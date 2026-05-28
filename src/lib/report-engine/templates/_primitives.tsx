// Shared report primitives — used by ScanReport.tsx and any future templates.

import React from "react";
import {
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
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
}: {
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  date: Date;
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
  return (
    <Page size="LETTER" style={coverStyles.page}>
      <RadialFlourish />

      {/* Top-left logo + wordmark */}
      <View style={coverStyles.topBar}>
        <Image src={LOGO_PATH} style={coverStyles.logo} />
        <Text style={coverStyles.wordmark}>vulnscanners</Text>
      </View>

      {/* Centered title block */}
      <View style={coverStyles.center}>
        <View style={coverStyles.datePill}>
          <Text style={coverStyles.datePillText}>{dateStr}</Text>
        </View>
        <Text style={coverStyles.title}>{titles[scannerType]}</Text>
        <Text style={coverStyles.subtitle}>For {target}</Text>
      </View>
    </Page>
  );
}

const coverStyles = StyleSheet.create({
  page: {
    backgroundColor: C.navy,
    color: C.white,
    fontFamily: "Helvetica",
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
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  center: {
    position: "absolute",
    top: 240,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  datePill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.blueBorder,
    marginBottom: 18,
  },
  datePillText: { color: C.blueLight, fontSize: T.cover.datePill },
  title: {
    color: C.white,
    fontSize: T.cover.title,
    fontWeight: 700,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: { color: C.whiteMute, fontSize: T.cover.subtitle },
});

// ── Footer (content pages) ───────────────────────────────────────────────────

export function PageFooter({
  scannerType,
  target,
  date,
}: {
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  date: Date;
}) {
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const label = `${scannerType[0].toUpperCase() + scannerType.slice(1)} Scan Report`;
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
}: {
  scannerType: "nmap" | "nuclei" | "zap";
  target: string;
  date: Date;
  children: React.ReactNode;
}) {
  return (
    <Page size="LETTER" style={contentStyles.page}>
      <View style={contentStyles.body}>{children}</View>
      <PageFooter scannerType={scannerType} target={target} date={date} />
    </Page>
  );
}

const contentStyles = StyleSheet.create({
  page: {
    backgroundColor: C.page,
    color: C.ink,
    fontFamily: "Helvetica",
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

// ── Severity-distribution bar chart ──────────────────────────────────────────

export function SeverityChart({
  counts,
}: {
  counts: Record<Severity, number>;
}) {
  // Aikido chart shows Critical/High/Medium/Low only — info is implicit.
  const buckets: { key: Exclude<Severity, "info">; label: string; color: string }[] = [
    { key: "critical", label: "Critical", color: C.chart.critical },
    { key: "high", label: "High", color: C.chart.high },
    { key: "medium", label: "Medium", color: C.chart.medium },
    { key: "low", label: "Low", color: C.chart.low },
  ];
  const max = Math.max(1, ...buckets.map((b) => counts[b.key] ?? 0));
  // Round the Y axis to a nice ceiling (1, 3, 7, 10, ...).
  const nice = max <= 1 ? 1 : max <= 3 ? 3 : max <= 7 ? 7 : Math.ceil(max / 10) * 10;
  const chartH = 100;
  const colW = 110;
  const gap = 8;
  const totalW = buckets.length * colW + (buckets.length - 1) * gap;

  return (
    <View style={{ marginVertical: 8 }}>
      {/* Plot area */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: chartH,
          paddingLeft: 20,
        }}
      >
        {/* Y-axis ticks (drawn as text on the left) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 18,
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingRight: 4,
          }}
        >
          <Text style={{ fontSize: 7.5, color: C.ink4 }}>{nice}</Text>
          <Text style={{ fontSize: 7.5, color: C.ink4 }}>
            {Math.round(nice / 2)}
          </Text>
          <Text style={{ fontSize: 7.5, color: C.ink4 }}>0</Text>
        </View>
        {/* Bars */}
        {buckets.map((b, i) => {
          const value = counts[b.key] ?? 0;
          const h = Math.max(value === 0 ? 0 : 6, (value / nice) * chartH);
          return (
            <View
              key={b.key}
              style={{
                width: colW,
                marginLeft: i === 0 ? 0 : gap,
                alignItems: "center",
                justifyContent: "flex-end",
                height: chartH,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: h,
                  backgroundColor: b.color,
                  borderRadius: 1,
                }}
              />
            </View>
          );
        })}
      </View>
      {/* Labels row */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 0,
          paddingLeft: 20,
          backgroundColor: C.panel,
          borderTopWidth: 0.5,
          borderTopColor: C.panelBorder,
          borderBottomWidth: 0.5,
          borderBottomColor: C.panelBorder,
        }}
      >
        {buckets.map((b, i) => (
          <View
            key={b.key}
            style={{
              width: colW,
              marginLeft: i === 0 ? 0 : gap,
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: T.body, color: C.ink, fontWeight: 500 }}>
              {b.label}
            </Text>
          </View>
        ))}
      </View>
      {/* Counts row */}
      <View style={{ flexDirection: "row", paddingLeft: 20 }}>
        {buckets.map((b, i) => (
          <View
            key={b.key}
            style={{
              width: colW,
              marginLeft: i === 0 ? 0 : gap,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: T.body, color: C.ink2 }}>
              {counts[b.key] ?? 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
