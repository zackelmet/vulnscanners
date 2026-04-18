/**
 * Tests for the webhook payload validation helper.
 * These tests exercise the pure validation logic without any HTTP or Firestore
 * calls.
 */

import {
  validateWebhookPayload,
  normalizeTimestamp,
  generateEventId,
  VALID_SCAN_TYPES,
  VALID_STATUSES,
} from "../lib/scans/webhookValidation";

// ---------------------------------------------------------------------------
// Helper: minimal valid payload
// ---------------------------------------------------------------------------
const BASE_PAYLOAD: Record<string, unknown> = {
  scanId: "scan-abc123",
  userId: "user-xyz",
  scanType: "nmap",
  status: "completed",
  startedAt: "2025-01-01T00:00:00.000Z",
  completedAt: "2025-01-01T00:05:00.000Z",
  durationSec: 300,
  resultUrl: "https://storage.example.com/results/scan-abc123.json",
};

// ---------------------------------------------------------------------------
// normalizeTimestamp
// ---------------------------------------------------------------------------
describe("normalizeTimestamp", () => {
  it("parses an ISO 8601 string", () => {
    const d = normalizeTimestamp("2025-01-01T00:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2025);
  });

  it("parses epoch milliseconds as a number", () => {
    const ms = 1_735_689_600_000; // 2025-01-01
    const d = normalizeTimestamp(ms);
    expect(d).toBeInstanceOf(Date);
    expect(d!.getTime()).toBe(ms);
  });

  it("returns null for invalid string", () => {
    expect(normalizeTimestamp("not-a-date")).toBeNull();
  });

  it("returns null for zero/negative number", () => {
    expect(normalizeTimestamp(0)).toBeNull();
    expect(normalizeTimestamp(-1)).toBeNull();
  });

  it("returns null for non-string non-number types", () => {
    expect(normalizeTimestamp(null)).toBeNull();
    expect(normalizeTimestamp(undefined)).toBeNull();
    expect(normalizeTimestamp({})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateEventId
// ---------------------------------------------------------------------------
describe("generateEventId", () => {
  it("returns a 64-char hex string", () => {
    const id = generateEventId(BASE_PAYLOAD);
    expect(typeof id).toBe("string");
    expect(id).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });

  it("is deterministic for the same payload", () => {
    expect(generateEventId(BASE_PAYLOAD)).toBe(generateEventId(BASE_PAYLOAD));
  });

  it("changes when scanId changes", () => {
    const other = { ...BASE_PAYLOAD, scanId: "scan-different" };
    expect(generateEventId(BASE_PAYLOAD)).not.toBe(generateEventId(other));
  });
});

// ---------------------------------------------------------------------------
// validateWebhookPayload — valid cases
// ---------------------------------------------------------------------------
describe("validateWebhookPayload — valid payloads", () => {
  it("accepts a minimal valid payload", () => {
    const result = validateWebhookPayload({ ...BASE_PAYLOAD });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.scanId).toBe("scan-abc123");
    expect(result.payload.status).toBe("completed");
    expect(result.payload.scanType).toBe("nmap");
    expect(result.payload.startedAt).toBeInstanceOf(Date);
    expect(result.payload.completedAt).toBeInstanceOf(Date);
    expect(result.payload.durationSec).toBe(300);
    expect(result.payload.resultUrl).toBe(
      "https://storage.example.com/results/scan-abc123.json",
    );
    expect(result.payload.resultPath).toBeNull();
    expect(result.payload.error).toBeNull();
  });

  it("accepts resultPath instead of resultUrl", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).resultUrl;
    payload.resultPath = "scans/scan-abc123/results.json";
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.resultPath).toBe("scans/scan-abc123/results.json");
    expect(result.payload.resultUrl).toBeNull();
  });

  it("accepts legacy gcpStorageUrl as resultUrl alias", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).resultUrl;
    payload.gcpStorageUrl = "gs://bucket/scan-abc123.json";
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.resultUrl).toBe("gs://bucket/scan-abc123.json");
  });

  it("accepts legacy gcsPath as resultPath alias", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).resultUrl;
    payload.gcsPath = "scans/path/results.json";
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.resultPath).toBe("scans/path/results.json");
  });

  it("accepts legacy scannerType as scanType alias", () => {
    const payload: Record<string, unknown> = { ...BASE_PAYLOAD };
    delete (payload as any).scanType;
    payload.scannerType = "nuclei";
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.scanType).toBe("nuclei");
  });

  it("normalizes 'done' status to 'completed'", () => {
    const result = validateWebhookPayload({ ...BASE_PAYLOAD, status: "done" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.status).toBe("completed");
  });

  it("normalizes 'cancelled' (British) to 'canceled'", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      status: "cancelled",
      resultUrl: "https://example.com/r.json",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.status).toBe("canceled");
  });

  it("accepts all canonical scan types", () => {
    for (const scanType of VALID_SCAN_TYPES) {
      const result = validateWebhookPayload({ ...BASE_PAYLOAD, scanType });
      expect(result.valid).toBe(true);
    }
  });

  it("accepts all canonical statuses (non-failed)", () => {
    const nonFailed = VALID_STATUSES.filter((s) => s !== "failed");
    for (const status of nonFailed) {
      const result = validateWebhookPayload({ ...BASE_PAYLOAD, status });
      expect(result.valid).toBe(true);
    }
  });

  it("accepts epoch ms for startedAt and completedAt", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      startedAt: 1_735_689_600_000,
      completedAt: 1_735_689_900_000,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.startedAt).toBeInstanceOf(Date);
    expect(result.payload.completedAt).toBeInstanceOf(Date);
  });

  it("uses provided eventId as-is", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      eventId: "my-custom-event-id",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.eventId).toBe("my-custom-event-id");
  });

  it("generates a deterministic eventId when none is provided", () => {
    const r1 = validateWebhookPayload({ ...BASE_PAYLOAD });
    const r2 = validateWebhookPayload({ ...BASE_PAYLOAD });
    expect(r1.valid).toBe(true);
    expect(r2.valid).toBe(true);
    if (!r1.valid || !r2.valid) return;
    expect(r1.payload.eventId).toBe(r2.payload.eventId);
    expect(r1.payload.eventId).toHaveLength(64);
  });

  it("collects unknown fields into rawPayload", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      customMetaField: "foo",
      anotherUnknown: 42,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.rawPayload).toEqual({
      customMetaField: "foo",
      anotherUnknown: 42,
    });
  });

  it("produces an empty rawPayload when no unknown fields are present", () => {
    const result = validateWebhookPayload({ ...BASE_PAYLOAD });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.rawPayload).toEqual({});
  });

  it("accepts failed status when error field is provided", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      status: "failed",
      error: "timeout connecting to target",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.error).toBe("timeout connecting to target");
  });

  it("accepts failed status when legacy errorMessage is provided", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      status: "failed",
      errorMessage: "connection refused",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.error).toBe("connection refused");
  });

  it("uses legacy resultsSummary as summary", () => {
    const payload = {
      ...BASE_PAYLOAD,
      resultsSummary: { critical: 1, high: 2 },
    };
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.payload.summary).toEqual({ critical: 1, high: 2 });
  });
});

// ---------------------------------------------------------------------------
// validateWebhookPayload — invalid cases
// ---------------------------------------------------------------------------
describe("validateWebhookPayload — invalid payloads", () => {
  it("rejects missing scanId", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).scanId;
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/scanId/);
  });

  it("rejects non-string scanId", () => {
    const result = validateWebhookPayload({ ...BASE_PAYLOAD, scanId: 123 });
    expect(result.valid).toBe(false);
  });

  it("rejects missing userId", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).userId;
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/userId/);
  });

  it("rejects invalid scanType", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      scanType: "nessus",
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/scanType/);
  });

  it("rejects invalid status", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      status: "unknown-status",
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/status/);
  });

  it("rejects missing startedAt", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).startedAt;
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/startedAt/);
  });

  it("rejects invalid startedAt string", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      startedAt: "not-a-date",
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/startedAt/);
  });

  it("rejects missing completedAt", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).completedAt;
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/completedAt/);
  });

  it("rejects missing durationSec", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).durationSec;
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/durationSec/);
  });

  it("rejects negative durationSec", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      durationSec: -5,
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/durationSec/);
  });

  it("rejects NaN durationSec", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      durationSec: NaN,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects when neither resultUrl nor resultPath is provided", () => {
    const payload = { ...BASE_PAYLOAD };
    delete (payload as any).resultUrl;
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/resultUrl/);
  });

  it("rejects status 'failed' when error is missing", () => {
    const result = validateWebhookPayload({
      ...BASE_PAYLOAD,
      status: "failed",
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/error/);
  });
});
