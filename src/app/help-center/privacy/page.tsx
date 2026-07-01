import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export const metadata = {
  title: "Privacy Policy | VulnScanners",
  description:
    "How VulnScanners collects, uses, shares, and protects your information.",
};

const EFFECTIVE = "July 1, 2026";

type Section = { heading: string; body: string[] };

const SECTIONS: Section[] = [
  {
    heading: "1. Who we are",
    body: [
      "VulnScanners (“VulnScanners,” “we,” “us”) provides hosted external vulnerability scanning — Nmap, Nuclei, and OWASP ZAP — and client-ready reports through our web application at vulnscanners.com. This policy explains what information we handle and how.",
    ],
  },
  {
    heading: "2. Information we collect",
    body: [
      "Account information: your name and email address, provided when you create an account (handled through our authentication provider).",
      "Scan data: the targets (domains, IP addresses, or URLs) you submit, scan configuration, and the results and reports we generate for you.",
      "Payment information: when you buy credits, payments are processed by Stripe. We receive confirmation and billing metadata but never see or store your full card number.",
      "Communications: messages you send us (e.g., support requests) and, if you request a sample report, the work email you provide.",
      "Usage and device data: basic log and analytics data (such as IP address, browser type, and pages viewed) used to operate and secure the service.",
    ],
  },
  {
    heading: "3. How we use your information",
    body: [
      "To provide the service — run the scans you request, generate reports, manage your account and credits, and deliver results.",
      "To process payments and prevent fraud.",
      "To communicate with you about your account, scans, and support requests, and — where permitted — relevant product updates.",
      "To maintain, secure, and improve the service.",
      "To comply with legal obligations.",
    ],
  },
  {
    heading: "4. How we share information",
    body: [
      "We do not sell your personal information. We share it only with service providers who help us run VulnScanners, under contract and only as needed:",
      "• Google Firebase — authentication and data storage.",
      "• Stripe — payment processing.",
      "• Resend — transactional and report delivery email.",
      "• Vercel — application hosting; and our own scanning infrastructure that executes scans against the targets you authorize.",
      "We may also disclose information if required by law, to protect our rights or users, or in connection with a business transfer.",
    ],
  },
  {
    heading: "5. Authorized scanning & your responsibilities",
    body: [
      "You may only scan systems you own or are explicitly authorized to test. You are responsible for having that authorization. Scan targets and results are treated as your confidential data and are only used to provide the service to you.",
    ],
  },
  {
    heading: "6. Data retention",
    body: [
      "We keep your account information and scan results for as long as your account is active or as needed to provide the service. You can request deletion of your data at any time (see Your rights). Some records may be retained where required for legal, tax, or security purposes.",
    ],
  },
  {
    heading: "7. Security",
    body: [
      "We use industry-standard measures — encryption in transit, access controls, and reputable infrastructure providers — to protect your information. No method of transmission or storage is completely secure, but we work to protect your data and respond promptly to any issues.",
    ],
  },
  {
    heading: "8. Your rights",
    body: [
      "Depending on your location, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. To exercise any of these, email us at privacy@vulnscanners.com and we’ll respond within a reasonable timeframe.",
    ],
  },
  {
    heading: "9. Cookies",
    body: [
      "We use essential cookies to keep you signed in and operate the app, and limited analytics to understand usage. You can control cookies through your browser settings; disabling essential cookies may affect functionality.",
    ],
  },
  {
    heading: "10. International users & children",
    body: [
      "VulnScanners is operated from the United States; by using it you consent to processing there. The service is intended for businesses and is not directed to anyone under 18, and we do not knowingly collect information from children.",
    ],
  },
  {
    heading: "11. Changes to this policy",
    body: [
      "We may update this policy from time to time. Material changes will be reflected by updating the effective date above, and where appropriate we’ll notify you.",
    ],
  },
  {
    heading: "12. Contact",
    body: [
      "Questions about this policy or your data? Email privacy@vulnscanners.com.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#07090d]">
      <header className="border-b border-[#161b24] bg-[#0d1117]/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            href="/help-center"
            className="inline-flex items-center gap-2 text-[#4493f8] hover:text-[#0366d6] transition-colors text-sm"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            Back to Help Center
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8] mb-3">
          Legal
        </p>
        <h1 className="text-4xl font-medium tracking-tight text-[#e6edf5] mb-2">
          Privacy Policy
        </h1>
        <p className="text-[#697080] text-sm mb-10">Effective {EFFECTIVE}</p>

        <div className="space-y-9">
          {SECTIONS.map((s) => (
            <section key={s.heading} className="scroll-mt-20">
              <h2 className="text-xl font-medium tracking-tight text-[#e6edf5] mb-3">
                {s.heading}
              </h2>
              <div className="space-y-2.5">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-[#9aa5b6] text-[15px] leading-relaxed"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
