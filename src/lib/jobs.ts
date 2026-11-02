import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDpsaCircularSlug, parseDpsaCircularSlug } from "@/lib/job-slugs";
import { buildDpsaCircularPdfUrl } from "@/lib/dpsa-circular-discovery";
import type { Database } from "@/lib/supabase/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type PublishedCircular = {
  year: number;
  number: number;
};
export type PublishedJobFacets = {
  total: number;
  provinces: Array<{ name: string; count: number }>;
  departments: string[];
  departmentsByProvince: Record<string, string[]>;
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

const searchConsolePopularSearches = [
  "DPSA vacancies 2026",
  "DPSA",
  "DPSA circular",
  "DPSA circular 2026",
  "Government vacancies",
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

export function getJobProvince(job: Pick<Job, "location" | "description"> & Partial<Pick<Job, "province">>) {
  const candidate = job.province?.trim() || getVacancyFact(job.description, "province") || job.location?.trim() || "";
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

function getPublicJobsFilter(today: string, search: string | undefined, filters: JobSearchFilters) {
  const conditions = [`or(closing_date.is.null,closing_date.gte.${today})`];
  if (filters.province) {
    const province = southAfricanProvinces.find((name) =>
      name.toLowerCase() === filters.province?.trim().toLowerCase(),
    );
    if (province) {
      conditions.push(
        `or(province.eq."${province}",location.eq."${province}",description.ilike."%Province: ${province}%")`,
      );
    }
  }
  if (search?.trim()) {
    const term = search.trim().replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").slice(0, 80).trim();
    if (term) {
      conditions.push(`or(${["title", "department", "location", "description"]
        .map((column) => `${column}.ilike."%${term}%"`)
        .join(",")})`);
    }
  }
  return `and(${conditions.join(",")})`;
}

export async function getPublishedJobs(limit = 100, search?: string, filters: JobSearchFilters = {}) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const today = getSouthAfricanDate();
  const jobs: Array<{
    id: string;
    title: string;
    slug: string;
    department: string | null;
    location: string | null;
    province: string | null;
    closing_date: string | null;
    description: string;
    application_url: string | null;
    source_url: string | null;
    status: "draft" | "published" | "closed";
    created_at: string;
    updated_at: string;
  }> = [];
  const pageSize = 1000;

  for (let offset = 0; offset < limit; offset += pageSize) {
    const batchSize = Math.min(pageSize, limit - offset);
    let query = supabase
      .from("jobs")
      .select("id,title,slug,department,location,province,closing_date,description,application_url,source_url,status,created_at,updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (filters.department?.trim()) {
      query = query.eq("department", filters.department.trim().slice(0, 180));
    }

    const { data, error } = await query.or(getPublicJobsFilter(today, search, filters));
    if (error) throw new Error(`Could not load vacancies: ${error.message}`);
    jobs.push(...(data ?? []));
    if ((data?.length ?? 0) < batchSize) break;
  }
  return jobs;
}

export async function getPublishedJobPage(
  page: number,
  pageSize = 10,
  search?: string,
  filters: JobSearchFilters = {},
) {
  if (!isSupabaseConfigured()) return { jobs: [], total: 0 };
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid vacancy page.");
  }

  const supabase = await createSupabaseServerClient();
  const today = getSouthAfricanDate();
  let query = supabase
    .from("jobs")
    .select("id,title,slug,department,location,province,closing_date,description,application_url,status,created_at,updated_at", { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.department?.trim()) {
    query = query.eq("department", filters.department.trim().slice(0, 180));
  }
  const { data, count, error } = await query
    .or(getPublicJobsFilter(today, search, filters));
  if (error) throw new Error(`Could not load vacancy page: ${error.message}`);
  return { jobs: data ?? [], total: count ?? 0 };
}

export async function getPublishedCircularJobPage(year: number, number: number, page: number, pageSize = 10) {
  if (!isSupabaseConfigured()) return { jobs: [], total: 0 };
  if (!Number.isInteger(year) || !Number.isInteger(number) || number < 1 || number > 100) {
    throw new Error("Invalid DPSA circular details.");
  }
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid vacancy page.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, count, error } = await supabase
    .from("jobs")
    .select("id,title,slug,department,location,province,closing_date,description,application_url,status,created_at,updated_at", { count: "exact" })
    .eq("status", "published")
    .or(`description.ilike.%DPSA CIRCULAR ${number} of ${year}%,source_url.eq.${buildDpsaCircularPdfUrl(year, number)}`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw new Error(`Could not load DPSA Circular ${number} of ${year} vacancies: ${error.message}`);
  return { jobs: data ?? [], total: count ?? 0 };
}

export function getPublishedCircularSlugs(jobs: Pick<Job, "description" | "source_url">[]) {
  return [...new Set(jobs
    .map((job) => getDpsaCircularSlug(`${job.description} ${job.source_url ?? ""}`))
    .filter((slug): slug is string => Boolean(slug)))];
}

export async function getPublishedCirculars(): Promise<PublishedCircular[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const jobs: Pick<Job, "description" | "source_url">[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("jobs")
      .select("description,source_url")
      .eq("status", "published")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load published DPSA circulars: ${error.message}`);
    jobs.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }

  const circulars = new Map<string, PublishedCircular>();
  for (const job of jobs) {
    const slug = getDpsaCircularSlug(`${job.description} ${job.source_url ?? ""}`);
    const circular = slug ? parseDpsaCircularSlug(slug) : null;
    if (circular) circulars.set(`${circular.year}-${circular.number}`, circular);
  }

  return [...circulars.values()].sort((left, right) =>
    right.year - left.year || right.number - left.number,
  );
}

export async function getLatestPublishedCircular(): Promise<PublishedCircular | null> {
  return (await getPublishedCirculars())[0] ?? null;
}

export async function getPopularJobSearches(limit = 6) {
  const fallbackSearches = () =>
    searchConsolePopularSearches.slice(0, limit).map((search_term) => ({ search_term }));
  if (!isSupabaseConfigured()) return fallbackSearches();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_popular_job_searches", {
    p_limit: Math.max(1, Math.min(limit, 8)),
  });
  if (error) {
    console.error("Could not load popular job searches. Apply the job search analytics migration to enable this feature.", error.message);
    return fallbackSearches();
  }
  return data?.length ? data : fallbackSearches();
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

export async function getPublishedJobFacets(selectedProvince?: string): Promise<PublishedJobFacets> {
  if (!isSupabaseConfigured()) return { total: 0, provinces: [], departments: [], departmentsByProvince: {} };

  const supabase = await createSupabaseServerClient();
  const provinceCounts = new Map<string, number>();
  const departmentSets = new Map<string, Set<string>>();
  const allDepartments = new Set<string>();
  const today = getSouthAfricanDate();
  let total = 0;
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("jobs")
      .select("province,location,description,department")
      .eq("status", "published")
      .or(`closing_date.is.null,closing_date.gte.${today}`)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load vacancy filters: ${error.message}`);
    const rows = data ?? [];
    total += rows.length;
    for (const job of rows) {
      const province = getJobProvince(job);
      if (province) provinceCounts.set(province, (provinceCounts.get(province) ?? 0) + 1);
      const department = job.department?.trim();
      if (department) {
        allDepartments.add(department);
        if (province) {
          const provinceDepartments = departmentSets.get(province) ?? new Set<string>();
          provinceDepartments.add(department);
          departmentSets.set(province, provinceDepartments);
        }
      }
    }
    if (rows.length < pageSize) break;
  }

  const departmentsByProvince = Object.fromEntries([...departmentSets.entries()].map(([province, departments]) => [
    province,
    [...departments].sort((left, right) => left.localeCompare(right)),
  ]));
  const selected = Object.keys(departmentsByProvince)
    .find((province) => province.toLowerCase() === selectedProvince?.trim().toLowerCase());

  return {
    total,
    provinces: [...provinceCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    departments: selectedProvince
      ? departmentsByProvince[selected ?? ""] ?? []
      : [...allDepartments].sort((left, right) => left.localeCompare(right)),
    departmentsByProvince,
  };
}

export async function getPublishedDepartments(limit = 100, province?: string) {
  return (await getPublishedJobFacets(province)).departments.slice(0, limit);
}

export async function getPublishedProvinces() {
  return (await getPublishedJobFacets()).provinces.map(({ name }) => name);
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
  if (data) return data;

  const { data: legacyJob, error: legacyError } = await supabase
    .from("jobs")
    .select("*")
    .contains("legacy_slugs", [slug])
    .eq("status", "published")
    .maybeSingle();

  if (legacyError) throw new Error(`Could not load legacy vacancy URL: ${legacyError.message}`);
  return legacyJob;
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
