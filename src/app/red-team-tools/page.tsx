import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, jsonLdString } from "@/lib/seo/jsonld";
import {
  categoryOrder,
  categoryLabel,
  toolsByCategory,
  totalTools,
} from "@/data/redteam-tools";

export const metadata: Metadata = {
  title: "Red Team Tools — Offensive Security Tool Directory",
  description: `A directory of ${totalTools} red-team and offensive-security tools across recon, scanning, web, credential access, Active Directory, C2, and exploitation — what each does and how to run it.`,
  alternates: { canonical: "/red-team-tools" },
  openGraph: {
    title: "Red Team Tools — Offensive Security Tool Directory",
    description: `${totalTools} offensive-security tools, organized by category, with a representative command for each.`,
    url: "https://vulnscanners.com/red-team-tools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Red Team Tools — Offensive Security Tool Directory",
    description: `${totalTools} offensive-security tools, organized by category.`,
  },
};

const jsonLd = jsonLdString(
  breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Red Team Tools", url: "/red-team-tools" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Red Team Tools",
    description: `A directory of ${totalTools} offensive-security tools, organized by category.`,
    url: "https://vulnscanners.com/red-team-tools",
  },
);

export default function RedTeamToolsIndexPage() {
  return (
    <main className="min-h-screen text-[#e6edf5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="max-w-5xl mx-auto px-5 py-20 space-y-16">
        <header className="space-y-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8]">
            Resources · Reference
          </p>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight leading-[1.05]">
            Red Team Tools
          </h1>
          <p className="text-[#9aa5b6] text-lg max-w-2xl leading-relaxed">
            A reference directory of {totalTools} offensive-security tools — what
            each one does, a representative command, and a link to the source.
            Grouped by where they fit in an engagement, from reconnaissance to
            command-and-control.
          </p>
        </header>

        {categoryOrder.map((cat) => {
          const items = toolsByCategory(cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="space-y-5">
              <h2 className="text-xs font-mono uppercase tracking-[0.08em] text-[#697080] border-b border-[#161b24] pb-3">
                {categoryLabel[cat]}{" "}
                <span className="text-[#3a4150]">· {items.length}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/red-team-tools/${t.slug}`}
                    className="rounded-xl border border-[#1f2632] bg-[#0d1117] p-4 hover:border-[#2a3242] hover:bg-[#11161f] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#e6edf5]">{t.name}</span>
                      {t.tags[0] && (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-[#697080] border border-[#1f2632] rounded px-1.5 py-0.5">
                          {t.tags[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#9aa5b6] mt-1.5 leading-relaxed">
                      {t.oneLiner}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl border border-[#1f2632] bg-gradient-to-br from-[#0d1117] to-[#0a141f] p-8 text-center space-y-4">
          <h2 className="text-2xl font-medium tracking-tight">
            Skip the install. Scan from the browser.
          </h2>
          <p className="text-[#9aa5b6] max-w-xl mx-auto">
            VulnScanners runs Nmap, Nuclei, and OWASP ZAP on hosted
            infrastructure — point at a target, get a report. No setup.
          </p>
          <div className="flex justify-center gap-3 flex-wrap pt-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0366d6] hover:bg-[#034ea1] text-white font-medium transition-colors"
            >
              Start scanning →
            </Link>
            <Link
              href="/scanners"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#1f2632] hover:border-[#2a3242] text-[#e6edf5] transition-colors"
            >
              See the scanners
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
