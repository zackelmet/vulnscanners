// Parse ZAP Automation Framework text output (what the VM stores in
// resultsSummary.rawPreview). Each rule line looks like:
//   PASS: Cookie No HttpOnly Flag [10010]
//   WARN-NEW: In Page Banner Information Leak [10009] x 5
// Followed sometimes by tab-indented detail lines.

import { ParsedZapAlert, ParsedZapReport, ZapAlertLevel } from "./types";

const LEVELS: ZapAlertLevel[] = ["PASS", "WARN-NEW", "WARN", "FAIL", "INFO"];

function parseRuleLine(line: string): ParsedZapAlert | null {
  for (const level of LEVELS) {
    const prefix = `${level}:`;
    if (line.startsWith(prefix)) {
      const body = line.slice(prefix.length).trim();
      // Match optional " x N" multiplier at the end, then "[ruleId]" before it.
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
      // Fallback: no [ruleId] match — keep the body as the name.
      return {
        level,
        name: body,
        ruleId: null,
        count: 1,
        details: [],
      };
    }
  }
  return null;
}

export function parseZapOutput(raw: string): ParsedZapReport {
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

    // Indented detail line (tab or 2+ spaces) attaches to the current alert.
    if (current && /^[\t ]+\S/.test(line)) {
      current.details.push(line.trim());
    }
  }

  let passed = 0,
    warnings = 0,
    failures = 0;
  for (const a of alerts) {
    if (a.level === "PASS") passed++;
    else if (a.level === "FAIL") failures++;
    else if (a.level.startsWith("WARN")) warnings++;
  }

  // Only surface non-PASS in the body of the report (PASS counts roll into the
  // summary). Sort failures first, then warnings, then info-ish.
  const severityOrder: ZapAlertLevel[] = [
    "FAIL",
    "WARN-NEW",
    "WARN",
    "INFO",
    "PASS",
  ];
  const filtered = alerts
    .filter((a) => a.level !== "PASS")
    .sort(
      (a, b) => severityOrder.indexOf(a.level) - severityOrder.indexOf(b.level),
    );

  return {
    passed,
    warnings,
    failures,
    totalUrls,
    alerts: filtered,
    rawOutput: raw,
  };
}
