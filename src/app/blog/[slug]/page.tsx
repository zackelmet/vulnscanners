import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import BlogLayout from "@/components/blog/BlogLayout";
import { breadcrumbJsonLd, jsonLdString } from "@/lib/seo/jsonld";

const postsDirectory = path.join(process.cwd(), "src/posts");

function readPost(slug: string) {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  return matter(fileContents);
}

function computeReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

export async function generateStaticParams() {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames.map((fileName) => ({
    slug: fileName.replace(/\.mdx$/, ""),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { data } = readPost(params.slug);
  const url = `https://vulnscanners.com/blog/${params.slug}`;
  const title = data.title || "";
  const description = data.description || "";

  return {
    title,
    description,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: data.date,
      authors: data.author ? [data.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const { content, data } = readPost(params.slug);
  const readingTime = computeReadingTime(content);

  const frontMatter = {
    title: data.title || "",
    date: data.date || "",
    description: data.description || "",
    image: data.image,
    author: data.author || "VulnScanners team",
    readingTime,
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontMatter.title,
    description: frontMatter.description,
    datePublished: frontMatter.date,
    dateModified: data.updated || frontMatter.date,
    author: {
      "@type": "Organization",
      name: frontMatter.author,
    },
    publisher: {
      "@type": "Organization",
      name: "VulnScanners",
      url: "https://vulnscanners.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://vulnscanners.com/blog/${params.slug}`,
    },
  };

  const jsonLd = jsonLdString(
    articleJsonLd,
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: frontMatter.title, url: `/blog/${params.slug}` },
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <BlogLayout frontMatter={frontMatter}>
        <MDXRemote source={content} />
      </BlogLayout>
    </>
  );
}
