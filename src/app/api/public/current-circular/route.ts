import { NextResponse } from "next/server";
import { getLatestPublishedCircular } from "@/lib/jobs";

export async function GET() {
  const circular = await getLatestPublishedCircular();
  return NextResponse.json({ circular });
}
