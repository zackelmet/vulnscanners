import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/mdx";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Blog — Scanner guides, cheat sheets & playbooks",
  description:
    "Practical guides, scanner cheat sheets, and security playbooks for Nmap, Nuclei, OWASP ZAP, and the rest of the modern open-source security stack.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "VulnScanners Blog",
    description:
      "Practical guides and scanner cheat sheets — Nmap, Nuclei, ZAP, and the rest of the open-source security stack.",
    url: "https://vulnscanners.com/blog",
    siteName: "VulnScanners",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VulnScanners Blog",
    description:
      "Practical guides and scanner cheat sheets for the open-source security stack.",
  },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Blog", url: "/blog" },
]);

export default function BlogPage() {
  const posts = getAllPosts(["slug", "title", "date", "description"]);

  return (
    <main className="min-h-screen text-[#e6edf5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="max-w-4xl mx-auto px-5 py-20">
        <header className="mb-14">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#a78bfa] mb-3">
            Blog
          </p>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight mb-3">
            Field notes from a hosted scanning team.
          </h1>
          <p className="text-[#9aa5b6] text-lg max-w-2xl">
            Practical guides, scanner cheat sheets, and security playbooks for
            Nmap, Nuclei, OWASP ZAP, and the open-source security stack we run.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="py-24 text-[#697080]">
            <p className="text-xl mb-2">No posts yet.</p>
            <p className="text-sm">Check back soon.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#161b24]">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="block py-6 group">
                  <p className="text-xs text-[#697080] font-mono mb-1.5">
                    {post.date}
                  </p>
                  <h2 className="text-xl lg:text-2xl font-medium tracking-tight text-[#e6edf5] group-hover:text-[#a78bfa] transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-[#9aa5b6] text-sm leading-relaxed line-clamp-2">
                    {post.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
