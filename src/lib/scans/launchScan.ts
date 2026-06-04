// Reusable single-scan launcher shared by the scheduled-scan cron.
// Mirrors the credit-gated creation + worker-enqueue flow in
// src/app/api/scans/route.ts, but for one already-validated target. Returns the
// new scanId, or throws a tagged Error the caller can branch on.

import type { ScanScannerType } from "./schedule";

/** Normalize + validate a target for a given scanner. Returns null if invalid. */
export function normalizeScanTarget(
  type: ScanScannerType,
  targetStr: string,
): string | null {
  let normalized = targetStr.trim();

  if (type === "zap") {
    if (!/^https?:\/\//i.test(normalized)) normalized = `http://${normalized}`;
    try {
      new URL(normalized);
      return normalized;
    } catch {
      return null;
    }
  }

  // nuclei / nmap want a bare host or IP.
  normalized = normalized.replace(/^https?:\/\//i, "");
  normalized = normalized.replace(/:\d+.*$/, "");
  normalized = normalized.replace(/\/.*$/, "");

  const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const domainPattern =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return ipPattern.test(normalized) || domainPattern.test(normalized)
    ? normalized
    : null;
}

export class ScanLaunchError extends Error {
  code: "InvalidTarget" | "InsufficientCredits" | "UserNotFound";
  constructor(
    code: "InvalidTarget" | "InsufficientCredits" | "UserNotFound",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "ScanLaunchError";
  }
}

export interface LaunchScanInput {
  userId: string;
  type: ScanScannerType;
  /** Ad-hoc target value; OR provide targetId to resolve a saved target. */
  target?: string;
  targetId?: string;
  options?: Record<string, unknown>;
  /** Tag for provenance, e.g. "scheduled". Stored on the scan doc. */
  source?: string;
  /** Extra fields to merge onto the scan doc (e.g. scheduleId). */
  extra?: Record<string, unknown>;
}

/**
 * Create one credit-gated scan under the user and enqueue it on the worker.
 * `admin` is the initialized firebase-admin module; `firestore` its Firestore.
 */
export async function launchScan(
  admin: any,
  firestore: any,
  input: LaunchScanInput,
): Promise<{ scanId: string }> {
  const { userId, type, targetId, options = {}, source, extra = {} } = input;
  const scanner = type;

  // Resolve target value (ad-hoc or saved target).
  let targetValue = input.target?.trim();
  if (!targetValue && targetId) {
    const targetDoc = await firestore
      .collection("users")
      .doc(userId)
      .collection("targets")
      .doc(targetId)
      .get();
    if (!targetDoc.exists) {
      throw new ScanLaunchError("InvalidTarget", "Saved target not found");
    }
    targetValue = targetDoc.data()?.value;
  }
  if (!targetValue) {
    throw new ScanLaunchError("InvalidTarget", "No target provided");
  }

  const normalized = normalizeScanTarget(type, targetValue);
  if (!normalized) {
    throw new ScanLaunchError(
      "InvalidTarget",
      `Invalid target format: ${targetValue}`,
    );
  }

  const userDocRef = firestore.collection("users").doc(userId);
  const userSnap = await userDocRef.get();
  if (!userSnap.exists) {
    throw new ScanLaunchError("UserNotFound", "User not found");
  }

  // Credit-gated creation in a transaction (same model as /api/scans).
  let newScanId = "";
  await firestore.runTransaction(async (tx: any) => {
    const fresh = (await tx.get(userDocRef)).data() || {};
    const credits = fresh.scanCredits || { nmap: 0, nuclei: 0, zap: 0 };
    const available = (credits[scanner] as number) ?? 0;
    if (available < 1) {
      throw new ScanLaunchError(
        "InsufficientCredits",
        `No ${scanner} credits remaining`,
      );
    }

    const newScanRef = userDocRef.collection("completedScans").doc();
    newScanId = newScanRef.id;
    const scanData: Record<string, unknown> = {
      scanId: newScanRef.id,
      userId,
      type,
      target: normalized,
      targetValue: normalized,
      options,
      status: "queued",
      startTime: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      resultsSummary: null,
      gcpStorageUrl: null,
      errorMessage: null,
      ...extra,
    };
    if (source) scanData.source = source;
    if (targetId) scanData.targetId = targetId;

    tx.set(newScanRef, scanData);
    tx.update(userDocRef, {
      [`scanCredits.${scanner}`]: admin.firestore.FieldValue.increment(-1),
      [`scansUsed.${scanner}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Enqueue on the worker; mark in_progress on success.
  try {
    const { enqueueScanJob } = await import("@/lib/gcp/scannerClient");
    await enqueueScanJob({
      scanId: newScanId,
      userId,
      type,
      target: normalized,
      options,
      callbackUrl: process.env.VERCEL_WEBHOOK_URL || "",
    });
    await userDocRef
      .collection("completedScans")
      .doc(newScanId)
      .update({
        status: "in_progress",
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (err) {
    console.error(`launchScan: enqueue failed for ${newScanId}:`, err);
    // Leave the doc as "queued"; the scan was created and credited.
  }

  return { scanId: newScanId };
}
