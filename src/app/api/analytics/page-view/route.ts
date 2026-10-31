import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Analytics are not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A valid JSON request body is required." }, { status: 400 });
  }

  const pagePath = typeof body === "object" && body !== null && "pagePath" in body
    ? body.pagePath
    : null;
  if (typeof pagePath !== "string" || pagePath.length > 200) {
    return Response.json({ error: "A valid page path is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_public_page_view", {
    p_page_path: pagePath,
  });
  if (error) {
    console.error("Could not record an anonymous page view.", error.message);
    return Response.json({ error: "Could not record the page view." }, { status: 500 });
  }

  return Response.json({ recorded: data });
}
