import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  breadcrumbJsonLd,
  scannerServiceJsonLd,
  jsonLdString,
} from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Hosted Nuclei CVE Scanner",
  description:
    "Hosted Nuclei scanning with the full community template engine — CVEs, misconfigurations, default credentials, and exposures. PDF reports per scan.",
  alternates: { canonical: "/scanners/nuclei" },
  openGraph: {
    title: "Hosted Nuclei CVE Scanner — VulnScanners",
    description:
      "Hosted Nuclei with community templates — CVEs, misconfigs, default creds. PDF reports per scan.",
    url: "https://vulnscanners.com/scanners/nuclei",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hosted Nuclei CVE Scanner — VulnScanners",
    description:
      "Hosted Nuclei with community templates — CVEs, misconfigs, default creds. PDF reports per scan.",
  },
};

const CAPABILITIES = [
  {
    title: "Community template engine",
    body: "Thousands of YAML detection templates contributed by security researchers worldwide and pulled from the upstream feed.",
  },
  {
    title: "Multi-protocol coverage",
    body: "Templates target HTTP, DNS, TCP, SSL, WHOIS, JavaScript, and file/code patterns — not just web.",
  },
  {
    title: "CVE detection",
    body: "Named-CVE templates for high-impact issues like Log4Shell, alongside thousands of lesser-known CVE checks.",
  },
  {
    title: "Misconfiguration & exposure checks",
    body: "Default credentials, exposed config files, open admin panels, takeover-prone DNS records, SSL/TLS misconfigurations.",
  },
  {
    title: "Low false-positive design",
    body: "Templates encode real-world conditions — Nuclei reduces noise by only matching when the actual exploit precondition is observed.",
  },
  {
    title: "Parallel request execution",
    body: "Request clustering and concurrency built into the engine; large targets finish quickly.",
  },
] as const;

const USE_CASES = [
  {
    title: "Continuous CVE sweep",
    body: "Run after every major CVE drop to see which client assets are exposed before the news cycle catches up.",
  },
  {
    title: "Pre-engagement triage",
    body: "Point Nuclei at a target on day one of an engagement and immediately surface the low-hanging known issues.",
  },
  {
    title: "Pair with Nmap output",
    body: "Run Nmap first for the surface map, then Nuclei to deepen the assessment on the services Nmap surfaces.",
  },
] as const;

const jsonLd = jsonLdString(
  breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Scanners", url: "/scanners" },
    { name: "Nuclei", url: "/scanners/nuclei" },
  ]),
  scannerServiceJsonLd({
    name: "Hosted Nuclei CVE Scanner",
    description:
      "Run Nuclei CVE and misconfiguration scans on hosted infrastructure. Community template feed kept current — PDF report per scan.",
    slug: "nuclei",
    serviceType: "CVE vulnerability scanning",
  }),
);

export default function NucleiScannerPage() {
  return (
    <main className="min-h-screen text-[#e6edf5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="max-w-5xl mx-auto px-5 py-20 space-y-20">
        {/* Hero */}
        <header className="space-y-6">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
            Scanner · CVE
          </p>
          <div className="flex items-center gap-5">
            <Image
              src="/scanners/nuclei.png"
              alt="Nuclei logo"
              width={48}
              height={48}
              className="max-h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight leading-[1.05]">
            Nuclei CVE Scanner.
            <br />
            <span className="text-[#9aa5b6]">
              Hosted. Templates kept current.
            </span>
          </h1>
          <p className="text-[#9aa5b6] text-lg max-w-2xl leading-relaxed">
            Nuclei is a fast, template-based vulnerability scanner from
            ProjectDiscovery, with thousands of community-contributed
            detections. VulnScanners runs the scanner and keeps templates
            current — you pick a target, get findings, get a PDF.
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
          aria-labelledby="about-nuclei"
          className="grid md:grid-cols-[2fr_1fr] gap-8 items-start"
        >
          <div className="space-y-4">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              About the project
            </p>
            <h2
              id="about-nuclei"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              What is Nuclei?
            </h2>
            <p className="text-[#9aa5b6] leading-relaxed">
              ProjectDiscovery describes Nuclei as &ldquo;a fast, template based
              vulnerability scanner focusing on extensive configurability,
              massive extensibility and ease of use.&rdquo; Detections are
              authored as YAML files; the upstream template repository is
              updated continuously by the community. We track that feed so your
              scans run against current templates.
            </p>
          </div>
          <dl className="rounded-xl border border-[#1f2632] bg-[#0d1117] divide-y divide-[#161b24] text-sm">
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Maintainer</dt>
              <dd className="text-[#e6edf5]">ProjectDiscovery</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Templates</dt>
              <dd className="text-[#e6edf5]">Community feed, YAML</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">License</dt>
              <dd className="text-[#e6edf5]">MIT</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Source</dt>
              <dd>
                <a
                  href="https://github.com/projectdiscovery/nuclei"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-[#4493f8] hover:underline"
                >
                  GitHub ↗
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
              What Nuclei does
            </h2>
            <p className="text-[#9aa5b6] max-w-xl">
              All features below come from upstream Nuclei. We don&apos;t
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
              <h3 className="font-medium mb-2">Templates kept current</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                We sync the community template feed on our side. You never ship
                a scan against last month&apos;s detection set.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">Static source IP</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                Scans originate from our fixed range — allowlist once, scan
                forever.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">PDF report on every scan</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                Findings grouped by severity with the raw Nuclei output
                preserved alongside the deliverable.
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
              Where Nuclei earns its keep
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
              Nuclei guides
            </h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-4">
            <li>
              <Link
                href="/blog/nuclei-templates-guide"
                className="block p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">
                  Nuclei Templates: A Practical Guide
                </h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  Template syntax, matchers, custom templates, and how to keep
                  the feed current.
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
                  Honest comparison of Nmap, Nuclei, ZAP, OpenVAS, and Trivy.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/blog/vulnerability-management-slas-guide"
                className="block p-5 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] transition-colors"
              >
                <h3 className="font-medium text-[#e6edf5] mb-2">
                  Vulnerability Management SLAs
                </h3>
                <p className="text-sm text-[#9aa5b6] leading-relaxed">
                  Setting realistic SLAs by severity and asset criticality — and
                  hitting them.
                </p>
              </Link>
            </li>
          </ul>
        </section>

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-[#1f2632] bg-gradient-to-br from-[#0d1117] to-[#0a141f] p-10 text-center space-y-5">
          <h2 className="text-2xl lg:text-3xl font-medium tracking-tight">
            One credit. One Nuclei scan. One PDF.
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
