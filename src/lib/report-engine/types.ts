// ─── VulnScanners Report Engine — shared types ────────────────────────────────

export type ScannerType = "nmap" | "nuclei" | "zap";

// ── Nmap-specific parsed output ────────────────────────────────────────────────

export interface ParsedPort {
  port: number;
  protocol: "tcp" | "udp" | string;
  state: "open" | "closed" | "filtered" | string;
  service: string;
  version: string;
}

export interface ParsedHost {
  ip: string;
  hostname: string | null;
  state: "up" | "down" | string;
  latency: string | null;
  os: string | null;
  ports: ParsedPort[];
}

export interface NmapScanMeta {
  startTime: string | null;
  endTime: string | null;
  durationSec: number | null;
  command: string | null;
  rawVersion: string | null;
  totalHosts: number;
  hostsUp: number;
  hostsDown: number;
  openPortsTotal: number;
}

export interface ParsedNmapReport {
  meta: NmapScanMeta;
  hosts: ParsedHost[];
  rawOutput: string;
}

// ── Generic scan report payload (used by PDF generator) ───────────────────────

export interface ScanReportPayload {
  reportId: string;
  scanId: string;
  scannerType: ScannerType;
  target: string;
  userId: string;
  generatedAt: string;
  /** Parsed structured data (type-narrowed by scannerType) */
  parsedData: ParsedNmapReport; // extend as union when nuclei/zap parsers added
  /** Raw full output from the scanner */
  rawOutput: string;
}
