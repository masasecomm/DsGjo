import { NextResponse } from "next/server";
import { getPublishedCirculars } from "@/lib/jobs";

export async function GET() {
  const circulars = await getPublishedCirculars();
  return NextResponse.json(
    { circulars },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
