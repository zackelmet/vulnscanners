// Combined multi-scan report in HostedScan structure: cover → TOC → Executive
// Summary → Vulnerabilities By Target → one section per scanner → Glossary →
// back cover.

import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import { ScanReportData, Severity, ReportFinding } from "../report-data";
import { ScannerType } from "../types";
import { normalizeHost } from "../../scans/host";
import { C, SEVERITY_ORDER } from "./_theme";
import { CoverPage } from "./_primitives";
import {
  HostedPage,
  TableOfContents,
  SectionH1,
  SectionH2,
  Lead,
  SeverityCards,
  SeverityBarChart,
  KeyRisksCallout,
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
  TocEntry,
  findingNoun,
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
  // Group by normalized host so the same target stored differently per scanner
  // (ZAP keeps https://, Nmap/Nuclei strip it) counts and renders as one.
  const targets = Array.from(
    new Set(data.scans.map((s) => normalizeHost(s.target))),
  );
  const subtitle = `${data.scans.length} ${
    data.scans.length === 1 ? "scan" : "scans"
  } across ${targets.length} ${targets.length === 1 ? "target" : "targets"}`;
  const anyScanner: ScannerType = data.scans[0]?.scannerType ?? "nuclei";

  // Per-target aggregate severity counts (for the by-target table + breakdowns).
  const byTarget = targets.map((t) => {
    const scans = data.scans.filter((s) => normalizeHost(s.target) === t);
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

  // Top findings by severity, surfaced as the "Key Risks" callout.
  const topRisks = data.scans
    .flatMap((s) =>
      s.data.findings.map((f) => ({
        title: f.title,
        severity: f.severity,
        target: normalizeHost(s.target),
      })),
    )
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    )
    .slice(0, 3);

  // Confidentiality recipient: a single host reads cleanly; many → generic.
  const confidentialFor =
    targets.length === 1 ? targets[0] : "the intended recipient";

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
        target: normalizeHost(s.target),
        completedAt: s.data.completedAt,
      }));
    });
    return { scannerType: type, counts, items };
  }).filter((g): g is ScannerGroup => g !== null);

  // Give each finding a unique detail anchor so breakdown rows — both in the
  // per-scanner sections and the by-target section — link down to its detail.
  const anchorByFinding = new Map<ReportFinding, string>();
  groups.forEach((g, gi) => {
    g.items.forEach((it, ii) => {
      it.anchor = `find-${gi}-${ii}`;
      anchorByFinding.set(it.finding, it.anchor);
    });
  });

  // Section numbering: 1 Exec, 2 By Target, 3..N scanner types, last Glossary.
  const scannerStart = 3;
  const glossaryNum = scannerStart + groups.length;

  const tocEntries: TocEntry[] = [
    { id: "s1", label: "1", title: "Executive Summary" },
    { id: "s1-1", label: "1.1", title: "Assessment Methodology", sub: true },
    { id: "s1-2", label: "1.2", title: "Total Vulnerabilities", sub: true },
    { id: "s1-3", label: "1.3", title: "Report Coverage", sub: true },
    { id: "s2", label: "2", title: "Vulnerabilities By Target" },
    { id: "s2-1", label: "2.1", title: "Targets Summary", sub: true },
    { id: "s2-2", label: "2.2", title: "Target Breakdowns", sub: true },
    ...groups.flatMap((g, i) => {
      const n = scannerStart + i;
      const noun = findingNoun(g.scannerType);
      const subs: TocEntry[] = [
        { id: `s${n}-1`, label: `${n}.1`, title: noun.total, sub: true },
        { id: `s${n}-2`, label: `${n}.2`, title: noun.breakdown, sub: true },
      ];
      if (g.items.length > 0) {
        subs.push({
          id: `s${n}-3`,
          label: `${n}.3`,
          title: noun.details,
          sub: true,
        });
      }
      return [
        {
          id: `s${n}`,
          label: `${n}`,
          title: SCANNER_SECTION_TITLE[g.scannerType],
        },
        ...subs,
      ];
    }),
    { id: `s${glossaryNum}`, label: `${glossaryNum}`, title: "Glossary" },
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
        titleOverride="Combined Vulnerability Assessment"
        confidentialFor={confidentialFor}
        metaRows={[
          {
            label: "Targets",
            value:
              targets.length === 1 ? targets[0] : `${targets.length} targets`,
          },
          {
            label: "Date",
            value: data.generatedAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          },
          {
            label: "Scans",
            value: `${data.scans.length} — ${toolList.join(", ")}`,
          },
        ]}
      />

      <HostedPage sectionName="Table of Contents" date={data.generatedAt}>
        <TableOfContents entries={tocEntries} />
      </HostedPage>

      {/* 1. Executive Summary */}
      <HostedPage sectionName="Executive Summary" date={data.generatedAt}>
        <SectionH1 num={1} id="s1">
          Executive Summary
        </SectionH1>
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

        <KeyRisksCallout risks={topRisks} />

        <SectionH2 num="1.1" id="s1-1">
          Assessment Methodology
        </SectionH2>
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

        {/* Start the distribution on a fresh page so the cards + bar chart stay
            together instead of the chart orphaning to the top of a page. */}
        <View break wrap={false}>
          <SectionH2 num="1.2" id="s1-2">
            Total Vulnerabilities
          </SectionH2>
          <Lead>
            Below are the total number of vulnerabilities found by severity.
            Critical vulnerabilities are the most severe and should be evaluated
            first.
          </Lead>
          <SeverityCards counts={data.aggregateSeverityCounts} />
          <SeverityBarChart counts={data.aggregateSeverityCounts} />
        </View>

        <SectionH2 num="1.3" id="s1-3">
          Report Coverage
        </SectionH2>
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
        <SectionH1 num={2} id="s2">
          Vulnerabilities By Target
        </SectionH1>
        <Lead>
          This section contains the vulnerability findings for each scanned
          target. Prioritization should be given to the targets with the highest
          severity vulnerabilities.
        </Lead>

        <SectionH2 num="2.1" id="s2-1">
          Targets Summary
        </SectionH2>
        <Lead>
          The number of potential vulnerabilities found for each target by
          severity.
        </Lead>
        <TargetsSummaryTable
          rows={byTarget.map((t) => ({ target: t.target, counts: t.counts }))}
        />

        <SectionH2 num="2.2" id="s2-2">
          Target Breakdowns
        </SectionH2>
        <Lead>
          Details for the potential vulnerabilities found for each target.
        </Lead>
        {byTarget.map((t) => (
          <View key={t.target} style={{ marginTop: 14 }}>
            {/* Keep the cards together, but let the (potentially long) table
                flow across pages — its rows are individually wrap={false}. */}
            <View wrap={false}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.ink,
                  marginBottom: 6,
                }}
              >
                {t.target}
              </Text>
              <SeverityCards counts={t.counts} />
            </View>
            <View style={{ marginTop: 6 }}>
              <BreakdownTable
                findings={t.findings}
                linkResolver={(f) => anchorByFinding.get(f)}
              />
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
        <SectionH1 num={glossaryNum} id={`s${glossaryNum}`}>
          Glossary
        </SectionH1>
        <GlossaryTwoCol rows={glossary} />
      </HostedPage>

      <BackCover confidentialFor={confidentialFor} />
    </Document>
  );
}
