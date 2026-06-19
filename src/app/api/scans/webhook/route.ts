import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { ScanMetadata } from "@/lib/types/user";
import { sendScanCompleteEmail, sendScanFailedEmail } from "@/lib/email/resend";
import {
  buildScanPdfFromDoc,
  scanPdfFilename,
} from "@/lib/report-engine/render-from-doc";
import { failScanAndRefund } from "@/lib/scans/settle";

// Short human summary line for the scan-complete email, by scanner.
function scanSummaryLine(rs: any): string | null {
  if (!rs || typeof rs !== "object") return null;
  if (rs.targetUnreachable)
    return "The target appears unreachable — no responsive ports/services were found (it may be down, firewalled, or blocking the scanner). Verify the host is reachable and re-run.";
  if (typeof rs.findings === "number")
    return `${rs.findings} finding${rs.findings === 1 ? "" : "s"} identified.`;
  if (typeof rs.alertsMentioned === "number")
    return `${rs.alertsMentioned} alert${rs.alertsMentioned === 1 ? "" : "s"} reported.`;
  if (typeof rs.openPorts === "number")
    return `${rs.openPorts} open port${rs.openPorts === 1 ? "" : "s"} found.`;
  return null;
}

/**
 * Upload raw scan output to Firebase Storage and return the gs:// URL.
 * Returns null if upload fails or content is empty.
 */
async function uploadRawToStorage(
  scanId: string,
  filename: string,
  content: string,
  contentType: string,
): Promise<string | null> {
  if (!content) return null;
  try {
    const admin = initializeAdmin();
    const bucket = admin.storage().bucket();
    const objectPath = `scans/${scanId}/${filename}`;
    const file = bucket.file(objectPath);
    await file.save(Buffer.from(content, "utf-8"), {
      contentType,
      resumable: false,
      metadata: { cacheControl: "private, max-age=0, no-transform" },
    });
    console.log(
      `✅ Uploaded ${objectPath} (${content.length} bytes) to ${bucket.name}`,
    );
    return `gs://${bucket.name}/${objectPath}`;
  } catch (err) {
    console.error(`Failed to upload ${filename} to Storage:`, err);
    return null;
  }
}

/**
 * Generate a signed URL for a GCS path (gs://bucket/path)
 * Valid for 7 days
 */
async function generateSignedUrl(gcsUrl: string): Promise<string | null> {
  try {
    const admin = initializeAdmin();
    const storage = admin.storage();

    // Parse gs://bucket/path format
    const match = gcsUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      console.error("Invalid GCS URL format:", gcsUrl);
      return null;
    }

    const [, bucketName, filePath] = match;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    // Generate signed URL valid for 7 days
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`✅ Generated signed URL for ${gcsUrl}`);
    return signedUrl;
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    return null;
  }
}

export const runtime = "nodejs";
// Rendering the report PDF + sending email adds work beyond the DB update.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const firestore = admin.firestore();

    // Verify webhook signature. Accept either header name so workers and
    // functions with different header naming conventions both work.
    const webhookSecret = process.env.HETZNER_WEBHOOK_SECRET;
    const sig1 = request.headers.get("x-webhook-signature");
    const sig2 = request.headers.get("x-gcp-webhook-secret");
    const sig3 = request.headers.get("x-webhook-secret");
    const sig4 = request.headers.get("x-hetzner-webhook-secret");

    // Debug logging for webhook auth issues
    console.log("🔐 Webhook auth check:", {
      hasEnvSecret: !!webhookSecret,
      envSecretPreview: webhookSecret
        ? `${webhookSecret.slice(0, 4)}...`
        : "NOT SET",
      sig1: sig1 ? `${sig1.slice(0, 4)}...` : null,
      sig2: sig2 ? `${sig2.slice(0, 4)}...` : null,
      sig3: sig3 ? `${sig3.slice(0, 4)}...` : null,
      sig4: sig4 ? `${sig4.slice(0, 4)}...` : null,
    });

    // Fail closed: a missing or empty shared secret must NOT pass the check.
    if (!webhookSecret || webhookSecret !== (sig1 || sig2 || sig3 || sig4)) {
      console.error(
        "❌ Webhook signature mismatch or secret unset — expected:",
        webhookSecret ? webhookSecret.slice(0, 4) : "<unset>",
        "got:",
        (sig1 || sig2 || sig3 || sig4)?.slice(0, 4) || "<none>",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse scan result from Cloud Function
    const result = await request.json();
    const {
      // Unique per worker delivery; used to dedupe callback retries.
      eventId,
      scanId,
      userId,
      status,
      resultsSummary,
      gcpStorageUrl,
      // optional signed URL and expiry sent by worker
      gcpSignedUrl,
      gcpSignedUrlExpires,
      // XML results
      gcpXmlStorageUrl,
      gcpXmlSignedUrl,
      gcpXmlSignedUrlExpires,
      // JSON results (nuclei -jsonl / zap -J)
      gcpJsonStorageUrl,
      gcpJsonSignedUrl,
      gcpJsonSignedUrlExpires,
      // optional PDF report links
      gcpReportStorageUrl,
      gcpReportSignedUrl,
      gcpReportSignedUrlExpires,
      errorMessage,
      // optional scanner metadata
      scannerType,
      billingUnits,
      // legacy/alternate keys some workers may send:
      gcsPath,
      summary,
      // full raw outputs from worker (worker no longer truncates)
      rawStdout,
      rawXml,
      rawJson,
    } = result;

    console.log(`📥 Webhook received for scan ${scanId}:`, status);
    console.log(`📦 Webhook payload URLs:`, {
      gcpStorageUrl: gcpStorageUrl || "NOT PROVIDED",
      gcpSignedUrl: gcpSignedUrl
        ? `${gcpSignedUrl.slice(0, 60)}...`
        : "NOT PROVIDED",
      gcpReportSignedUrl: gcpReportSignedUrl
        ? `${gcpReportSignedUrl.slice(0, 60)}...`
        : "NOT PROVIDED",
    });

    // Idempotency: the worker retries this callback on transient failures, so a
    // single scan result can arrive more than once. Claim the eventId up front;
    // if it's already claimed, this is a duplicate — ack and skip the
    // non-idempotent work (emails, PDF render). Credit refund is independently
    // guarded, but emails would otherwise re-fire. We release the claim if
    // processing fails below so a genuine retry can re-run.
    // (Consider a Firestore TTL policy on `expiresAt` to GC this collection.)
    const eventRef =
      eventId != null
        ? firestore.collection("processedWebhookEvents").doc(String(eventId))
        : null;
    if (eventRef) {
      try {
        await eventRef.create({
          scanId,
          userId,
          status: status ?? null,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromMillis(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ),
        });
      } catch {
        // create() throws ALREADY_EXISTS when we've already handled this event.
        console.log(
          `↩️ Duplicate webhook event ${eventId} for scan ${scanId} — skipping.`,
        );
        return NextResponse.json({ success: true, deduped: true });
      }
    }

    // Update per-user subcollection document for this scan (preferred)
    const userScanRef = firestore
      .collection("users")
      .doc(userId)
      .collection("completedScans")
      .doc(scanId);

    try {
      const now = admin.firestore.Timestamp.now();

      // Normalize fields and support alternate worker payloads (gcsPath, summary, 'done')
      const normalizedStatus =
        (status === "done" ? "completed" : status) || "completed";
      const normalizedSummary = resultsSummary || summary || null;

      // If the worker sent raw output inline, upload it to Firebase Storage so
      // the existing gs:// → signed URL flow has something to point at.
      let uploadedStdoutGcsUrl: string | null = null;
      let uploadedXmlGcsUrl: string | null = null;
      if (
        normalizedStatus === "completed" &&
        typeof rawStdout === "string" &&
        rawStdout.length > 0
      ) {
        uploadedStdoutGcsUrl = await uploadRawToStorage(
          scanId,
          "output.txt",
          rawStdout,
          "text/plain; charset=utf-8",
        );
      }
      if (
        normalizedStatus === "completed" &&
        typeof rawXml === "string" &&
        rawXml.length > 0
      ) {
        uploadedXmlGcsUrl = await uploadRawToStorage(
          scanId,
          "output.xml",
          rawXml,
          "application/xml; charset=utf-8",
        );
      }
      let uploadedJsonGcsUrl: string | null = null;
      if (
        normalizedStatus === "completed" &&
        typeof rawJson === "string" &&
        rawJson.length > 0
      ) {
        uploadedJsonGcsUrl = await uploadRawToStorage(
          scanId,
          "output.json",
          rawJson,
          "application/json; charset=utf-8",
        );
      }

      const normalizedGcsUrl =
        gcpStorageUrl || gcsPath || uploadedStdoutGcsUrl || null;

      // Generate signed URLs if GCS URL provided but signed URL missing
      let normalizedSignedUrl = gcpSignedUrl || null;
      let normalizedSignedUrlExpires = gcpSignedUrlExpires || null;

      if (normalizedGcsUrl && !normalizedSignedUrl) {
        console.log("🔗 Generating signed URL for:", normalizedGcsUrl);
        normalizedSignedUrl = await generateSignedUrl(normalizedGcsUrl);
        if (normalizedSignedUrl) {
          normalizedSignedUrlExpires = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
        }
      }

      // Handle XML results
      const normalizedXmlUrl = gcpXmlStorageUrl || uploadedXmlGcsUrl || null;
      let normalizedXmlSignedUrl = gcpXmlSignedUrl || null;
      let normalizedXmlSignedUrlExpires = gcpXmlSignedUrlExpires || null;

      if (normalizedXmlUrl && !normalizedXmlSignedUrl) {
        console.log("🔗 Generating signed URL for XML:", normalizedXmlUrl);
        normalizedXmlSignedUrl = await generateSignedUrl(normalizedXmlUrl);
        if (normalizedXmlSignedUrl) {
          normalizedXmlSignedUrlExpires = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
        }
      }

      // Handle JSON results (nuclei -jsonl / zap -J)
      const normalizedJsonUrl = gcpJsonStorageUrl || uploadedJsonGcsUrl || null;
      let normalizedJsonSignedUrl = gcpJsonSignedUrl || null;
      let normalizedJsonSignedUrlExpires = gcpJsonSignedUrlExpires || null;
      if (normalizedJsonUrl && !normalizedJsonSignedUrl) {
        normalizedJsonSignedUrl = await generateSignedUrl(normalizedJsonUrl);
        if (normalizedJsonSignedUrl) {
          normalizedJsonSignedUrlExpires = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
        }
      }

      const normalizedReportUrl = gcpReportStorageUrl || null;
      let normalizedReportSignedUrl = gcpReportSignedUrl || null;
      let normalizedReportSignedUrlExpires = gcpReportSignedUrlExpires || null;

      if (normalizedReportUrl && !normalizedReportSignedUrl) {
        console.log(
          "🔗 Generating signed URL for report:",
          normalizedReportUrl,
        );
        normalizedReportSignedUrl =
          await generateSignedUrl(normalizedReportUrl);
        if (normalizedReportSignedUrl) {
          normalizedReportSignedUrlExpires = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
        }
      }

      // Persist the worker's full structured output INLINE on the scan doc so
      // the report engine can parse findings without a Storage bucket (the
      // Spark plan has none, so every gcp*StorageUrl above is null). Each parser
      // wants its scanner's structured format — nmap→XML, zap→JSON,
      // nuclei→JSONL(stdout) — so we keep all three. Capped to stay under
      // Firestore's 1MB per-document limit; rawTruncated flags an overflow.
      const INLINE_RAW_CAP = 700_000;
      const capRaw = (v: unknown): string | null =>
        typeof v === "string" && v.length > 0
          ? v.slice(0, INLINE_RAW_CAP)
          : null;
      const inlineStdout = capRaw(rawStdout);
      const inlineXml = capRaw(rawXml);
      const inlineJson = capRaw(rawJson);
      const rawTruncatedInline =
        (typeof rawStdout === "string" && rawStdout.length > INLINE_RAW_CAP) ||
        (typeof rawXml === "string" && rawXml.length > INLINE_RAW_CAP) ||
        (typeof rawJson === "string" && rawJson.length > INLINE_RAW_CAP);

      // Merge the update into the user's scan doc (create if missing)
      await userScanRef.set(
        {
          status: normalizedStatus,
          endTime: now,
          resultsSummary: normalizedSummary,
          // Full structured output stored inline — the report engine + raw
          // download read these first; Storage URLs are null on the Spark plan.
          rawStdout: inlineStdout,
          rawXml: inlineXml,
          rawJson: inlineJson,
          rawTruncated: rawTruncatedInline,
          gcpStorageUrl: normalizedGcsUrl,
          // store worker-provided signed urls and their expiry if present
          gcpSignedUrl: normalizedSignedUrl,
          gcpSignedUrlExpires: normalizedSignedUrlExpires,
          // XML results
          gcpXmlStorageUrl: normalizedXmlUrl,
          gcpXmlSignedUrl: normalizedXmlSignedUrl,
          gcpXmlSignedUrlExpires: normalizedXmlSignedUrlExpires,
          // JSON results (nuclei -jsonl / zap -J)
          gcpJsonStorageUrl: normalizedJsonUrl,
          gcpJsonSignedUrl: normalizedJsonSignedUrl,
          gcpJsonSignedUrlExpires: normalizedJsonSignedUrlExpires,
          // PDF reports
          gcpReportStorageUrl: normalizedReportUrl,
          gcpReportSignedUrl: normalizedReportSignedUrl,
          gcpReportSignedUrlExpires: normalizedReportSignedUrlExpires,
          errorMessage: errorMessage || null,
          // scanner metadata for usage/billing
          scannerType: scannerType || null,
          billingUnits: typeof billingUnits === "number" ? billingUnits : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Scans live solely under the user (users/{uid}/completedScans) — no
      // global mirror to keep in sync.

      // Reconcile the reserved credit. A scan reserves one credit at creation
      // (scanCredits -1). If it did NOT complete, return that credit exactly
      // once. Completed scans keep the credit spent. The scan doc's status was
      // already written above, so markFailed=false (refund only).
      if (normalizedStatus !== "completed") {
        try {
          const outcome = await failScanAndRefund(admin, firestore, {
            userId,
            scanId,
            reason: errorMessage || "scan failed",
            markFailed: false,
          });
          console.log(`💸 Credit settlement for ${scanId}: ${outcome}`);
        } catch (err: any) {
          console.error("Failed to settle scan credit on webhook:", err);
        }
      }

      // ── Notify the user by email (best-effort; never fails the webhook) ────
      try {
        const userRecord = await admin
          .auth()
          .getUser(userId)
          .catch(() => null);
        const toEmail = userRecord?.email;
        if (toEmail) {
          const freshScan = (await userScanRef.get()).data() as any;
          const sType = (freshScan?.scannerType ||
            freshScan?.type ||
            scannerType ||
            "nmap") as string;
          const target =
            freshScan?.target || freshScan?.targetValue || "your target";

          if (normalizedStatus === "completed") {
            const pdf = await buildScanPdfFromDoc(admin, freshScan, scanId);
            await sendScanCompleteEmail({
              to: toEmail,
              scannerType: sType,
              target,
              summaryLine: scanSummaryLine(freshScan?.resultsSummary),
              pdf,
              filename: scanPdfFilename(freshScan, scanId),
            });
          } else if (normalizedStatus === "failed") {
            await sendScanFailedEmail({
              to: toEmail,
              scannerType: sType,
              target,
              errorMessage: errorMessage || freshScan?.errorMessage,
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to send scan notification email:", err);
      }

      console.log(`✅ Updated scan ${scanId} status to ${status}`);
    } catch (err: any) {
      console.error(
        "Failed to update per-user scan doc or global scan doc:",
        err,
      );
      // Processing failed — release the idempotency claim so the worker's retry
      // (which returns a 5xx-triggered re-POST) can re-run instead of being
      // deduped into a no-op.
      if (eventRef) {
        await eventRef
          .delete()
          .catch((e: any) =>
            console.error("Failed to release webhook event claim:", e),
          );
      }
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
    console.error("❌ Error processing scan webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
