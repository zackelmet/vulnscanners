// GET /api/cron/reap-stuck-scans
//
// Safety net for scans that never reach a terminal state. A scan can silently
// hang forever when:
//   - the enqueue POST to the worker is fire-and-forget and the worker is down,
//   - the worker (in-memory queue) reboots and drops queued/running jobs, or
//   - the worker's result callback fails with no retry.
// In every case the scan stays "queued"/"in_progress", the user's credit was
// already spent at creation, and nothing ever fixes it.
//
// This sweep finds scans stuck past SCAN_STUCK_MINUTES, marks them failed, and
// refunds the reserved credit (exactly once, via failScanAndRefund).
//
// Invoked by Vercel Cron (daily backup) and the Hetzner box (hourly). Auth
// mirrors the scheduled-scans cron: CRON_SECRET bearer, or a genuine Vercel
// cron header.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { failScanAndRefund } from "@/lib/scans/settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A scan legitimately runs at most the worker's hard timeout (~30 min) plus
// queue wait. Anything older than this is dead. Override via env if the worker
// timeout changes.
const DEFAULT_STUCK_MINUTES = 60;
// Bound per-sweep work so a backlog can't blow maxDuration. Reaped over
// successive sweeps if ever exceeded (logged below).
const MAX_PER_SWEEP = 200;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  return request.headers.get("x-vercel-cron") != null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = initializeAdmin();
  const firestore = admin.firestore();
  const nowMs = admin.firestore.Timestamp.now().toMillis();

  const stuckMinutes = Number(
    process.env.SCAN_STUCK_MINUTES || DEFAULT_STUCK_MINUTES,
  );
  const thresholdMs = stuckMinutes * 60 * 1000;

  // Prefer a status-filtered collection-group read (single-field, auto-indexed)
  // so we only scan active docs. Fall back to a filter-less read + in-code
  // filter if collection-group single-field indexing is exempted.
  let snap;
  try {
    snap = await firestore
      .collectionGroup("completedScans")
      .where("status", "in", ["queued", "in_progress"])
      .get();
  } catch (err: any) {
    console.warn(
      "reap-stuck-scans: status-filtered query failed, falling back to full scan:",
      err?.message,
    );
    try {
      snap = await firestore.collectionGroup("completedScans").get();
    } catch (err2: any) {
      console.error("reap-stuck-scans: query failed:", err2);
      return NextResponse.json(
        { error: err2?.message || "query failed" },
        { status: 500 },
      );
    }
  }

  const stuck = snap.docs.filter((doc: any) => {
    const d = doc.data();
    if (d.status !== "queued" && d.status !== "in_progress") return false;
    const startedMs =
      d.createdAt?.toMillis?.() ?? d.startTime?.toMillis?.() ?? 0;
    // Skip docs with no usable timestamp rather than reaping them blindly.
    return startedMs > 0 && nowMs - startedMs >= thresholdMs;
  });

  const capped = stuck.length > MAX_PER_SWEEP;
  const batch = capped ? stuck.slice(0, MAX_PER_SWEEP) : stuck;
  if (capped) {
    console.warn(
      `reap-stuck-scans: ${stuck.length} stuck scans found, processing ${MAX_PER_SWEEP} this sweep`,
    );
  }

  const results: {
    scanId: string;
    userId: string;
    outcome: string;
  }[] = [];

  for (const doc of batch) {
    const d = doc.data();
    const scanId: string = d.scanId || doc.id;
    const userId: string = d.userId || doc.ref.parent.parent?.id;
    if (!userId) {
      results.push({ scanId, userId: "?", outcome: "no-userId" });
      continue;
    }
    try {
      const outcome = await failScanAndRefund(admin, firestore, {
        userId,
        scanId,
        reason: `Scan timed out — no result after ${stuckMinutes} minutes.`,
        markFailed: true,
      });
      results.push({ scanId, userId, outcome });
    } catch (err: any) {
      console.error(`reap-stuck-scans: failed to settle ${scanId}:`, err);
      results.push({ scanId, userId, outcome: `error: ${err?.message}` });
    }
  }

  const refunded = results.filter((r) => r.outcome === "refunded").length;
  return NextResponse.json({
    success: true,
    sweptAt: new Date(nowMs).toISOString(),
    stuckMinutes,
    candidates: stuck.length,
    processed: batch.length,
    refunded,
    capped,
    results,
  });
}
