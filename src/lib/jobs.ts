import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type PublishedCircular = {
  year: number;
  number: number;
};
export type PublicComment = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "id" | "author_name" | "content" | "created_at"
>;

const southAfricanProvinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

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

export function getVacancyFact(description: string, ...labels: string[]) {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return description.match(new RegExp(`\\b(?:${labelPattern})\\s*:\\s*([^•|\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
}

export function getJobProvince(job: Pick<Job, "location" | "description">) {
  const candidate = getVacancyFact(job.description, "province") || job.location?.trim() || "";
  return southAfricanProvinces.find((province) => province.toLowerCase() === candidate.toLowerCase()) ?? "";
}

export function isCircularJob(job: Pick<Job, "description"> & Partial<Pick<Job, "source_url">>) {
  if (/\bDPSA\s+CIRCULAR\s+\d{1,3}\s+of\s+20\d{2}\b/i.test(job.description)
    || /\bCircular PDF:\s*https:\/\/\S+/i.test(job.description)) {
    return true;
  }

  if (!job.source_url) return false;
  try {
    const url = new URL(job.source_url);
    const path = decodeURIComponent(url.pathname);
    return (url.hostname === "dpsa.gov.za" || url.hostname === "www.dpsa.gov.za")
      && /\bcircular(?:[-_\s]+)?\d{1,3}\b/i.test(path);
  } catch {
    return false;
  }
}

export type JobSearchFilters = {
  province?: string;
  department?: string;
};

export async function getPublishedJobs(limit = 100, search?: string, filters: JobSearchFilters = {}) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const today = getSouthAfricanDate();
  let query = supabase
    .from("jobs")
    .select("id,title,slug,department,location,closing_date,description,application_url,status,created_at,updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.province) {
    const province = southAfricanProvinces.find((name) => name.toLowerCase() === filters.province?.trim().toLowerCase());
    if (province) query = query.ilike("description", `%Province: ${province}%`);
  }
  if (filters.department?.trim()) {
    query = query.eq("department", filters.department.trim().slice(0, 180));
  }

  if (search?.trim()) {
    const term = search.trim().replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").slice(0, 80).trim();
    if (term) {
      const searchFilters = ["title", "department", "location", "description"]
        .map((column) => `${column}.ilike.%${term}%`);
      query = query.or(searchFilters.join(","));
    }
  }

  query = query.or(`closing_date.is.null,closing_date.gte.${today}`);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load vacancies: ${error.message}`);
  return data ?? [];
}

export async function getLatestPublishedCircular(): Promise<PublishedCircular | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("description")
    .eq("status", "published")
    .or(`closing_date.is.null,closing_date.gte.${getSouthAfricanDate()}`)
    .ilike("description", "%DPSA CIRCULAR%")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`Could not load published circular vacancies: ${error.message}`);

  const circulars = new Map<string, PublishedCircular>();
  for (const { description } of data ?? []) {
    for (const match of description.matchAll(/\bDPSA\s+CIRCULAR\s+(\d{1,3})\s+of\s+(20\d{2})\b/gi)) {
      const number = Number(match[1]);
      const year = Number(match[2]);
      if (number < 1 || number > 100) continue;
      circulars.set(`${year}-${number}`, { year, number });
    }
  }

  return [...circulars.values()].sort((left, right) =>
    right.year - left.year || right.number - left.number,
  )[0] ?? null;
}

export async function getPopularJobSearches(limit = 6) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_popular_job_searches", {
    p_limit: Math.max(1, Math.min(limit, 8)),
  });
  if (error) {
    console.error("Could not load popular job searches. Apply the job search analytics migration to enable this feature.", error.message);
    return [];
  }
  return data ?? [];
}

export async function recordPopularJobSearch(searchTerm: string) {
  const term = searchTerm.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!isSupabaseConfigured() || term.length < 2 || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(term)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_public_job_search", {
    p_search_term: term,
  });
  if (error) {
    console.error("Could not record an anonymous job search. Apply the job search analytics migration to enable this feature.", error.message);
  }
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

export async function getPublishedProvinces() {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("location,description,closing_date")
    .eq("status", "published")
    .or(`closing_date.is.null,closing_date.gte.${getSouthAfricanDate()}`)
    .limit(1000);

  if (error) throw new Error(`Could not load vacancy provinces: ${error.message}`);
  const provinces = new Set<string>();
  for (const job of data ?? []) {
    const province = getJobProvince(job);
    if (province) provinces.add(province);
  }
  return [...provinces].sort((left, right) => left.localeCompare(right));
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
