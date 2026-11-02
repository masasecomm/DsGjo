import { getPublishedJobFacets } from "@/lib/jobs";

export async function GET(request: Request) {
  const province = new URL(request.url).searchParams.get("province") ?? "";
  const facets = await getPublishedJobFacets(province);
  return Response.json(
    { departments: facets.departments },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
