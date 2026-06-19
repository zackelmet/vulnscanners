// Shared report primitives — used by ScanReport.tsx and any future templates.

import React from "react";
import { Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { C, T, S, Severity } from "./_theme";
import { RadialFlourish } from "./_radial-flourish";

// react-pdf needs absolute file paths when running in a Next.js server route.
// process.cwd() at runtime is the project root.
const LOGO_PATH = path.join(process.cwd(), "public", "vulnscanners-logo.png");

// ── Cover ────────────────────────────────────────────────────────────────────

export function CoverPage({
  scannerType,
  target,
  date,
  titleOverride,
  metaRows,
}: {
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  date: Date;
  /** When set, replaces the scanner-derived title (used by combined reports). */
  titleOverride?: string;
  /** Small-caps metadata rows under the title. Defaults to Target + Date. */
  metaRows?: { label: string; value: string }[];
}) {
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const titles: Record<typeof scannerType, string> = {
    nmap: "Network Scan Report",
    nuclei: "Vulnerability Scan Report",
    zap: "Web Application Scan Report",
  };
  const rows = metaRows ?? [
    { label: "Target", value: target },
    { label: "Date", value: dateStr },
  ];
  return (
    <Page size="LETTER" style={coverStyles.page}>
      <RadialFlourish />

      {/* Top-left logo + wordmark */}
      <View style={coverStyles.topBar}>
        <Image src={LOGO_PATH} style={coverStyles.logo} />
        <Text style={coverStyles.wordmark}>vulnscanners</Text>
      </View>

      {/* Title + hairline rule + small-caps metadata */}
      <View style={coverStyles.center}>
        <Text style={coverStyles.title}>
          {titleOverride ?? titles[scannerType]}
        </Text>
        <View style={coverStyles.rule} />
        <View style={coverStyles.metaBlock}>
          {rows.map((r) => (
            <View key={r.label} style={coverStyles.metaRow}>
              <Text style={coverStyles.metaLabel}>{r.label.toUpperCase()}</Text>
              <Text style={coverStyles.metaValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

const coverStyles = StyleSheet.create({
  page: {
    backgroundColor: C.navy,
    color: C.white,
    fontFamily: "IBM Plex Sans",
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: { width: 18, height: 18 },
  wordmark: {
    color: C.white,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  center: {
    position: "absolute",
    top: 230,
    left: 56,
    right: 56,
    alignItems: "flex-start",
  },
  title: {
    color: C.white,
    fontSize: T.cover.title,
    fontWeight: 300,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  rule: {
    width: 300,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 20,
  },
  metaBlock: {},
  metaRow: { flexDirection: "row", marginBottom: 7 },
  metaLabel: {
    width: 72,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: C.whiteMute,
    fontWeight: 600,
  },
  metaValue: { fontSize: 11, color: C.whiteSoft },
});

// ── Footer (content pages) ───────────────────────────────────────────────────

export function PageFooter({
  scannerType,
  target,
  date,
  labelOverride,
}: {
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  date: Date;
  /** When set, replaces the scanner-derived footer label. */
  labelOverride?: string;
}) {
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const label =
    labelOverride ??
    `${scannerType[0].toUpperCase() + scannerType.slice(1)} Scan Report`;
  return (
    <View style={footerStyles.bar} fixed>
      <View style={footerStyles.left}>
        <Image src={LOGO_PATH} style={footerStyles.logo} />
        <Text style={footerStyles.text}>
          {label} <Text style={footerStyles.sep}>|</Text> {target}{" "}
          <Text style={footerStyles.sep}>·</Text> {dateStr}
        </Text>
      </View>
      <Text
        style={footerStyles.pageNum}
        render={({ pageNumber }) => `${pageNumber}`}
      />
    </View>
  );
}

const footerStyles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.divider,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 6 },
  logo: { width: 9, height: 9 },
  text: { color: C.ink3, fontSize: T.footer },
  sep: { color: C.ink4 },
  pageNum: { color: C.ink3, fontSize: T.footer },
});

// ── Content page wrapper ─────────────────────────────────────────────────────

export function ContentPage({
  scannerType,
  target,
  date,
  children,
  footerLabel,
}: {
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  date: Date;
  children: React.ReactNode;
  /** Overrides the footer label (used by combined reports). */
  footerLabel?: string;
}) {
  return (
    <Page size="LETTER" style={contentStyles.page}>
      <View style={contentStyles.body}>{children}</View>
      <PageFooter
        scannerType={scannerType}
        target={target}
        date={date}
        labelOverride={footerLabel}
      />
    </Page>
  );
}

const contentStyles = StyleSheet.create({
  page: {
    backgroundColor: C.page,
    color: C.ink,
    fontFamily: "IBM Plex Sans",
    paddingTop: S.page.top,
    paddingBottom: S.page.bottom + 30, // leave room for fixed footer
    paddingLeft: S.page.left,
    paddingRight: S.page.right,
  },
  body: { flexGrow: 1 },
});

// ── Headings ─────────────────────────────────────────────────────────────────

export function Heading1({ children }: { children: React.ReactNode }) {
  return <Text style={hStyles.h1}>{children}</Text>;
}
export function Heading2({ children }: { children: React.ReactNode }) {
  return <Text style={hStyles.h2}>{children}</Text>;
}
export function Heading3({ children }: { children: React.ReactNode }) {
  return <Text style={hStyles.h3}>{children}</Text>;
}
export function Paragraph({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: any;
}) {
  return (
    <Text style={[hStyles.p, muted && hStyles.pMuted, style].filter(Boolean)}>
      {children}
    </Text>
  );
}

const hStyles = StyleSheet.create({
  h1: {
    fontSize: T.h1,
    fontWeight: 700,
    color: C.ink,
    letterSpacing: -0.3,
    marginBottom: S.section,
  },
  h2: {
    fontSize: T.h2,
    fontWeight: 700,
    color: C.ink,
    letterSpacing: -0.2,
    marginTop: S.section,
    marginBottom: S.subSection,
  },
  h3: {
    fontSize: T.h3,
    fontWeight: 700,
    color: C.ink,
    marginTop: S.subSection,
    marginBottom: S.para,
  },
  p: {
    fontSize: T.body,
    color: C.ink2,
    lineHeight: 1.5,
    marginBottom: S.para,
  },
  pMuted: { color: C.ink3 },
});

// ── Severity pill ────────────────────────────────────────────────────────────

export function SeverityPill({
  severity,
  fixed,
}: {
  severity: Severity;
  fixed?: boolean;
}) {
  const palette = fixed ? C.sev.fixed : C.sev[severity];
  const label = severity[0].toUpperCase() + severity.slice(1);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingVertical: 2,
        paddingHorizontal: 8,
        backgroundColor:
          severity === "critical" && !fixed ? palette.fill : "transparent",
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <Text
        style={{
          color: palette.text,
          fontSize: T.pill,
          fontWeight: 500,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Code block ───────────────────────────────────────────────────────────────

export function CodeBlock({ children }: { children: string }) {
  return (
    <View
      style={{
        backgroundColor: C.panel,
        borderWidth: 0.5,
        borderColor: C.panelBorder,
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginVertical: 6,
      }}
    >
      <Text
        style={{
          fontFamily: "Courier",
          fontSize: T.code,
          color: C.ink2,
          lineHeight: 1.45,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

// ── Bulleted list ────────────────────────────────────────────────────────────

export function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <View style={{ marginTop: 4, marginBottom: S.para }}>
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            marginBottom: 4,
            paddingLeft: 4,
          }}
        >
          <Text style={{ fontSize: T.body, color: C.ink2, marginRight: 6 }}>
            •
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: T.body,
              color: C.ink2,
              lineHeight: 1.5,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
