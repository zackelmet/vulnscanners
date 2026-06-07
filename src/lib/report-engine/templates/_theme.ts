// VulnScanners report theme — colors, type scale, spacing.
// Mirrors the Aikido pentest layout but swaps the accent to our brand blue.

export const C = {
  // Cover / dark surfaces
  navy: "#0a141f",
  navyDeep: "#07090d",
  navy2: "#0f1d2e",

  // Brand
  blue: "#0366d6",
  blueLight: "#4493f8",
  blueWash: "rgba(3,102,214,0.10)",
  blueBorder: "rgba(3,102,214,0.30)",

  // Text on light pages
  ink: "#0a141f",
  ink2: "#374151",
  ink3: "#6b7280",
  ink4: "#9ca3af",

  // Text on dark cover
  white: "#ffffff",
  whiteSoft: "#e6edf5",
  whiteMute: "#9aa5b6",

  // Surfaces
  page: "#ffffff",
  panel: "#f7f8fa",
  panelBorder: "#e5e7eb",
  divider: "#e5e7eb",

  // Severity (filled cell + pill text + pill border)
  sev: {
    critical: { fill: "#fde2e2", border: "#f3b4b4", text: "#b91c1c" },
    high: { fill: "#feefdf", border: "#fbcc88", text: "#b45309" },
    medium: { fill: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
    low: { fill: "#d1fae5", border: "#86efac", text: "#047857" },
    info: { fill: "#f3f4f6", border: "#d1d5db", text: "#374151" },
    accepted: { fill: "#dcfce7", border: "#86efac", text: "#15803d" },
    fixed: { fill: "#f3f4f6", border: "#d1d5db", text: "#6b7280" },
  },

  // Chart bar colors
  chart: {
    critical: "#c026d3",
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#eab308",
    info: "#9ca3af",
    accepted: "#22c55e",
  },

  // HostedScan-style severity palette — solid accent (cards, dots, % bar) and a
  // light tint (card backgrounds). Keyed by Severity.
  sevColor: {
    critical: "#c026d3",
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#eab308",
    info: "#9ca3af",
    accepted: "#22c55e",
  },
  sevTint: {
    critical: "#fdf4ff",
    high: "#fef2f2",
    medium: "#fffbeb",
    low: "#fefce8",
    info: "#f9fafb",
    accepted: "#f0fdf4",
  },
} as const;

// Type scale — keep in points (react-pdf uses 1pt = 1/72 inch)
export const T = {
  cover: { title: 36, subtitle: 14, datePill: 10, logo: 12 },
  h1: 24,
  h2: 16,
  h3: 12,
  body: 10.5,
  small: 9,
  footer: 8.5,
  code: 8.5,
  pill: 9,
} as const;

// Spacing scale
export const S = {
  page: { top: 56, bottom: 56, left: 56, right: 56 },
  // Vertical rhythm between blocks
  section: 24,
  subSection: 14,
  para: 8,
  finding: { headingGap: 4, blockGap: 12 },
} as const;

export type Severity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "accepted";

// Display order for severity rows/cards (most → least severe, then accepted).
export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "accepted",
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
  accepted: "Accepted",
};
