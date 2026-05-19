// ─── VulnScanners branded PDF report generator ────────────────────────────────
// Uses pdf-lib (pure JS, no headless browser needed) to produce a multi-page
// branded PDF from parsed scanner output.

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
  PageSizes,
} from "pdf-lib";
import { ScanReportPayload } from "./types";
import {
  ParsedHost,
  ParsedPort,
  ParsedNmapReport,
  ParsedNucleiReport,
  ParsedNucleiFinding,
  NucleiSeverity,
  ParsedZapReport,
  ParsedZapAlert,
} from "./types";
import { portRisk, riskLabel, riskColor, RiskLevel } from "./nmap-parser";

// ── Brand colours ──────────────────────────────────────────────────────────────
const C = {
  navy: rgb(0.039, 0.055, 0.082), // #0a0e15
  blue: rgb(0.012, 0.4, 0.843), // #0366d6
  blueLight: rgb(0.267, 0.576, 0.973), // #4493f8
  white: rgb(1, 1, 1),
  offWhite: rgb(0.96, 0.97, 0.98),
  grey100: rgb(0.95, 0.96, 0.97),
  grey300: rgb(0.8, 0.82, 0.84),
  grey500: rgb(0.55, 0.58, 0.62),
  grey700: rgb(0.3, 0.33, 0.37),
  grey900: rgb(0.1, 0.12, 0.15),
  red: rgb(0.863, 0.149, 0.149),
  amber: rgb(0.851, 0.467, 0.024),
  green: rgb(0.133, 0.545, 0.133),
};

const MARGIN = 48;
const PAGE_W = PageSizes.A4[0]; // 595.28
const PAGE_H = PageSizes.A4[1]; // 841.89
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Low-level drawing helpers ──────────────────────────────────────────────────

function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    try {
      if (font.widthOfTextAtSize(next, size) <= maxW) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    } catch {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

interface TextBlock {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxW: number;
  font: PDFFont;
  size: number;
  lineH: number;
  color?: ReturnType<typeof rgb>;
}

/** Draw wrapped text, return new Y below the last line */
function drawText(opts: TextBlock): number {
  const lines = wrapText(opts.text, opts.font, opts.size, opts.maxW);
  let y = opts.y;
  for (const line of lines) {
    opts.page.drawText(line, {
      x: opts.x,
      y,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? C.grey900,
    });
    y -= opts.lineH;
  }
  return y;
}

// ── Page factory ───────────────────────────────────────────────────────────────

interface Fonts {
  bold: PDFFont;
  regular: PDFFont;
  mono: PDFFont;
}

// pdf-lib's StandardFonts (Helvetica/Courier) use WinAnsi (CP1252) encoding,
// which cannot render glyphs like ▲ ▼ → ✓. Map known glyphs to ASCII and
// strip any remaining char outside the WinAnsi range so the report never
// crashes on user-supplied or stylized text.
const WINANSI_MAP: Record<string, string> = {
  "▲": "^",
  "▼": "v",
  "△": "^",
  "▽": "v",
  "→": "->",
  "←": "<-",
  "↑": "^",
  "↓": "v",
  "✓": "Y",
  "✗": "X",
  "✘": "X",
  "★": "*",
  "☆": "*",
};
function toWinAnsi(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code <= 0x7e) {
      out += ch; // printable ASCII (and control chars, fine for drawText)
    } else if (WINANSI_MAP[ch] !== undefined) {
      out += WINANSI_MAP[ch];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += ch; // Latin-1 supplement is WinAnsi-safe (© — • … etc.)
    } else {
      out += "?";
    }
  }
  return out;
}

function addPage(doc: PDFDocument): PDFPage {
  const page = doc.addPage(PageSizes.A4);
  const original = page.drawText.bind(page);
  (page as any).drawText = (text: string, options?: any) =>
    original(toWinAnsi(String(text ?? "")), options);
  return page;
}

function drawPageFooter(page: PDFPage, fonts: Fonts, pageNum: number) {
  const y = 24;
  page.drawText("VulnScanners | Confidential Scan Report", {
    x: MARGIN,
    y,
    size: 8,
    font: fonts.regular,
    color: C.grey500,
  });
  const pn = `Page ${pageNum}`;
  const w = fonts.regular.widthOfTextAtSize(pn, 8);
  page.drawText(pn, {
    x: PAGE_W - MARGIN - w,
    y,
    size: 8,
    font: fonts.regular,
    color: C.grey500,
  });
  page.drawLine({
    start: { x: MARGIN, y: 36 },
    end: { x: PAGE_W - MARGIN, y: 36 },
    thickness: 0.5,
    color: C.grey300,
  });
}

// ── Cover page ─────────────────────────────────────────────────────────────────

function drawCoverPage(
  page: PDFPage,
  fonts: Fonts,
  payload: ScanReportPayload,
  parsed: ParsedNmapReport,
) {
  // Header band
  drawRect(page, 0, PAGE_H - 140, PAGE_W, 140, C.navy);

  // Brand name
  page.drawText("VULNSCANNERS", {
    x: MARGIN,
    y: PAGE_H - 58,
    size: 26,
    font: fonts.bold,
    color: C.white,
  });
  page.drawText("Automated Security Scanning Platform", {
    x: MARGIN,
    y: PAGE_H - 82,
    size: 11,
    font: fonts.regular,
    color: C.blueLight,
  });

  // Accent rule
  drawRect(page, MARGIN, PAGE_H - 100, CONTENT_W, 2, C.blue);

  // "SCAN REPORT" label
  page.drawText("NMAP NETWORK SCAN REPORT", {
    x: MARGIN,
    y: PAGE_H - 120,
    size: 10,
    font: fonts.bold,
    color: C.blueLight,
  });

  // Big target
  let y = PAGE_H - 200;
  page.drawText(payload.target, {
    x: MARGIN,
    y,
    size: 22,
    font: fonts.bold,
    color: C.navy,
  });

  // Meta table
  y -= 36;
  const rows: [string, string][] = [
    ["Scan ID", payload.scanId.slice(0, 16) + "…"],
    ["Scanner", "Nmap (Network Mapper)"],
    ["Hosts Scanned", String(parsed.meta.totalHosts)],
    ["Hosts Up", String(parsed.meta.hostsUp)],
    ["Open Ports Found", String(parsed.meta.openPortsTotal)],
    [
      "Scan Duration",
      parsed.meta.durationSec != null ? `${parsed.meta.durationSec}s` : "—",
    ],
    ["Generated", payload.generatedAt],
  ];

  for (const [label, value] of rows) {
    drawRect(page, MARGIN, y - 4, CONTENT_W, 22, C.grey100);
    page.drawText(label, {
      x: MARGIN + 8,
      y,
      size: 10,
      font: fonts.bold,
      color: C.grey700,
    });
    page.drawText(value, {
      x: MARGIN + 180,
      y,
      size: 10,
      font: fonts.regular,
      color: C.grey900,
    });
    y -= 24;
  }

  // Risk badge summary
  y -= 20;
  const highCount = parsed.hosts
    .flatMap((h) => h.ports)
    .filter((p) => p.state === "open" && portRisk(p) === "high").length;
  const medCount = parsed.hosts
    .flatMap((h) => h.ports)
    .filter((p) => p.state === "open" && portRisk(p) === "medium").length;

  const badges: [string, RiskLevel][] = [
    [`${highCount} HIGH`, "high"],
    [`${medCount} MEDIUM`, "medium"],
  ];

  let bx = MARGIN;
  for (const [label, level] of badges) {
    const col = rgb(
      ...(hexToRgbTuple(riskColor(level)) as [number, number, number]),
    );
    const bw = fonts.bold.widthOfTextAtSize(label, 10) + 20;
    drawRect(page, bx, y - 4, bw, 20, col);
    page.drawText(label, {
      x: bx + 10,
      y: y + 2,
      size: 10,
      font: fonts.bold,
      color: C.white,
    });
    bx += bw + 8;
  }

  // Disclaimer
  page.drawText(
    "This report is confidential and intended solely for the authorised recipient.",
    { x: MARGIN, y: 56, size: 8, font: fonts.regular, color: C.grey500 },
  );
  page.drawText("© VulnScanners — vulnscanners.com", {
    x: MARGIN,
    y: 40,
    size: 8,
    font: fonts.regular,
    color: C.grey500,
  });
}

// ── Host detail pages ──────────────────────────────────────────────────────────

function drawHostSection(
  doc: PDFDocument,
  fonts: Fonts,
  host: ParsedHost,
  pageNum: { n: number },
): void {
  const page = addPage(doc);
  drawPageFooter(page, fonts, ++pageNum.n);

  let y = PAGE_H - MARGIN;

  // Host header bar
  drawRect(page, MARGIN, y - 22, CONTENT_W, 26, C.navy);
  const hostLabel = host.hostname ? `${host.hostname} (${host.ip})` : host.ip;
  page.drawText(hostLabel, {
    x: MARGIN + 8,
    y: y - 16,
    size: 11,
    font: fonts.bold,
    color: C.white,
  });
  const stateLabel = host.state === "up" ? "▲ UP" : "▼ DOWN";
  const stateCol = host.state === "up" ? rgb(0.2, 0.8, 0.4) : C.red;
  const sw = fonts.bold.widthOfTextAtSize(stateLabel, 10);
  page.drawText(stateLabel, {
    x: PAGE_W - MARGIN - sw - 8,
    y: y - 16,
    size: 10,
    font: fonts.bold,
    color: stateCol,
  });
  y -= 36;

  // Host meta
  if (host.latency) {
    page.drawText(`Latency: ${host.latency}`, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: C.grey500,
    });
    y -= 14;
  }
  if (host.os) {
    page.drawText(`OS: ${host.os}`, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: C.grey500,
    });
    y -= 14;
  }
  y -= 8;

  const openPorts = host.ports.filter((p) => p.state === "open");

  if (openPorts.length === 0) {
    page.drawText("No open ports detected.", {
      x: MARGIN,
      y,
      size: 10,
      font: fonts.regular,
      color: C.grey500,
    });
    return;
  }

  // Table header
  drawRect(page, MARGIN, y - 4, CONTENT_W, 20, C.navy);
  const cols = [
    { label: "PORT", x: MARGIN + 8, w: 60 },
    { label: "PROTO", x: MARGIN + 72, w: 48 },
    { label: "STATE", x: MARGIN + 124, w: 56 },
    { label: "SERVICE", x: MARGIN + 184, w: 100 },
    { label: "VERSION", x: MARGIN + 288, w: 160 },
    { label: "RISK", x: MARGIN + 452, w: 48 },
  ];
  for (const col of cols) {
    page.drawText(col.label, {
      x: col.x,
      y: y - 0,
      size: 8,
      font: fonts.bold,
      color: C.white,
    });
  }
  y -= 26;

  // Port rows
  let rowIdx = 0;
  for (const port of openPorts) {
    if (y < MARGIN + 60) {
      // New page
      const np = addPage(doc);
      drawPageFooter(np, fonts, ++pageNum.n);
      y = PAGE_H - MARGIN;
    }

    const risk = portRisk(port);
    const bg = rowIdx % 2 === 0 ? C.offWhite : C.white;
    drawRect(page, MARGIN, y - 4, CONTENT_W, 18, bg);

    const rCol = rgb(
      ...(hexToRgbTuple(riskColor(risk)) as [number, number, number]),
    );

    const cells: [string, number][] = [
      [String(port.port), cols[0].x],
      [port.protocol, cols[1].x],
      [port.state, cols[2].x],
      [port.service, cols[3].x],
      [port.version.slice(0, 38), cols[4].x],
    ];
    for (const [text, cx] of cells) {
      page.drawText(text, {
        x: cx,
        y: y - 0,
        size: 9,
        font: fonts.regular,
        color: C.grey900,
      });
    }
    // Risk badge
    const rLabel = riskLabel(risk).slice(0, 4).toUpperCase();
    const rw = fonts.bold.widthOfTextAtSize(rLabel, 7) + 8;
    drawRect(page, cols[5].x, y - 4, rw, 14, rCol);
    page.drawText(rLabel, {
      x: cols[5].x + 4,
      y: y - 2,
      size: 7,
      font: fonts.bold,
      color: C.white,
    });

    y -= 20;
    rowIdx++;
  }
}

// ── Raw output appendix page ───────────────────────────────────────────────────

function drawAppendix(
  doc: PDFDocument,
  fonts: Fonts,
  rawOutput: string,
  pageNum: { n: number },
) {
  const page = addPage(doc);
  drawPageFooter(page, fonts, ++pageNum.n);

  let y = PAGE_H - MARGIN;

  page.drawText("Appendix — Raw Nmap Output", {
    x: MARGIN,
    y,
    size: 13,
    font: fonts.bold,
    color: C.navy,
  });
  y -= 24;
  drawRect(page, MARGIN, y, CONTENT_W, 1, C.grey300);
  y -= 12;

  const maxChars = 6000;
  const truncated =
    rawOutput.length > maxChars
      ? rawOutput.slice(0, maxChars) + "\n\n[output truncated…]"
      : rawOutput;

  const monoSize = 7.5;
  const lineH = 10;

  for (const line of truncated.split("\n")) {
    if (y < MARGIN + 20) break;
    const safeChars = line.replace(/[^\x20-\x7E]/g, " ");
    page.drawText(safeChars.slice(0, 110), {
      x: MARGIN,
      y,
      size: monoSize,
      font: fonts.mono,
      color: C.grey700,
    });
    y -= lineH;
  }
}

// ── Executive summary page ─────────────────────────────────────────────────────

function drawSummaryPage(
  doc: PDFDocument,
  fonts: Fonts,
  parsed: ParsedNmapReport,
  payload: ScanReportPayload,
  pageNum: { n: number },
) {
  const page = addPage(doc);
  drawPageFooter(page, fonts, ++pageNum.n);

  let y = PAGE_H - MARGIN;

  // Title
  page.drawText("Executive Summary", {
    x: MARGIN,
    y,
    size: 16,
    font: fonts.bold,
    color: C.navy,
  });
  y -= 8;
  drawRect(page, MARGIN, y, CONTENT_W, 2, C.blue);
  y -= 20;

  // Paragraph
  const highCount = parsed.hosts
    .flatMap((h) => h.ports)
    .filter((p) => p.state === "open" && portRisk(p) === "high").length;
  const medCount = parsed.hosts
    .flatMap((h) => h.ports)
    .filter((p) => p.state === "open" && portRisk(p) === "medium").length;

  const summary =
    `VulnScanners performed an automated Nmap network scan against the target ` +
    `"${payload.target}" on ${payload.generatedAt}. ` +
    `The scan identified ${parsed.meta.hostsUp} live host(s) out of ` +
    `${parsed.meta.totalHosts} scanned, with a total of ` +
    `${parsed.meta.openPortsTotal} open port(s) discovered. ` +
    `${highCount > 0 ? `${highCount} port(s) were classified as HIGH risk due to the services exposed (e.g. FTP, Telnet, RDP). ` : ""}` +
    `${medCount > 0 ? `${medCount} port(s) were classified as MEDIUM risk. ` : ""}` +
    `Findings are detailed per-host in the following sections. ` +
    `Raw scanner output is included in the appendix.`;

  y = drawText({
    page,
    text: summary,
    x: MARGIN,
    y,
    maxW: CONTENT_W,
    font: fonts.regular,
    size: 10,
    lineH: 16,
    color: C.grey900,
  });
  y -= 24;

  // Recommendations
  page.drawText("Recommendations", {
    x: MARGIN,
    y,
    size: 13,
    font: fonts.bold,
    color: C.navy,
  });
  y -= 20;

  const recs = [
    "Close or firewall any ports that are not required for business operations.",
    "Disable high-risk services such as FTP, Telnet, and unencrypted SMTP where possible.",
    "Ensure all services are running the latest patched versions.",
    "Implement network segmentation to limit lateral movement.",
    "Consider running periodic scans to detect new exposures.",
  ];

  for (const rec of recs) {
    y = drawText({
      page,
      text: `• ${rec}`,
      x: MARGIN + 8,
      y,
      maxW: CONTENT_W - 16,
      font: fonts.regular,
      size: 10,
      lineH: 15,
      color: C.grey900,
    });
    y -= 4;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateNmapPdf(
  payload: ScanReportPayload,
): Promise<Uint8Array> {
  const parsed = payload.parsedData as ParsedNmapReport;
  const doc = await PDFDocument.create();

  const [boldFont, regularFont, monoFont] = await Promise.all([
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.Courier),
  ]);

  const fonts: Fonts = {
    bold: boldFont,
    regular: regularFont,
    mono: monoFont,
  };

  // 1. Cover
  const cover = addPage(doc);
  drawCoverPage(cover, fonts, payload, parsed);

  const pageNum = { n: 1 };

  // 2. Executive summary
  drawSummaryPage(doc, fonts, parsed, payload, pageNum);

  // 3. Per-host detail pages
  for (const host of parsed.hosts) {
    drawHostSection(doc, fonts, host, pageNum);
  }

  // 4. Raw appendix
  drawAppendix(doc, fonts, parsed.rawOutput, pageNum);

  return doc.save();
}

// ── Shared cover/section helpers used by nuclei & zap reports ─────────────────

function drawScannerCover(
  page: PDFPage,
  fonts: Fonts,
  payload: ScanReportPayload,
  scannerLabel: string,
  metrics: { label: string; value: string; color?: ReturnType<typeof rgb> }[],
) {
  // Brand band
  drawRect(page, 0, PAGE_H - 110, PAGE_W, 110, C.navy);
  page.drawText("VULNSCANNERS", {
    x: MARGIN,
    y: PAGE_H - 55,
    size: 26,
    font: fonts.bold,
    color: C.white,
  });
  page.drawText("Automated Security Scanning Platform", {
    x: MARGIN,
    y: PAGE_H - 80,
    size: 10,
    font: fonts.regular,
    color: C.grey300,
  });

  // Title + target
  let y = PAGE_H - 180;
  page.drawText(`${scannerLabel.toUpperCase()} SCAN REPORT`, {
    x: MARGIN,
    y,
    size: 22,
    font: fonts.bold,
    color: C.navy,
  });
  y -= 30;
  page.drawText(payload.target, {
    x: MARGIN,
    y,
    size: 14,
    font: fonts.regular,
    color: C.grey700,
  });
  y -= 40;

  // Metadata block
  const meta: [string, string][] = [
    ["Scan ID", payload.scanId.slice(0, 16) + "..."],
    ["Generated", payload.generatedAt],
    ["Scanner", scannerLabel],
  ];
  for (const [label, value] of meta) {
    page.drawText(label, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.bold,
      color: C.grey500,
    });
    page.drawText(value, {
      x: MARGIN + 90,
      y,
      size: 10,
      font: fonts.regular,
      color: C.grey900,
    });
    y -= 18;
  }
  y -= 20;

  // Metric tiles
  const tileW = (CONTENT_W - 12 * (metrics.length - 1)) / metrics.length;
  const tileH = 70;
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    const tx = MARGIN + i * (tileW + 12);
    drawRect(page, tx, y - tileH, tileW, tileH, C.grey100);
    page.drawText(m.value, {
      x: tx + 14,
      y: y - 30,
      size: 22,
      font: fonts.bold,
      color: m.color ?? C.blue,
    });
    page.drawText(m.label, {
      x: tx + 14,
      y: y - 55,
      size: 9,
      font: fonts.regular,
      color: C.grey700,
    });
  }

  page.drawText("© VulnScanners — vulnscanners.com", {
    x: MARGIN,
    y: 36,
    size: 8,
    font: fonts.regular,
    color: C.grey500,
  });
}

function severityColor(sev: NucleiSeverity): ReturnType<typeof rgb> {
  switch (sev) {
    case "critical":
    case "high":
      return C.red;
    case "medium":
      return C.amber;
    case "low":
      return C.blue;
    case "info":
      return C.grey500;
    default:
      return C.grey500;
  }
}

// ── Nuclei findings pages ─────────────────────────────────────────────────────

function drawNucleiFindings(
  doc: PDFDocument,
  fonts: Fonts,
  parsed: ParsedNucleiReport,
  pageNum: { n: number },
) {
  let page = addPage(doc);
  pageNum.n++;
  drawPageFooter(page, fonts, pageNum.n);
  drawRect(page, 0, PAGE_H - 60, PAGE_W, 60, C.navy);
  page.drawText("Findings", {
    x: MARGIN,
    y: PAGE_H - 38,
    size: 18,
    font: fonts.bold,
    color: C.white,
  });
  let y = PAGE_H - 90;

  if (parsed.findings.length === 0) {
    page.drawText("No findings reported by nuclei templates.", {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.regular,
      color: C.grey700,
    });
    return;
  }

  for (const f of parsed.findings) {
    // Need at least ~50 pt for a finding block
    if (y < MARGIN + 50) {
      page = addPage(doc);
      pageNum.n++;
      drawPageFooter(page, fonts, pageNum.n);
      y = PAGE_H - MARGIN;
    }

    // Severity chip
    const sevLabel = f.severity.toUpperCase();
    const chipW = fonts.bold.widthOfTextAtSize(sevLabel, 8) + 12;
    drawRect(page, MARGIN, y - 14, chipW, 16, severityColor(f.severity));
    page.drawText(sevLabel, {
      x: MARGIN + 6,
      y: y - 10,
      size: 8,
      font: fonts.bold,
      color: C.white,
    });

    // Template id (bold) on same line
    page.drawText(f.templateId, {
      x: MARGIN + chipW + 8,
      y: y - 10,
      size: 11,
      font: fonts.bold,
      color: C.grey900,
    });

    // Protocol tag at far right
    page.drawText(`[${f.protocol}]`, {
      x: PAGE_W - MARGIN - 50,
      y: y - 10,
      size: 9,
      font: fonts.mono,
      color: C.grey500,
    });
    y -= 22;

    // Target
    y = drawText({
      page,
      text: f.target,
      x: MARGIN + 4,
      y,
      maxW: CONTENT_W - 8,
      font: fonts.regular,
      size: 10,
      lineH: 13,
      color: C.grey700,
    });

    // Extracted (optional)
    if (f.extracted) {
      y = drawText({
        page,
        text: f.extracted,
        x: MARGIN + 4,
        y,
        maxW: CONTENT_W - 8,
        font: fonts.mono,
        size: 8,
        lineH: 11,
        color: C.grey500,
      });
    }

    y -= 10;
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_W - MARGIN, y: y + 4 },
      thickness: 0.3,
      color: C.grey300,
    });
    y -= 6;
  }
}

// ── ZAP alerts pages ──────────────────────────────────────────────────────────

function drawZapAlerts(
  doc: PDFDocument,
  fonts: Fonts,
  parsed: ParsedZapReport,
  pageNum: { n: number },
) {
  let page = addPage(doc);
  pageNum.n++;
  drawPageFooter(page, fonts, pageNum.n);
  drawRect(page, 0, PAGE_H - 60, PAGE_W, 60, C.navy);
  page.drawText("Alerts", {
    x: MARGIN,
    y: PAGE_H - 38,
    size: 18,
    font: fonts.bold,
    color: C.white,
  });
  let y = PAGE_H - 90;

  if (parsed.alerts.length === 0) {
    page.drawText(
      "No warnings or failures reported. All passive checks passed.",
      {
        x: MARGIN,
        y,
        size: 11,
        font: fonts.regular,
        color: C.grey700,
      },
    );
    return;
  }

  for (const a of parsed.alerts) {
    if (y < MARGIN + 50) {
      page = addPage(doc);
      pageNum.n++;
      drawPageFooter(page, fonts, pageNum.n);
      y = PAGE_H - MARGIN;
    }

    const color =
      a.level === "FAIL"
        ? C.red
        : a.level.startsWith("WARN")
          ? C.amber
          : C.blue;

    const chipW = fonts.bold.widthOfTextAtSize(a.level, 8) + 12;
    drawRect(page, MARGIN, y - 14, chipW, 16, color);
    page.drawText(a.level, {
      x: MARGIN + 6,
      y: y - 10,
      size: 8,
      font: fonts.bold,
      color: C.white,
    });

    const title = a.ruleId ? `${a.name} [${a.ruleId}]` : a.name;
    const countTag = a.count > 1 ? ` x ${a.count}` : "";
    page.drawText(title + countTag, {
      x: MARGIN + chipW + 8,
      y: y - 10,
      size: 11,
      font: fonts.bold,
      color: C.grey900,
    });
    y -= 22;

    for (const detail of a.details.slice(0, 6)) {
      if (y < MARGIN + 20) break;
      y = drawText({
        page,
        text: detail,
        x: MARGIN + 14,
        y,
        maxW: CONTENT_W - 18,
        font: fonts.mono,
        size: 8,
        lineH: 11,
        color: C.grey700,
      });
    }
    if (a.details.length > 6) {
      page.drawText(`...and ${a.details.length - 6} more`, {
        x: MARGIN + 14,
        y,
        size: 8,
        font: fonts.regular,
        color: C.grey500,
      });
      y -= 11;
    }

    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_W - MARGIN, y: y + 4 },
      thickness: 0.3,
      color: C.grey300,
    });
    y -= 6;
  }
}

// ── Nuclei main export ────────────────────────────────────────────────────────

export async function generateNucleiPdf(
  payload: ScanReportPayload,
): Promise<Uint8Array> {
  const parsed = payload.parsedData as ParsedNucleiReport;
  const doc = await PDFDocument.create();

  const [boldFont, regularFont, monoFont] = await Promise.all([
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.Courier),
  ]);
  const fonts: Fonts = {
    bold: boldFont,
    regular: regularFont,
    mono: monoFont,
  };

  const critHigh = parsed.bySeverity.critical + parsed.bySeverity.high;
  const cover = addPage(doc);
  drawScannerCover(cover, fonts, payload, "Nuclei", [
    {
      label: "Total findings",
      value: String(parsed.totalFindings),
      color: C.blue,
    },
    {
      label: "Critical / High",
      value: String(critHigh),
      color: critHigh > 0 ? C.red : C.green,
    },
    {
      label: "Medium",
      value: String(parsed.bySeverity.medium),
      color: parsed.bySeverity.medium > 0 ? C.amber : C.green,
    },
    {
      label: "Info / Low",
      value: String(parsed.bySeverity.low + parsed.bySeverity.info),
      color: C.grey500,
    },
  ]);

  const pageNum = { n: 1 };
  drawNucleiFindings(doc, fonts, parsed, pageNum);
  drawAppendix(doc, fonts, parsed.rawOutput, pageNum);

  return doc.save();
}

// ── ZAP main export ───────────────────────────────────────────────────────────

export async function generateZapPdf(
  payload: ScanReportPayload,
): Promise<Uint8Array> {
  const parsed = payload.parsedData as ParsedZapReport;
  const doc = await PDFDocument.create();

  const [boldFont, regularFont, monoFont] = await Promise.all([
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.Courier),
  ]);
  const fonts: Fonts = {
    bold: boldFont,
    regular: regularFont,
    mono: monoFont,
  };

  const cover = addPage(doc);
  drawScannerCover(cover, fonts, payload, "OWASP ZAP", [
    {
      label: "URLs crawled",
      value: parsed.totalUrls != null ? String(parsed.totalUrls) : "-",
      color: C.blue,
    },
    {
      label: "Failures",
      value: String(parsed.failures),
      color: parsed.failures > 0 ? C.red : C.green,
    },
    {
      label: "Warnings",
      value: String(parsed.warnings),
      color: parsed.warnings > 0 ? C.amber : C.green,
    },
    {
      label: "Passed checks",
      value: String(parsed.passed),
      color: C.green,
    },
  ]);

  const pageNum = { n: 1 };
  drawZapAlerts(doc, fonts, parsed, pageNum);
  drawAppendix(doc, fonts, parsed.rawOutput, pageNum);

  return doc.save();
}

// ── Utility ────────────────────────────────────────────────────────────────────

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}
