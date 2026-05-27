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

// ── Nuclei-specific parsed output ──────────────────────────────────────────────

export type NucleiSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "unknown";

export interface ParsedNucleiFinding {
  templateId: string;
  protocol: string;
  severity: NucleiSeverity;
  target: string;
  extracted: string | null;
}

export interface ParsedNucleiReport {
  totalFindings: number;
  bySeverity: Record<NucleiSeverity, number>;
  findings: ParsedNucleiFinding[];
  rawOutput: string;
}

// ── ZAP-specific parsed output ─────────────────────────────────────────────────

export type ZapAlertLevel = "PASS" | "WARN-NEW" | "WARN" | "FAIL" | "INFO";

export interface ParsedZapAlert {
  level: ZapAlertLevel;
  ruleId: string | null;
  name: string;
  count: number;
  details: string[]; // additional indented lines below the alert
}

export interface ParsedZapReport {
  passed: number;
  warnings: number;
  failures: number;
  totalUrls: number | null;
  alerts: ParsedZapAlert[]; // non-PASS alerts surfaced for the report
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
  /** Parsed structured data — type narrows by scannerType */
  parsedData: ParsedNmapReport | ParsedNucleiReport | ParsedZapReport;
  /** Raw full output from the scanner (or rawPreview if VM truncated) */
  rawOutput: string;
}
