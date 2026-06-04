// Combined multi-scan report — one branded PDF consolidating several scans
// across targets: cover, an aggregate executive summary (severity rollup +
// per-scan table), then a detailed section per scan, then shared appendices.

import React from "react";
import { Document, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ScanReportData, Severity } from "../report-data";
import { ScannerType } from "../types";
import { C, T } from "./_theme";
import {
  BulletList,
  ContentPage,
  CoverPage,
  Heading1,
  Heading2,
  Heading3,
  Paragraph,
  SeverityChart,
} from "./_primitives";
import { FindingsTable, FindingDetail } from "./ScanReport";

export interface CombinedReportScan {
  scanId: string;
  scannerType: ScannerType;
  target: string;
  data: ScanReportData;
}

export interface CombinedReportData {
  generatedAt: Date;
  scans: CombinedReportScan[];
  /** Sum of severityCounts across all scans. */
  aggregateSeverityCounts: Record<Severity, number>;
  totalFindings: number;
}

const SCANNER_LABEL: Record<ScannerType, string> = {
  nmap: "Nmap network scan",
  nuclei: "Nuclei vulnerability scan",
  zap: "OWASP ZAP web scan",
};

const FOOTER_LABEL = "Combined Assessment Report";

export function CombinedReport({ data }: { data: CombinedReportData }) {
  const targets = Array.from(new Set(data.scans.map((s) => s.target)));
  const subtitle = `${data.scans.length} ${
    data.scans.length === 1 ? "scan" : "scans"
  } across ${targets.length} ${targets.length === 1 ? "target" : "targets"}`;
  // The footer needs a scannerType for styling only; the label is overridden.
  const anyScanner: ScannerType = data.scans[0]?.scannerType ?? "nuclei";
  const pageProps = {
    scannerType: anyScanner,
    target: subtitle,
    date: data.generatedAt,
    footerLabel: FOOTER_LABEL,
  };

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

      <ContentPage {...pageProps}>
        <CombinedExecutiveSummary data={data} targets={targets} />
      </ContentPage>

      {data.scans.map((scan, i) => (
        <ContentPage key={scan.scanId} {...pageProps}>
          <ScanSection scan={scan} index={i + 1} />
        </ContentPage>
      ))}

      <ContentPage {...pageProps}>
        <CombinedAppendix data={data} targets={targets} />
      </ContentPage>
    </Document>
  );
}

// ── Aggregate executive summary ───────────────────────────────────────────────

function CombinedExecutiveSummary({
  data,
  targets,
}: {
  data: CombinedReportData;
  targets: string[];
}) {
  const dateStr = data.generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <View>
      <Heading1>Executive Summary</Heading1>
      <Paragraph>
        This report consolidates the results of{" "}
        <Text style={{ fontWeight: 500 }}>{data.scans.length}</Text>{" "}
        {data.scans.length === 1 ? "scan" : "scans"} across{" "}
        <Text style={{ fontWeight: 500 }}>{targets.length}</Text>{" "}
        {targets.length === 1 ? "target" : "targets"}, compiled on{" "}
        <Text style={{ fontWeight: 500 }}>{dateStr}</Text>. In aggregate the
        assessment surfaced{" "}
        <Text style={{ fontWeight: 500 }}>{data.totalFindings} findings</Text>{" "}
        across {totalsSummary(data.aggregateSeverityCounts)}.
      </Paragraph>

      <Heading2>Aggregate Severity Distribution</Heading2>
      <SeverityChart counts={data.aggregateSeverityCounts} />

      <Heading2>Scans Included</Heading2>
      <View
        style={{
          borderWidth: 0.5,
          borderColor: C.panelBorder,
          borderRadius: 4,
          marginTop: 8,
        }}
      >
        <View style={[s.row, s.headerRow]}>
          <Text style={[s.cell, s.colNum, s.headerText]}>#</Text>
          <Text style={[s.cell, s.colScanner, s.headerText]}>Scanner</Text>
          <Text style={[s.cell, s.colTarget, s.headerText]}>Target</Text>
          <Text style={[s.cell, s.colCount, s.headerText]}>Findings</Text>
          <Text style={[s.cell, s.colCount, s.headerText]}>Crit/High</Text>
        </View>
        {data.scans.map((scan, i) => {
          const c = scan.data.severityCounts;
          const critHigh = (c.critical || 0) + (c.high || 0);
          const last = i === data.scans.length - 1;
          return (
            <View
              key={scan.scanId}
              style={[
                s.row,
                last
                  ? {}
                  : { borderBottomWidth: 0.5, borderBottomColor: C.panelBorder },
              ]}
            >
              <Text style={[s.cell, s.colNum]}>{i + 1}</Text>
              <Text style={[s.cell, s.colScanner]}>
                {SCANNER_LABEL[scan.scannerType]}
              </Text>
              <Text style={[s.cell, s.colTarget]}>{scan.target}</Text>
              <Text style={[s.cell, s.colCount]}>
                {scan.data.findings.length}
              </Text>
              <Text style={[s.cell, s.colCount]}>{critHigh}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Per-scan section ──────────────────────────────────────────────────────────

function ScanSection({
  scan,
  index,
}: {
  scan: CombinedReportScan;
  index: number;
}) {
  const data = scan.data;
  const detailed = data.findings.filter((f) => f.severity !== "info");
  const dateStr = data.completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <View break={index > 1}>
      <Heading1>
        {index}. {SCANNER_LABEL[scan.scannerType]} — {scan.target}
      </Heading1>
      <Text style={{ fontSize: T.small, color: C.ink3, marginBottom: 4 }}>
        Completed {dateStr} · {data.findings.length} findings ·{" "}
        {totalsSummary(data.severityCounts)}
      </Text>

      <Heading2>
        {index}.1 Vulnerability Distribution
      </Heading2>
      <SeverityChart counts={data.severityCounts} />

      <Heading2>{index}.2 Master Findings Table</Heading2>
      <FindingsTable findings={data.findings} />

      <Heading2>{index}.3 Detailed Findings</Heading2>
      {detailed.length === 0 ? (
        <Paragraph muted>No actionable findings to detail.</Paragraph>
      ) : (
        detailed.map((f, j) => (
          <View key={f.id} break={j > 0} style={{ marginBottom: 18 }}>
            <FindingDetail
              finding={f}
              numberLabel={`${index}.3.${j + 1}`}
              completedAt={data.completedAt}
            />
          </View>
        ))
      )}
    </View>
  );
}

// ── Shared appendix ───────────────────────────────────────────────────────────

function CombinedAppendix({
  data,
  targets,
}: {
  data: CombinedReportData;
  targets: string[];
}) {
  // Union of every scanner's methodology tools, de-duplicated.
  const tools = Array.from(
    new Set(data.scans.flatMap((s) => s.data.methodology.tools)),
  );
  // Merge glossaries, de-duplicating by term.
  const glossaryMap = new Map<string, string>();
  for (const scan of data.scans) {
    for (const row of scan.data.glossary) {
      if (!glossaryMap.has(row.term)) glossaryMap.set(row.term, row.definition);
    }
  }
  const glossary = Array.from(glossaryMap, ([term, definition]) => ({
    term,
    definition,
  }));

  return (
    <View>
      <Heading1>Appendix</Heading1>
      <Heading2>A. Scope & Methodology</Heading2>
      <Paragraph>
        This combined assessment covered the following targets:
      </Paragraph>
      <BulletList items={targets} />
      <Heading3>Tools</Heading3>
      <BulletList items={tools} />

      <Heading2>B. Glossary</Heading2>
      <View
        style={{
          borderWidth: 0.5,
          borderColor: C.panelBorder,
          borderRadius: 4,
        }}
      >
        {glossary.map((row, i) => (
          <View
            key={row.term}
            style={{
              flexDirection: "row",
              borderBottomWidth: i < glossary.length - 1 ? 0.5 : 0,
              borderBottomColor: C.panelBorder,
              paddingVertical: 8,
              paddingHorizontal: 10,
            }}
          >
            <Text
              style={{
                width: 90,
                fontSize: T.body,
                color: C.ink,
                fontWeight: 500,
              }}
            >
              {row.term}
            </Text>
            <Text
              style={{
                flex: 1,
                fontSize: T.body,
                color: C.ink2,
                lineHeight: 1.5,
              }}
            >
              {row.definition}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function totalsSummary(c: Record<Severity, number>): string {
  const parts: string[] = [];
  (["critical", "high", "medium", "low", "info"] as const).forEach((k) => {
    if (c[k] > 0) parts.push(`${c[k]} ${k}`);
  });
  return parts.length ? parts.join(", ") : "no severity-classified findings";
}

const s = StyleSheet.create({
  row: { flexDirection: "row" },
  headerRow: { backgroundColor: C.panel },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: T.body,
    color: C.ink2,
  },
  headerText: { color: C.ink, fontWeight: 500 },
  colNum: { width: 26 },
  colScanner: { width: 150 },
  colTarget: { flex: 1 },
  colCount: { width: 60, textAlign: "right" },
});
