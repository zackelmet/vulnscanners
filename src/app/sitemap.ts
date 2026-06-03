import { getAllPosts } from "@/lib/blog/mdx";
import { getToolSlugs } from "@/data/redteam-tools";
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
    {
      url: `${domain}/help-center`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${domain}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
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

  // Red-team tools directory
  staticPages.push({
    url: `${domain}/red-team-tools`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  });
  staticPages.push(
    ...getToolSlugs().map((slug) => ({
      url: `${domain}/red-team-tools/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return staticPages;
}
