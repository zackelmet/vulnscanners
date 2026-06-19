// GET  /api/scheduled-scans  → list the user's recurring scan schedules
// POST /api/scheduled-scans  → create a recurring scan schedule
//
// Schedules live at users/{uid}/scheduledScans/{id}. A Vercel Cron
// (/api/cron/scheduled-scans) sweeps due schedules and launches the scans.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import {
  ScanScannerType,
  ScheduleConfig,
  computeNextRun,
  validateSchedule,
} from "@/lib/scans/schedule";
import { normalizeScanTarget } from "@/lib/scans/launchScan";

export const runtime = "nodejs";

const SCANNERS: ScanScannerType[] = ["nmap", "nuclei", "zap"];

async function authUid(
  request: NextRequest,
  admin: ReturnType<typeof initializeAdmin>,
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await admin
      .auth()
      .verifyIdToken(authHeader.split("Bearer ")[1]);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = initializeAdmin();
  const firestore = admin.firestore();
  const userId = await authUid(request, admin);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await firestore
    .collection("users")
    .doc(userId)
    .collection("scheduledScans")
    .get();

  const schedules = snap.docs
    .map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Surface timestamps as ISO so the client can format them.
        nextRunAt: data.nextRunAt?.toDate?.()?.toISOString() ?? null,
        lastRunAt: data.lastRunAt?.toDate?.()?.toISOString() ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    })
    .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ success: true, schedules });
}

export async function POST(request: NextRequest) {
  const admin = initializeAdmin();
  const firestore = admin.firestore();
  const userId = await authUid(request, admin);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    name,
    type,
    types,
    target,
    targetId,
    options = {},
    frequency,
    hourUTC,
    minuteUTC = 0,
    dayOfWeek,
    dayOfMonth,
  } = body || {};

  // Accept either `types` (array — one schedule can fan out to several
  // scanners) or the legacy single `type`. De-dupe and validate every entry.
  const requestedTypes: unknown[] = Array.isArray(types)
    ? types
    : type
      ? [type]
      : [];
  const scanTypes = Array.from(new Set(requestedTypes)) as ScanScannerType[];
  if (scanTypes.length === 0 || !scanTypes.every((t) => SCANNERS.includes(t))) {
    return NextResponse.json(
      { error: "Select at least one scanner (nmap, nuclei, or zap)" },
      { status: 400 },
    );
  }

  // Resolve + validate the target now so bad schedules never reach the cron.
  let targetValue: string | undefined =
    typeof target === "string" && target.trim() ? target.trim() : undefined;
  if (!targetValue && targetId) {
    const tDoc = await firestore
      .collection("users")
      .doc(userId)
      .collection("targets")
      .doc(targetId)
      .get();
    if (!tDoc.exists) {
      return NextResponse.json(
        { error: "Saved target not found" },
        { status: 400 },
      );
    }
    targetValue = tDoc.data()?.value;
  }
  if (!targetValue) {
    return NextResponse.json(
      { error: "A target (or targetId) is required" },
      { status: 400 },
    );
  }
  // The same target must be valid for every selected scanner. zap wants a URL,
  // nmap/nuclei want a host/IP — normalizeScanTarget coerces each, so reject
  // only if a scanner genuinely can't use this target.
  for (const t of scanTypes) {
    if (!normalizeScanTarget(t, targetValue)) {
      return NextResponse.json(
        {
          error: `Invalid target format for ${t}: ${targetValue}. ${
            t === "zap"
              ? "Must be a valid URL"
              : "Must be a valid IP address or domain name"
          }`,
        },
        { status: 400 },
      );
    }
  }

  const cfg: ScheduleConfig = {
    frequency,
    hourUTC,
    minuteUTC,
    dayOfWeek,
    dayOfMonth,
  };
  const cfgError = validateSchedule(cfg);
  if (cfgError) {
    return NextResponse.json({ error: cfgError }, { status: 400 });
  }

  const nextRunAt = computeNextRun(cfg);

  const docData: Record<string, unknown> = {
    userId,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    // `types` is the source of truth; `type` kept as the first entry for
    // backward compatibility with older readers. The launcher re-normalizes the
    // target per scanner, so store the raw (trimmed) target here.
    types: scanTypes,
    type: scanTypes[0],
    target: targetValue.trim(),
    options,
    frequency,
    hourUTC,
    minuteUTC,
    enabled: true,
    nextRunAt: admin.firestore.Timestamp.fromDate(nextRunAt),
    lastRunAt: null,
    lastScanId: null,
    lastError: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (targetId) docData.targetId = targetId;
  if (frequency === "weekly") docData.dayOfWeek = dayOfWeek;
  if (frequency === "monthly") docData.dayOfMonth = dayOfMonth;

  const ref = await firestore
    .collection("users")
    .doc(userId)
    .collection("scheduledScans")
    .add(docData);

  // The schedule fires at its chosen time via the runner (swept every minute by
  // the always-on worker box). The first run is the next occurrence of the
  // chosen time — today if it's still ahead, otherwise the next matching day.
  return NextResponse.json(
    {
      success: true,
      id: ref.id,
      nextRunAt: nextRunAt.toISOString(),
    },
    { status: 201 },
  );
}
