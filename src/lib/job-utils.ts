import type { Database } from "@/lib/supabase/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];

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

export function getJobProvince(job: Pick<Job, "location" | "description"> & Partial<Pick<Job, "province">>) {
  const candidate = job.province?.trim()
    || getVacancyFact(job.description, "province")
    || job.location?.trim()
    || "";
  return southAfricanProvinces.find((province) => province.toLowerCase() === candidate.toLowerCase()) ?? "";
}

export function isCircularJob(job: Pick<Job, "description"> & Partial<Pick<Job, "source_url">>) {
  if (
    /\bDPSA\s+CIRCULAR\s+\d{1,3}\s+of\s+20\d{2}\b/i.test(job.description)
    || /\bCircular PDF:\s*https:\/\/\S+/i.test(job.description)
  ) return true;

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
