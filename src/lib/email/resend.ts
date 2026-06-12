// Transactional email via Resend.
// All senders are best-effort: if RESEND_API_KEY is unset (e.g. local/dev or
// before setup) they no-op and return { skipped: true } instead of throwing,
// so scan/report flows never fail because of email.
//
// Templates are table-based with inline styles for broad email-client support.

import { Resend } from "resend";

const FROM =
  process.env.EMAIL_FROM || "VulnScanners <noreply@vulnscanners.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vulnscanners.com";
const LOGO = `${APP_URL}/vulnscanners-logo.png`;

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

type SendResult = { skipped: true } | { id: string | null };

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<SendResult> {
  const resend = getClient();
  if (!resend || !opts.to) {
    console.warn(
      `[email] skipped "${opts.subject}" (no RESEND_API_KEY or recipient)`,
    );
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
  if (error) {
    console.error(`[email] send failed "${opts.subject}":`, error);
    throw new Error(error.message || "Email send failed");
  }
  return { id: data?.id ?? null };
}

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#eef1f6",
  card: "#ffffff",
  border: "#e3e8ef",
  ink: "#0d1117",
  ink2: "#3d4757",
  ink3: "#6b7686",
  brand: "#0366d6",
  button: "#0a2540",
  navy: "#0a141f",
  badgeOk: "#1f9d57",
  badgeBad: "#c0392b",
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const SCANNER_LABEL: Record<string, string> = {
  nmap: "Nmap network scan",
  nuclei: "Nuclei vulnerability scan",
  zap: "OWASP ZAP web scan",
};

// ── Building blocks ──────────────────────────────────────────────────────────

// Hidden preview text shown in the inbox list before opening.
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.bg};">${escapeHtml(
    text,
  )}</div>`;
}

// Bulletproof, table-based CTA button.
function button(href: string, label: string): string {
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;">
    <tr><td align="center" bgcolor="${C.button}" style="border-radius:8px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;
}

// Two-column "Scanner / Target / …" detail table.
function detailTable(rows: { label: string; value: string }[]): string {
  const trs = rows
    .map(
      (r, i) => `<tr>
        <td style="padding:10px 14px;font-family:${FONT};font-size:13px;color:${C.ink3};width:110px;border-top:${
          i === 0 ? "0" : `1px solid ${C.border}`
        };vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:10px 14px;font-family:${FONT};font-size:14px;color:${C.ink};font-weight:500;border-top:${
          i === 0 ? "0" : `1px solid ${C.border}`
        };">${r.value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:4px 0 20px;border:1px solid ${C.border};border-radius:10px;background:#fafbfc;overflow:hidden;">${trs}</table>`;
}

function statusBadge(ok: boolean): string {
  const color = ok ? C.badgeOk : C.badgeBad;
  const label = ok ? "Completed" : "Failed";
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color}1a;color:${color};font-family:${FONT};font-size:12px;font-weight:600;">${label}</span>`;
}

// Full email document. `paragraphs` and `extraHtml` are pre-built HTML strings.
function renderEmail(opts: {
  preheaderText: string;
  heading: string;
  intro: string;
  extraHtml?: string;
  ctaHref: string;
  ctaLabel: string;
  // Override the default "you ran a scan" footer (e.g. for marketing emails
  // sent to people who haven't created an account).
  footerHtml?: string;
}): string {
  const footer =
    opts.footerHtml ??
    `You received this because you ran a scan on VulnScanners.<br>
        <a href="${APP_URL}/app/dashboard" style="color:${C.brand};text-decoration:none;">Open your dashboard</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}" style="color:${C.brand};text-decoration:none;">vulnscanners.com</a>`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
${preheader(opts.preheaderText)}
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:${C.bg};">
  <tr><td align="center" style="padding:28px 14px;">
    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">

      <!-- Header -->
      <tr><td style="padding:0 4px 16px;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img src="${LOGO}" width="28" height="28" alt="VulnScanners" style="display:block;border:0;">
            </td>
            <td style="vertical-align:middle;font-family:${FONT};font-size:18px;font-weight:700;color:${C.brand};letter-spacing:.2px;">VulnScanners</td>
          </tr>
        </table>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr><td style="height:4px;background:${C.brand};border-radius:14px 14px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:32px 32px 34px;">
            <h1 style="margin:0 0 14px;font-family:${FONT};font-size:21px;line-height:1.3;color:${C.ink};font-weight:700;">${escapeHtml(
              opts.heading,
            )}</h1>
            <p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink2};">${opts.intro}</p>
            ${opts.extraHtml || ""}
            ${button(opts.ctaHref, opts.ctaLabel)}
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:22px 8px 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.ink3};">
        ${footer}
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Senders ───────────────────────────────────────────────────────────────────

export function sendScanCompleteEmail(args: {
  to: string;
  scannerType: string;
  target: string;
  summaryLine?: string | null;
  pdf: Buffer;
  filename: string;
}): Promise<SendResult> {
  const label = SCANNER_LABEL[args.scannerType] || args.scannerType;
  const rows = [
    { label: "Scanner", value: escapeHtml(label) },
    { label: "Target", value: escapeHtml(args.target) },
    { label: "Status", value: statusBadge(true) },
  ];
  if (args.summaryLine) {
    rows.push({ label: "Result", value: escapeHtml(args.summaryLine) });
  }
  const extraHtml =
    detailTable(rows) +
    `<p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink2};">
       The full report is attached to this email as a PDF. You can also review
       this scan any time in your dashboard.
     </p>`;
  const html = renderEmail({
    preheaderText: `Your ${label} of ${args.target} finished — report attached.`,
    heading: "Your scan is complete",
    intro: `Your <strong>${escapeHtml(label)}</strong> of <strong>${escapeHtml(
      args.target,
    )}</strong> finished successfully.`,
    extraHtml,
    ctaHref: `${APP_URL}/app/history`,
    ctaLabel: "View scan history",
  });
  return send({
    to: args.to,
    subject: `Scan complete: ${args.target} (${args.scannerType})`,
    html,
    attachments: [{ filename: args.filename, content: args.pdf }],
  });
}

export function sendScanFailedEmail(args: {
  to: string;
  scannerType: string;
  target: string;
  errorMessage?: string | null;
}): Promise<SendResult> {
  const label = SCANNER_LABEL[args.scannerType] || args.scannerType;
  const rows = [
    { label: "Scanner", value: escapeHtml(label) },
    { label: "Target", value: escapeHtml(args.target) },
    { label: "Status", value: statusBadge(false) },
  ];
  const errorBlock = args.errorMessage
    ? `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
         <tr><td style="padding:12px 14px;background:#fdf2f2;border:1px solid #f3d0d0;border-radius:10px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:#8a2c2c;white-space:pre-wrap;word-break:break-word;">${escapeHtml(
           args.errorMessage.slice(0, 600),
         )}</td></tr>
       </table>`
    : "";
  const extraHtml =
    detailTable(rows) +
    errorBlock +
    `<p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink2};">
       Your scan credit has been returned. You can try the scan again from your
       dashboard.
     </p>`;
  const html = renderEmail({
    preheaderText: `Your ${label} of ${args.target} didn't complete — credit returned.`,
    heading: "Your scan didn't complete",
    intro: `Your <strong>${escapeHtml(label)}</strong> of <strong>${escapeHtml(
      args.target,
    )}</strong> didn't finish successfully.`,
    extraHtml,
    ctaHref: `${APP_URL}/app/scans`,
    ctaLabel: "Run another scan",
  });
  return send({
    to: args.to,
    subject: `Scan failed: ${args.target} (${args.scannerType})`,
    html,
  });
}

export function sendCombinedReportEmail(args: {
  to: string;
  scanCount: number;
  pdf: Buffer;
  filename: string;
}): Promise<SendResult> {
  const noun = args.scanCount === 1 ? "scan" : "scans";
  const html = renderEmail({
    preheaderText: `Your combined report covering ${args.scanCount} ${noun} is attached.`,
    heading: "Your combined report is ready",
    intro: `Your combined security report covering <strong>${args.scanCount} ${noun}</strong> is attached to this email as a PDF.`,
    extraHtml: `<p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink2};">
        It includes an executive summary with the aggregate severity breakdown,
        followed by a detailed section for each scan.
      </p>`,
    ctaHref: `${APP_URL}/app/reports`,
    ctaLabel: "Open Reports",
  });
  return send({
    to: args.to,
    subject: `Your VulnScanners combined report (${args.scanCount} ${noun})`,
    html,
    attachments: [{ filename: args.filename, content: args.pdf }],
  });
}

// Lead-magnet: deliver the gated sample report PDF to a work-email lead.
export function sendSampleReportEmail(args: {
  to: string;
  pdf: Buffer;
  filename: string;
}): Promise<SendResult> {
  const extraHtml = `<p style="margin:0 0 18px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink2};">
      Attached is a sample VulnScanners report — a real combined scan showing the
      executive summary, severity breakdown, and the detailed findings with
      remediation and copy-paste verification steps you'd get for your own assets.
    </p>
    <p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink2};">
      When you're ready, run the same scans against your own targets — no install,
      no infrastructure, credits never expire.
    </p>`;
  const html = renderEmail({
    preheaderText: "Your sample VulnScanners report is attached.",
    heading: "Here's your sample report",
    intro:
      "Thanks for your interest in VulnScanners. Your sample security report is attached as a PDF.",
    extraHtml,
    ctaHref: `${APP_URL}/#pricing`,
    ctaLabel: "Scan your own assets",
    footerHtml: `You received this because you requested a sample report at vulnscanners.com.<br>
        <a href="${APP_URL}" style="color:${C.brand};text-decoration:none;">vulnscanners.com</a>`,
  });
  return send({
    to: args.to,
    subject: "Your sample VulnScanners report",
    html,
    attachments: [{ filename: args.filename, content: args.pdf }],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
