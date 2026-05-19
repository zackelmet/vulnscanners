// Parse nuclei text output (the standard one-line-per-finding format the VM
// stores in resultsSummary.rawPreview). Example line:
//   [template-id:matcher] [http] [medium] http://target/path ["extracted"]

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

function parseLine(line: string): ParsedNucleiFinding | null {
  // Split on top-level "[...]" groups followed by the target/extracted tail.
  // We want the first three bracketed groups (template, protocol, severity)
  // and the rest of the line as target + optional ["extracted"] suffix.
  const m = line.match(
    /^\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+?)\s*$/,
  );
  if (!m) return null;
  const [, templateId, protocol, severityRaw, tail] = m;

  // Tail may be "target" or "target [\"extracted\"]" or "target [extra=...]".
  // Take everything up to the first " [" as the target.
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

export function parseNucleiOutput(raw: string): ParsedNucleiReport {
  const findings: ParsedNucleiFinding[] = [];
  for (const line of raw.split("\n")) {
    const f = parseLine(line);
    if (f) findings.push(f);
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

  // Sort by severity desc so highest-impact findings render first.
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
