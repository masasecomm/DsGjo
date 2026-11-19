import { getAllPublishedJobs } from "@/lib/jobs";

export const dynamic = "force-static";

export async function GET() {
  const jobs = await getAllPublishedJobs();
  return Response.json(jobs, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
