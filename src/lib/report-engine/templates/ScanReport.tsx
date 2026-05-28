// Full Aikido-style scan report — cover, ToC, executive summary, vulnerability
// distribution, master findings table, detailed findings, appendices.

import React from "react";
import { Document, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ScanReportData } from "../report-data";
import { C, T, S } from "./_theme";
import {
  BulletList,
  CodeBlock,
  ContentPage,
  CoverPage,
  Heading1,
  Heading2,
  Heading3,
  Paragraph,
  SeverityChart,
  SeverityPill,
} from "./_primitives";

// ────────────────────────────────────────────────────────────────────────────
// Top-level Document
// ────────────────────────────────────────────────────────────────────────────

export function ScanReport({ data }: { data: ScanReportData }) {
  const pageProps = {
    scannerType: data.scannerType,
    target: data.target,
    date: data.completedAt,
  };
  return (
    <Document
      title={`${data.scannerType} scan report — ${data.target}`}
      author="VulnScanners"
      producer="VulnScanners report engine"
    >
      <CoverPage {...pageProps} />
      <ContentPage {...pageProps}>
        <TableOfContents />
      </ContentPage>
      <ContentPage {...pageProps}>
        <ExecutiveSummary data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <KeyFindings data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <FindingsOverview data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <MasterFindingsTable data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <DetailedFindings data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <AppendixScope data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <AppendixCoverage data={data} />
      </ContentPage>
      <ContentPage {...pageProps}>
        <AppendixGlossary data={data} />
      </ContentPage>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Table of Contents
// ────────────────────────────────────────────────────────────────────────────

function TableOfContents() {
  const groups: { title: string; items: { label: string; page: number }[] }[] = [
    {
      title: "1. Executive summary",
      items: [
        { label: "1.1 Confidentiality statement", page: 3 },
        { label: "1.2 Report Overview", page: 3 },
        { label: "1.3 Key Findings & Business Impact", page: 4 },
      ],
    },
    {
      title: "2. Findings",
      items: [
        { label: "2.1 Vulnerability Distribution", page: 5 },
        { label: "2.2 Master Findings Table", page: 6 },
        { label: "2.3 Detailed Findings", page: 7 },
      ],
    },
    {
      title: "Appendices",
      items: [
        { label: "A. Scope & Methodology", page: 8 },
        { label: "B. Vulnerability Coverage", page: 9 },
        { label: "C. Glossary", page: 10 },
      ],
    },
  ];

  return (
    <View>
      <Heading1>Table of contents</Heading1>
      <View style={{ marginTop: 10 }}>
        {groups.map((g, gi) => (
          <View
            key={gi}
            style={{
              flexDirection: "row",
              paddingVertical: 16,
              borderBottomWidth: gi < groups.length - 1 ? 0.5 : 0,
              borderBottomColor: C.divider,
            }}
          >
            <View style={{ width: 220 }}>
              <Text
                style={{
                  fontSize: T.h2,
                  fontWeight: 700,
                  color: C.ink,
                  letterSpacing: -0.2,
                }}
              >
                {g.title}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {g.items.map((it, ii) => (
                <View
                  key={ii}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: T.body, color: C.ink2 }}>
                    {it.label}
                  </Text>
                  <Text style={{ fontSize: T.body, color: C.ink2 }}>
                    {it.page}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section 1: Executive Summary
// ────────────────────────────────────────────────────────────────────────────

function ExecutiveSummary({ data }: { data: ScanReportData }) {
  const dateStr = data.completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const scannerLabel: Record<typeof data.scannerType, string> = {
    nmap: "Nmap network scan",
    nuclei: "Nuclei vulnerability scan",
    zap: "OWASP ZAP baseline scan",
  };
  return (
    <View>
      <Heading1>1. Executive Summary</Heading1>
      <Heading2>1.1 Confidentiality statement</Heading2>
      <Paragraph>{data.confidentialityStatement}</Paragraph>

      <Heading2>1.2 Report Overview</Heading2>
      <Paragraph>
        On <Text style={{ fontWeight: 500 }}>{dateStr}</Text>, VulnScanners ran
        a <Text style={{ fontWeight: 500 }}>{scannerLabel[data.scannerType]}</Text>{" "}
        against <Text style={{ fontWeight: 500 }}>{data.target}</Text> to
        identify exposed services, known vulnerabilities, and misconfigurations.
        The assessment surfaced{" "}
        <Text style={{ fontWeight: 500 }}>{data.findings.length} findings</Text>{" "}
        across {totalsSummary(data.severityCounts)}.
      </Paragraph>
      {data.command ? (
        <>
          <Paragraph muted>Command executed by the worker:</Paragraph>
          <CodeBlock>{data.command}</CodeBlock>
        </>
      ) : null}
    </View>
  );
}

function totalsSummary(c: ScanReportData["severityCounts"]): string {
  const parts: string[] = [];
  (["critical", "high", "medium", "low", "info"] as const).forEach((k) => {
    if (c[k] > 0) parts.push(`${c[k]} ${k}`);
  });
  return parts.length ? parts.join(", ") : "no severity-classified findings";
}

// ────────────────────────────────────────────────────────────────────────────
// Section 1.3: Key Findings & Business Impact
// ────────────────────────────────────────────────────────────────────────────

function KeyFindings({ data }: { data: ScanReportData }) {
  return (
    <View>
      <Heading2>1.3 Key Findings & Business Impact</Heading2>
      {data.keyFindings.length === 0 ? (
        <Paragraph muted>
          No high-severity findings identified in this scan.
        </Paragraph>
      ) : (
        data.keyFindings.map((kf, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Heading3>{kf.title}</Heading3>
            <Paragraph>{kf.impact}</Paragraph>
          </View>
        ))
      )}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section 2.1: Vulnerability Distribution
// ────────────────────────────────────────────────────────────────────────────

function FindingsOverview({ data }: { data: ScanReportData }) {
  return (
    <View>
      <Heading1>2. Findings</Heading1>
      <Heading2>2.1 Vulnerability Distribution</Heading2>
      <SeverityChart counts={data.severityCounts} />
      <Paragraph>{data.findingsOverview}</Paragraph>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section 2.2: Master Findings Table
// ────────────────────────────────────────────────────────────────────────────

function MasterFindingsTable({ data }: { data: ScanReportData }) {
  return (
    <View>
      <Heading2>2.2 Master Findings Table</Heading2>
      {data.findings.length === 0 ? (
        <Paragraph muted>No findings to list.</Paragraph>
      ) : (
        <View
          style={{
            borderWidth: 0.5,
            borderColor: C.panelBorder,
            borderRadius: 4,
            marginTop: 8,
          }}
        >
          {/* Header */}
          <View style={tableStyles.headerRow}>
            <Text style={[tableStyles.cell, tableStyles.colId, tableStyles.headerText]}>
              ID
            </Text>
            <Text style={[tableStyles.cell, tableStyles.colTitle, tableStyles.headerText]}>
              Title
            </Text>
            <Text
              style={[tableStyles.cell, tableStyles.colState, tableStyles.headerText]}
            >
              State
            </Text>
            <Text
              style={[
                tableStyles.cell,
                tableStyles.colSev,
                tableStyles.headerText,
              ]}
            >
              Severity
            </Text>
          </View>
          {data.findings.map((f, i) => {
            const fixed = f.state === "Fixed";
            const rowStyle =
              i < data.findings.length - 1
                ? [
                    tableStyles.row,
                    {
                      borderBottomWidth: 0.5,
                      borderBottomColor: C.panelBorder,
                    },
                  ]
                : tableStyles.row;
            const idStyle = fixed
              ? [tableStyles.cell, tableStyles.colId, tableStyles.muted]
              : [tableStyles.cell, tableStyles.colId];
            const titleStyle = fixed
              ? [tableStyles.cell, tableStyles.colTitle, tableStyles.muted]
              : [tableStyles.cell, tableStyles.colTitle];
            const stateStyle = fixed
              ? [tableStyles.cell, tableStyles.colState, tableStyles.muted]
              : [tableStyles.cell, tableStyles.colState];
            return (
              <View key={f.id} style={rowStyle}>
                <Text style={idStyle}>{f.id}</Text>
                <Text style={titleStyle}>{f.title}</Text>
                <Text style={stateStyle}>{f.state}
                </Text>
                <View style={[tableStyles.cell, tableStyles.colSev]}>
                  <SeverityPill severity={f.severity} fixed={fixed} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.panelBorder,
    backgroundColor: C.panel,
  },
  row: { flexDirection: "row" },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: T.body,
    color: C.ink2,
  },
  headerText: { color: C.ink, fontWeight: 500 },
  colId: { width: 50 },
  colTitle: { flex: 1 },
  colState: { width: 80 },
  colSev: { width: 90, justifyContent: "center" },
  muted: { color: C.ink4 },
});

// ────────────────────────────────────────────────────────────────────────────
// Section 2.3: Detailed Findings
// ────────────────────────────────────────────────────────────────────────────

function DetailedFindings({ data }: { data: ScanReportData }) {
  // Info-severity findings (e.g. nmap filtered-port observations) appear in
  // the master findings table but don't get a per-finding detail page —
  // they're observational notes, not actionable items, and a page each would
  // bloat the report.
  const detailed = data.findings.filter((f) => f.severity !== "info");
  return (
    <View>
      <Heading2>2.3 Detailed Findings</Heading2>
      {detailed.length === 0 ? (
        <Paragraph muted>No actionable findings to detail.</Paragraph>
      ) : (
        detailed.map((f, i) => (
          <View key={f.id} break={i > 0} style={{ marginBottom: 18 }}>
            <FindingDetail
              finding={f}
              index={i + 1}
              completedAt={data.completedAt}
            />
          </View>
        ))
      )}
    </View>
  );
}

function FindingDetail({
  finding,
  index,
  completedAt,
}: {
  finding: import("../report-data").ReportFinding;
  index: number;
  completedAt: Date;
}) {
  const date = completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <View>
      <Text
        style={{
          fontSize: T.h2,
          fontWeight: 700,
          color: C.ink,
          letterSpacing: -0.2,
          marginBottom: 8,
        }}
      >
        2.3.{index} {finding.id} – {finding.title}
      </Text>
      <SeverityPill
        severity={finding.severity}
        fixed={finding.state === "Fixed"}
      />
      <Text style={{ fontSize: T.small, color: C.ink3, marginTop: 6 }}>
        Identified on: {date}
      </Text>

      <Heading3>Description</Heading3>
      <Paragraph>{finding.description}</Paragraph>

      <Heading3>Business impact</Heading3>
      <Paragraph>{finding.businessImpact}</Paragraph>

      {finding.howToVerify.length > 0 && (
        <>
          <Heading3>How to verify</Heading3>
          {finding.howToVerify.map((step, si) => (
            <View key={si} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: T.body, color: C.ink2, lineHeight: 1.5 }}>
                <Text style={{ fontWeight: 500, color: C.ink }}>
                  Step {si + 1}:
                </Text>{" "}
                {step.text}
              </Text>
              {step.code ? <CodeBlock>{step.code}</CodeBlock> : null}
            </View>
          ))}
        </>
      )}

      <Heading3>Remediation</Heading3>
      <Paragraph>
        Implement the following measures to address this finding:
      </Paragraph>
      <BulletList items={finding.remediation} />

      {finding.references && finding.references.length > 0 ? (
        <>
          <Heading3>References</Heading3>
          <BulletList items={finding.references} />
        </>
      ) : null}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Appendix A: Scope & Methodology
// ────────────────────────────────────────────────────────────────────────────

function AppendixScope({ data }: { data: ScanReportData }) {
  return (
    <View>
      <Heading1>Appendices</Heading1>
      <Heading2>A. Scope & Methodology</Heading2>
      <Heading3>Methodologies</Heading3>
      <Paragraph>{data.methodology.description}</Paragraph>
      <BulletList items={data.methodology.tools} />
      <Heading3>Scope</Heading3>
      <Paragraph>{data.methodology.scope}</Paragraph>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Appendix B: Vulnerability Coverage
// ────────────────────────────────────────────────────────────────────────────

function AppendixCoverage({ data }: { data: ScanReportData }) {
  return (
    <View>
      <Heading2>B. Vulnerability Coverage</Heading2>
      <Paragraph>
        The scan checked for the following categories of issues. Items in bold
        are headings; the rest are the specific checks performed.
      </Paragraph>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 8,
        }}
      >
        {data.coverage.map((group, i) => (
          <View
            key={i}
            style={{
              width: "48%",
              borderWidth: 0.5,
              borderColor: C.panelBorder,
              borderRadius: 4,
              padding: 10,
            }}
          >
            <Text
              style={{
                fontSize: T.body,
                color: C.ink,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              {group.heading}
            </Text>
            {group.items.map((it, ii) => (
              <Text
                key={ii}
                style={{
                  fontSize: T.body,
                  color: C.ink2,
                  paddingVertical: 3,
                  borderTopWidth: ii === 0 ? 0.5 : 0.5,
                  borderTopColor: C.panelBorder,
                }}
              >
                {it}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Appendix C: Glossary
// ────────────────────────────────────────────────────────────────────────────

function AppendixGlossary({ data }: { data: ScanReportData }) {
  return (
    <View>
      <Heading2>C. Glossary</Heading2>
      <View
        style={{
          borderWidth: 0.5,
          borderColor: C.panelBorder,
          borderRadius: 4,
        }}
      >
        {data.glossary.map((row, i) => (
          <View
            key={row.term}
            style={{
              flexDirection: "row",
              borderBottomWidth: i < data.glossary.length - 1 ? 0.5 : 0,
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
