// Shared mapper helpers — confidentiality boilerplate, glossary, severity helpers.

import { ScanReportData, Severity } from "../report-data";

export const CONFIDENTIALITY_STATEMENT =
  "This document is the exclusive property of the recipient and VulnScanners. It contains proprietary and confidential information. Duplication, redistribution, or use, in whole or in part, in any form, requires the consent of both parties. The recipient may share this document with auditors under non-disclosure agreements to demonstrate scan-coverage requirements.";

export const GLOSSARY: ScanReportData["glossary"] = [
  {
    term: "CVE",
    definition:
      "Common Vulnerabilities and Exposures — a public catalogue of known security flaws, each identified by a unique ID.",
  },
  {
    term: "CVSS",
    definition:
      "Common Vulnerability Scoring System — a standardised method for rating the severity of security vulnerabilities.",
  },
  {
    term: "Open port",
    definition:
      "A network port on a host that accepts inbound connections. Each open port represents an exposed service and a potential attack surface.",
  },
  {
    term: "Service banner",
    definition:
      "Text returned by a network service when a client connects, often revealing the vendor, product, and version of the software.",
  },
  {
    term: "OWASP Top 10",
    definition:
      "An industry-standard list of the most critical web-application security risks, maintained by the Open Worldwide Application Security Project.",
  },
  {
    term: "XSS",
    definition:
      "Cross-Site Scripting — a class of web vulnerability that allows attackers to inject client-side scripts into pages viewed by other users.",
  },
  {
    term: "SQLi",
    definition:
      "SQL Injection — a code-injection technique where malicious SQL statements are inserted into application data-entry points.",
  },
  {
    term: "Brute force",
    definition:
      "An attack that guesses authentication credentials through exhaustive trial of candidate values.",
  },
];

export function buildSeverityCounts(
  findings: { severity: Severity }[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity]++;
  return counts;
}

/**
 * Pick the top 3-5 most severe findings for the "Key Findings" page.
 * Skips info-level findings entirely.
 */
export function pickKeyFindings(
  findings: { title: string; description: string; severity: Severity; businessImpact: string }[],
): { title: string; impact: string }[] {
  const sevOrder: Severity[] = ["critical", "high", "medium", "low"];
  const sorted = [...findings].sort(
    (a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity),
  );
  return sorted
    .filter((f) => f.severity !== "info")
    .slice(0, 5)
    .map((f) => ({ title: f.title, impact: f.businessImpact }));
}

export function buildFindingsOverview(
  c: Record<Severity, number>,
  surfaceClass: string,
): string {
  const total = c.critical + c.high + c.medium + c.low + c.info;
  if (total === 0) {
    return `No exposures detected on ${surfaceClass}. The findings table below is empty.`;
  }
  const sentences: string[] = [];
  sentences.push(
    `The table below outlines each identified ${surfaceClass}, categorized by severity.`,
  );
  if (c.critical > 0)
    sentences.push(
      `${c.critical} critical issue${c.critical === 1 ? "" : "s"} require immediate attention.`,
    );
  if (c.high > 0)
    sentences.push(
      `${c.high} high-severity issue${c.high === 1 ? "" : "s"} should be remediated within the next sprint.`,
    );
  if (c.medium > 0)
    sentences.push(
      `${c.medium} medium-severity issue${c.medium === 1 ? "" : "s"} warrant follow-up in the next maintenance window.`,
    );
  if (c.low > 0)
    sentences.push(
      `${c.low} low-severity issue${c.low === 1 ? "" : "s"} are informational and can be addressed opportunistically.`,
    );
  return sentences.join(" ");
}
