// Combined multi-scan report in HostedScan structure: cover → TOC → Executive
// Summary → Vulnerabilities By Target → one section per scanner → Glossary →
// back cover.

import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import { ScanReportData, Severity } from "../report-data";
import { ScannerType } from "../types";
import { SEVERITY_ORDER } from "./_theme";
import { CoverPage } from "./_primitives";
import {
  HostedPage,
  TableOfContents,
  SectionH1,
  SectionH2,
  Lead,
  SeverityCards,
  StatPanel,
  BreakdownTable,
  TargetsSummaryTable,
  ScannerSection,
  GlossaryTwoCol,
  BackCover,
  SCANNER_SECTION_TITLE,
  SCANNER_INTRO,
  SCANNER_ORDER,
  ScannerGroup,
} from "./_hosted";

export interface CombinedReportScan {
  scanId: string;
  scannerType: ScannerType;
  target: string;
  data: ScanReportData;
}

export interface CombinedReportData {
  generatedAt: Date;
  scans: CombinedReportScan[];
  aggregateSeverityCounts: Record<Severity, number>;
  totalFindings: number;
}

const COVERAGE_LABEL: Record<ScannerType, string> = {
  zap: "Web App Findings",
  nmap: "Network Findings",
  nuclei: "Nuclei Findings",
};

// Friendly tool names for the Executive Summary methodology write-up.
const TOOL_LABEL: Record<ScannerType, string> = {
  zap: "OWASP ZAP",
  nmap: "Nmap",
  nuclei: "Nuclei",
};

function emptyCounts(): Record<Severity, number> {
  return SEVERITY_ORDER.reduce(
    (a, k) => ((a[k] = 0), a),
    {} as Record<Severity, number>,
  );
}

export function CombinedReport({ data }: { data: CombinedReportData }) {
  const targets = Array.from(new Set(data.scans.map((s) => s.target)));
  const subtitle = `${data.scans.length} ${
    data.scans.length === 1 ? "scan" : "scans"
  } across ${targets.length} ${targets.length === 1 ? "target" : "targets"}`;
  const anyScanner: ScannerType = data.scans[0]?.scannerType ?? "nuclei";

  // Per-target aggregate severity counts (for the by-target table + breakdowns).
  const byTarget = targets.map((t) => {
    const scans = data.scans.filter((s) => s.target === t);
    const counts = emptyCounts();
    for (const s of scans)
      for (const k of SEVERITY_ORDER)
        counts[k] += s.data.severityCounts[k] || 0;
    const findings = scans.flatMap((s) => s.data.findings);
    return { target: t, counts, findings };
  });

  // Per-scanner-type finding totals for the coverage panel.
  const typeTotals = new Map<ScannerType, number>();
  for (const s of data.scans)
    typeTotals.set(
      s.scannerType,
      (typeTotals.get(s.scannerType) || 0) + s.data.findings.length,
    );

  const coverageItems = [
    { value: targets.length, label: "Total Targets" },
    ...Array.from(typeTotals, ([type, count]) => ({
      value: count,
      label: COVERAGE_LABEL[type],
    })),
  ];

  // Methodology: which tools actually ran, with their scan + finding counts, in
  // fixed display order. Drives the verbose "what we ran and why" write-up.
  const scanCountByType = new Map<ScannerType, number>();
  for (const s of data.scans)
    scanCountByType.set(
      s.scannerType,
      (scanCountByType.get(s.scannerType) || 0) + 1,
    );
  const usedScanners = SCANNER_ORDER.filter((t) => scanCountByType.has(t));
  const toolList = usedScanners.map((t) => TOOL_LABEL[t]);
  const toolsSentence =
    toolList.length === 1
      ? toolList[0]
      : toolList.length === 2
        ? `${toolList[0]} and ${toolList[1]}`
        : `${toolList.slice(0, -1).join(", ")}, and ${toolList[toolList.length - 1]}`;

  // Group scans by scanner TYPE (not per scan) into fixed-order sections, so
  // e.g. three ZAP scans share one "Web Application Vulnerabilities" section.
  const groups: ScannerGroup[] = SCANNER_ORDER.map((type) => {
    const ofType = data.scans.filter((s) => s.scannerType === type);
    if (ofType.length === 0) return null;
    const counts = emptyCounts();
    const items = ofType.flatMap((s) => {
      for (const k of SEVERITY_ORDER)
        counts[k] += s.data.severityCounts[k] || 0;
      return s.data.findings.map((finding) => ({
        finding,
        target: s.target,
        completedAt: s.data.completedAt,
      }));
    });
    return { scannerType: type, counts, items };
  }).filter((g): g is ScannerGroup => g !== null);

  // Section numbering: 1 Exec, 2 By Target, 3..N scanner types, last Glossary.
  const scannerStart = 3;
  const glossaryNum = scannerStart + groups.length;

  const tocEntries = [
    { num: 1, title: "Executive Summary" },
    { num: 2, title: "Vulnerabilities By Target" },
    ...groups.map((g, i) => ({
      num: scannerStart + i,
      title: SCANNER_SECTION_TITLE[g.scannerType],
    })),
    { num: glossaryNum, title: "Glossary" },
  ];

  // Merge glossaries (de-dupe by term).
  const glossaryMap = new Map<string, string>();
  for (const s of data.scans)
    for (const row of s.data.glossary)
      if (!glossaryMap.has(row.term)) glossaryMap.set(row.term, row.definition);
  const glossary = Array.from(glossaryMap, ([term, definition]) => ({
    term,
    definition,
  }));

  return (
    <Document
      title={`Combined security assessment — ${subtitle}`}
      author="VulnScanners"
      producer="VulnScanners report engine"
    >
      <CoverPage
        scannerType={anyScanner}
        target={subtitle}
        date={data.generatedAt}
        titleOverride="Combined Security Assessment"
        subtitleOverride={subtitle}
      />

      <HostedPage sectionName="Table of Contents" date={data.generatedAt}>
        <TableOfContents entries={tocEntries} />
      </HostedPage>

      {/* 1. Executive Summary */}
      <HostedPage sectionName="Executive Summary" date={data.generatedAt}>
        <SectionH1 num={1}>Executive Summary</SectionH1>
        <Lead>
          This report consolidates the results of {data.scans.length}{" "}
          {data.scans.length === 1 ? "scan" : "scans"} performed with{" "}
          {toolsSentence} across {targets.length}{" "}
          {targets.length === 1 ? "target" : "targets"}. In aggregate the
          assessment surfaced {data.totalFindings}{" "}
          {data.totalFindings === 1 ? "finding" : "findings"}. Higher severity
          indicates a greater risk to the confidentiality, integrity, or
          availability of the targets.
        </Lead>

        <SectionH2 num="1.1">Assessment Methodology</SectionH2>
        <Lead>
          {toolList.length === 1
            ? "This assessment used a single scanning tool"
            : `This assessment combined ${toolList.length} complementary scanning tools`}{" "}
          to examine the {targets.length === 1 ? "target" : "targets"} from
          different angles. Each tool inspects a distinct layer of the attack
          surface — network exposure, web-application behavior, and
          known-vulnerability signatures — so together they give a broader and
          more reliable picture than any single scan. The findings below are
          organized first by target, then by the tool that produced them.
        </Lead>
        {usedScanners.map((t) => {
          const scanN = scanCountByType.get(t) || 0;
          const findN = typeTotals.get(t) || 0;
          return (
            <Lead key={t}>
              <Text style={{ fontWeight: 700 }}>{TOOL_LABEL[t]}</Text>
              {` — ${scanN} ${scanN === 1 ? "scan" : "scans"}, ${findN} ${
                findN === 1 ? "finding" : "findings"
              }. ${SCANNER_INTRO[t]}`}
            </Lead>
          );
        })}

        <SectionH2 num="1.2">Total Vulnerabilities</SectionH2>
        <Lead>
          Below are the total number of vulnerabilities found by severity.
          Critical vulnerabilities are the most severe and should be evaluated
          first.
        </Lead>
        <SeverityCards counts={data.aggregateSeverityCounts} />

        <SectionH2 num="1.3">Report Coverage</SectionH2>
        <Lead>
          This report includes findings for {targets.length}{" "}
          {targets.length === 1 ? "target" : "targets"} scanned. Each target is
          a single URL, IP address, or fully qualified domain name (FQDN).
        </Lead>
        <StatPanel items={coverageItems} />
      </HostedPage>

      {/* 2. Vulnerabilities By Target */}
      <HostedPage
        sectionName="Vulnerabilities By Target"
        date={data.generatedAt}
      >
        <SectionH1 num={2}>Vulnerabilities By Target</SectionH1>
        <Lead>
          This section contains the vulnerability findings for each scanned
          target. Prioritization should be given to the targets with the highest
          severity vulnerabilities.
        </Lead>

        <SectionH2 num="2.1">Targets Summary</SectionH2>
        <Lead>
          The number of potential vulnerabilities found for each target by
          severity.
        </Lead>
        <TargetsSummaryTable
          rows={byTarget.map((t) => ({ target: t.target, counts: t.counts }))}
        />

        <SectionH2 num="2.2">Target Breakdowns</SectionH2>
        <Lead>
          Details for the potential vulnerabilities found for each target.
        </Lead>
        {byTarget.map((t) => (
          <View key={t.target} style={{ marginTop: 14 }}>
            {/* Keep the cards together, but let the (potentially long) table
                flow across pages — its rows are individually wrap={false}. */}
            <View wrap={false}>
              <SeverityCards counts={t.counts} />
            </View>
            <View style={{ marginTop: 6 }}>
              <BreakdownTable findings={t.findings} />
            </View>
          </View>
        ))}
      </HostedPage>

      {/* 3..N per-scanner-type sections (all scans of a type aggregated) */}
      {groups.map((group, i) => (
        <HostedPage
          key={group.scannerType}
          sectionName={SCANNER_SECTION_TITLE[group.scannerType]}
          date={data.generatedAt}
        >
          <ScannerSection num={scannerStart + i} group={group} />
        </HostedPage>
      ))}

      {/* Glossary */}
      <HostedPage sectionName="Glossary" date={data.generatedAt}>
        <SectionH1 num={glossaryNum}>Glossary</SectionH1>
        <GlossaryTwoCol rows={glossary} />
      </HostedPage>

      <BackCover />
    </Document>
  );
}
