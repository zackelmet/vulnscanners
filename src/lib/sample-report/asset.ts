// The gated sample-report PDF, bundled as base64 so it ships with the
// serverless function regardless of file-tracing. Regenerate with the
// /api/sample-report-tmp dev harness, then base64 the PDF into pdf-base64.ts.
import { SAMPLE_REPORT_PDF_BASE64 } from "./pdf-base64";

export const SAMPLE_REPORT_FILENAME = "VulnScanners-Sample-Report.pdf";

let cached: Buffer | null = null;

export function getSampleReportPdf(): Buffer {
  if (!cached) {
    cached = Buffer.from(SAMPLE_REPORT_PDF_BASE64, "base64");
  }
  return cached;
}
