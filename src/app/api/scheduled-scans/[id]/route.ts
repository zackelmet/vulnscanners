// PATCH  /api/scheduled-scans/[id]  → toggle enabled / edit cadence
// DELETE /api/scheduled-scans/[id]  → remove a schedule

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import {
  ScheduleConfig,
  computeNextRun,
  validateSchedule,
} from "@/lib/scans/schedule";

export const runtime = "nodejs";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = initializeAdmin();
  const firestore = admin.firestore();
  const userId = await authUid(request, admin);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ref = firestore
    .collection("users")
    .doc(userId)
    .collection("scheduledScans")
    .doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const current = snap.data() as any;
  const update: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (typeof body.enabled === "boolean") {
    update.enabled = body.enabled;
  }
  if (typeof body.name === "string") {
    update.name = body.name.trim() || null;
  }

  // If any cadence field changes, re-validate and recompute nextRunAt.
  const cadenceKeys = [
    "frequency",
    "hourUTC",
    "minuteUTC",
    "dayOfWeek",
    "dayOfMonth",
  ];
  const cadenceTouched = cadenceKeys.some((k) => k in body);
  if (cadenceTouched) {
    const cfg: ScheduleConfig = {
      frequency: body.frequency ?? current.frequency,
      hourUTC: body.hourUTC ?? current.hourUTC,
      minuteUTC: body.minuteUTC ?? current.minuteUTC ?? 0,
      dayOfWeek: body.dayOfWeek ?? current.dayOfWeek,
      dayOfMonth: body.dayOfMonth ?? current.dayOfMonth,
    };
    const err = validateSchedule(cfg);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    update.frequency = cfg.frequency;
    update.hourUTC = cfg.hourUTC;
    update.minuteUTC = cfg.minuteUTC;
    update.dayOfWeek = cfg.frequency === "weekly" ? cfg.dayOfWeek : null;
    update.dayOfMonth = cfg.frequency === "monthly" ? cfg.dayOfMonth : null;
    update.nextRunAt = admin.firestore.Timestamp.fromDate(computeNextRun(cfg));
  }

  await ref.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = initializeAdmin();
  const firestore = admin.firestore();
  const userId = await authUid(request, admin);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await firestore
    .collection("users")
    .doc(userId)
    .collection("scheduledScans")
    .doc(params.id)
    .delete();

  return NextResponse.json({ success: true });
}
