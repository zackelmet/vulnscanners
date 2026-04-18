import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { validateWebhookPayload } from "@/lib/scans/webhookValidation";

/**
 * Generate a signed URL for a GCS path (gs://bucket/path)
 * Valid for 7 days
 */
async function generateSignedUrl(gcsUrl: string): Promise<string | null> {
  try {
    const admin = initializeAdmin();
    const storage = admin.storage();

    // Parse gs://bucket/path format
    const match = gcsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      console.error("Invalid GCS URL format (expected gs://bucket/path)");
      return null;
    }

    const [, bucketName, filePath] = match;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log("Generated signed URL for GCS path");
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

    // ── Auth ─────────────────────────────────────────────────────────────────
    // Accept any of three header names so workers with different naming
    // conventions both work.  Compare to GCP_WEBHOOK_SECRET (server-only).
    const webhookSecret = process.env.GCP_WEBHOOK_SECRET;
    const sig =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-gcp-webhook-secret") ||
      request.headers.get("x-webhook-secret");

    console.log("Webhook auth check:", {
      hasEnvSecret: !!webhookSecret,
      hasIncomingSig: !!sig,
    });

    if (webhookSecret && sig !== webhookSecret) {
      console.error("Webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ── Parse & validate ─────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    const validation = validateWebhookPayload(body);
    if (!validation.valid) {
      console.error("Webhook payload validation failed:", validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      scanId,
      userId,
      scanType,
      status,
      startedAt,
      completedAt,
      durationSec,
      resultUrl,
      resultPath,
      summary,
      error: errorField,
      eventId,
      rawPayload,
    } = validation.payload;

    console.log("Webhook received:", { scanId, status, scanType, eventId });

    // ── Idempotency ──────────────────────────────────────────────────────────
    // Write scans/{scanId}/events/{eventId} with create semantics.
    // If the document already exists this is a duplicate delivery — return 200
    // without reprocessing to keep the operation idempotent.
    const eventRef = firestore
      .collection("scans")
      .doc(scanId)
      .collection("events")
      .doc(eventId);

    let isDuplicate = false;
    try {
      await firestore.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        if (eventSnap.exists) {
          isDuplicate = true;
          return;
        }
        tx.set(eventRef, {
          eventId,
          scanId,
          status,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          startedAt: admin.firestore.Timestamp.fromDate(startedAt),
          completedAt: admin.firestore.Timestamp.fromDate(completedAt),
        });
      });
    } catch (err) {
      console.error("Failed idempotency check for event:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    if (isDuplicate) {
      console.log("Duplicate webhook event ignored:", { scanId, eventId });
      return NextResponse.json({
        success: true,
        message: "Duplicate event — already processed",
      });
    }

    // ── Firestore updates ────────────────────────────────────────────────────
    try {
      const now = admin.firestore.Timestamp.now();

      // Generate signed URL for GCS paths when only a path is provided
      const legacyGcpSignedUrl =
        (body.gcpSignedUrl as string | undefined) || null;
      const legacyXmlStorageUrl =
        (body.gcpXmlStorageUrl as string | undefined) || null;
      const legacyXmlSignedUrl =
        (body.gcpXmlSignedUrl as string | undefined) || null;
      const legacyReportStorageUrl =
        (body.gcpReportStorageUrl as string | undefined) || null;
      const legacyReportSignedUrl =
        (body.gcpReportSignedUrl as string | undefined) || null;

      // Generate missing signed URLs for GCS storage paths
      let resolvedSignedUrl = legacyGcpSignedUrl;
      if (resultUrl && resultUrl.startsWith("gs://") && !resolvedSignedUrl) {
        resolvedSignedUrl = await generateSignedUrl(resultUrl);
      }

      let resolvedXmlSignedUrl = legacyXmlSignedUrl;
      if (
        legacyXmlStorageUrl &&
        legacyXmlStorageUrl.startsWith("gs://") &&
        !resolvedXmlSignedUrl
      ) {
        resolvedXmlSignedUrl = await generateSignedUrl(legacyXmlStorageUrl);
      }

      let resolvedReportSignedUrl = legacyReportSignedUrl;
      if (
        legacyReportStorageUrl &&
        legacyReportStorageUrl.startsWith("gs://") &&
        !resolvedReportSignedUrl
      ) {
        resolvedReportSignedUrl = await generateSignedUrl(
          legacyReportStorageUrl,
        );
      }

      const signedUrlExpiry =
        resolvedSignedUrl || resolvedXmlSignedUrl || resolvedReportSignedUrl
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null;

      // Canonical fields written to scans/{scanId}
      const scanUpdate: Record<string, unknown> = {
        scanId,
        userId,
        status,
        scanType,
        startedAt: admin.firestore.Timestamp.fromDate(startedAt),
        completedAt: admin.firestore.Timestamp.fromDate(completedAt),
        // keep legacy field names for frontend compatibility
        startTime: admin.firestore.Timestamp.fromDate(startedAt),
        endTime: admin.firestore.Timestamp.fromDate(completedAt),
        durationSec,
        resultUrl,
        resultPath,
        // legacy aliases still written so existing reads don't break
        gcpStorageUrl: resultUrl,
        gcsPath: resultPath,
        gcpSignedUrl: resolvedSignedUrl,
        gcpSignedUrlExpires: resolvedSignedUrl ? signedUrlExpiry : null,
        gcpXmlStorageUrl: legacyXmlStorageUrl,
        gcpXmlSignedUrl: resolvedXmlSignedUrl,
        gcpXmlSignedUrlExpires: resolvedXmlSignedUrl ? signedUrlExpiry : null,
        gcpReportStorageUrl: legacyReportStorageUrl,
        gcpReportSignedUrl: resolvedReportSignedUrl,
        gcpReportSignedUrlExpires: resolvedReportSignedUrl
          ? signedUrlExpiry
          : null,
        summary,
        resultsSummary: summary, // legacy alias
        error: errorField,
        errorMessage: errorField, // legacy alias
        scannerType: scanType, // legacy alias
        billingUnits:
          typeof body.billingUnits === "number" ? body.billingUnits : null,
        rawPayload: Object.keys(rawPayload).length > 0 ? rawPayload : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Update (or create) the global scan document
      const globalScanRef = firestore.collection("scans").doc(scanId);
      await globalScanRef.set(
        {
          ...scanUpdate,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Mirror into the per-user subcollection
      const userScanRef = firestore
        .collection("users")
        .doc(userId)
        .collection("completedScans")
        .doc(scanId);
      await userScanRef.set(scanUpdate, { merge: true });

      // ── Billing reconciliation ───────────────────────────────────────────
      // Usage counters are reserved at scan-creation time. On completion,
      // reconcile extra billing units (if any); on failure/cancellation,
      // roll back the reserved unit.
      try {
        const scanner = scanType;
        const units =
          typeof body.billingUnits === "number" && body.billingUnits > 0
            ? body.billingUnits
            : 1;

        const userRef = firestore.collection("users").doc(userId);
        await firestore.runTransaction(async (tx) => {
          const usrSnap = await tx.get(userRef);
          if (!usrSnap.exists) return;
          const usr = usrSnap.data() as Record<string, any>;
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
          } else {
            // Roll back the reserved unit for non-completion statuses
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
      } catch (err) {
        console.error("Failed to reconcile billing units on webhook:", err);
      }

      console.log("Scan webhook processed:", { scanId, status });
    } catch (err) {
      console.error("Failed to update scan documents on webhook:", err);
      return NextResponse.json(
        { error: "Failed to update scan metadata" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scan result processed",
    });
  } catch (error: any) {
    console.error("Error processing scan webhook:", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
