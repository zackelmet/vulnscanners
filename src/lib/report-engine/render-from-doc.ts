// Build report PDFs directly from Firestore scan documents.
// Shared by the report download routes, the scan-completion webhook, and the
// report-email endpoint so artifact resolution + rendering live in one place.

import {
  renderScanReport,
  renderCombinedReport,
  CombinedScanArgs,
} from "./pdf-renderer";
import { ScannerType } from "./types";

// Download a gs:// object's text contents (empty string on any failure).
async function downloadGcs(admin: any, gsUrl: string | null): Promise<string> {
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
}

// Resolve the best available raw output for a scan, in priority order:
//   1. full structured artifact stored INLINE on the doc (the reliable source
//      on the Spark plan — nmap→XML, zap→JSON, nuclei→JSONL on stdout),
//   2. structured artifact downloaded from Storage (null without a bucket),
//   3. inline stdout / truncated preview as a last resort.
// Each parser expects its scanner's structured format; returning the wrong one
// silently yields an empty findings list (which reads as a clean scan).
export async function resolveRawOutput(
  admin: any,
  scan: any,
  scannerType: ScannerType,
): Promise<string> {
  // 1. Inline structured output (preferred — survives the no-Storage gap).
  const inlineStructured: string | null =
    scannerType === "nmap"
      ? scan.rawXml || null
      : scannerType === "zap"
        ? scan.rawJson || null
        : scan.rawStdout || null; // nuclei -jsonl writes JSONL to stdout
  if (typeof inlineStructured === "string" && inlineStructured.length > 0) {
    return inlineStructured;
  }

  // 2. Structured artifact from Storage (no-op while there is no bucket).
  const primaryUrl: string | null =
    scannerType === "nmap"
      ? scan.gcpXmlStorageUrl || scan.gcpStorageUrl || null
      : scannerType === "zap"
        ? scan.gcpJsonStorageUrl || scan.gcpStorageUrl || null
        : scan.gcpStorageUrl || null;

  let raw = await downloadGcs(admin, primaryUrl);
  if (!raw && primaryUrl !== scan.gcpStorageUrl) {
    raw = await downloadGcs(admin, scan.gcpStorageUrl || null);
  }

  // 3. Inline stdout / truncated preview. For zap/nuclei the parsers fall back
  // to their legacy text formats, so raw stdout still yields some findings.
  if (!raw) {
    raw =
      scan.rawStdout ||
      scan.resultsSummary?.rawPreview ||
      scan.rawPayload?.stdout ||
      scan.rawOutput ||
      "";
  }
  return raw;
}

function scanArgsFromDoc(
  scan: any,
  scanId: string,
  rawOutput: string,
): CombinedScanArgs {
  const scannerType = (scan.scannerType || scan.type || "nmap") as ScannerType;
  const startedAt =
    scan.startTime?.toDate?.() ??
    (scan.startTime ? new Date(scan.startTime) : new Date());
  const completedAt =
    scan.endTime?.toDate?.() ??
    (scan.endTime ? new Date(scan.endTime) : new Date());
  return {
    scanId,
    scannerType,
    target: scan.target || scan.targetValue || "Unknown target",
    rawOutput,
    startedAt,
    completedAt,
    command: scan.rawPayload?.cmd || scan.resultsSummary?.command || null,
  };
}

/** Render a single-scan branded PDF from its Firestore doc data. */
export async function buildScanPdfFromDoc(
  admin: any,
  scan: any,
  scanId: string,
): Promise<Buffer> {
  const scannerType = (scan.scannerType || scan.type || "nmap") as ScannerType;
  const rawOutput = await resolveRawOutput(admin, scan, scannerType);
  const args = scanArgsFromDoc(scan, scanId, rawOutput);
  return renderScanReport(args);
}

/** A filename like `nmap-example.com-1a2b3c4d.pdf` for a single scan. */
export function scanPdfFilename(scan: any, scanId: string): string {
  const scannerType = scan.scannerType || scan.type || "nmap";
  const target = scan.target || scan.targetValue || "scan";
  const safe = target
    .replace(/[^a-z0-9.-]/gi, "-")
    .toLowerCase()
    .slice(0, 40);
  return `vulnscanners-${scannerType}-${safe}-${scanId.slice(0, 8)}.pdf`;
}

export interface CombinedBuildResult {
  pdf: Buffer;
  included: number;
  skipped: string[];
}

/**
 * Build a combined PDF for a user across the given completed scan IDs.
 * Skips missing / non-completed / unsupported scans. Throws if none qualify.
 */
export async function buildCombinedPdfForUser(
  admin: any,
  firestore: any,
  userId: string,
  scanIds: string[],
): Promise<CombinedBuildResult> {
  const completedScans = firestore
    .collection("users")
    .doc(userId)
    .collection("completedScans");

  const docs = await Promise.all(
    scanIds.map((id) => completedScans.doc(id).get()),
  );

  const scanArgs: CombinedScanArgs[] = [];
  const skipped: string[] = [];

  for (const doc of docs) {
    if (!doc.exists) {
      skipped.push(doc.id);
      continue;
    }
    const scan = doc.data() as any;
    const scannerType = (scan.scannerType ||
      scan.type ||
      "nmap") as ScannerType;
    if (
      scan.status !== "completed" ||
      !["nmap", "nuclei", "zap"].includes(scannerType)
    ) {
      skipped.push(doc.id);
      continue;
    }
    const rawOutput = await resolveRawOutput(admin, scan, scannerType);
    scanArgs.push(scanArgsFromDoc(scan, doc.id, rawOutput));
  }

  if (scanArgs.length === 0) {
    throw new Error(
      "None of the selected scans are available (must be completed and owned by you).",
    );
  }

  const pdf = await renderCombinedReport({
    generatedAt: new Date(),
    scans: scanArgs,
  });
  return { pdf, included: scanArgs.length, skipped };
}
