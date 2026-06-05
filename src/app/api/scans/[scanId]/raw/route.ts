// GET /api/scans/[scanId]/raw
// Streams the raw scanner output for a scan as a downloadable file.
// Prefers the full artifact uploaded to Storage by the worker; falls back to
// the inline (truncated) preview stored on the Firestore doc so the Result
// Files action is never empty for a completed scan.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { ScannerType } from "@/lib/report-engine/types";

export const runtime = "nodejs";

// File extension for the structured artifact each scanner produces.
const EXT: Record<ScannerType, string> = {
  nmap: "xml",
  nuclei: "jsonl",
  zap: "json",
};

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

    // ── Fetch scan record (per-user) ──────────────────────────────────────
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
    const scannerType = (scan.scannerType ||
      scan.type ||
      "nmap") as ScannerType;

    // ── Resolve raw output ────────────────────────────────────────────────
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
        console.error(`Failed to download raw artifact ${gsUrl}:`, err);
        return "";
      }
    };

    let ext = EXT[scannerType] || "txt";
    let truncated = false;

    // Prefer the full structured artifact stored inline on the doc — the
    // reliable source on the Spark plan (no Storage bucket).
    const inlineStructured: string | null =
      scannerType === "nmap"
        ? scan.rawXml || null
        : scannerType === "zap"
          ? scan.rawJson || null
          : scan.rawStdout || null; // nuclei stdout is JSONL

    let raw = "";
    if (typeof inlineStructured === "string" && inlineStructured.length > 0) {
      raw = inlineStructured;
    } else {
      // Fall back to Storage (null without a bucket), then stdout.
      const structuredUrl: string | null =
        scannerType === "nmap"
          ? scan.gcpXmlStorageUrl || null
          : scannerType === "zap"
            ? scan.gcpJsonStorageUrl || null
            : scan.gcpStorageUrl || null;

      raw = await downloadGcs(structuredUrl);
      if (!raw && structuredUrl !== scan.gcpStorageUrl) {
        raw = await downloadGcs(scan.gcpStorageUrl || null);
        if (raw)
          ext = scannerType === "nmap" ? "txt" : EXT[scannerType] || "txt";
      }

      // Last resort: the inline (truncated) preview. Mark it for the user.
      if (!raw) {
        raw =
          scan.resultsSummary?.rawPreview ||
          scan.rawPayload?.stdout ||
          scan.rawOutput ||
          "";
        ext = "txt";
        truncated = true;
      }
    }

    // The webhook caps inline output at Firestore's doc limit; flag if it did.
    if (scan.rawTruncated) truncated = true;

    if (!raw) {
      return NextResponse.json(
        { error: "No raw output is available for this scan." },
        { status: 404 },
      );
    }

    const body = truncated
      ? `# NOTE: This is a truncated preview of the scanner output.\n` +
        `# The full artifact was not stored for this scan.\n\n${raw}`
      : raw;

    const target: string = scan.target || scan.targetValue || "scan";
    const safeTarget = target
      .replace(/[^a-z0-9.-]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    const filename = `${scannerType}-${safeTarget}-${scanId.slice(0, 8)}.${ext}`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err: any) {
    console.error("Raw output fetch failed:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
