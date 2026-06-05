// Stub the PDF renderer so importing render-from-doc doesn't pull in the heavy
// (ESM, un-transformed) @react-pdf renderer — we only exercise resolveRawOutput.
jest.mock("../../../lib/report-engine/pdf-renderer", () => ({
  renderScanReport: jest.fn(),
  renderCombinedReport: jest.fn(),
}));

import { resolveRawOutput } from "@/lib/report-engine/render-from-doc";

// admin double — resolveRawOutput only touches admin.storage() on the Storage
// fallback path, which the inline cases never reach. Make it throw so any
// accidental Storage hit fails loudly.
const admin = {
  storage() {
    throw new Error("Storage should not be touched when inline output exists");
  },
};

describe("resolveRawOutput — inline structured output preference", () => {
  it("returns inline rawJson for zap (the -J report the parser needs)", async () => {
    const scan = {
      rawJson: '{"site":[{"alerts":[{"name":"X"}]}]}',
      rawStdout: "PASS: ... WARN-NEW: 1",
      gcpJsonStorageUrl: null,
    };
    const raw = await resolveRawOutput(admin, scan, "zap");
    expect(raw).toBe(scan.rawJson);
  });

  it("returns inline rawXml for nmap", async () => {
    const scan = { rawXml: "<nmaprun></nmaprun>", rawStdout: "Host is up" };
    const raw = await resolveRawOutput(admin, scan, "nmap");
    expect(raw).toBe(scan.rawXml);
  });

  it("returns inline rawStdout (JSONL) for nuclei", async () => {
    const scan = { rawStdout: '{"info":{"name":"x"}}\n{"info":{"name":"y"}}' };
    const raw = await resolveRawOutput(admin, scan, "nuclei");
    expect(raw).toBe(scan.rawStdout);
  });

  it("falls back to rawStdout when the structured artifact is absent (zap legacy)", async () => {
    const scan = {
      rawJson: null,
      gcpJsonStorageUrl: null,
      gcpStorageUrl: null,
      rawStdout: "WARN-NEW: 2  PASS: 50",
    };
    const raw = await resolveRawOutput(admin, scan, "zap");
    expect(raw).toBe(scan.rawStdout);
  });

  it("falls back to the truncated preview only as a last resort", async () => {
    const scan = {
      rawJson: null,
      rawStdout: null,
      gcpJsonStorageUrl: null,
      gcpStorageUrl: null,
      resultsSummary: { rawPreview: "preview text" },
    };
    const raw = await resolveRawOutput(admin, scan, "zap");
    expect(raw).toBe("preview text");
  });
});
