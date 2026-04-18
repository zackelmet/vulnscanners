import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import type { Timestamp } from "firebase-admin/firestore";

const VALID_SCAN_TYPES = ["nmap", "nuclei", "zap"] as const;
const VALID_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "canceled",
  "cancelled",
  "timeout",
] as const;

/** Convert an ISO string or millisecond epoch number to a Firestore Timestamp. */
function toFirestoreTimestamp(value: string | number): Timestamp | null {
  if (value == null) return null;
  try {
    const admin = initializeAdmin();
    if (typeof value === "number") {
      return admin.firestore.Timestamp.fromMillis(value);
    }
    return admin.firestore.Timestamp.fromDate(new Date(value));
  } catch {
    return null;
  }
}

/**
 * Generate a signed URL for a GCS path (gs://bucket/path).
 * Valid for 7 days.
 */
async function generateSignedUrl(gcsUrl: string): Promise<string | null> {
  try {
    const admin = initializeAdmin();
    const storage = admin.storage();

    const match = gcsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      console.error("Invalid GCS URL format supplied to generateSignedUrl");
      return null;
    }

    const [, bucketName, filePath] = match;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    console.log("Generated signed URL for GCS object");
    return signedUrl;
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const firestore = admin.firestore();

    // ── Auth ──────────────────────────────────────────────────────────────────
    // Accept any of three header names; compare to GCP_WEBHOOK_SECRET.
    const webhookSecret = process.env.GCP_WEBHOOK_SECRET;
    const receivedSecret =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-gcp-webhook-secret") ||
      request.headers.get("x-webhook-secret");

    console.log("Webhook auth check:", {
      hasEnvSecret: !!webhookSecret,
      hasReceivedSecret: !!receivedSecret,
    });

    if (webhookSecret && webhookSecret !== receivedSecret) {
      console.error("Webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // ── Required field validation ──────────────────────────────────────────────
    const eventId = body.eventId as string | undefined;
    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: eventId" },
        { status: 400 },
      );
    }

    const scanId = body.scanId as string | undefined;
    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: scanId" },
        { status: 400 },
      );
    }

    const userId = body.userId as string | undefined;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 },
      );
    }

    // Accept both new `scanType` and legacy `scannerType`
    const rawScanType = (body.scanType || body.scannerType) as
      | string
      | undefined;
    if (!rawScanType || !VALID_SCAN_TYPES.includes(rawScanType as any)) {
      return NextResponse.json(
        {
          error: `Missing or invalid scanType. Must be one of: ${VALID_SCAN_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    const scanType = rawScanType as (typeof VALID_SCAN_TYPES)[number];

    const rawStatus = body.status as string | undefined;
    if (!rawStatus || !VALID_STATUSES.includes(rawStatus as any)) {
      return NextResponse.json(
        {
          error: `Missing or invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    const status = rawStatus as (typeof VALID_STATUSES)[number];

    const rawStartedAt = body.startedAt as string | number | undefined;
    if (rawStartedAt == null) {
      return NextResponse.json(
        { error: "Missing required field: startedAt" },
        { status: 400 },
      );
    }
    const startedAtTs = toFirestoreTimestamp(rawStartedAt);
    if (!startedAtTs) {
      return NextResponse.json(
        { error: "Invalid startedAt: must be ISO string or ms number" },
        { status: 400 },
      );
    }

    const rawCompletedAt = body.completedAt as string | number | undefined;
    if (rawCompletedAt == null) {
      return NextResponse.json(
        { error: "Missing required field: completedAt" },
        { status: 400 },
      );
    }
    const completedAtTs = toFirestoreTimestamp(rawCompletedAt);
    if (!completedAtTs) {
      return NextResponse.json(
        { error: "Invalid completedAt: must be ISO string or ms number" },
        { status: 400 },
      );
    }

    const durationSec = body.durationSec;
    if (typeof durationSec !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid durationSec: must be a number" },
        { status: 400 },
      );
    }

    // Accept new `resultUrl` / `resultPath`, falling back to legacy field names
    const resultUrl =
      (body.resultUrl as string | undefined) ||
      (body.gcpStorageUrl as string | undefined) ||
      (body.gcsPath as string | undefined) ||
      null;
    const resultPath = (body.resultPath as string | undefined) || null;

    if (!resultUrl && !resultPath) {
      return NextResponse.json(
        { error: "Missing required field: provide resultUrl or resultPath" },
        { status: 400 },
      );
    }

    // Conditional: error string required when status is failed
    const errorMsg =
      (body.error as string | undefined) ||
      (body.errorMessage as string | undefined) ||
      null;

    if (status === "failed" && !errorMsg) {
      return NextResponse.json(
        { error: "Field 'error' is required when status is 'failed'" },
        { status: 400 },
      );
    }

    // Optional fields
    const summary =
      (body.summary as Record<string, unknown> | undefined) ||
      (body.resultsSummary as Record<string, unknown> | undefined) ||
      null;
    const billingUnits =
      typeof body.billingUnits === "number" ? body.billingUnits : null;

    // ── Idempotency: create event doc first ───────────────────────────────────
    // If the event already exists, skip re-processing and return 200 OK.
    const eventRef = firestore
      .collection("scans")
      .doc(scanId)
      .collection("events")
      .doc(eventId);

    try {
      await eventRef.create({
        eventId,
        status,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      if (err.code === 6 || err.code === "already-exists") {
        console.log(`Webhook event ${eventId} already processed — skipping`);
        return NextResponse.json({
          success: true,
          message: "Event already processed",
        });
      }
      throw err;
    }

    // ── Signed URL generation (for GCS paths) ────────────────────────────────
    const gcsPath = resultPath || resultUrl || null;
    let resolvedSignedUrl: string | null =
      (body.gcpSignedUrl as string | undefined) || null;
    let signedUrlExpires: string | null =
      (body.gcpSignedUrlExpires as string | undefined) || null;

    if (gcsPath && gcsPath.startsWith("gs://") && !resolvedSignedUrl) {
      console.log("Generating signed URL for result artifact");
      resolvedSignedUrl = await generateSignedUrl(gcsPath);
      if (resolvedSignedUrl) {
        signedUrlExpires = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
      }
    }

    // ── rawPayload: entire incoming body (stored only on scans/{scanId}) ──────
    const rawPayload = body;

    // ── Shared update fields (mirror-safe; no rawPayload) ────────────────────
    const sharedFields: Record<string, unknown> = {
      status,
      scanType,
      startedAt: startedAtTs,
      completedAt: completedAtTs,
      durationSec,
      resultUrl: resultUrl || resolvedSignedUrl || null,
      resultPath: resultPath || gcsPath || null,
      summary,
      error: errorMsg,
      gcpSignedUrl: resolvedSignedUrl,
      gcpSignedUrlExpires: signedUrlExpires,
      billingUnits,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // ── Firestore: update scans/{scanId} (with rawPayload) ───────────────────
    try {
      const globalScanRef = firestore.collection("scans").doc(scanId);
      await globalScanRef.set(
        {
          ...sharedFields,
          scanId,
          userId,
          rawPayload,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err: any) {
      console.error("Failed to update global scan doc:", err);
      return NextResponse.json(
        { error: "Failed to update scan metadata" },
        { status: 500 },
      );
    }

    // ── Firestore: mirror update users/{userId}/completedScans/{scanId} ───────
    // rawPayload is intentionally excluded from the mirror.
    try {
      const userScanRef = firestore
        .collection("users")
        .doc(userId)
        .collection("completedScans")
        .doc(scanId);

      await userScanRef.set({ ...sharedFields, scanId }, { merge: true });
    } catch (err: any) {
      console.error("Failed to update user scan mirror:", err);
      // Non-fatal: global doc already written; log and continue.
    }

    // ── Billing reconciliation ────────────────────────────────────────────────
    // Usage counters are reserved at scan creation time. Here we:
    //  - Adjust for extra billing units on completion (units > 1).
    //  - Rollback the reserved unit for non-completed scans.
    try {
      const scanner = scanType as "nmap" | "nuclei" | "zap";
      const units =
        typeof billingUnits === "number" && billingUnits > 0 ? billingUnits : 1;
      const userRef = firestore.collection("users").doc(userId);

      await firestore.runTransaction(async (tx) => {
        const usrSnap = await tx.get(userRef);
        if (!usrSnap.exists) return;
        const usr = usrSnap.data() as any;
        const currentUsed =
          (usr.scannersUsedThisMonth && usr.scannersUsedThisMonth[scanner]) ||
          0;

        if (status === "completed") {
          const extra = units - 1;
          if (extra > 0) {
            tx.update(userRef, {
              [`scannersUsedThisMonth.${scanner}`]:
                admin.firestore.FieldValue.increment(extra),
              scansThisMonth: admin.firestore.FieldValue.increment(extra),
              totalScansAllTime: admin.firestore.FieldValue.increment(extra),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } else if (
          status === "failed" ||
          status === "canceled" ||
          status === "cancelled" ||
          status === "timeout"
        ) {
          const dec = Math.min(1, currentUsed);
          if (dec > 0) {
            tx.update(userRef, {
              [`scannersUsedThisMonth.${scanner}`]:
                admin.firestore.FieldValue.increment(-dec),
              scansThisMonth: admin.firestore.FieldValue.increment(-dec),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      });
    } catch (err: any) {
      console.error("Failed to reconcile billing units on webhook:", err);
    }

    console.log(`Webhook processed: scanId=${scanId} status=${status}`);

    return NextResponse.json({
      success: true,
      message: "Scan result processed",
    });
  } catch (error: any) {
    console.error("Error processing scan webhook:", error?.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
