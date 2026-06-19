// HostedScan-style report primitives: numbered sections, severity cards,
// stat panels, breakdown tables, finding details, targets summary, glossary,
// running header/footer, table of contents and back cover. Shared by the
// single-scan and combined report templates.

import React from "react";
import { Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { C, T, Severity, SEVERITY_ORDER, SEVERITY_LABEL } from "./_theme";
import { ReportFinding } from "../report-data";

const LOGO_PATH = path.join(process.cwd(), "public", "vulnscanners-logo.png");

// ── Page chrome ──────────────────────────────────────────────────────────────

/** A content page with a fixed running header + footer (HostedScan style). */
export function HostedPage({
  sectionName,
  breadcrumb,
  date,
  children,
}: {
  sectionName: string;
  breadcrumb?: string;
  date: Date;
  children: React.ReactNode;
}) {
  return (
    <Page size="LETTER" style={st.page}>
      <View style={st.runHead} fixed>
        <Text style={st.runHeadLeft}>
          {sectionName}
          {breadcrumb ? (
            <Text style={st.runHeadCrumb}>{`   |   ${breadcrumb}`}</Text>
          ) : null}
        </Text>
        <Text style={st.runHeadRight}>Vulnerability Scan Report</Text>
      </View>

      <View style={st.body}>{children}</View>

      <View style={st.footer} fixed>
        <Text style={st.footerLink}>vulnscanners.com</Text>
        <Text
          style={st.footerNum}
          render={({ pageNumber }) => `${pageNumber}`}
        />
      </View>
    </Page>
  );
}

// ── Headings ─────────────────────────────────────────────────────────────────

export function SectionH1({
  num,
  children,
}: {
  num: number | string;
  children: React.ReactNode;
}) {
  return (
    <View style={st.h1Row}>
      <View style={st.h1Rule} />
      <Text style={st.h1Num}>{num}</Text>
      <Text style={st.h1}>{children}</Text>
    </View>
  );
}

export function SectionH2({
  num,
  children,
}: {
  num: string;
  children: React.ReactNode;
}) {
  return (
    <Text style={st.h2}>
      <Text style={st.h2Num}>{num} </Text>
      {children}
    </Text>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <Text style={st.lead}>{children}</Text>;
}

export function Note({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={st.note}>
      <Text style={st.noteTitle}>{title}</Text>
      <Text style={st.noteBody}>{children}</Text>
    </View>
  );
}

// ── Severity cards + distribution bar ────────────────────────────────────────

export function SeverityCards({
  counts,
}: {
  counts: Record<Severity, number>;
}) {
  const total = SEVERITY_ORDER.reduce((s, k) => s + (counts[k] || 0), 0);
  // The % bar shows only severities with findings (excludes accepted, which is
  // a triage state, not a risk level).
  const barKeys = SEVERITY_ORDER.filter(
    (k) => k !== "accepted" && (counts[k] || 0) > 0,
  );
  const barTotal = barKeys.reduce((s, k) => s + counts[k], 0) || 1;

  return (
    <View>
      <View style={st.cardRow}>
        {SEVERITY_ORDER.filter((k) => k !== "accepted").map((k) => {
          const v = counts[k] || 0;
          const active = v > 0;
          return (
            <View
              key={k}
              style={[
                st.sevCard,
                active
                  ? {
                      borderColor: C.sevColor[k],
                      borderTopColor: C.sevColor[k],
                      backgroundColor: C.sevTint[k],
                    }
                  : {},
              ]}
            >
              <Text style={st.sevCardLabel}>{SEVERITY_LABEL[k]}</Text>
              <Text
                style={[
                  st.sevCardNum,
                  { color: active ? C.sevColor[k] : C.ink4 },
                ]}
              >
                {v}
              </Text>
            </View>
          );
        })}
      </View>

      {total > 0 && barKeys.length > 0 && (
        <View style={st.bar}>
          {barKeys.map((k, i) => {
            const pct = Math.round((counts[k] / barTotal) * 100);
            return (
              <View
                key={k}
                style={{
                  width: `${(counts[k] / barTotal) * 100}%`,
                  backgroundColor: C.sevColor[k],
                  borderTopLeftRadius: i === 0 ? 3 : 0,
                  borderBottomLeftRadius: i === 0 ? 3 : 0,
                  borderTopRightRadius: i === barKeys.length - 1 ? 3 : 0,
                  borderBottomRightRadius: i === barKeys.length - 1 ? 3 : 0,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 4,
                }}
              >
                {pct >= 12 && <Text style={st.barPct}>{pct}%</Text>}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Stat panel (coverage / counts) ───────────────────────────────────────────

export function StatPanel({
  items,
}: {
  items: { value: React.ReactNode; label: string }[];
}) {
  return (
    <View style={st.statPanel}>
      {items.map((it, i) => (
        <View key={i} style={st.statCell}>
          <Text style={st.statValue}>{it.value}</Text>
          <Text style={st.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Severity dot + label ─────────────────────────────────────────────────────

export function SevDot({ severity }: { severity: Severity }) {
  return (
    <View style={st.sevDotRow}>
      <View style={[st.dot, { backgroundColor: C.sevColor[severity] }]} />
      <Text style={st.sevDotText}>{SEVERITY_LABEL[severity]}</Text>
    </View>
  );
}

// ── Severity tag (filled pill) ───────────────────────────────────────────────
// Our brand marker — replaces the HostedScan dot+label in tables.

export function SevTag({ severity }: { severity: Severity }) {
  const p = C.sev[severity];
  return (
    <View
      style={[st.sevTag, { backgroundColor: p.fill, borderColor: p.border }]}
    >
      <Text style={[st.sevTagText, { color: p.text }]}>
        {SEVERITY_LABEL[severity]}
      </Text>
    </View>
  );
}

// ── Vulnerabilities breakdown table ──────────────────────────────────────────

export function BreakdownTable({
  findings,
  emptyLabel = "No vulnerabilities detected",
}: {
  findings: ReportFinding[];
  emptyLabel?: string;
}) {
  if (findings.length === 0) {
    return (
      <View style={st.table}>
        <Text style={st.emptyRow}>{emptyLabel}</Text>
      </View>
    );
  }
  return (
    <View style={st.table}>
      <View style={[st.tRow, st.tHead]}>
        <Text style={[st.tCell, st.colTitle, st.tHeadText]}>Title</Text>
        <Text style={[st.tCell, st.colSev, st.tHeadText]}>Severity</Text>
      </View>
      {findings.map((f, i) => (
        <View
          key={f.id}
          style={[
            st.tRow,
            i % 2 === 1 ? { backgroundColor: C.panel } : {},
            i === findings.length - 1
              ? {}
              : { borderBottomWidth: 0.5, borderBottomColor: C.panelBorder },
          ]}
          wrap={false}
        >
          <Text style={[st.tCell, st.colTitle, st.link]}>{f.title}</Text>
          <View style={[st.tCell, st.colSev]}>
            <SevTag severity={f.severity} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Targets summary table (combined) ─────────────────────────────────────────

export function TargetsSummaryTable({
  rows,
}: {
  rows: { target: string; counts: Record<Severity, number> }[];
}) {
  return (
    <View style={st.table}>
      <View style={[st.tRow, st.tHead]}>
        <Text style={[st.tCell, st.colTarget, st.tHeadText]}>Target</Text>
        {SEVERITY_ORDER.filter((k) => k !== "accepted").map((k) => (
          <View key={k} style={[st.tCell, st.colSevNum, st.colSevHead]}>
            <View style={[st.dot, { backgroundColor: C.sevColor[k] }]} />
            <Text style={st.tHeadText}>{SEVERITY_LABEL[k]}</Text>
          </View>
        ))}
      </View>
      {rows.map((r, i) => (
        <View
          key={r.target}
          style={[
            st.tRow,
            i === rows.length - 1
              ? {}
              : { borderBottomWidth: 0.5, borderBottomColor: C.panelBorder },
          ]}
          wrap={false}
        >
          <Text style={[st.tCell, st.colTarget, st.link]}>{r.target}</Text>
          {SEVERITY_ORDER.filter((k) => k !== "accepted").map((k) => (
            <Text
              key={k}
              style={[
                st.tCell,
                st.colSevNum,
                { textAlign: "center", color: r.counts[k] ? C.ink : C.ink4 },
              ]}
            >
              {r.counts[k] || 0}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Finding detail ───────────────────────────────────────────────────────────

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={st.detailBlock}>
      <Text style={st.detailH}>{title}</Text>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={st.bulletRow}>
          <Text style={st.bulletDot}>•</Text>
          <Text style={st.bulletText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

export function FindingDetail({
  finding,
  target,
  completedAt,
}: {
  finding: ReportFinding;
  target: string;
  completedAt: Date;
}) {
  const dateStr = completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (
    <View
      style={[st.detail, { borderLeftColor: C.sevColor[finding.severity] }]}
    >
      {/* Title + severity tag */}
      <View style={st.detailTitleRow} wrap={false}>
        <Text style={st.detailTitle}>{finding.title}</Text>
        <SevTag severity={finding.severity} />
      </View>

      {/* Meta row */}
      <View style={st.metaRow} wrap={false}>
        <View style={st.metaCol}>
          <Text style={st.metaLabel}>SEVERITY</Text>
          <Text style={st.metaValue}>{SEVERITY_LABEL[finding.severity]}</Text>
        </View>
        <View style={st.metaCol}>
          <Text style={st.metaLabel}>AFFECTED TARGET</Text>
          <Text style={st.metaValue}>{target}</Text>
        </View>
        <View style={st.metaCol}>
          <Text style={st.metaLabel}>LAST DETECTED</Text>
          <Text style={st.metaValue}>{dateStr}</Text>
        </View>
      </View>
      <View style={st.metaRule} />

      <DetailBlock title="Description">
        <Text style={st.detailBody}>{finding.description}</Text>
      </DetailBlock>

      {finding.businessImpact ? (
        <DetailBlock title="Business Impact">
          <Text style={st.detailBody}>{finding.businessImpact}</Text>
        </DetailBlock>
      ) : null}

      {finding.remediation?.length ? (
        <DetailBlock title="Solution">
          <Bullets items={finding.remediation} />
        </DetailBlock>
      ) : null}

      {finding.howToVerify?.length ? (
        <DetailBlock title="Verification">
          {finding.howToVerify.map((stp, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={st.detailBody}>
                <Text style={st.stepLabel}>{`Step ${i + 1}: `}</Text>
                {stp.text}
              </Text>
              {stp.code ? (
                <View style={st.code}>
                  <Text style={st.codeText}>{stp.code}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </DetailBlock>
      ) : null}

      {finding.references?.length ? (
        <DetailBlock title="References">
          {finding.references.map((r, i) => (
            <Text key={i} style={[st.detailBody, st.link]}>
              {r}
            </Text>
          ))}
        </DetailBlock>
      ) : null}

      {/* Vulnerable target table */}
      <View style={[st.table, { marginTop: 8 }]} wrap={false}>
        <View style={[st.tRow, st.tHead]}>
          <Text style={[st.tCell, st.colTarget, st.tHeadText]}>
            Vulnerable Target
          </Text>
          <Text style={[st.tCell, st.colDate, st.tHeadText]}>
            First Detected
          </Text>
          <Text style={[st.tCell, st.colDate, st.tHeadText]}>
            Last Detected
          </Text>
        </View>
        <View style={st.tRow}>
          <Text style={[st.tCell, st.colTarget, st.link]}>{target}</Text>
          <Text style={[st.tCell, st.colDate]}>{dateStr}</Text>
          <Text style={[st.tCell, st.colDate]}>{dateStr}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Table of contents ────────────────────────────────────────────────────────

export function TableOfContents({
  entries,
}: {
  entries: { num: number; title: string }[];
}) {
  return (
    <View>
      <Text style={st.tocTitle}>Table of Contents</Text>
      <View style={st.tocRule} />
      {entries.map((e) => (
        <View key={e.num} style={st.tocRow}>
          <Text style={st.tocNum}>{e.num}</Text>
          <Text style={st.tocText}>{e.title}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Glossary (two column) ────────────────────────────────────────────────────

export function GlossaryTwoCol({
  rows,
}: {
  rows: { term: string; definition: string }[];
}) {
  const mid = Math.ceil(rows.length / 2);
  const cols = [rows.slice(0, mid), rows.slice(mid)];
  return (
    <View style={st.glossaryRow}>
      {cols.map((col, ci) => (
        <View key={ci} style={st.glossaryCol}>
          {col.map((r) => (
            <View key={r.term} style={st.glossaryItem} wrap={false}>
              <Text style={st.glossaryTerm}>{r.term}</Text>
              <Text style={st.glossaryDef}>{r.definition}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Back cover ───────────────────────────────────────────────────────────────

export function BackCover() {
  return (
    <Page size="LETTER" style={st.backPage}>
      <View style={st.backCenter}>
        <Text style={st.backSmall}>This report was prepared using</Text>
        <View style={st.backLogoRow}>
          <Image src={LOGO_PATH} style={st.backLogo} />
          <Text style={st.backBrand}>VulnScanners</Text>
        </View>
        <Text style={st.backLink}>
          For more information, visit vulnscanners.com
        </Text>
        <Text style={st.backBlurb}>
          VulnScanners runs Nmap, Nuclei, and OWASP ZAP as a fully hosted
          service — launch scans, manage vulnerabilities, and deliver
          client-ready reports without standing up any tooling.
        </Text>
      </View>
    </Page>
  );
}

// ── Scanner section (shared by single + combined) ────────────────────────────

export type ScannerKind = "nmap" | "nuclei" | "zap";

export const SCANNER_SECTION_TITLE: Record<ScannerKind, string> = {
  zap: "Web Application Vulnerabilities",
  nmap: "Open TCP Ports",
  nuclei: "Nuclei Vulnerabilities",
};

// Nmap surfaces open ports, not vulnerabilities — so its report sections read
// "Open Ports" throughout rather than calling every exposed port a "vuln".
export interface FindingNoun {
  total: string;
  totalLead: string;
  breakdown: string;
  breakdownLead: string;
  details: string;
  detailsLead: string;
  empty: string;
  /** Label for the count stat on the coverage panel. */
  coverage: string;
}

export function findingNoun(scannerType: ScannerKind): FindingNoun {
  if (scannerType === "nmap") {
    return {
      total: "Total Open Ports",
      totalLead: "Total number of open ports found by severity.",
      breakdown: "Open Ports Breakdown",
      breakdownLead: "Summary list of all detected open ports.",
      details: "Open Port Details",
      detailsLead:
        "Detailed information about each open port found by the scan.",
      empty: "No open ports detected",
      coverage: "Open Ports",
    };
  }
  return {
    total: "Total Vulnerabilities",
    totalLead: "Total number of vulnerabilities found by severity.",
    breakdown: "Vulnerabilities Breakdown",
    breakdownLead: "Summary list of all detected vulnerabilities.",
    details: "Vulnerability Details",
    detailsLead:
      "Detailed information about each potential vulnerability found by the scan.",
    empty: "No vulnerabilities detected",
    coverage: "Vulnerabilities",
  };
}

export const SCANNER_INTRO: Record<ScannerKind, string> = {
  zap: "The OWASP ZAP scan crawls the pages of a website or web application and inspects each request and response, checking for issues such as cross-domain misconfigurations, missing security headers, injection, and insecure cookies.",
  nmap: "The Nmap TCP port scan discovers open ports and the services running on them, and flags exposed or insecurely configured services on the scanned hosts.",
  nuclei:
    "Nuclei is a fast, template-driven scanner that detects CVEs, misconfigurations, exposures, and security issues across web applications and infrastructure.",
};

// Fixed display order for the per-scanner sections (HostedScan order, minus the
// OpenVAS-powered Network Vulnerabilities section we don't run).
export const SCANNER_ORDER: ScannerKind[] = ["zap", "nmap", "nuclei"];

export interface ScannerGroupItem {
  finding: ReportFinding;
  target: string;
  completedAt: Date;
}

/** All scans of one scanner type, aggregated into a single section. */
export interface ScannerGroup {
  scannerType: ScannerKind;
  counts: Record<Severity, number>;
  items: ScannerGroupItem[];
}

/** One numbered per-scanner-type section: Total Vulnerabilities → Breakdown → Details. */
export function ScannerSection({
  num,
  group,
}: {
  num: number;
  group: ScannerGroup;
}) {
  const findings = group.items.map((i) => i.finding);
  const noun = findingNoun(group.scannerType);
  return (
    <View>
      <SectionH1 num={num}>
        {SCANNER_SECTION_TITLE[group.scannerType]}
      </SectionH1>
      <Lead>{SCANNER_INTRO[group.scannerType]}</Lead>

      <SectionH2 num={`${num}.1`}>{noun.total}</SectionH2>
      <Lead>{noun.totalLead}</Lead>
      <SeverityCards counts={group.counts} />

      <SectionH2 num={`${num}.2`}>{noun.breakdown}</SectionH2>
      <Lead>{noun.breakdownLead}</Lead>
      <BreakdownTable findings={findings} emptyLabel={noun.empty} />

      {group.items.length > 0 && (
        <View>
          <SectionH2 num={`${num}.3`}>{noun.details}</SectionH2>
          <Lead>{noun.detailsLead}</Lead>
          {group.items.map((it, i) => (
            <FindingDetail
              key={`${it.finding.id}-${i}`}
              finding={it.finding}
              target={it.target}
              completedAt={it.completedAt}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  page: {
    backgroundColor: C.page,
    color: C.ink,
    fontFamily: "Helvetica",
    paddingTop: 52,
    paddingBottom: 50,
    paddingHorizontal: 56,
  },
  body: { flexGrow: 1 },

  runHead: {
    position: "absolute",
    top: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  runHeadLeft: { fontSize: T.footer, color: C.ink3 },
  runHeadCrumb: { color: C.ink4 },
  runHeadRight: { fontSize: T.footer, color: C.blueLight },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.divider,
  },
  footerLink: { fontSize: T.footer, color: C.ink3 },
  footerNum: { fontSize: T.footer, color: C.ink3 },

  // headings
  h1Row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  h1Rule: {
    width: 3,
    height: 22,
    borderRadius: 1.5,
    backgroundColor: C.blue,
    marginRight: 12,
  },
  h1Num: {
    fontSize: 18,
    color: C.blue,
    fontWeight: 400,
    marginRight: 10,
  },
  h1: { fontSize: 22, color: C.ink, fontWeight: 700 },
  h2: {
    fontSize: T.h2,
    color: C.ink,
    fontWeight: 700,
    marginTop: 18,
    marginBottom: 6,
  },
  h2Num: { color: C.ink4, fontWeight: 400 },
  lead: { fontSize: T.body, color: C.ink2, lineHeight: 1.5, marginBottom: 6 },

  note: {
    borderWidth: 0.5,
    borderColor: C.panelBorder,
    borderRadius: 8,
    backgroundColor: C.panel,
    padding: 14,
    marginTop: 8,
  },
  noteTitle: {
    fontSize: T.body,
    fontWeight: 700,
    color: C.ink,
    marginBottom: 3,
  },
  noteBody: { fontSize: T.body, color: C.ink2, lineHeight: 1.5 },

  // severity cards
  cardRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  sevCard: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: C.panelBorder,
    borderTopWidth: 3,
    borderTopColor: C.ink4,
    borderRadius: 5,
    backgroundColor: C.page,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  sevCardLabel: { fontSize: 8.5, color: C.ink3, marginBottom: 8 },
  sevCardNum: { fontSize: 26, fontWeight: 700 },

  bar: {
    flexDirection: "row",
    marginTop: 10,
    height: 18,
    borderRadius: 3,
    overflow: "hidden",
  },
  barPct: { fontSize: 8, color: C.white, fontWeight: 700 },

  // stat panel
  statPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 0.5,
    borderColor: C.panelBorder,
    borderRadius: 10,
    backgroundColor: C.panel,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  statCell: { width: "20%", paddingHorizontal: 8, paddingVertical: 6 },
  statValue: { fontSize: 24, fontWeight: 700, color: C.ink },
  statLabel: { fontSize: 8.5, color: C.ink3, marginTop: 2 },

  // severity dot
  sevDotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sevDotText: { fontSize: T.body, color: C.ink2 },

  // severity tag (filled pill)
  sevTag: {
    alignSelf: "flex-start",
    borderWidth: 0.75,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  sevTagText: { fontSize: 8.5, fontWeight: 700, letterSpacing: 0.2 },

  // tables
  table: {
    borderWidth: 0.5,
    borderColor: C.panelBorder,
    borderRadius: 6,
    marginTop: 8,
    overflow: "hidden",
  },
  tRow: { flexDirection: "row", alignItems: "center" },
  tHead: { backgroundColor: C.panel },
  tHeadText: { color: C.ink, fontWeight: 700, fontSize: 9 },
  tCell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: T.body,
    color: C.ink2,
  },
  colTitle: { flex: 1 },
  colTarget: { flex: 1 },
  colSev: { width: 90 },
  colSevNum: {
    width: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  // Header variant: stack the dot above the label with tighter padding so the
  // longest label ("Accepted") fits on one line in the narrow column.
  colSevHead: { flexDirection: "column", gap: 3, paddingHorizontal: 3 },
  colNum: { width: 74, textAlign: "right" },
  colDate: { width: 100 },
  link: { color: C.blueLight },
  emptyRow: { padding: 12, fontSize: T.body, color: C.ink3 },

  // finding detail
  detail: {
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: C.ink4, // overridden per-severity inline
    paddingLeft: 14,
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  detailTitle: { flex: 1, fontSize: 17, fontWeight: 700, color: C.ink },
  metaRow: { flexDirection: "row", gap: 24 },
  metaCol: {},
  metaLabel: {
    fontSize: 7.5,
    color: C.ink4,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: { fontSize: T.body, color: C.ink },
  metaRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.divider,
    marginTop: 12,
    marginBottom: 8,
  },
  detailBlock: { marginTop: 10 },
  detailH: { fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 4 },
  detailBody: {
    fontSize: T.body,
    color: C.ink2,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  stepLabel: { fontWeight: 700, color: C.ink },
  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  bulletDot: { fontSize: T.body, color: C.ink3 },
  bulletText: { flex: 1, fontSize: T.body, color: C.ink2, lineHeight: 1.5 },
  code: {
    backgroundColor: C.panel,
    borderWidth: 0.5,
    borderColor: C.panelBorder,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  codeText: { fontFamily: "Courier", fontSize: T.code, color: C.ink2 },

  // toc
  tocTitle: { fontSize: 28, color: C.ink3, fontWeight: 400, marginBottom: 12 },
  tocRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.divider,
    marginBottom: 8,
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
  },
  tocNum: { fontSize: 13, color: C.blueLight, width: 16 },
  tocText: { fontSize: 13, color: C.ink, fontWeight: 500 },

  // glossary
  glossaryRow: { flexDirection: "row", gap: 28, marginTop: 8 },
  glossaryCol: { flex: 1 },
  glossaryItem: { marginBottom: 12 },
  glossaryTerm: {
    fontSize: 10,
    fontWeight: 700,
    color: C.ink,
    marginBottom: 2,
  },
  glossaryDef: { fontSize: 9, color: C.ink2, lineHeight: 1.45 },

  // back cover
  backPage: {
    backgroundColor: C.page,
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "center",
  },
  backCenter: { alignItems: "center", paddingHorizontal: 80 },
  backSmall: { fontSize: T.body, color: C.ink3, marginBottom: 10 },
  backLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  backLogo: { width: 26, height: 26 },
  backBrand: { fontSize: 22, fontWeight: 700, color: C.ink },
  backLink: { fontSize: T.body, color: C.blueLight, marginBottom: 18 },
  backBlurb: {
    fontSize: 9.5,
    color: C.ink3,
    lineHeight: 1.6,
    textAlign: "center",
  },
});
