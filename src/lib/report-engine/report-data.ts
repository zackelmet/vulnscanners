// Normalized report shape — the contract every scanner mapper produces and
// the ScanReport template consumes.

import { Severity } from "./templates/_theme";
export type { Severity };

export type ReportFindingState = "Unresolved" | "Fixed";

export interface VerifyStep {
  text: string;
  /** Optional code/command to render in a CodeBlock under the step. */
  code?: string;
}

export interface ReportFinding {
  /** Per-report identifier e.g. PT-1, NM-3. */
  id: string;
  title: string;
  severity: Severity;
  state: ReportFindingState;
  description: string;
  businessImpact: string;
  /** Multi-step "How to verify / how to exploit" reproduction. */
  howToVerify: VerifyStep[];
  /** Bulleted remediation steps. */
  remediation: string[];
  /** Optional external references — CVE links, OWASP entries, vendor advisories. */
  references?: string[];
}

export interface KeyFinding {
  title: string;
  impact: string;
}

export interface CoverageGroup {
  /** Heading shown above the table — "Injection & Execution" etc. */
  heading: string;
  /** Items listed under that heading. */
  items: string[];
}

export interface ScanReportData {
  scanId: string;
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  startedAt: Date;
  completedAt: Date;
  durationSec: number | null;

  /** The command actually executed by the worker, surfaced in the appendix. */
  command: string | null;

  /** Counts for the bar chart + master findings header. */
  severityCounts: Record<Severity, number>;

  /** Top 3-5 findings, shown on the Executive Summary "Key findings" page. */
  keyFindings: KeyFinding[];

  /** All findings, in display order (severity desc). */
  findings: ReportFinding[];

  /** Appendix A — Scope & Methodology. */
  methodology: {
    description: string;
    tools: string[];
    scope: string;
  };

  /** Appendix B — Vulnerability Coverage (two-column groups). */
  coverage: CoverageGroup[];

  /** Appendix C — Glossary (term → definition). */
  glossary: { term: string; definition: string }[];

  /** Free-form notes shown beneath the chart on the Findings section opener. */
  findingsOverview: string;

  /** Confidentiality block (rendered on the Executive Summary page). */
  confidentialityStatement: string;
}
