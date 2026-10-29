import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPublishedJobs } from "@/lib/jobs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dpsagovernmentjobs.co.za";
  const jobs = await getPublishedJobs(5000);
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/jobs`, changeFrequency: "daily", priority: 0.9 },
    ...jobs.map((job) => ({
      url: `${siteUrl}/jobs/${job.slug}`,
      lastModified: job.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
