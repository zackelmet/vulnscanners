// GET /api/scans/[scanId]/report
// Fetches scan data from Firestore, parses nmap output, generates a branded PDF
// and streams it as a direct download. Requires a valid Firebase user token.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { renderScanReport } from "@/lib/report-engine/pdf-renderer";
import { ScannerType } from "@/lib/report-engine/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } },
) {
  try {
    const admin = initializeAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { scanId } = params;
    const userId = decoded.uid;

    // ── Fetch scan record ─────────────────────────────────────────────────
    // Try user subcollection first (preferred), fall back to global scans collection
    let scanDoc = await firestore
      .collection("users")
      .doc(userId)
      .collection("completedScans")
      .doc(scanId)
      .get();

    if (!scanDoc.exists) {
      scanDoc = await firestore.collection("scans").doc(scanId).get();
      if (!scanDoc.exists) {
        return NextResponse.json({ error: "Scan not found" }, { status: 404 });
      }
      // Ensure the scan belongs to this user
      const globalData = scanDoc.data() as any;
      if (globalData?.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const scan = scanDoc.data() as any;

    if (scan.status !== "completed") {
      return NextResponse.json(
        { error: "Scan is not yet completed" },
        { status: 409 },
      );
    }

    const scannerType = (scan.scannerType ||
      scan.type ||
      "nmap") as ScannerType;

    if (
      scannerType !== "nmap" &&
      scannerType !== "nuclei" &&
      scannerType !== "zap"
    ) {
      return NextResponse.json(
        { error: `Unsupported scanner type: ${scannerType}` },
        { status: 422 },
      );
    }

    // ── Extract raw scanner output ────────────────────────────────────────
    // Preferred source: full output uploaded to Storage by the webhook
    // (gcpStorageUrl as gs://bucket/path). Fall back to the inline preview
    // for older scans that predate the Storage upload path.
    const downloadGcs = async (gsUrl: string | null): Promise<string> => {
      if (!gsUrl) return "";
      const match = gsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
      if (!match) return "";
      try {
        const [, bucketName, filePath] = match;
        const [buf] = await admin
          .storage()
          .bucket(bucketName)
          .file(filePath)
          .download();
        return buf.toString("utf-8");
      } catch (err) {
        console.error(`Failed to download scan artifact ${gsUrl}:`, err);
        return "";
      }
    };

    // Prefer the STRUCTURED artifact for this scanner — XML for nmap, JSON for
    // zap, JSONL stdout for nuclei — so parsers read lossless machine output
    // instead of scraping the human-readable text. The parsers auto-detect the
    // format, so legacy text scans still render via the fallback chain.
    const primaryUrl: string | null =
      scannerType === "nmap"
        ? scan.gcpXmlStorageUrl || scan.gcpStorageUrl || null
        : scannerType === "zap"
          ? scan.gcpJsonStorageUrl || scan.gcpStorageUrl || null
          : scan.gcpStorageUrl || null; // nuclei stdout is JSONL

    let rawOutput = await downloadGcs(primaryUrl);

    // Fall back to the stdout artifact, then the inline (truncated) preview.
    if (!rawOutput && primaryUrl !== scan.gcpStorageUrl) {
      rawOutput = await downloadGcs(scan.gcpStorageUrl || null);
    }
    if (!rawOutput) {
      rawOutput =
        scan.resultsSummary?.rawPreview ||
        scan.rawPayload?.stdout ||
        scan.rawOutput ||
        "";
      if (rawOutput) {
        console.warn(
          `[report] scan ${scanId} (${scannerType}) built from inline preview/truncated output — full artifact unavailable; findings may be incomplete.`,
        );
      }
    }

    // An empty rawOutput is legitimate — a completed scan that found nothing
    // is still a valid deliverable. The template renders a "no findings" PDF
    // gracefully for every section. Only the absence of the Firestore record
    // itself (handled earlier) is a hard error.

    const target: string = scan.target || scan.targetValue || "Unknown target";

    // ── Render branded PDF via @react-pdf/renderer ───────────────────────
    const startedAt =
      scan.startTime?.toDate?.() ??
      (scan.startTime ? new Date(scan.startTime) : new Date());
    const completedAt =
      scan.endTime?.toDate?.() ??
      (scan.endTime ? new Date(scan.endTime) : new Date());
    const command =
      scan.rawPayload?.cmd || scan.resultsSummary?.command || null;

    const pdfBuffer = await renderScanReport({
      scanId,
      scannerType,
      target,
      rawOutput,
      startedAt,
      completedAt,
      command,
    });
    const pdfBytes = new Uint8Array(pdfBuffer);

    // ── Return as download ────────────────────────────────────────────────
    const safeTarget = target
      .replace(/[^a-z0-9.-]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    const filename = `vulnscanners-${scannerType}-${safeTarget}-${scanId.slice(0, 8)}.pdf`;

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err: any) {
    console.error("Report generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
