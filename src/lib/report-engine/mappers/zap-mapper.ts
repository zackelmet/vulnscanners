// ZAP baseline output → ScanReportData.
// Each non-PASS alert becomes a finding. ZAP levels (FAIL/WARN-NEW/WARN/INFO)
// map onto our severity scale.

import { ParsedZapReport, ParsedZapAlert, ZapAlertLevel } from "../types";
import { ReportFinding, ScanReportData, Severity } from "../report-data";
import {
  buildFindingsOverview,
  buildSeverityCounts,
  CONFIDENTIALITY_STATEMENT,
  GLOSSARY,
  pickKeyFindings,
} from "./_shared";

const ZAP_TO_SEV: Record<ZapAlertLevel, Severity> = {
  "FAIL-NEW": "high",
  "FAIL-INPROG": "high",
  FAIL: "high",
  "WARN-NEW": "medium",
  "WARN-INPROG": "medium",
  WARN: "low",
  INFO: "info",
  IGNORE: "info",
  PASS: "info", // never used; PASS alerts are filtered out before mapping
};

// True ZAP risk level (from JSON) maps to severity more precisely than the
// WARN/FAIL bucket, so prefer it when present.
const RISK_TO_SEV: Record<string, Severity> = {
  High: "high",
  Medium: "medium",
  Low: "low",
  Informational: "info",
};

function severityForAlert(a: ParsedZapAlert): Severity {
  if (a.riskLevel && RISK_TO_SEV[a.riskLevel]) return RISK_TO_SEV[a.riskLevel];
  return ZAP_TO_SEV[a.level];
}

// Curated remediation per common ZAP rule ID. Falls back to the generic
// list when we don't have specific guidance.
const RULE_GUIDE: Record<
  string,
  { description: string; impact: string; remediation: string[] }
> = {
  "10020": {
    description:
      "Pages on this host are returned without an X-Frame-Options header (or with a permissive value), which allows the page to be rendered inside a frame on a different origin.",
    impact:
      "Without anti-clickjacking protection, an attacker can render the page inside a hostile iframe and trick users into authenticating, transferring funds, or performing other state-changing actions.",
    remediation: [
      "Add a Content-Security-Policy with `frame-ancestors 'self'` (or `'none'`) at the edge.",
      "Or add an X-Frame-Options header set to DENY or SAMEORIGIN.",
      "Verify the header is sent on every response, not just the application root.",
    ],
  },
  "10021": {
    description:
      "Responses do not include the X-Content-Type-Options header, allowing MIME-sniffing browsers to interpret content with a type that differs from what the server declared.",
    impact:
      "MIME-sniffing can promote a non-script response into executable JavaScript or expose XSS via uploaded files, depending on the surrounding application.",
    remediation: [
      "Set `X-Content-Type-Options: nosniff` on every response.",
      "Audit Content-Type values on upload endpoints to ensure correct MIME types.",
    ],
  },
  "10036": {
    description:
      "The HTTP `Server` header exposes the upstream product and version. This is informational on its own but accelerates targeted attacks by removing a recon step for the attacker.",
    impact:
      "Version disclosure makes it cheaper for attackers to find applicable exploits against this exact platform.",
    remediation: [
      "Strip or generalise the `Server` response header at the edge layer.",
      "Apply the same hardening to `X-Powered-By`, `X-AspNet-Version`, and similar headers.",
    ],
  },
  "10038": {
    description: "No Content-Security-Policy header is set on responses.",
    impact:
      "Without CSP, the browser has no allowlist for script/style sources, materially raising the impact of any reflected or stored XSS that exists in the application.",
    remediation: [
      "Define a starting CSP based on the actual resources the application loads, then tighten over time.",
      "Use `report-only` mode initially to catch unexpected resource loads without breaking the app.",
      "Deliver the policy on every response, including error pages.",
    ],
  },
  "10049": {
    description:
      "Responses are marked as cacheable by intermediate caches, despite containing dynamic content.",
    impact:
      "Cached responses can leak between users if the URL is keyed on something other than user identity, particularly in shared CDNs or corporate proxies.",
    remediation: [
      "Set `Cache-Control: no-store` on responses that contain user-specific data.",
      "Use `private` for responses safe to cache only in the user's browser.",
      "Verify the policy on authentication, account, and billing endpoints.",
    ],
  },
  "10063": {
    description:
      "No Permissions-Policy header is set. The browser will use its default permission set for sensors, payment, microphone, camera, etc.",
    impact:
      "Misuse of browser features (e.g. payment-request, geolocation) by injected scripts is not constrained at the platform level.",
    remediation: [
      "Set a restrictive Permissions-Policy that only allows the features the application actually needs.",
      "Verify the header is present on every response.",
    ],
  },
  "10009": {
    description:
      "Page content leaks branding or banner information about the underlying platform/host.",
    impact:
      "On its own this is informational. It can speed up reconnaissance against the host platform and reveal that errors are reaching end users instead of being handled.",
    remediation: [
      "Render generic error pages that don't reveal product or host information.",
      "Audit 4xx/5xx responses for accidental disclosure.",
    ],
  },
  "10109": {
    description: "ZAP detected this as a modern single-page application.",
    impact:
      "Informational — SPA detection is not a vulnerability. The advisory exists to flag that some passive scan rules give partial coverage on SPAs.",
    remediation: [
      "No action required. Consider running ZAP in browser-mode for fuller SPA coverage.",
    ],
  },
  "90003": {
    description:
      "External scripts/styles are loaded without Subresource Integrity (SRI) hashes.",
    impact:
      "If an external CDN is compromised, the affected resource can be silently replaced and executed in this application's origin.",
    remediation: [
      "Add `integrity` attributes to <script>/<link> tags loading third-party assets.",
      "Pin third-party assets to a specific version that you can audit.",
    ],
  },
  "90004": {
    description:
      "Responses are missing or have an invalid Cross-Origin-Embedder-Policy header.",
    impact:
      "COEP is required to enable cross-origin isolation, which unlocks high-precision timers and SharedArrayBuffer safely.",
    remediation: [
      "Set `Cross-Origin-Embedder-Policy: require-corp` if the application needs cross-origin isolation.",
      "Audit external resources to ensure they accept this policy.",
    ],
  },
};

function descriptionFor(alert: ParsedZapAlert): string {
  if (alert.ruleId && RULE_GUIDE[alert.ruleId]) {
    return RULE_GUIDE[alert.ruleId].description;
  }
  // Prefer ZAP's own description from the JSON report.
  if (alert.description) return alert.description;
  return `ZAP rule "${alert.name}" matched ${alert.count} time${alert.count === 1 ? "" : "s"} during the active scan.`;
}

function impactFor(alert: ParsedZapAlert): string {
  if (alert.ruleId && RULE_GUIDE[alert.ruleId]) {
    return RULE_GUIDE[alert.ruleId].impact;
  }
  return "Refer to the ZAP rule documentation for impact context. The presence of this alert indicates the rule fired during the active scan and warrants review.";
}

function remediationFor(alert: ParsedZapAlert): string[] {
  if (alert.ruleId && RULE_GUIDE[alert.ruleId]) {
    return RULE_GUIDE[alert.ruleId].remediation;
  }
  // Prefer ZAP's own solution text (split into steps) from the JSON report.
  if (alert.solution) {
    const steps = alert.solution
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length) return steps;
  }
  return [
    "Review the ZAP rule documentation for this rule ID.",
    "Apply the recommended mitigation at the application or edge layer.",
    "Re-run the scan after the fix to confirm the alert no longer fires.",
  ];
}

export function mapZapReport(args: {
  parsed: ParsedZapReport;
  scanId: string;
  target: string;
  startedAt: Date;
  completedAt: Date;
  command?: string | null;
}): ScanReportData {
  const findings: ReportFinding[] = args.parsed.alerts.map((a, i) => {
    const severity = severityForAlert(a);
    const sample = a.details.slice(0, 8);
    const trailing =
      a.details.length > sample.length
        ? ` (… plus ${a.details.length - sample.length} more URL${a.details.length - sample.length === 1 ? "" : "s"})`
        : "";
    const description =
      descriptionFor(a) +
      (sample.length
        ? `\n\nAffected URLs include:\n${sample.map((s) => `  ${s}`).join("\n")}${trailing}`
        : "");
    const references = (a.references || []).filter((r) =>
      /^https?:\/\//.test(r),
    );
    if (a.cweid && a.cweid !== "-1") {
      references.push(`https://cwe.mitre.org/data/definitions/${a.cweid}.html`);
    }
    return {
      id: `ZP-${i + 1}`,
      title: a.name,
      severity,
      state: "Unresolved",
      description,
      businessImpact: impactFor(a),
      howToVerify: [
        {
          text: "Re-run the ZAP active scan against the same target:",
          code: `docker run --rm zaproxy/zap-stable zap-full-scan.py -t ${args.target} -I`,
        },
        ...(a.instances && a.instances[0]?.evidence
          ? [
              {
                text: `ZAP matched on evidence such as: ${a.instances[0].evidence}`,
              },
            ]
          : []),
      ],
      remediation: remediationFor(a),
      references: references.length ? references : undefined,
    };
  });

  // Sort by severity, re-number.
  const sevOrder = ["critical", "high", "medium", "low", "info", "accepted"] as const;
  findings.sort(
    (a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity),
  );
  findings.forEach((f, i) => {
    f.id = `ZP-${i + 1}`;
  });

  const counts = buildSeverityCounts(findings);
  const keyFindings = pickKeyFindings(findings);

  const urlsLine = args.parsed.totalUrls
    ? `${args.parsed.totalUrls} URL${args.parsed.totalUrls === 1 ? "" : "s"} crawled`
    : "Baseline crawl completed";
  const ruleLine = `${args.parsed.passed} rules passed, ${args.parsed.warnings} warnings, ${args.parsed.failures} failures`;

  return {
    scanId: args.scanId,
    scannerType: "zap",
    target: args.target,
    startedAt: args.startedAt,
    completedAt: args.completedAt,
    durationSec: null,
    command: args.command ?? null,
    severityCounts: counts,
    keyFindings,
    findings,
    confidentialityStatement: CONFIDENTIALITY_STATEMENT,
    findingsOverview:
      `${urlsLine}; ${ruleLine}. ` +
      buildFindingsOverview(counts, "web-application alert"),
    methodology: {
      description:
        "VulnScanners runs the OWASP ZAP baseline scanner inside a hardened container against the supplied URL. The baseline crawls the application for a configurable time budget and applies ZAP's passive scan rules to every observed request and response.",
      tools: [
        "OWASP ZAP — `zap-baseline.py` automation framework",
        "Container image: zaproxy/zap-stable",
        "Configurable crawl-time budget via the scan launch `minutes` option (default: 1)",
      ],
      scope: `Anonymous baseline scan of ${args.target}. Authenticated, full-spider, and active-attack modes are not part of the baseline product.`,
    },
    coverage: [
      {
        heading: "Headers & response policy",
        items: [
          "Anti-clickjacking (X-Frame-Options, CSP frame-ancestors)",
          "MIME sniffing (X-Content-Type-Options)",
          "Content Security Policy",
          "Permissions / Feature Policy",
          "Cache-control on sensitive responses",
          "Server / X-Powered-By disclosure",
        ],
      },
      {
        heading: "Cookies, sessions, and resources",
        items: [
          "Cookie flags (HttpOnly, Secure, SameSite)",
          "Subresource Integrity on third-party assets",
          "Open redirects and off-site form posts",
          "Mixed-content links",
          "Information disclosure in errors and comments",
        ],
      },
    ],
    glossary: GLOSSARY,
  };
}
