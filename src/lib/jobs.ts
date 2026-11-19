import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDpsaCircularPdfUrl } from "@/lib/dpsa-circular-discovery";
import { getDpsaCircularSlug, parseDpsaCircularSlug } from "@/lib/job-slugs";
import { getJobProvince, getVacancyFact, isJobOpen } from "@/lib/job-utils";
import type { Database } from "@/lib/supabase/database.types";

export { getJobProvince, getVacancyFact, isJobOpen, isCircularJob } from "@/lib/job-utils";
export type { Job } from "@/lib/job-utils";
import type { Job } from "@/lib/job-utils";
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
export type JobSearchFilters = {
  province?: string;
  department?: string;
};

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

let jobsCache: Job[] | undefined;

function isJob(value: unknown): value is Job {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const job = value as Record<string, unknown>;
  return typeof job.id === "string"
    && typeof job.title === "string"
    && typeof job.slug === "string"
    && Array.isArray(job.legacy_slugs)
    && typeof job.description === "string"
    && (job.status === "draft" || job.status === "published" || job.status === "closed")
    && typeof job.created_at === "string"
    && typeof job.updated_at === "string";
}

function loadJobs() {
  if (jobsCache) return jobsCache;
  const jobsDirectory = join(process.cwd(), "content", "jobs");
  const files = readdirSync(jobsDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const jobs = files.map((entry) => {
    const filePath = join(entry.parentPath, entry.name);
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Could not read vacancy content at ${filePath}.`, { cause: error });
    }
    if (!isJob(value)) throw new Error(`Vacancy content at ${filePath} has an invalid shape.`);
    return value;
  });
  jobsCache = jobs;
  return jobs;
}

function publishedJobs() {
  return loadJobs().filter((job) => job.status === "published");
}

export async function getAllPublishedJobs() {
  return publishedJobs();
}

export function isJobPostingIndexable(
  job: Pick<Job, "status" | "closing_date" | "location" | "province" | "description">,
) {
  return job.status === "published"
    && isJobOpen(job)
    && Boolean(job.location || job.province || getVacancyFact(job.description, "province"));
}

function filterOpenJobs(search: string | undefined, filters: JobSearchFilters) {
  const term = search?.trim().replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").slice(0, 80).trim().toLowerCase();
  return publishedJobs().filter((job) => {
    if (!isJobOpen(job)) return false;
    if (filters.department?.trim()
      && job.department?.trim().toLowerCase() !== filters.department.trim().toLowerCase()) return false;
    if (filters.province?.trim()) {
      const selectedProvince = southAfricanProvinces.find((province) =>
        province.toLowerCase() === filters.province?.trim().toLowerCase(),
      );
      if (selectedProvince && getJobProvince(job) !== selectedProvince) return false;
    }
    if (term && ![job.title, job.department, job.location, job.description]
      .some((value) => value?.toLowerCase().includes(term))) return false;
    return true;
  }).sort((left, right) =>
    right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id),
  );
}

export async function getPublishedJobs(limit = 100, search?: string, filters: JobSearchFilters = {}) {
  return filterOpenJobs(search, filters).slice(0, Math.max(0, limit));
}

export async function getPublishedJobPage(
  page: number,
  pageSize = 10,
  search?: string,
  filters: JobSearchFilters = {},
) {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid vacancy page.");
  }
  const jobs = filterOpenJobs(search, filters);
  const start = (page - 1) * pageSize;
  return { jobs: jobs.slice(start, start + pageSize), total: jobs.length };
}

export async function getPublishedCircularJobPage(year: number, number: number, page: number, pageSize = 10) {
  if (!Number.isInteger(year) || !Number.isInteger(number) || number < 1 || number > 100) {
    throw new Error("Invalid DPSA circular details.");
  }
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid vacancy page.");
  }
  const matchingJobs = await getPublishedCircularJobs(year, number);
  const start = (page - 1) * pageSize;
  return { jobs: matchingJobs.slice(start, start + pageSize), total: matchingJobs.length };
}

export async function getPublishedCircularJobs(year: number, number: number) {
  if (!Number.isInteger(year) || !Number.isInteger(number) || number < 1 || number > 100) {
    throw new Error("Invalid DPSA circular details.");
  }
  const pdfUrl = buildDpsaCircularPdfUrl(year, number);
  return publishedJobs()
    .filter((job) =>
      new RegExp(`\\bDPSA CIRCULAR ${number} of ${year}\\b`, "i").test(job.description)
      || job.source_url === pdfUrl,
    )
    .sort((left, right) =>
      right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id),
    );
}

export function getPublishedCircularSlugs(jobs: Pick<Job, "description" | "source_url">[]) {
  return [...new Set(jobs
    .map((job) => getDpsaCircularSlug(`${job.description} ${job.source_url ?? ""}`))
    .filter((slug): slug is string => Boolean(slug)))];
}

export async function getPublishedCirculars(): Promise<PublishedCircular[]> {
  const circulars = new Map<string, PublishedCircular>();
  for (const job of publishedJobs()) {
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

export async function getPublishedJobFacets(selectedProvince?: string): Promise<PublishedJobFacets> {
  const jobs = publishedJobs().filter(isJobOpen);
  const provinceCounts = new Map<string, number>();
  const departmentSets = new Map<string, Set<string>>();
  const allDepartments = new Set<string>();

  for (const job of jobs) {
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

  const departmentsByProvince = Object.fromEntries([...departmentSets.entries()].map(([province, departments]) => [
    province,
    [...departments].sort((left, right) => left.localeCompare(right)),
  ]));
  const selected = Object.keys(departmentsByProvince)
    .find((province) => province.toLowerCase() === selectedProvince?.trim().toLowerCase());

  return {
    total: jobs.length,
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
  return publishedJobs().find((job) =>
    job.slug === slug || job.legacy_slugs.includes(slug),
  ) ?? null;
}
