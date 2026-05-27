import { getAllPosts } from "@/lib/blog/mdx";
import type { MetadataRoute } from "next";

const domain = "https://vulnscanners.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: domain,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${domain}/scanners/nmap`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${domain}/scanners/nuclei`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${domain}/scanners/zap`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${domain}/trust-safety`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  if (process.env.NEXT_PUBLIC_ENABLE_BLOG === "true") {
    staticPages.push({
      url: `${domain}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    const posts = await getAllPosts();
    staticPages.push(
      ...posts.map((post) => ({
        url: `${domain}/blog/${post.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    );
  }

  return staticPages;
}
