// Parse nuclei output into a structured report. The worker now runs nuclei
// with `-jsonl`, so each finding is a JSON object (lossless: name, severity,
// CVE/CWE/CVSS, matched-at). We still support the legacy plain-text format
// (one `[id] [proto] [sev] target` line per finding) so older scans render.

import {
  NucleiSeverity,
  ParsedNucleiFinding,
  ParsedNucleiReport,
} from "./types";

const SEV: Record<string, NucleiSeverity> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
  unknown: "unknown",
};

// ── Legacy text line parser ────────────────────────────────────────────────
function parseTextLine(line: string): ParsedNucleiFinding | null {
  const m = line.match(
    /^\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+?)\s*$/,
  );
  if (!m) return null;
  const [, templateId, protocol, severityRaw, tail] = m;

  let target = tail;
  let extracted: string | null = null;
  const splitIdx = tail.indexOf(" [");
  if (splitIdx >= 0) {
    target = tail.slice(0, splitIdx).trim();
    extracted = tail.slice(splitIdx + 1).trim();
  }

  return {
    templateId: templateId.trim(),
    protocol: protocol.trim(),
    severity: SEV[severityRaw.toLowerCase()] || "unknown",
    target: target.trim(),
    extracted,
  };
}

// ── JSONL object parser ─────────────────────────────────────────────────────
function parseJsonObject(
  obj: Record<string, unknown>,
): ParsedNucleiFinding | null {
  const info = (obj["info"] as Record<string, unknown>) || {};
  const templateId =
    (obj["template-id"] as string) || (obj["templateID"] as string) || "";
  if (!templateId && !info["name"]) return null;

  const classification =
    (info["classification"] as Record<string, unknown>) || {};
  const asArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];

  const cvss =
    typeof classification["cvss-score"] === "number"
      ? (classification["cvss-score"] as number)
      : null;

  const extractedResults = asArr(obj["extracted-results"]);

  return {
    templateId: templateId || String(info["name"] || "finding"),
    protocol: (obj["type"] as string) || "http",
    severity: SEV[String(info["severity"] || "").toLowerCase()] || "unknown",
    target:
      (obj["matched-at"] as string) ||
      (obj["host"] as string) ||
      (obj["url"] as string) ||
      "",
    extracted: extractedResults.length ? extractedResults.join(", ") : null,
    name: (info["name"] as string) || undefined,
    description: (info["description"] as string) || undefined,
    cves: asArr(classification["cve-id"]),
    cwes: asArr(classification["cwe-id"]),
    cvss,
    references: asArr(info["reference"]),
    matcherName: (obj["matcher-name"] as string) || null,
  };
}

function looksLikeJsonl(raw: string): boolean {
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0) || "";
  return firstLine.trim().startsWith("{");
}

export function parseNucleiOutput(raw: string): ParsedNucleiReport {
  const findings: ParsedNucleiFinding[] = [];
  const isJsonl = looksLikeJsonl(raw);

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isJsonl && trimmed.startsWith("{")) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        const f = parseJsonObject(obj);
        if (f) findings.push(f);
      } catch {
        // tolerate the occasional malformed line rather than dropping silently
      }
    } else if (!isJsonl) {
      const f = parseTextLine(line);
      if (f) findings.push(f);
    }
  }

  const bySeverity: Record<NucleiSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    unknown: 0,
  };
  for (const f of findings) bySeverity[f.severity]++;

  const order: NucleiSeverity[] = [
    "critical",
    "high",
    "medium",
    "low",
    "info",
    "unknown",
  ];
  findings.sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  );

  return {
    totalFindings: findings.length,
    bySeverity,
    findings,
    rawOutput: raw,
  };
}
