// Parse ZAP output into a structured report. The worker now runs
// `zap-full-scan.py -J` (active scan) and ships the JSON report, which we parse
// losslessly (true risk level, solution, CWE, affected instances). The legacy
// text format (`PASS:`/`WARN-NEW:` lines) is still supported for old scans.

import { ParsedZapAlert, ParsedZapReport, ZapAlertLevel } from "./types";

// ── HTML → text (ZAP desc/solution/reference are HTML) ──────────────────────
function htmlToText(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const RISKCODE_TO_LEVEL: Record<string, ZapAlertLevel> = {
  "3": "FAIL-NEW",
  "2": "WARN-NEW",
  "1": "WARN",
  "0": "INFO",
};
const RISKCODE_TO_RISK: Record<string, string> = {
  "3": "High",
  "2": "Medium",
  "1": "Low",
  "0": "Informational",
};

// ── JSON parser (zap-full-scan -J) ──────────────────────────────────────────
function parseJson(raw: string): ParsedZapReport | null {
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const sites = (doc["site"] as Record<string, unknown>[]) || [];
  if (!Array.isArray(sites)) return null;

  const alerts: ParsedZapAlert[] = [];
  let totalUrls = 0;
  for (const site of sites) {
    const siteAlerts = (site["alerts"] as Record<string, unknown>[]) || [];
    for (const a of siteAlerts) {
      const riskcode = String(a["riskcode"] ?? "0");
      const instancesRaw = (a["instances"] as Record<string, unknown>[]) || [];
      const instances = instancesRaw.map((i) => ({
        uri: String(i["uri"] || ""),
        method: i["method"] ? String(i["method"]) : undefined,
        evidence: i["evidence"] ? String(i["evidence"]) : undefined,
      }));
      totalUrls += instances.length;
      alerts.push({
        level: RISKCODE_TO_LEVEL[riskcode] || "INFO",
        ruleId: a["pluginid"] ? String(a["pluginid"]) : null,
        name: String(a["name"] || a["alert"] || "Unnamed alert"),
        count: a["count"] ? Number(a["count"]) : instances.length || 1,
        details: instances.map((i) => i.uri).filter(Boolean),
        riskLevel: RISKCODE_TO_RISK[riskcode],
        confidence: a["confidence"] ? String(a["confidence"]) : undefined,
        description: htmlToText(a["desc"] as string),
        solution: htmlToText(a["solution"] as string),
        references: htmlToText(a["reference"] as string)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        cweid: a["cweid"] ? String(a["cweid"]) : null,
        instances,
      });
    }
  }

  const counts = { passed: 0, warnings: 0, failures: 0 };
  for (const a of alerts) {
    if (a.level.startsWith("FAIL")) counts.failures++;
    else if (a.level.startsWith("WARN")) counts.warnings++;
  }

  const order: ZapAlertLevel[] = [
    "FAIL-NEW",
    "FAIL-INPROG",
    "FAIL",
    "WARN-NEW",
    "WARN-INPROG",
    "WARN",
    "INFO",
    "IGNORE",
    "PASS",
  ];
  alerts.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));

  return {
    passed: 0,
    warnings: counts.warnings,
    failures: counts.failures,
    totalUrls: totalUrls || null,
    alerts,
    rawOutput: raw,
  };
}

// ── Legacy text parser ──────────────────────────────────────────────────────
const TEXT_LEVELS: ZapAlertLevel[] = [
  "PASS",
  "WARN-NEW",
  "WARN-INPROG",
  "WARN",
  "FAIL-NEW",
  "FAIL-INPROG",
  "FAIL",
  "INFO",
  "IGNORE",
];

function parseRuleLine(line: string): ParsedZapAlert | null {
  for (const level of TEXT_LEVELS) {
    const prefix = `${level}:`;
    if (line.startsWith(prefix)) {
      const body = line.slice(prefix.length).trim();
      const m = body.match(/^(.*?)\s*\[([^\]]+)\](?:\s*x\s*(\d+))?\s*$/);
      if (m) {
        const [, name, ruleId, count] = m;
        return {
          level,
          name: name.trim(),
          ruleId: ruleId.trim(),
          count: count ? Number(count) : 1,
          details: [],
        };
      }
      return { level, name: body, ruleId: null, count: 1, details: [] };
    }
  }
  return null;
}

function parseText(raw: string): ParsedZapReport {
  const lines = raw.split("\n");
  const alerts: ParsedZapAlert[] = [];
  let current: ParsedZapAlert | null = null;
  let totalUrls: number | null = null;

  for (const line of lines) {
    if (/^Total of \d+ URLs/i.test(line)) {
      const m = line.match(/(\d+)/);
      if (m) totalUrls = Number(m[1]);
      continue;
    }
    const parsed = parseRuleLine(line);
    if (parsed) {
      current = parsed;
      alerts.push(parsed);
      continue;
    }
    if (current && /^[\t ]+\S/.test(line)) current.details.push(line.trim());
  }

  let passed = 0,
    warnings = 0,
    failures = 0;
  for (const a of alerts) {
    if (a.level === "PASS") passed++;
    else if (a.level.startsWith("FAIL")) failures++;
    else if (a.level.startsWith("WARN")) warnings++;
  }

  const order: ZapAlertLevel[] = [
    "FAIL-NEW",
    "FAIL-INPROG",
    "FAIL",
    "WARN-NEW",
    "WARN-INPROG",
    "WARN",
    "INFO",
    "IGNORE",
    "PASS",
  ];
  const filtered = alerts
    .filter((a) => a.level !== "PASS")
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));

  return {
    passed,
    warnings,
    failures,
    totalUrls,
    alerts: filtered,
    rawOutput: raw,
  };
}

export function parseZapOutput(raw: string): ParsedZapReport {
  if (raw.trim().startsWith("{")) {
    const json = parseJson(raw);
    if (json) return json;
  }
  return parseText(raw);
}
