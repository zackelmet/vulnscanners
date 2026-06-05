// Shared, idempotent credit settlement for scans that did NOT succeed.
//
// A scan reserves one credit at creation time (scanCredits[scanner] -1,
// scansUsed[scanner] +1 — see launchScan / api/scans). If the scan later fails
// or never reaches a terminal state, that reserved credit must be returned.
// This helper reverses the creation accounting exactly once per scan, guarded
// by a `creditRefunded` flag on the scan doc, so it is safe to call from both:
//   - the worker webhook's failed callback, and
//   - the stuck-scan reaper cron,
// including any retries or a race between the two.
//
// A scan that completed successfully is never refunded — the credit was
// legitimately consumed.

import { ScanScannerType } from "./schedule";

/** Statuses an in-flight scan can hold before it reaches a terminal state. */
const ACTIVE_STATUSES = ["queued", "in_progress"] as const;
const SCANNERS: readonly string[] = ["nmap", "nuclei", "zap"];

export type SettleOutcome =
  | "refunded" // credit returned this call
  | "already-settled" // credit was already refunded (or no known scanner)
  | "completed-skip" // scan succeeded; nothing to refund
  | "not-found"; // scan doc missing

export interface FailAndRefundInput {
  userId: string;
  scanId: string;
  /** Recorded as errorMessage when this call flips an active scan to failed. */
  reason?: string;
  /**
   * When true (reaper), also flip a still-active scan to `failed`. When false
   * (webhook, which already wrote the failed status), only reconcile credits.
   */
  markFailed?: boolean;
}

/**
 * Transactionally refund a scan's reserved credit exactly once, optionally
 * marking a still-active scan as failed. Returns what it did.
 */
export async function failScanAndRefund(
  admin: any,
  firestore: any,
  input: FailAndRefundInput,
): Promise<SettleOutcome> {
  const { userId, scanId, reason, markFailed = false } = input;
  const userRef = firestore.collection("users").doc(userId);
  const scanRef = userRef.collection("completedScans").doc(scanId);

  return firestore.runTransaction(async (tx: any) => {
    // ---- reads (Firestore requires all reads before any writes) ----
    const scanSnap = await tx.get(scanRef);
    if (!scanSnap.exists) return "not-found" as const;
    const scan = scanSnap.data() || {};

    // Never refund a successful scan.
    if (scan.status === "completed") return "completed-skip" as const;

    const userSnap = await tx.get(userRef);

    // ---- decide ----
    const scanner = scan.type as ScanScannerType | undefined;
    const isKnownScanner = !!scanner && SCANNERS.includes(scanner);
    const alreadyRefunded = scan.creditRefunded === true;
    const isActive = ACTIVE_STATUSES.includes(scan.status);

    // ---- writes ----
    const scanUpdate: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (markFailed && isActive) {
      scanUpdate.status = "failed";
      scanUpdate.endTime = admin.firestore.Timestamp.now();
      if (reason) scanUpdate.errorMessage = reason;
    }

    let outcome: SettleOutcome = "already-settled";
    if (!alreadyRefunded && isKnownScanner && userSnap.exists) {
      const used = Number(userSnap.data()?.scansUsed?.[scanner!] ?? 0);
      scanUpdate.creditRefunded = true;
      const userUpdate: Record<string, unknown> = {
        [`scanCredits.${scanner}`]: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      // Mirror creation's scansUsed +1, but never drive the lifetime counter
      // below zero on legacy/edge docs.
      if (used > 0) {
        userUpdate[`scansUsed.${scanner}`] =
          admin.firestore.FieldValue.increment(-1);
      }
      tx.update(userRef, userUpdate);
      outcome = "refunded";
    }

    // Only touch the scan doc when we actually changed something meaningful.
    if ("status" in scanUpdate || "creditRefunded" in scanUpdate) {
      tx.update(scanRef, scanUpdate);
    }

    return outcome;
  });
}
