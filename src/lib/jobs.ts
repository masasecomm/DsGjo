import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type PublicComment = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "id" | "author_name" | "content" | "created_at"
>;

function getSouthAfricanDate() {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isJobOpen(job: Pick<Job, "closing_date">) {
  return !job.closing_date || job.closing_date >= getSouthAfricanDate();
}

export async function getPublishedJobs(limit = 100, search?: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const today = getSouthAfricanDate();
  let query = supabase
    .from("jobs")
    .select("id,title,slug,department,location,closing_date,description,application_url,status,created_at,updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search?.trim()) {
    const term = search.trim().replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").slice(0, 80).trim();
    if (term) {
      const searchFilters = ["title", "department", "location", "province"].flatMap((column) => [
        `and(closing_date.is.null,${column}.ilike.%${term}%)`,
        `and(closing_date.gte.${today},${column}.ilike.%${term}%)`,
      ]);
      query = query.or(searchFilters.join(","));
    } else {
      query = query.or(`closing_date.is.null,closing_date.gte.${today}`);
    }
  } else {
    query = query.or(`closing_date.is.null,closing_date.gte.${today}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load vacancies: ${error.message}`);
  return data ?? [];
}

export async function getPublishedDepartments(limit = 8) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("department,closing_date")
    .eq("status", "published")
    .or(`closing_date.is.null,closing_date.gte.${getSouthAfricanDate()}`)
    .not("department", "is", null)
    .order("department")
    .limit(100);

  if (error) throw new Error(`Could not load vacancy departments: ${error.message}`);
  return [...new Set((data ?? []).map(({ department }) => department?.trim()).filter((department): department is string => Boolean(department)))]
    .slice(0, limit);
}

export async function getPublishedJob(slug: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
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
