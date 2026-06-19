// Single-scan report in HostedScan structure: cover → TOC → Executive Summary
// → the scanner's section (Total Vulnerabilities / Breakdown / Details) →
// Glossary → back cover. Shares the section building blocks in _hosted.tsx.

import React from "react";
import { Document } from "@react-pdf/renderer";
import { ScanReportData } from "../report-data";
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
  ScannerSection,
  GlossaryTwoCol,
  BackCover,
  SCANNER_SECTION_TITLE,
  findingNoun,
} from "./_hosted";

const SEV_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
  accepted: 5,
};

export function ScanReport({ data }: { data: ScanReportData }) {
  const total = data.findings.length;
  const noun = findingNoun(data.scannerType);
  const topRisks = [...data.findings]
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
    .slice(0, 3)
    .map((f) => ({ title: f.title, severity: f.severity }));

  const tocEntries = [
    { num: 1, title: "Executive Summary" },
    { num: 2, title: SCANNER_SECTION_TITLE[data.scannerType] },
    { num: 3, title: "Glossary" },
  ];

  return (
    <Document
      title={`${data.scannerType} scan report — ${data.target}`}
      author="VulnScanners"
      producer="VulnScanners report engine"
    >
      <CoverPage
        scannerType={data.scannerType}
        target={data.target}
        date={data.completedAt}
        confidentialFor={data.target}
      />

      <HostedPage sectionName="Table of Contents" date={data.completedAt}>
        <TableOfContents entries={tocEntries} />
      </HostedPage>

      {/* 1. Executive Summary */}
      <HostedPage sectionName="Executive Summary" date={data.completedAt}>
        <SectionH1 num={1}>Executive Summary</SectionH1>
        <Lead>
          A vulnerability scan was conducted on {data.target}. This report
          contains the discovered potential vulnerabilities, classified by
          severity. Higher severity indicates a greater risk to the
          confidentiality, integrity, or availability of the target.
        </Lead>

        <KeyRisksCallout risks={topRisks} />

        <SectionH2 num="1.1">{noun.total}</SectionH2>
        <Lead>{noun.totalLead}</Lead>
        <SeverityCards counts={data.severityCounts} />
        <SeverityBarChart counts={data.severityCounts} />

        <SectionH2 num="1.2">Report Coverage</SectionH2>
        <Lead>
          This report includes findings for 1 target scanned. Each target is a
          single URL, IP address, or fully qualified domain name (FQDN).
        </Lead>
        <StatPanel
          items={[
            { value: 1, label: "Total Targets" },
            { value: total, label: noun.coverage },
          ]}
        />
      </HostedPage>

      {/* 2. Scanner section */}
      <HostedPage
        sectionName={SCANNER_SECTION_TITLE[data.scannerType]}
        breadcrumb={data.target}
        date={data.completedAt}
      >
        <ScannerSection
          num={2}
          group={{
            scannerType: data.scannerType,
            counts: data.severityCounts,
            items: data.findings.map((finding) => ({
              finding,
              target: data.target,
              completedAt: data.completedAt,
            })),
          }}
        />
      </HostedPage>

      {/* 3. Glossary */}
      <HostedPage sectionName="Glossary" date={data.completedAt}>
        <SectionH1 num={3}>Glossary</SectionH1>
        <GlossaryTwoCol rows={data.glossary} />
      </HostedPage>

      <BackCover confidentialFor={data.target} />
    </Document>
  );
}
