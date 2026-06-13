// VulnScanners report theme — colors, type scale, spacing.
// Brand-distinct: deeper severity ramp (Info tied to brand blue), tag-based
// severity markers, accent-rail finding cards, brand-chip section numbers.

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

  // Severity (filled tag bg + tag text + tag border). Deeper, more serious than
  // the HostedScan ramp; Info pulled toward the brand blue.
  sev: {
    critical: { fill: "#fee2e2", border: "#fca5a5", text: "#b91c1c" },
    high: { fill: "#ffedd5", border: "#fdba74", text: "#c2410c" },
    medium: { fill: "#fef3c7", border: "#fcd34d", text: "#b45309" },
    low: { fill: "#fef9c3", border: "#fde047", text: "#a16207" },
    info: { fill: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
    accepted: { fill: "#dcfce7", border: "#86efac", text: "#15803d" },
    fixed: { fill: "#f3f4f6", border: "#d1d5db", text: "#6b7280" },
  },

  // Chart bar colors — match the solid severity ramp below.
  chart: {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#d97706",
    low: "#ca8a04",
    info: "#2563eb",
    accepted: "#16a34a",
  },

  // Solid severity accent (cards, tags, rails, % bar) and a light tint (card
  // backgrounds). A deeper `-600` ramp with Info tied to the brand blue — our
  // own ramp, not the HostedScan magenta/red set. Keyed by Severity.
  sevColor: {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#d97706",
    low: "#ca8a04",
    info: "#2563eb",
    accepted: "#16a34a",
  },
  sevTint: {
    critical: "#fef2f2",
    high: "#fff7ed",
    medium: "#fffbeb",
    low: "#fefce8",
    info: "#eff6ff",
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
