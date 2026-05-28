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
      url: `${domain}/scanners`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
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
  ];

  staticPages.push({
    url: `${domain}/blog`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  });

  const posts = await getAllPosts(["slug", "date"]);
  staticPages.push(
    ...posts.map((post) => ({
      url: `${domain}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return staticPages;
}
