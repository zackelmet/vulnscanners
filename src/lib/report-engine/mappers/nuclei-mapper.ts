// Nuclei parser output → ScanReportData.
// Each parsed line becomes a finding. Severity is taken straight from nuclei.

import {
  ParsedNucleiReport,
  ParsedNucleiFinding,
  NucleiSeverity,
} from "../types";
import { ReportFinding, ScanReportData, Severity } from "../report-data";
import {
  buildFindingsOverview,
  buildSeverityCounts,
  CONFIDENTIALITY_STATEMENT,
  GLOSSARY,
  pickKeyFindings,
} from "./_shared";

const NUCLEI_TO_SEV: Record<NucleiSeverity, Severity> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
  unknown: "info",
};

function humanizeTemplate(id: string): string {
  // Strip ":matcher" suffix that nuclei sometimes appends, then turn
  // "ssh-server-enumeration" into "SSH server enumeration".
  const base = id.split(":")[0];
  if (/^CVE-\d{4}-\d+/i.test(base)) return base; // keep CVE IDs literal
  return base
    .split("-")
    .map((part) => {
      if (/^[A-Z]{2,}$/.test(part)) return part; // initialism
      if (
        /^(ssh|xss|sql|csrf|ssrf|ssti|lfi|rfi|dns|tls|ssl|cve|api|jwt|cors|smtp|ftp|http|https|udp|tcp|ws|wss)$/i.test(
          part,
        )
      ) {
        return part.toUpperCase();
      }
      return part[0]?.toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function descriptionFor(finding: ParsedNucleiFinding): string {
  // Prefer nuclei's own template description (from -jsonl) when available.
  const lead = finding.description ? `${finding.description.trim()} ` : "";
  const base = `${lead}Nuclei matched template "${finding.templateId}" against ${finding.target}.`;
  if (finding.extracted) {
    return `${base} The template extracted the following from the response: ${finding.extracted}.`;
  }
  return base;
}

function referencesFor(f: ParsedNucleiFinding): string[] | undefined {
  const refs: string[] = [];
  for (const cve of f.cves || []) {
    refs.push(`https://nvd.nist.gov/vuln/detail/${cve}`);
  }
  for (const cwe of f.cwes || []) {
    const id = cwe.replace(/[^0-9]/g, "");
    if (id) refs.push(`https://cwe.mitre.org/data/definitions/${id}.html`);
  }
  for (const r of f.references || []) {
    if (/^https?:\/\//.test(r)) refs.push(r);
  }
  // Legacy fallback: CVE encoded in the template id.
  if (!refs.length && /^CVE-\d{4}-\d+/i.test(f.templateId)) {
    refs.push(`https://nvd.nist.gov/vuln/detail/${f.templateId.split(":")[0]}`);
  }
  return refs.length ? Array.from(new Set(refs)) : undefined;
}

function businessImpactFor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "Critical-severity nuclei findings typically indicate a directly exploitable vulnerability — unauthenticated RCE, sensitive data exposure, or full authentication bypass. Treat as actively exploitable until patched.";
    case "high":
      return "High-severity findings represent a serious vulnerability that an attacker could exploit with modest effort, often leading to data exposure, account compromise, or privilege escalation.";
    case "medium":
      return "Medium-severity findings expand the attack surface or weaken defence-in-depth. Individually they may not yield direct compromise, but they often combine with other issues to enable exploitation.";
    case "low":
      return "Low-severity findings are informational misconfigurations or missing hardening controls. They are unlikely to be exploited in isolation but should be cleaned up to maintain baseline hygiene.";
    case "info":
    default:
      return "Informational findings document what the scan observed about the target — software versions, exposed banners, response headers. They do not represent vulnerabilities in themselves.";
  }
}

function remediationFor(
  finding: ParsedNucleiFinding,
  severity: Severity,
): string[] {
  const isCve = /^CVE-\d{4}-\d+/i.test(finding.templateId);
  if (isCve) {
    return [
      `Patch the affected component to a version not vulnerable to ${finding.templateId.split(":")[0]}.`,
      "Subscribe to the vendor's security advisory feed for future notifications.",
      "If patching is not possible immediately, apply vendor-recommended mitigations or restrict network access to the affected component.",
    ];
  }
  const id = finding.templateId.toLowerCase();
  if (id.includes("missing-security-headers") || id.includes("http-missing-")) {
    return [
      "Add the missing response header at your edge layer (reverse proxy, CDN, or application middleware).",
      "Use a tool like https://securityheaders.com to verify the change across all hostnames.",
      "Document the header policy in your platform's security baseline.",
    ];
  }
  if (
    id.includes("detect") ||
    id.includes("enumeration") ||
    id.includes("fingerprint")
  ) {
    return [
      "Reduce service-banner verbosity where possible (remove version strings from responses).",
      "Confirm the detected service version is current and supported.",
      "If the service does not need to be public, restrict it via firewall.",
    ];
  }
  if (severity === "info" || severity === "low") {
    return [
      "Review whether the detected configuration is intentional.",
      "Update internal documentation if this exposure is expected.",
      "Re-scan after any infrastructure changes.",
    ];
  }
  return [
    "Investigate the matched template against your target's actual configuration.",
    "Apply the remediation specified by the source of the template (e.g. vendor advisory, OWASP guidance).",
    "Re-scan after applying the fix to confirm the finding no longer reproduces.",
  ];
}

function verifyStepsFor(finding: ParsedNucleiFinding): {
  text: string;
  code?: string;
}[] {
  // Reproduce by re-running the same template against the same target.
  return [
    {
      text: "Reproduce the finding by re-running the specific template:",
      code: `nuclei -t ${finding.templateId.split(":")[0]} -u ${finding.target}`,
    },
    {
      text: "Inspect the raw response from the target if further investigation is required.",
      code: `curl -sI ${finding.target}`,
    },
  ];
}

export function mapNucleiReport(args: {
  parsed: ParsedNucleiReport;
  scanId: string;
  target: string;
  startedAt: Date;
  completedAt: Date;
  command?: string | null;
}): ScanReportData {
  // Map each parsed line to a finding.
  const reportFindings: ReportFinding[] = args.parsed.findings.map((f, i) => {
    const severity = NUCLEI_TO_SEV[f.severity];
    // Prefer nuclei's human-readable template name (from -jsonl) over the slug.
    const title = f.name?.trim() || humanizeTemplate(f.templateId);
    return {
      id: `NU-${i + 1}`,
      title,
      severity,
      state: "Unresolved",
      description: descriptionFor(f),
      businessImpact: businessImpactFor(severity),
      howToVerify: verifyStepsFor(f),
      remediation: remediationFor(f, severity),
      references: referencesFor(f),
    };
  });

  // Sort by severity, re-number.
  const sevOrder = ["critical", "high", "medium", "low", "info"] as const;
  reportFindings.sort(
    (a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity),
  );
  reportFindings.forEach((f, i) => {
    f.id = `NU-${i + 1}`;
  });

  const counts = buildSeverityCounts(reportFindings);
  const keyFindings = pickKeyFindings(reportFindings);

  return {
    scanId: args.scanId,
    scannerType: "nuclei",
    target: args.target,
    startedAt: args.startedAt,
    completedAt: args.completedAt,
    durationSec: null,
    command: args.command ?? null,
    severityCounts: counts,
    keyFindings,
    findings: reportFindings,
    confidentialityStatement: CONFIDENTIALITY_STATEMENT,
    findingsOverview: buildFindingsOverview(counts, "vulnerability finding"),
    methodology: {
      description:
        "VulnScanners runs the open-source Nuclei engine with the community template set against your target. Nuclei matches a curated catalogue of known-vulnerability fingerprints, CVE indicators, exposed admin panels, and misconfiguration patterns.",
      tools: [
        "Nuclei (ProjectDiscovery) — template-based vulnerability scanner",
        "Community templates — refreshed daily on our scanner host",
        "Optional severity filter via the scan launch options",
      ],
      scope: `HTTP/HTTPS endpoints reachable on ${args.target}, plus protocol-level checks for any exposed SSH, FTP, SMTP, DNS, and SNMP services discovered along the way.`,
    },
    coverage: [
      {
        heading: "Application-layer checks",
        items: [
          "Known CVE fingerprints (Apache, Nginx, IIS, app frameworks)",
          "Missing security headers",
          "Default credentials & admin panels",
          "Exposed configuration / debug endpoints",
          "Misconfigured CORS, redirects, JWT verification",
        ],
      },
      {
        heading: "Protocol-layer checks",
        items: [
          "SSH algorithm + version checks",
          "DNS / mail-server misconfiguration",
          "TLS / certificate posture",
          "SNMP information leakage",
          "Wildcard / takeover indicators",
        ],
      },
    ],
    glossary: GLOSSARY,
  };
}
