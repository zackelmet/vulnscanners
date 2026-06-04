import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, jsonLdString } from "@/lib/seo/jsonld";
import {
  getTool,
  getToolSlugs,
  toolsByCategory,
  categoryLabel,
} from "@/data/redteam-tools";

export function generateStaticParams() {
  return getToolSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const title = `${tool.name} — ${categoryLabel[tool.category]} Tool`;
  return {
    title,
    description: `${tool.name}: ${tool.oneLiner} What it does, a representative command, and the source repo.`,
    alternates: { canonical: `/red-team-tools/${tool.slug}` },
    openGraph: { title, description: tool.oneLiner, type: "article" },
    twitter: { card: "summary", title, description: tool.oneLiner },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const related = toolsByCategory(tool.category)
    .filter((t) => t.slug !== tool.slug)
    .slice(0, 4);

  const jsonLd = jsonLdString(
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Red Team Tools", url: "/red-team-tools" },
      { name: tool.name, url: `/red-team-tools/${tool.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Cross-platform",
      description: tool.description,
      url: `https://vulnscanners.com/red-team-tools/${tool.slug}`,
      sameAs: tool.source,
    },
  );

  return (
    <main className="min-h-screen text-[#e6edf5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="max-w-3xl mx-auto px-5 py-16 space-y-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#697080]">
          <Link href="/red-team-tools" className="hover:text-[#a78bfa]">
            Red Team Tools
          </Link>
          <span className="px-2">/</span>
          <span className="text-[#9aa5b6]">{categoryLabel[tool.category]}</span>
        </nav>

        {/* Header */}
        <header className="space-y-4">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#a78bfa]">
            {categoryLabel[tool.category]}
          </p>
          <h1 className="text-4xl font-medium tracking-tight">{tool.name}</h1>
          <p className="text-[#9aa5b6] text-lg leading-relaxed">{tool.oneLiner}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10.5px] uppercase tracking-wide text-[#697080] border border-[#1f2632] rounded px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Terminal visual */}
        <div className="rounded-xl border border-[#1f2632] bg-[#0d1117] overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#161b24] bg-[#11161f]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            <span className="ml-2 font-mono text-[11px] text-[#697080]">
              {tool.name.toLowerCase()} — terminal
            </span>
          </div>
          <pre className="px-4 py-4 overflow-x-auto">
            <code className="font-mono text-[13px] leading-relaxed text-[#e6edf5]">
              <span className="text-[#27c93f]">$</span> {tool.command}
            </code>
          </pre>
        </div>

        {/* What it does */}
        <section className="space-y-3">
          <h2 className="text-xl font-medium tracking-tight">What it does</h2>
          <p className="text-[#9aa5b6] leading-relaxed">{tool.description}</p>
        </section>

        {/* Source */}
        <section className="space-y-2">
          <h2 className="text-xl font-medium tracking-tight">Source</h2>
          <a
            href={tool.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#a78bfa] hover:text-[#79b6ff] break-all"
          >
            {tool.source} ↗
          </a>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-[#161b24] pt-8 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.08em] text-[#697080]">
              More {categoryLabel[tool.category]} tools
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/red-team-tools/${r.slug}`}
                  className="rounded-lg border border-[#1f2632] bg-[#0d1117] px-4 py-3 hover:border-[#2a3242] transition-colors"
                >
                  <span className="text-sm font-medium text-[#e6edf5]">
                    {r.name}
                  </span>
                  <span className="block text-xs text-[#697080] mt-0.5">
                    {r.oneLiner}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="rounded-xl border border-[#1f2632] bg-[#0d1117] p-6 text-center space-y-3">
          <p className="text-[#9aa5b6]">
            Need hosted scanning instead of local tooling?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7c3aed] hover:bg-[#034ea1] text-white font-medium transition-colors"
          >
            Run a scan in the browser →
          </Link>
        </section>
      </div>
    </main>
  );
}
