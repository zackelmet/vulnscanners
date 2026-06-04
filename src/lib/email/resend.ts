// Transactional email via Resend.
// All senders are best-effort: if RESEND_API_KEY is unset (e.g. local/dev or
// before setup) they no-op and return { skipped: true } instead of throwing,
// so scan/report flows never fail because of email.

import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "VulnScanners <noreply@vulnscanners.com>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://vulnscanners.com";

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

// ── Shared chrome ─────────────────────────────────────────────────────────────

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2230;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="font-weight:700;font-size:18px;color:#0366d6;letter-spacing:.3px;margin-bottom:20px;">VulnScanners</div>
    <div style="background:#ffffff;border:1px solid #e3e8ef;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 14px;font-size:20px;color:#0d1117;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="color:#8a94a6;font-size:12px;margin:20px 4px 0;line-height:1.5;">
      You received this because you ran a scan on VulnScanners.
      <a href="${APP_URL}/app/dashboard" style="color:#0366d6;">Open your dashboard</a>.
    </p>
  </div></body></html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0366d6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:8px;">${label}</a>`;

const SCANNER_LABEL: Record<string, string> = {
  nmap: "Nmap network scan",
  nuclei: "Nuclei vulnerability scan",
  zap: "OWASP ZAP web scan",
};

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
  const html = shell(
    "Your scan is complete",
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
       Your <strong>${label}</strong> of
       <strong>${escapeHtml(args.target)}</strong> finished successfully.
     </p>
     ${
       args.summaryLine
         ? `<p style="margin:0 0 16px;font-size:14px;color:#465062;">${escapeHtml(
             args.summaryLine,
           )}</p>`
         : ""
     }
     <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#465062;">
       The full report is attached as a PDF. You can also view this scan in your
       dashboard.
     </p>
     ${btn(`${APP_URL}/app/history`, "View scan history")}`,
  );
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
  const html = shell(
    "Your scan didn't complete",
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
       Your <strong>${label}</strong> of
       <strong>${escapeHtml(args.target)}</strong> didn't finish successfully.
     </p>
     ${
       args.errorMessage
         ? `<p style="margin:0 0 16px;font-size:13px;font-family:monospace;background:#f4f6f9;border:1px solid #e3e8ef;border-radius:8px;padding:12px;color:#8a2c2c;white-space:pre-wrap;">${escapeHtml(
             args.errorMessage.slice(0, 600),
           )}</p>`
         : ""
     }
     <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#465062;">
       Your scan credit has been returned. You can try the scan again from your
       dashboard.
     </p>
     ${btn(`${APP_URL}/app/scans`, "Run another scan")}`,
  );
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
  const html = shell(
    "Your combined report",
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
       Your combined security report covering
       <strong>${args.scanCount} ${args.scanCount === 1 ? "scan" : "scans"}</strong>
       is attached as a PDF.
     </p>
     ${btn(`${APP_URL}/app/reports`, "Open Reports")}`,
  );
  return send({
    to: args.to,
    subject: `Your VulnScanners combined report (${args.scanCount} ${
      args.scanCount === 1 ? "scan" : "scans"
    })`,
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
