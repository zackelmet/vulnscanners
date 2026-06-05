// GET /api/scans/[scanId]/report
// Fetches scan data from Firestore, parses nmap output, generates a branded PDF
// and streams it as a direct download. Requires a valid Firebase user token.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import {
  buildScanPdfFromDoc,
  scanPdfFilename,
} from "@/lib/report-engine/render-from-doc";
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
    // Scans live under the user: users/{uid}/completedScans/{scanId}.
    const scanDoc = await firestore
      .collection("users")
      .doc(userId)
      .collection("completedScans")
      .doc(scanId)
      .get();

    if (!scanDoc.exists) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
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

    // Render the branded PDF from the scan doc. buildScanPdfFromDoc resolves
    // the raw output (inline structured artifact → Storage → preview) and runs
    // the right parser/mapper — the single shared path the email PDF also uses,
    // so on-demand and emailed reports never diverge. An empty result is a
    // legitimate "no findings" report; the template renders it gracefully.
    const pdfBuffer = await buildScanPdfFromDoc(admin, scan, scanId);
    const pdfBytes = new Uint8Array(pdfBuffer);

    // ── Return as download ────────────────────────────────────────────────
    const filename = scanPdfFilename(scan, scanId);

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
