// ─── VulnScanners Report Engine — shared types ────────────────────────────────

export type ScannerType = "nmap" | "nuclei" | "zap";

// ── Nmap-specific parsed output ────────────────────────────────────────────────

export interface ParsedPort {
  port: number;
  protocol: "tcp" | "udp" | string;
  state: "open" | "closed" | "filtered" | string;
  service: string;
  version: string;
  /** CPE identifiers from `-sV` (XML only). */
  cpe?: string[];
  /** NSE/script output keyed by script id (XML only). */
  scripts?: { id: string; output: string }[];
}

export interface ParsedHost {
  ip: string;
  hostname: string | null;
  state: "up" | "down" | string;
  latency: string | null;
  os: string | null;
  ports: ParsedPort[];
  /** Summary of non-listed ports, e.g. "995 closed tcp ports" (XML only). */
  extraPorts?: { state: string; count: number }[];
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
  /** Rich fields, populated from -jsonl output (absent for legacy text). */
  name?: string;
  description?: string;
  cves?: string[];
  cwes?: string[];
  cvss?: number | null;
  references?: string[];
  matcherName?: string | null;
}

export interface ParsedNucleiReport {
  totalFindings: number;
  bySeverity: Record<NucleiSeverity, number>;
  findings: ParsedNucleiFinding[];
  rawOutput: string;
}

// ── ZAP-specific parsed output ─────────────────────────────────────────────────

export type ZapAlertLevel =
  | "PASS"
  | "WARN-NEW"
  | "WARN-INPROG"
  | "WARN"
  | "FAIL-NEW"
  | "FAIL-INPROG"
  | "FAIL"
  | "INFO"
  | "IGNORE";

export interface ParsedZapAlert {
  level: ZapAlertLevel;
  ruleId: string | null;
  name: string;
  count: number;
  details: string[]; // additional indented lines below the alert (text mode)
  /** Rich fields, populated from -J JSON output (absent for legacy text). */
  riskLevel?: "High" | "Medium" | "Low" | "Informational" | string;
  confidence?: string;
  description?: string;
  solution?: string;
  references?: string[];
  cweid?: string | null;
  /** Affected URL instances from JSON. */
  instances?: { uri: string; method?: string; evidence?: string }[];
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
