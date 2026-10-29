import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type PublicComment = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "id" | "author_name" | "content" | "created_at"
>;

export async function getPublishedJobs(limit = 100, search?: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("jobs")
    .select("id,title,slug,department,location,closing_date,description,application_url,status,created_at,updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search?.trim()) {
    const term = search.trim().replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").slice(0, 80).trim();
    if (term) query = query.or(`title.ilike.%${term}%,department.ilike.%${term}%,location.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load vacancies: ${error.message}`);
  return data ?? [];
}

export async function getPublishedJob(slug: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,slug,department,location,closing_date,description,application_url,status,created_at,updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`Could not load vacancy: ${error.message}`);
  return data;
}

export async function getApprovedComments(jobId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id,author_name,content,created_at")
    .eq("job_id", jobId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load comments: ${error.message}`);
  return data ?? [];
}
