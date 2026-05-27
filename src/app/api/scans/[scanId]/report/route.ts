// GET /api/scans/[scanId]/report
// Fetches scan data from Firestore, parses nmap output, generates a branded PDF
// and streams it as a direct download. Requires a valid Firebase user token.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { parseNmapOutput } from "@/lib/report-engine/nmap-parser";
import { parseNucleiOutput } from "@/lib/report-engine/nuclei-parser";
import { parseZapOutput } from "@/lib/report-engine/zap-parser";
import {
  generateNmapPdf,
  generateNucleiPdf,
  generateZapPdf,
} from "@/lib/report-engine/pdf-generator";
import { ScanReportPayload, ScannerType } from "@/lib/report-engine/types";

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
    let rawOutput = "";
    const gcsUrl: string | null = scan.gcpStorageUrl || null;
    if (gcsUrl) {
      const match = gcsUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (match) {
        try {
          const [, bucketName, filePath] = match;
          const [buf] = await admin
            .storage()
            .bucket(bucketName)
            .file(filePath)
            .download();
          rawOutput = buf.toString("utf-8");
        } catch (err) {
          console.error(
            `Failed to download full scan output from ${gcsUrl}, falling back to preview:`,
            err,
          );
        }
      }
    }

    if (!rawOutput) {
      rawOutput =
        scan.resultsSummary?.rawPreview ||
        scan.rawPayload?.stdout ||
        scan.rawOutput ||
        "";
    }

    if (!rawOutput) {
      return NextResponse.json(
        {
          error:
            "Raw scan output not available for this scan. " +
            "Older scans may not have stored the full output.",
        },
        { status: 422 },
      );
    }

    const target: string = scan.target || scan.targetValue || "Unknown target";

    // ── Parse & generate PDF (dispatch by scanner type) ───────────────────
    const parsedData =
      scannerType === "nmap"
        ? parseNmapOutput(rawOutput)
        : scannerType === "nuclei"
          ? parseNucleiOutput(rawOutput)
          : parseZapOutput(rawOutput);

    const payload: ScanReportPayload = {
      reportId: `${scanId}-report`,
      scanId,
      scannerType,
      target,
      userId,
      generatedAt:
        new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
      parsedData,
      rawOutput,
    };

    const pdfBytes =
      scannerType === "nmap"
        ? await generateNmapPdf(payload)
        : scannerType === "nuclei"
          ? await generateNucleiPdf(payload)
          : await generateZapPdf(payload);

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
