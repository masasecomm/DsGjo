import { requireAdmin } from "@/lib/admin";
import { getRecentDpsaCirculars } from "@/lib/dpsa-circular-discovery-server";

export async function GET() {
  const supabase = await requireAdmin();
  try {
    return Response.json(await getRecentDpsaCirculars(supabase), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    console.error("Could not check the DPSA circular listing.", error);
    return Response.json({ error: "Could not check the DPSA circular listing." }, { status: 500 });
  }
}
