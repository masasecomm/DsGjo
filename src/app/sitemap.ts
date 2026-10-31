import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPublishedJobs } from "@/lib/jobs";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const siteUrl = getSiteUrl();
  const jobs = await getPublishedJobs(50_000);
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/cookie-statement`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
    ...jobs.map((job) => ({
      url: `${siteUrl}/jobs/${job.slug}`,
      lastModified: job.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
