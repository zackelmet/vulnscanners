import crypto from "crypto";

/** Canonical scan types accepted by the webhook. */
export const VALID_SCAN_TYPES = ["nmap", "nuclei", "zap"] as const;
export type WebhookScanType = (typeof VALID_SCAN_TYPES)[number];

/** Canonical status values accepted by the webhook. */
export const VALID_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "canceled",
  "timeout",
] as const;
export type WebhookStatus = (typeof VALID_STATUSES)[number];

/** Aliases for non-canonical status strings sent by legacy workers. */
const STATUS_ALIASES: Record<string, WebhookStatus> = {
  done: "completed",
  cancelled: "canceled", // British spelling → canonical
  in_progress: "running",
};

/** Normalizes a timestamp value to a Date, accepting ISO string or epoch ms. */
export function normalizeTimestamp(ts: unknown): Date | null {
  if (typeof ts === "number" && ts > 0) return new Date(ts);
  if (typeof ts === "string" && ts.length > 0) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Fields that are part of the canonical / known-legacy schema. */
const KNOWN_FIELDS = new Set([
  "scanId",
  "userId",
  "scanType",
  "scannerType", // legacy alias
  "status",
  "startedAt",
  "completedAt",
  "durationSec",
  "resultUrl",
  "resultPath",
  "gcpStorageUrl", // legacy alias for resultUrl
  "gcsPath", // legacy alias for resultPath
  "gcpSignedUrl",
  "gcpSignedUrlExpires",
  "gcpXmlStorageUrl",
  "gcpXmlSignedUrl",
  "gcpXmlSignedUrlExpires",
  "gcpReportStorageUrl",
  "gcpReportSignedUrl",
  "gcpReportSignedUrlExpires",
  "summary",
  "resultsSummary", // legacy alias for summary
  "error",
  "errorMessage", // legacy alias for error
  "eventId",
  "billingUnits",
  "scannerVersion",
  "engineVersion",
]);

/** The fully normalized, validated payload used by the webhook handler. */
export interface NormalizedWebhookPayload {
  scanId: string;
  userId: string;
  scanType: WebhookScanType;
  status: WebhookStatus;
  startedAt: Date;
  completedAt: Date;
  durationSec: number;
  resultUrl: string | null;
  resultPath: string | null;
  summary: Record<string, unknown> | null;
  error: string | null;
  eventId: string;
  /** Extra fields not in the canonical schema — stored for forward compatibility. */
  rawPayload: Record<string, unknown>;
}

export type ValidationResult =
  | { valid: true; payload: NormalizedWebhookPayload }
  | { valid: false; error: string };

/**
 * Generates a deterministic eventId by SHA-256 hashing the stable subset of the
 * payload (scanId + userId + status + raw startedAt + raw completedAt).
 */
export function generateEventId(body: Record<string, unknown>): string {
  const key = JSON.stringify({
    scanId: body.scanId,
    userId: body.userId,
    status: body.status,
    startedAt: body.startedAt,
    completedAt: body.completedAt,
  });
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Validates and normalizes an incoming webhook payload.
 *
 * Strict on required fields and enum values; permissive on extra/unknown fields
 * (which are collected into `rawPayload` for forward compatibility).
 */
export function validateWebhookPayload(
  body: Record<string, unknown>,
): ValidationResult {
  // scanId
  if (typeof body.scanId !== "string" || !body.scanId.trim()) {
    return {
      valid: false,
      error: "Missing or invalid required field: scanId (string)",
    };
  }

  // userId
  if (typeof body.userId !== "string" || !body.userId.trim()) {
    return {
      valid: false,
      error: "Missing or invalid required field: userId (string)",
    };
  }

  // scanType — accept canonical "scanType" or legacy "scannerType"
  const rawScanType = body.scanType ?? body.scannerType;
  if (!VALID_SCAN_TYPES.includes(rawScanType as WebhookScanType)) {
    return {
      valid: false,
      error: `Invalid scanType: must be one of ${VALID_SCAN_TYPES.join(", ")}`,
    };
  }
  const scanType = rawScanType as WebhookScanType;

  // status — normalize aliases
  const rawStatus = body.status as string;
  const normalizedStatus: WebhookStatus | undefined =
    STATUS_ALIASES[rawStatus] ??
    (VALID_STATUSES.includes(rawStatus as WebhookStatus)
      ? (rawStatus as WebhookStatus)
      : undefined);
  if (!normalizedStatus) {
    return {
      valid: false,
      error: `Invalid status: must be one of ${VALID_STATUSES.join(", ")}`,
    };
  }

  // startedAt
  const startedAt = normalizeTimestamp(body.startedAt);
  if (!startedAt) {
    return {
      valid: false,
      error:
        "Missing or invalid required field: startedAt (ISO string or epoch ms)",
    };
  }

  // completedAt
  const completedAt = normalizeTimestamp(body.completedAt);
  if (!completedAt) {
    return {
      valid: false,
      error:
        "Missing or invalid required field: completedAt (ISO string or epoch ms)",
    };
  }

  // durationSec
  if (
    typeof body.durationSec !== "number" ||
    isNaN(body.durationSec) ||
    body.durationSec < 0
  ) {
    return {
      valid: false,
      error:
        "Missing or invalid required field: durationSec (non-negative number)",
    };
  }

  // resultUrl / resultPath — accept canonical names and legacy aliases
  const resultUrl =
    (typeof body.resultUrl === "string" && body.resultUrl) ||
    (typeof body.gcpStorageUrl === "string" && body.gcpStorageUrl) ||
    null;
  const resultPath =
    (typeof body.resultPath === "string" && body.resultPath) ||
    (typeof body.gcsPath === "string" && body.gcsPath) ||
    null;

  if (!resultUrl && !resultPath) {
    return {
      valid: false,
      error:
        "Missing required field: resultUrl (string URL) or resultPath (string)",
    };
  }

  // error — required when status == "failed"
  const errorField =
    (typeof body.error === "string" && body.error) ||
    (typeof body.errorMessage === "string" && body.errorMessage) ||
    null;
  if (normalizedStatus === "failed" && !errorField) {
    return {
      valid: false,
      error: 'Field "error" (string) is required when status is "failed"',
    };
  }

  // summary — accept canonical "summary" or legacy "resultsSummary"
  const summary =
    (body.summary as Record<string, unknown> | null | undefined) ??
    (body.resultsSummary as Record<string, unknown> | null | undefined) ??
    null;

  // eventId — use provided value or generate deterministic hash
  const eventId =
    typeof body.eventId === "string" && body.eventId.trim()
      ? body.eventId.trim()
      : generateEventId(body);

  // Collect extra unknown fields into rawPayload
  const rawPayload: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (!KNOWN_FIELDS.has(key)) {
      rawPayload[key] = body[key];
    }
  }

  return {
    valid: true,
    payload: {
      scanId: body.scanId as string,
      userId: body.userId as string,
      scanType,
      status: normalizedStatus,
      startedAt,
      completedAt,
      durationSec: body.durationSec as number,
      resultUrl,
      resultPath,
      summary,
      error: errorField,
      eventId,
      rawPayload,
    },
  };
}
