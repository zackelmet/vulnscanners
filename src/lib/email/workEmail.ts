// Work-email validation for the sample-report lead magnet.
// We deliberately reject free/consumer mailbox providers and obvious
// disposable domains so the gated asset goes to real business contacts.

// Common consumer / free webmail providers. Not exhaustive, but covers the
// overwhelming majority of free signups.
const FREE_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "tutanota.com",
  "tuta.io",
  "fastmail.com",
  "hey.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "cox.net",
  "qq.com",
  "163.com",
  "126.com",
  "naver.com",
]);

// Common disposable / throwaway domains.
const DISPOSABLE_PROVIDERS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "sharklasers.com",
  "fakeinbox.com",
  "mintemail.com",
  "mohmal.com",
]);

// RFC-5322-ish pragmatic email check. We are not trying to be exhaustive —
// just reject malformed input before the domain checks.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WorkEmailResult =
  | { ok: true; email: string; domain: string }
  | { ok: false; reason: string };

export function validateWorkEmail(input: unknown): WorkEmailResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "Please enter a valid email address." };
  }
  const email = input.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, reason: "Please enter a valid email address." };
  }
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (FREE_PROVIDERS.has(domain)) {
    return {
      ok: false,
      reason:
        "Please use your work email — free mailboxes (Gmail, Outlook, etc.) aren't accepted.",
    };
  }
  if (DISPOSABLE_PROVIDERS.has(domain)) {
    return {
      ok: false,
      reason: "Disposable email addresses aren't accepted.",
    };
  }
  return { ok: true, email, domain };
}
