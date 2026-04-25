// GET /api/scans/[scanId]/report
// Fetches scan data from Firestore, parses nmap output, generates a branded PDF
// and streams it as a direct download. Requires a valid Firebase user token.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { parseNmapOutput } from "@/lib/report-engine/nmap-parser";
import { generateNmapPdf } from "@/lib/report-engine/pdf-generator";
import { ScanReportPayload } from "@/lib/report-engine/types";

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

    const scannerType: string = scan.scannerType || scan.type || "nmap";

    if (scannerType !== "nmap") {
      return NextResponse.json(
        { error: "Report generation for this scanner type is coming soon." },
        { status: 422 },
      );
    }

    // ── Extract raw nmap output ───────────────────────────────────────────
    // The VPS worker stores it in rawPayload.stdout (via the webhook callback)
    const rawOutput: string =
      scan.resultsSummary?.rawPreview ||
      scan.rawPayload?.stdout ||
      scan.rawOutput ||
      "";

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

    // ── Parse & generate PDF ──────────────────────────────────────────────
    const parsedData = parseNmapOutput(rawOutput);

    const payload: ScanReportPayload = {
      reportId: `${scanId}-report`,
      scanId,
      scannerType: "nmap",
      target,
      userId,
      generatedAt:
        new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
      parsedData,
      rawOutput,
    };

    const pdfBytes = await generateNmapPdf(payload);

    // ── Return as download ────────────────────────────────────────────────
    const safeTarget = target
      .replace(/[^a-z0-9.-]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    const filename = `vulnscanners-nmap-${safeTarget}-${scanId.slice(0, 8)}.pdf`;

    return new NextResponse(pdfBytes, {
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
