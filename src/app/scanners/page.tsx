import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Scanners — Nmap, Nuclei & OWASP ZAP",
  description:
    "Three hosted vulnerability scanners — Nmap, Nuclei, and OWASP ZAP — in one console. Pick the right tool for your target and get a PDF report per scan.",
  alternates: { canonical: "/scanners" },
  openGraph: {
    title: "Hosted Scanners — Nmap, Nuclei & OWASP ZAP",
    description:
      "Three hosted scanners in one console. PDF report per scan. Credits never expire.",
    url: "https://vulnscanners.com/scanners",
    siteName: "VulnScanners",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hosted Scanners — Nmap, Nuclei & OWASP ZAP",
    description:
      "Three hosted scanners in one console. PDF report per scan. Credits never expire.",
  },
};

const SCANNERS = [
  {
    slug: "nmap",
    name: "Nmap",
    tag: "Network",
    logo: "/scanners/nmap.png",
    logoW: 120,
    logoH: 56,
    h2: "Port and service inventory",
    body: "TCP / UDP port scanning, service and version detection, OS fingerprinting, and the Nmap Scripting Engine — the foundation of any external assessment.",
    bullets: ["TCP & UDP scanning", "Version detection", "NSE scripts"],
  },
  {
    slug: "nuclei",
    name: "Nuclei",
    tag: "CVE",
    logo: "/scanners/nuclei.png",
    logoW: 48,
    logoH: 48,
    h2: "Template-based CVE detection",
    body: "Thousands of community-contributed YAML templates covering CVEs, misconfigurations, default credentials, and exposures across HTTP, DNS, TCP, SSL, and more.",
    bullets: ["CVE detection", "Multi-protocol", "Low false-positives"],
  },
  {
    slug: "zap",
    name: "OWASP ZAP",
    tag: "Web",
    logo: "/scanners/zap.png",
    logoW: 48,
    logoH: 48,
    h2: "Dynamic web app scanning",
    body: "The open-source DAST tool — active and passive scan rules, traditional and AJAX spider, authentication support, and anti-CSRF token handling.",
    bullets: ["Active + passive scan", "AJAX spider", "Auth support"],
  },
] as const;

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: SCANNERS.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://vulnscanners.com/scanners/${s.slug}`,
    name: `Hosted ${s.name} scanner`,
  })),
};

export default function ScannersIndexPage() {
  return (
    <main className="min-h-screen text-[#e6edf5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-5 py-20 space-y-16">
        <header className="space-y-4">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
            Scanners
          </p>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight leading-[1.1]">
            Three scanners. One hosted workflow.
          </h1>
          <p className="text-[#9aa5b6] text-lg max-w-2xl leading-relaxed">
            VulnScanners runs Nmap, Nuclei, and OWASP ZAP on our infrastructure
            so you can pick the right tool for the target and get a PDF report
            per scan — no install, no maintenance, credits never expire.
          </p>
          <div className="flex gap-3 flex-wrap pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0366d6] hover:bg-[#034ea1] text-white font-medium transition-colors"
            >
              Start scanning →
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#1f2632] hover:border-[#2a3242] text-[#e6edf5] transition-colors"
            >
              See pricing
            </Link>
          </div>
        </header>

        <section className="space-y-6">
          {SCANNERS.map((s) => (
            <Link
              key={s.slug}
              href={`/scanners/${s.slug}`}
              className="group block p-6 rounded-xl bg-[#0d1117] border border-[#1f2632] hover:border-[#2a3242] hover:bg-[#11161f] transition-colors"
            >
              <div className="grid md:grid-cols-[180px_1fr] gap-6 items-start">
                <div className="flex items-center justify-center md:justify-start h-14">
                  <Image
                    src={s.logo}
                    alt={`${s.name} logo`}
                    width={s.logoW}
                    height={s.logoH}
                    className="max-h-12 w-auto object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-medium tracking-tight">
                      {s.name}
                    </h2>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#697080] border border-[#1f2632] bg-[#0a141f] px-2 py-0.5 rounded">
                      {s.tag}
                    </span>
                  </div>
                  <p className="text-[#e6edf5] text-base font-medium">{s.h2}</p>
                  <p className="text-[#9aa5b6] leading-relaxed">{s.body}</p>
                  <ul className="flex flex-wrap gap-2 pt-1">
                    {s.bullets.map((b) => (
                      <li
                        key={b}
                        className="text-xs text-[#9aa5b6] bg-[#0a141f] border border-[#1f2632] px-2.5 py-1 rounded"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="pt-2 text-sm text-[#4493f8] group-hover:underline">
                    Learn more about hosted {s.name} →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section
          aria-labelledby="workflow"
          className="rounded-xl border border-[#1f2632] bg-gradient-to-br from-[#0d1117] to-[#0a141f] p-8 space-y-4"
        >
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
            How they work together
          </p>
          <h2
            id="workflow"
            className="text-2xl lg:text-3xl font-medium tracking-tight"
          >
            Run them in order. Each builds on the last.
          </h2>
          <ol className="space-y-3 text-[#9aa5b6] leading-relaxed list-decimal pl-5">
            <li>
              <strong className="text-[#e6edf5] font-medium">Nmap</strong> — map
              the surface. Ports, services, versions.
            </li>
            <li>
              <strong className="text-[#e6edf5] font-medium">Nuclei</strong> —
              sweep the discovered services for known CVEs, misconfigurations,
              and exposures.
            </li>
            <li>
              <strong className="text-[#e6edf5] font-medium">OWASP ZAP</strong>{" "}
              — go deep on the web applications, including authenticated
              surfaces.
            </li>
          </ol>
          <p className="text-sm text-[#697080]">
            More on this layering in our{" "}
            <Link
              href="/blog/nmap-vs-nuclei-vs-zap"
              className="text-[#4493f8] hover:underline"
            >
              Nmap vs Nuclei vs ZAP guide
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
