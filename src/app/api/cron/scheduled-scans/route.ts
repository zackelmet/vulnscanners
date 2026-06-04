// GET /api/cron/scheduled-scans
// Invoked by Vercel Cron (see vercel.json). Finds every enabled schedule whose
// nextRunAt is due, launches the scan via the shared launcher, and rolls the
// schedule forward to its next occurrence.
//
// Auth: when CRON_SECRET is set, Vercel sends `Authorization: Bearer <secret>`
// on cron invocations — we require it. Otherwise we fall back to requiring the
// `x-vercel-cron` header that Vercel adds to scheduled requests.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import {
  ScanScannerType,
  ScheduleConfig,
  computeNextRun,
} from "@/lib/scans/schedule";
import { launchScan, ScanLaunchError } from "@/lib/scans/launchScan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow time to launch a batch of scans.
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  // No secret configured — accept only genuine Vercel cron invocations.
  return request.headers.get("x-vercel-cron") != null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = initializeAdmin();
  const firestore = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  // Single-field inequality on a collection-group field — no composite index
  // needed. We filter `enabled` in code to avoid a composite index.
  const dueSnap = await firestore
    .collectionGroup("scheduledScans")
    .where("nextRunAt", "<=", now)
    .get();

  const results: {
    scheduleId: string;
    userId: string;
    status: "launched" | "skipped" | "error";
    scanId?: string;
    reason?: string;
  }[] = [];

  for (const doc of dueSnap.docs) {
    const sched = doc.data() as any;
    const scheduleId = doc.id;
    const userId: string = sched.userId || doc.ref.parent.parent?.id;

    if (sched.enabled === false) continue; // paused
    if (!userId) {
      results.push({ scheduleId, userId: "?", status: "error", reason: "no userId" });
      continue;
    }

    const cfg: ScheduleConfig = {
      frequency: sched.frequency,
      hourUTC: sched.hourUTC,
      minuteUTC: sched.minuteUTC ?? 0,
      dayOfWeek: sched.dayOfWeek,
      dayOfMonth: sched.dayOfMonth,
    };
    // Always roll forward so a due schedule never re-fires every sweep, even
    // if the launch fails (e.g. out of credits).
    const nextRunAt = admin.firestore.Timestamp.fromDate(
      computeNextRun(cfg, new Date()),
    );

    try {
      const { scanId } = await launchScan(admin, firestore, {
        userId,
        type: sched.type as ScanScannerType,
        target: sched.target,
        targetId: sched.targetId,
        options: sched.options || {},
        source: "scheduled",
        extra: { scheduleId },
      });
      await doc.ref.update({
        nextRunAt,
        lastRunAt: now,
        lastScanId: scanId,
        lastError: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      results.push({ scheduleId, userId, status: "launched", scanId });
    } catch (err: any) {
      const reason =
        err instanceof ScanLaunchError ? err.code : err?.message || "error";
      await doc.ref.update({
        nextRunAt,
        lastRunAt: now,
        lastError: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      results.push({ scheduleId, userId, status: "skipped", reason });
    }
  }

  return NextResponse.json({
    success: true,
    sweptAt: now.toDate().toISOString(),
    due: dueSnap.size,
    launched: results.filter((r) => r.status === "launched").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    results,
  });
}
