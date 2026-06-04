import React from "react";
import Image from "next/image";
import Link from "next/link";

interface BlogLayoutProps {
  children: React.ReactNode;
  frontMatter: {
    title: string;
    date: string;
    description: string;
    image?: string;
    author?: string;
    readingTime?: string;
  };
}

const BlogLayout: React.FC<BlogLayoutProps> = ({ children, frontMatter }) => {
  return (
    <main className="min-h-screen bg-[#0a141f] text-[#e6edf5]">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-[#a78bfa] hover:underline">
            ← All posts
          </Link>
        </div>

        <header className="mb-10 space-y-4">
          <h1 className="text-3xl lg:text-5xl font-medium tracking-tight leading-[1.1]">
            {frontMatter.title}
          </h1>
          {frontMatter.description && (
            <p className="text-[#9aa5b6] text-lg leading-relaxed">
              {frontMatter.description}
            </p>
          )}
          <p className="text-sm text-[#697080] flex flex-wrap items-center gap-3">
            {frontMatter.author && <span>{frontMatter.author}</span>}
            {frontMatter.author && <span aria-hidden="true">·</span>}
            <time dateTime={frontMatter.date}>{frontMatter.date}</time>
            {frontMatter.readingTime && (
              <>
                <span aria-hidden="true">·</span>
                <span>{frontMatter.readingTime}</span>
              </>
            )}
          </p>
        </header>

        {frontMatter.image && (
          <div className="relative aspect-[1200/630] w-full mb-12 rounded-xl overflow-hidden border border-[#1f2632]">
            <Image
              src={frontMatter.image}
              alt={frontMatter.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <article className="prose prose-invert prose-lg max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-[#cdd5e0] prose-p:leading-relaxed prose-li:text-[#cdd5e0] prose-a:text-[#a78bfa] prose-a:no-underline hover:prose-a:underline prose-code:text-[#a5f3fc] prose-code:bg-[#11161f] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[#1f2632] prose-strong:text-[#e6edf5] prose-blockquote:border-l-[#a78bfa] prose-blockquote:text-[#9aa5b6] prose-table:text-sm prose-thead:border-b prose-thead:border-[#1f2632] prose-th:text-[#e6edf5] prose-td:border-b prose-td:border-[#161b24]">
          {children}
        </article>

        <aside className="mt-16 p-6 rounded-xl bg-gradient-to-br from-[#0d1117] to-[#0a141f] border border-[#1f2632]">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#a78bfa] mb-2">
            Run it hosted
          </p>
          <p className="text-[#e6edf5] mb-3">
            Skip the local install. Run Nmap, Nuclei, and OWASP ZAP on
            VulnScanners and get a client-ready PDF per scan.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#034ea1] text-white font-medium text-sm transition-colors"
          >
            Start scanning →
          </Link>
        </aside>
      </div>
    </main>
  );
};

export default BlogLayout;
