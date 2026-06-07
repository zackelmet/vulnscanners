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
  StatPanel,
  ScannerSection,
  GlossaryTwoCol,
  BackCover,
  SCANNER_SECTION_TITLE,
} from "./_hosted";

const COVERAGE_LABEL: Record<string, string> = {
  zap: "Web App Vulnerabilities",
  nmap: "Network / Port Findings",
  nuclei: "Nuclei Vulnerabilities",
};

export function ScanReport({ data }: { data: ScanReportData }) {
  const total = data.findings.length;

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

        <SectionH2 num="1.1">Total Vulnerabilities</SectionH2>
        <Lead>
          Below are the total number of vulnerabilities found by severity.
          Critical vulnerabilities are the most severe and should be evaluated
          first.
        </Lead>
        <SeverityCards counts={data.severityCounts} />

        <SectionH2 num="1.2">Report Coverage</SectionH2>
        <Lead>
          This report includes findings for 1 target scanned. Each target is a
          single URL, IP address, or fully qualified domain name (FQDN).
        </Lead>
        <StatPanel
          items={[
            { value: 1, label: "Total Targets" },
            { value: total, label: COVERAGE_LABEL[data.scannerType] },
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
          scan={{
            scannerType: data.scannerType,
            target: data.target,
            data: {
              severityCounts: data.severityCounts,
              findings: data.findings,
              completedAt: data.completedAt,
            },
          }}
        />
      </HostedPage>

      {/* 3. Glossary */}
      <HostedPage sectionName="Glossary" date={data.completedAt}>
        <SectionH1 num={3}>Glossary</SectionH1>
        <GlossaryTwoCol rows={data.glossary} />
      </HostedPage>

      <BackCover />
    </Document>
  );
}
