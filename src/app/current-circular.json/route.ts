import { getPublishedCirculars } from "@/lib/jobs";

export const dynamic = "force-static";

export async function GET() {
  return Response.json({ circulars: await getPublishedCirculars() }, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
