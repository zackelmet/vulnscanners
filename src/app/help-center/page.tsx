import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRocket,
  faSatelliteDish,
  faFileLines,
  faCoins,
  faClock,
  faWrench,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export const metadata = {
  title: "Help Center | VulnScanners",
  description:
    "Get started with VulnScanners — running scans, understanding Nmap, Nuclei, and OWASP ZAP, reading reports, managing credits, scheduling, troubleshooting, and our trust & safety practices.",
};

type Block =
  | { kind: "p"; text: string }
  | { kind: "steps"; items: { title: string; text: string }[] }
  | { kind: "subs"; items: { title: string; text: string }[] }
  | { kind: "bullets"; items: string[] };

interface Section {
  id: string;
  icon: typeof faRocket;
  title: string;
  blocks: Block[];
}

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    icon: faRocket,
    title: "Getting started",
    blocks: [
      {
        kind: "p",
        text: "VulnScanners is fully hosted — there's nothing to install. From sign-up to your first report is a few minutes:",
      },
      {
        kind: "steps",
        items: [
          {
            title: "Create your account",
            text: "Sign up with email or Google. Your account is created instantly.",
          },
          {
            title: "Buy scan credits",
            text: "From the dashboard, choose a pack (Essential, Pro, or Scale). Credits work across all three scanners and never expire.",
          },
          {
            title: "Add a target",
            text: "Save targets you scan often under Targets, or enter an ad-hoc target when you launch a scan. A target is a URL, IP address, or domain you own or are authorized to test.",
          },
          {
            title: "Launch a scan",
            text: "Go to Launch Scan, pick a scanner (Nmap, Nuclei, or OWASP ZAP) and a target, then submit. Scans run in the background — you don't have to keep the console open.",
          },
          {
            title: "Review results",
            text: "Track progress on your dashboard and in Scan History. When a scan completes, download the raw output or a branded PDF report.",
          },
        ],
      },
    ],
  },
  {
    id: "scanners",
    icon: faSatelliteDish,
    title: "The scanners",
    blocks: [
      {
        kind: "p",
        text: "Each scan consumes one credit of that scanner type and produces its own findings and PDF report. The three engines are complementary — use whichever fits the target.",
      },
      {
        kind: "subs",
        items: [
          {
            title: "Nmap — network & open ports",
            text: "Discovers open TCP ports and the services and versions running on them, flagging exposed or insecurely configured services. Host discovery is disabled so firewalled or CDN-fronted hosts still get scanned. Typically finishes in 1–10 minutes.",
          },
          {
            title: "Nuclei — vulnerabilities & exposures",
            text: "A fast, template-driven scanner that runs thousands of community templates to detect CVEs, misconfigurations, exposed files/APIs, and security issues across web apps and infrastructure. Typically 5–15 minutes against a single target.",
          },
          {
            title: "OWASP ZAP — web application",
            text: "A full active scan that spiders a web application and actively tests it for issues like cross-site scripting (XSS), SQL injection, missing security headers, and insecure cookies (OWASP Top 10). The most thorough — and the slowest — from several minutes to a couple of hours on a large app.",
          },
        ],
      },
    ],
  },
  {
    id: "reports",
    icon: faFileLines,
    title: "Reports & results",
    blocks: [
      {
        kind: "subs",
        items: [
          {
            title: "Severity levels",
            text: "Findings are classified Critical, High, Medium, Low, and Info (plus Accepted for findings you've triaged). Higher severity indicates a greater risk to the confidentiality, integrity, or availability of the target — evaluate Critical and High first.",
          },
          {
            title: "PDF report",
            text: "Every completed scan generates a branded, client-ready PDF — executive summary, severity distribution, a master findings table, and detailed findings with description, business impact, and remediation. Download it from Scan History → Report.",
          },
          {
            title: "Raw output",
            text: "Download the exact tool output for any scan — Nmap XML, Nuclei JSONL, or ZAP JSON — from Scan History → Raw output. It's the same data you'd get running the tool yourself.",
          },
          {
            title: "Combined report",
            text: "From the Reports page, select multiple completed scans to generate one consolidated PDF across targets — useful for handing a client or auditor a single document.",
          },
          {
            title: "Deleting scans",
            text: "You can permanently delete any scan — including its raw output — from Scan History. Deletion can't be undone.",
          },
        ],
      },
    ],
  },
  {
    id: "credits",
    icon: faCoins,
    title: "Credits & billing",
    blocks: [
      {
        kind: "bullets",
        items: [
          "Each scan uses one credit of that scanner type. Credits are tracked separately per scanner — Nmap, Nuclei, and ZAP.",
          "Packs add credits to all three scanners: Essential (10 each), Pro (100 each), and Scale (1,000 each).",
          "Credits never expire — they stay on your account until you use them.",
          "Failed scans are automatically refunded, so you're never charged for a scan that didn't complete.",
          "First purchase is covered by a 7-day, no-questions-asked refund; after that we handle issues case by case.",
          "Buy more anytime from the dashboard with “Buy Credits.”",
        ],
      },
    ],
  },
  {
    id: "scheduling",
    icon: faClock,
    title: "Scheduled scans",
    blocks: [
      {
        kind: "p",
        text: "Set up recurring scans from the Scheduled Scans page: pick a saved target, a scanner, and a cadence (daily, weekly, or monthly). Each run consumes one credit and emails you the report when it finishes — handy for continuous monitoring of an asset.",
      },
    ],
  },
  {
    id: "troubleshooting",
    icon: faWrench,
    title: "Troubleshooting",
    blocks: [
      {
        kind: "subs",
        items: [
          {
            title: "A scan failed",
            text: "The credit is automatically refunded. The most common cause is a target that isn't reachable from the public internet — confirm the host is up and try again.",
          },
          {
            title: "“Target unreachable”",
            text: "The host didn't respond on any scanned port, or returned only server errors. That usually means it's down, firewalled, or blocking the scanner. Verify the target resolves and responds publicly, then re-run.",
          },
          {
            title: "No findings",
            text: "Either the target is genuinely clean for that scanner, or it was unreachable during the scan. Download the raw output to see exactly what the tool observed.",
          },
          {
            title: "A scan seems stuck",
            text: "Scans that don't report back within about an hour are automatically marked failed and the credit refunded — you won't have a scan hanging indefinitely.",
          },
          {
            title: "A ZAP scan is taking a long time",
            text: "A full active scan on a large web app can legitimately take a while. It runs in the background, so you can close the console and come back — the report and an email will be waiting.",
          },
        ],
      },
    ],
  },
  {
    id: "trust",
    icon: faShieldHalved,
    title: "Trust & safety",
    blocks: [
      {
        kind: "subs",
        items: [
          {
            title: "Data protection & privacy",
            text: "Scan results, target information, and account data are encrypted in transit (TLS) and at rest. Your results are private to your account — we never share, sell, or distribute your scan data. You can export any scan to PDF or permanently delete it, including the raw output, at any time.",
          },
          {
            title: "Ethical use",
            text: "VulnScanners is for authorized security testing only. You may scan only systems you own or have explicit written permission to test. Unauthorized scanning of third-party systems is prohibited and may be illegal under laws such as the Computer Fraud and Abuse Act (CFAA) and similar legislation. We may suspend accounts that violate this policy.",
          },
          {
            title: "Compliance",
            text: "Our infrastructure follows OWASP best practices and implements controls aligned with SOC 2 Type II. For customers subject to GDPR, HIPAA, or PCI DSS, we can provide documentation of our security controls and data-handling practices on request.",
          },
          {
            title: "Incident response",
            text: "We maintain an incident response plan to contain, investigate, and remediate security issues, and we will notify affected users within 72 hours of confirming a breach that compromises their data. If you believe you've found a vulnerability in VulnScanners itself, report it via the support page using the “Security concern” category.",
          },
          {
            title: "Your responsibilities",
            text: "Use a strong, unique password; confirm you're authorized before scanning any target; review your scan history and targets periodically; and use scan results to remediate, not exploit. Report anything suspicious to support right away.",
          },
        ],
      },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#161b24] bg-[#0d1117]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4493f8] hover:text-[#0366d6] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8] mb-3">
            Help Center
          </p>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-[#e6edf5] mb-3">
            Everything you need to scan with confidence.
          </h1>
          <p className="text-[#9aa5b6] text-lg leading-relaxed max-w-2xl">
            Getting started, the scanners, reading your reports, credits,
            scheduling, troubleshooting, and how we handle your data.
          </p>
        </div>

        {/* Jump nav */}
        <nav className="mb-14 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#161b24] text-sm text-[#9aa5b6] hover:border-[#0366d6] hover:text-[#e6edf5] transition-colors"
            >
              <FontAwesomeIcon icon={s.icon} className="text-xs text-[#4493f8]" />
              {s.title}
            </a>
          ))}
        </nav>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-20 bg-[#0d1117]/60 border border-[#161b24] rounded-lg p-7 backdrop-blur"
            >
              <div className="flex items-center gap-3 mb-5">
                <FontAwesomeIcon
                  icon={section.icon}
                  className="text-base text-[#4493f8] flex-shrink-0"
                />
                <h2 className="text-xl font-medium tracking-tight text-[#e6edf5]">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-4">
                {section.blocks.map((block, bi) => {
                  if (block.kind === "p") {
                    return (
                      <p
                        key={bi}
                        className="text-[#9aa5b6] text-[15px] leading-relaxed"
                      >
                        {block.text}
                      </p>
                    );
                  }
                  if (block.kind === "bullets") {
                    return (
                      <ul key={bi} className="space-y-2.5">
                        {block.items.map((it, ii) => (
                          <li key={ii} className="flex gap-2.5">
                            <span className="text-[#4493f8] mt-0.5">•</span>
                            <span className="text-[#9aa5b6] text-[15px] leading-relaxed">
                              {it}
                            </span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.kind === "steps") {
                    return (
                      <ol key={bi} className="space-y-4">
                        {block.items.map((it, ii) => (
                          <li key={ii} className="flex gap-4">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0366d6]/15 text-[#4493f8] text-sm font-semibold flex items-center justify-center">
                              {ii + 1}
                            </span>
                            <div>
                              <p className="text-[#e6edf5] text-[15px] font-medium">
                                {it.title}
                              </p>
                              <p className="text-[#9aa5b6] text-[15px] leading-relaxed">
                                {it.text}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    );
                  }
                  // subs
                  return (
                    <div key={bi} className="space-y-4">
                      {block.items.map((it, ii) => (
                        <div key={ii}>
                          <p className="text-[#e6edf5] text-[15px] font-medium mb-1">
                            {it.title}
                          </p>
                          <p className="text-[#9aa5b6] text-[15px] leading-relaxed">
                            {it.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-14 border-t border-[#161b24] pt-10">
          <h3 className="text-xl font-medium tracking-tight text-[#e6edf5] mb-2">
            Still need a hand?
          </h3>
          <p className="text-[#9aa5b6] text-[15px] leading-relaxed mb-5 max-w-2xl">
            Can&apos;t find what you&apos;re looking for, or need to report a
            security concern? Our team is here to help.
          </p>
          <Link
            href="/support"
            className="inline-block px-5 py-2.5 bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium rounded-md transition-colors"
          >
            Contact support
          </Link>
        </div>

        <div className="mt-10">
          <p className="text-xs text-[#697080] font-mono">
            Last updated{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
