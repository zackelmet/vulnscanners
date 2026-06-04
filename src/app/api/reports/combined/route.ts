// POST /api/reports/combined
// Body: { scanIds: string[] }
// Builds ONE branded PDF consolidating the selected completed scans
// (cover + aggregate executive summary + a detailed section per scan) and
// streams it as a download. Generated on demand — nothing is persisted.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import {
  renderCombinedReport,
  CombinedScanArgs,
} from "@/lib/report-engine/pdf-renderer";
import { ScannerType } from "@/lib/report-engine/types";

export const runtime = "nodejs";

const MAX_SCANS = 25;

export async function POST(request: NextRequest) {
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
    const userId = decoded.uid;

    // ── Validate input ────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const scanIds: string[] = Array.isArray(body?.scanIds) ? body.scanIds : [];
    if (scanIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one scan to include." },
        { status: 400 },
      );
    }
    if (scanIds.length > MAX_SCANS) {
      return NextResponse.json(
        { error: `A combined report can include at most ${MAX_SCANS} scans.` },
        { status: 400 },
      );
    }

    // ── Fetch each scan (per-user) ──────────────────────────────────────────
    const completedScans = firestore
      .collection("users")
      .doc(userId)
      .collection("completedScans");

    const docs = await Promise.all(
      scanIds.map((id) => completedScans.doc(id).get()),
    );

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

    const scanArgs: CombinedScanArgs[] = [];
    const skipped: string[] = [];

    for (const doc of docs) {
      if (!doc.exists) {
        skipped.push(doc.id);
        continue;
      }
      const scan = doc.data() as any;
      if (scan.status !== "completed") {
        skipped.push(doc.id);
        continue;
      }
      const scannerType = (scan.scannerType ||
        scan.type ||
        "nmap") as ScannerType;
      if (!["nmap", "nuclei", "zap"].includes(scannerType)) {
        skipped.push(doc.id);
        continue;
      }

      // Prefer the structured artifact, then stdout, then inline preview.
      const primaryUrl: string | null =
        scannerType === "nmap"
          ? scan.gcpXmlStorageUrl || scan.gcpStorageUrl || null
          : scannerType === "zap"
            ? scan.gcpJsonStorageUrl || scan.gcpStorageUrl || null
            : scan.gcpStorageUrl || null;

      let rawOutput = await downloadGcs(primaryUrl);
      if (!rawOutput && primaryUrl !== scan.gcpStorageUrl) {
        rawOutput = await downloadGcs(scan.gcpStorageUrl || null);
      }
      if (!rawOutput) {
        rawOutput =
          scan.resultsSummary?.rawPreview ||
          scan.rawPayload?.stdout ||
          scan.rawOutput ||
          "";
      }

      const startedAt =
        scan.startTime?.toDate?.() ??
        (scan.startTime ? new Date(scan.startTime) : new Date());
      const completedAt =
        scan.endTime?.toDate?.() ??
        (scan.endTime ? new Date(scan.endTime) : new Date());

      scanArgs.push({
        scanId: doc.id,
        scannerType,
        target: scan.target || scan.targetValue || "Unknown target",
        rawOutput,
        startedAt,
        completedAt,
        command: scan.rawPayload?.cmd || scan.resultsSummary?.command || null,
      });
    }

    if (scanArgs.length === 0) {
      return NextResponse.json(
        {
          error:
            "None of the selected scans are available (must be completed and owned by you).",
        },
        { status: 404 },
      );
    }

    // ── Render combined PDF ──────────────────────────────────────────────────
    const pdfBuffer = await renderCombinedReport({
      generatedAt: new Date(),
      scans: scanArgs,
    });
    const pdfBytes = new Uint8Array(pdfBuffer);

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `vulnscanners-combined-report-${scanArgs.length}-scans-${stamp}.pdf`;

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
        ...(skipped.length
          ? { "X-Skipped-Scans": String(skipped.length) }
          : {}),
      },
    });
  } catch (err: any) {
    console.error("Combined report generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
