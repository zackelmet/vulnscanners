import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Hosted OWASP ZAP Web Scanner",
  description:
    "Hosted OWASP ZAP DAST scanning — active and passive scan rules, spider, AJAX spider, and auth support. PDF reports per scan.",
  alternates: { canonical: "/scanners/zap" },
  openGraph: {
    title: "Hosted OWASP ZAP Web Scanner — VulnScanners",
    description:
      "Hosted DAST scanning — active + passive rules, spider, AJAX spider. PDF reports per scan.",
    url: "https://vulnscanners.com/scanners/zap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hosted OWASP ZAP Web Scanner — VulnScanners",
    description:
      "Hosted DAST scanning — active + passive rules, spider, AJAX spider. PDF reports per scan.",
  },
};

const CAPABILITIES = [
  {
    title: "Active scanner",
    body: "Sends crafted requests to confirm injection, XSS, header, and configuration issues — including the Advanced SQL Injection add-on and DOM XSS rule.",
  },
  {
    title: "Passive scanner",
    body: "Inspects requests and responses as they pass through, surfacing misconfigured headers, cookies, and content issues without modifying traffic.",
  },
  {
    title: "Traditional spider",
    body: "Crawls server-rendered links to map application structure before scanning.",
  },
  {
    title: "AJAX spider",
    body: "Drives a headless browser to crawl modern JavaScript and single-page applications that the traditional spider can't reach.",
  },
  {
    title: "Authentication support",
    body: "Form, JSON, script-based, and HTTP authentication for scans that require an authenticated session.",
  },
  {
    title: "Anti-CSRF token handling",
    body: "Automatically refreshes CSRF tokens so the active scanner doesn't get blocked by token checks.",
  },
] as const;

const USE_CASES = [
  {
    title: "Web app security baseline",
    body: "Run before launch or after a release to confirm common web-layer issues — injection, XSS, header, cookie, and config flaws — aren't shipping.",
  },
  {
    title: "Recurring app monitoring",
    body: "Re-scan client web properties periodically. Surface regressions like missing headers or newly exposed admin paths.",
  },
  {
    title: "Authenticated assessments",
    body: "Configure auth once and have ZAP exercise post-login surfaces — the parts of an app most static scans never reach.",
  },
] as const;

export default function ZapScannerPage() {
  return (
    <main className="min-h-screen text-[#e6edf5]">
      <div className="max-w-5xl mx-auto px-5 py-20 space-y-20">
        {/* Hero */}
        <header className="space-y-6">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
            Scanner · Web
          </p>
          <div className="flex items-center gap-5">
            <Image
              src="/scanners/zap.png"
              alt="OWASP ZAP logo"
              width={48}
              height={48}
              className="max-h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight leading-[1.05]">
            Hosted OWASP ZAP.
            <br />
            <span className="text-[#9aa5b6]">
              Dynamic web app scanning, without the Java jar wrangling.
            </span>
          </h1>
          <p className="text-[#9aa5b6] text-lg max-w-2xl leading-relaxed">
            ZAP — the Zed Attack Proxy — is, per the project, &ldquo;the
            world&apos;s most widely used web app scanner.&rdquo; A free, open
            source DAST tool originally from OWASP, now an independent project
            stewarded by Checkmarx. VulnScanners runs it on our infrastructure
            with the spider, auth, and active/passive rules pre-configured.
          </p>
          <div className="flex gap-3 flex-wrap pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0366d6] hover:bg-[#034ea1] text-white font-medium transition-colors"
            >
              Run a scan →
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#1f2632] hover:border-[#2a3242] text-[#e6edf5] transition-colors"
            >
              See pricing
            </Link>
          </div>
        </header>

        {/* About */}
        <section
          aria-labelledby="about-zap"
          className="grid md:grid-cols-[2fr_1fr] gap-8 items-start"
        >
          <div className="space-y-4">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              About the project
            </p>
            <h2
              id="about-zap"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              What you&apos;re actually running
            </h2>
            <p className="text-[#9aa5b6] leading-relaxed">
              ZAP is a community-driven open-source DAST tool. It ships as a
              proxy plus scanner — applications are crawled (traditional or
              AJAX), traffic is inspected by passive rules, and the active
              scanner sends crafted payloads to confirm injection, XSS,
              configuration, and other classes of web-layer issues. VulnScanners
              runs the headless scanner core.
            </p>
          </div>
          <dl className="rounded-xl border border-[#1f2632] bg-[#0d1117] divide-y divide-[#161b24] text-sm">
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Steward</dt>
              <dd className="text-[#e6edf5]">Checkmarx</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Origin</dt>
              <dd className="text-[#e6edf5]">OWASP flagship</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Type</dt>
              <dd className="text-[#e6edf5]">DAST / web scanner</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Source</dt>
              <dd>
                <a
                  href="https://www.zaproxy.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-[#4493f8] hover:underline"
                >
                  zaproxy.org ↗
                </a>
              </dd>
            </div>
          </dl>
        </section>

        {/* Capabilities */}
        <section aria-labelledby="capabilities" className="space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              Capabilities
            </p>
            <h2
              id="capabilities"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              What ZAP does
            </h2>
            <p className="text-[#9aa5b6] max-w-xl">
              All features below come from upstream ZAP. We don&apos;t
              re-implement them — we host them.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {CAPABILITIES.map((c) => (
              <article
                key={c.title}
                className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">{c.title}</h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  {c.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Hosted advantages */}
        <section aria-labelledby="hosted" className="space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              Why hosted
            </p>
            <h2
              id="hosted"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              Same scanner. None of the operational tax.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">No Java, no jar</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                ZAP is a Java app — VulnScanners runs the headless scanner so
                you don&apos;t install or maintain a JVM.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">Static source IP</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                Scans originate from our fixed range — clients allowlist once
                and you avoid noisy WAF blocks from rotating residential IPs.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">PDF report on every scan</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                Findings grouped by severity with full ZAP output preserved next
                to the client-ready deliverable.
              </p>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section aria-labelledby="usecases" className="space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              Use cases
            </p>
            <h2
              id="usecases"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              Where ZAP earns its keep
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {USE_CASES.map((u) => (
              <article
                key={u.title}
                className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]"
              >
                <h3 className="font-medium mb-2">{u.title}</h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  {u.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Related posts */}
        <section aria-labelledby="related" className="space-y-6">
          <div className="space-y-3">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              From the blog
            </p>
            <h2
              id="related"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              ZAP and web app guides
            </h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-4">
            <li>
              <Link
                href="/blog/owasp-zap-active-vs-passive-scan"
                className="block p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">
                  ZAP Active vs Passive Scan
                </h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  What each scanner does, what each detects, and which one
                  belongs in which phase.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/blog/sqlmap-tutorial"
                className="block p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">
                  SQLmap Tutorial
                </h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  Confirming and exploiting SQL injection — the natural
                  follow-up to a ZAP finding.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/blog/nmap-vs-nuclei-vs-zap"
                className="block p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">
                  Nmap vs Nuclei vs ZAP
                </h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  When each tool is the right answer — and how to layer all
                  three.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/blog/best-open-source-vulnerability-scanners"
                className="block p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">
                  Best Open-Source Vulnerability Scanners (2026)
                </h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  Honest comparison — where ZAP fits, where it doesn&apos;t.
                </p>
              </Link>
            </li>
          </ul>
        </section>

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-[#1f2632] bg-gradient-to-br from-[#0d1117] to-[#0a141f] p-10 text-center space-y-5">
          <h2 className="text-2xl lg:text-3xl font-medium tracking-tight">
            One credit. One ZAP scan. One PDF.
          </h2>
          <p className="text-[#9aa5b6] max-w-lg mx-auto">
            Credit packs start at $10. No subscription, no seats, no overages.
          </p>
          <div className="flex gap-3 justify-center flex-wrap pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0366d6] hover:bg-[#034ea1] text-white font-medium transition-colors"
            >
              Start scanning →
            </Link>
            <Link
              href="/#scanners"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#1f2632] hover:border-[#2a3242] text-[#e6edf5] transition-colors"
            >
              ← All scanners
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
