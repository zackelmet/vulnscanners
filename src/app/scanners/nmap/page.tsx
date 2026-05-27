import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Hosted Nmap Port Scanner",
  description:
    "Run Nmap port and service scans without managing a host. TCP/UDP scanning, version detection, and NSE — hosted, with PDF reports.",
  alternates: { canonical: "/scanners/nmap" },
  openGraph: {
    title: "Hosted Nmap Port Scanner — VulnScanners",
    description:
      "TCP/UDP port scans, version detection, and NSE scripts — hosted, with PDF reports.",
    url: "https://vulnscanners.com/scanners/nmap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hosted Nmap Port Scanner — VulnScanners",
    description:
      "TCP/UDP port scans, version detection, and NSE scripts — hosted, with PDF reports.",
  },
};

const CAPABILITIES = [
  {
    title: "TCP & UDP port scanning",
    body: "Discover open, closed, and filtered ports across IPv4/IPv6 hosts using Nmap's TCP and UDP scan modes.",
  },
  {
    title: "Service & version detection",
    body: "Identify the application, vendor, and version behind each open port via Nmap's version detection probes.",
  },
  {
    title: "OS fingerprinting",
    body: "Infer the operating system family and generation from TCP/IP stack characteristics.",
  },
  {
    title: "Nmap Scripting Engine (NSE)",
    body: "Run from a library of hundreds of NSE scripts for deeper service interrogation, default-cred checks, and protocol probes.",
  },
  {
    title: "Host discovery",
    body: "Ping sweeps and host-up checks to confirm which addresses in a range are reachable before scanning.",
  },
  {
    title: "Firewall & filter awareness",
    body: "Detect packet filtering and stateful behaviour from scan response patterns.",
  },
] as const;

const USE_CASES = [
  {
    title: "Attack surface inventory",
    body: "List every internet-facing port and service on a client's external range — the artifact that anchors most external pentest engagements.",
  },
  {
    title: "Change detection between engagements",
    body: "Re-run the same scan a month later. New ports, new services, new versions — surface what changed since the last report.",
  },
  {
    title: "Pre-scan reconnaissance",
    body: "Feed the open-port list into a Nuclei or ZAP scan so the deeper tools only spend credits on services that actually exist.",
  },
] as const;

export default function NmapScannerPage() {
  return (
    <main className="min-h-screen bg-[#0a141f] text-[#e6edf5]">
      <div className="max-w-5xl mx-auto px-5 py-20 space-y-20">
        {/* Hero */}
        <header className="space-y-6">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
            Scanner · Network
          </p>
          <div className="flex items-center gap-5">
            <Image
              src="/scanners/nmap.png"
              alt="Nmap logo"
              width={120}
              height={56}
              className="max-h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight leading-[1.05]">
            Hosted Nmap.
            <br />
            <span className="text-[#9aa5b6]">
              Port and service visibility without the VM.
            </span>
          </h1>
          <p className="text-[#9aa5b6] text-lg max-w-2xl leading-relaxed">
            Nmap is a free and open-source utility for network discovery and
            security auditing, first released in 1997. VulnScanners runs it on
            our infrastructure so you can target a host, kick off a scan, and
            get a PDF-ready report — no install, no maintenance.
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

        {/* About the project */}
        <section
          aria-labelledby="about-nmap"
          className="grid md:grid-cols-[2fr_1fr] gap-8 items-start"
        >
          <div className="space-y-4">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
              About the project
            </p>
            <h2
              id="about-nmap"
              className="text-2xl lg:text-3xl font-medium tracking-tight"
            >
              What you&apos;re actually running
            </h2>
            <p className="text-[#9aa5b6] leading-relaxed">
              Per the project, Nmap &ldquo;determines what hosts are available
              on the network, what services those hosts are offering, what
              operating systems they are running, what type of packet
              filters/firewalls are in use, and dozens of other
              characteristics.&rdquo; The suite includes Zenmap (GUI), Ncat,
              Ndiff, and Nping — VulnScanners exposes the scanning core; we skip
              the GUI side.
            </p>
          </div>
          <dl className="rounded-xl border border-[#1f2632] bg-[#0d1117] divide-y divide-[#161b24] text-sm">
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Maintainer</dt>
              <dd className="text-[#e6edf5]">Nmap project</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">First release</dt>
              <dd className="text-[#e6edf5]">1997</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">License</dt>
              <dd className="text-[#e6edf5]">Nmap Public Source License</dd>
            </div>
            <div className="flex justify-between p-4">
              <dt className="text-[#697080]">Source</dt>
              <dd>
                <a
                  href="https://nmap.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-[#4493f8] hover:underline"
                >
                  nmap.org ↗
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
              What Nmap does
            </h2>
            <p className="text-[#9aa5b6] max-w-xl">
              The features below are part of upstream Nmap. We don&apos;t
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
              <h3 className="font-medium mb-2">Zero install</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                No VM, no Docker, no &ldquo;works on my laptop&rdquo;. Hit the
                scan endpoint from anywhere with a browser.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">Static source IP</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                Scans originate from our fixed range, so clients can allowlist
                once instead of chasing a residential IP.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#0d1117] border border-[#1f2632]">
              <h3 className="font-medium mb-2">PDF report on every scan</h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">
                Raw output preserved, plus a client-ready PDF with the host
                summary and port table.
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
              Where Nmap earns its keep
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

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-[#1f2632] bg-gradient-to-br from-[#0d1117] to-[#0a141f] p-10 text-center space-y-5">
          <h2 className="text-2xl lg:text-3xl font-medium tracking-tight">
            One credit. One Nmap scan. One PDF.
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
