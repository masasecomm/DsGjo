import { revalidatePath } from "next/cache";
import type { Database, Json } from "@/lib/supabase/database.types";
import { buildDpsaCircularPdfUrl } from "@/lib/dpsa-circular-discovery";
import { getJobSlug } from "@/lib/job-slugs";
import { requireAdmin } from "@/lib/admin";

const maxRequestBytes = 1_000_000;
const maxBatchSize = 25;
const supportedEmploymentTypes: readonly string[] = [
  "Permanent",
  "Contract",
  "Internship",
  "Temporary",
  "Sessional",
  "Full-time",
  "Part-time",
];

type ImportAction = "check" | "batch" | "finish";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(
  value: unknown,
  field: string,
  index: number,
  maxLength = 5000,
): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`Vacancy ${index} has invalid ${field} details.`);
  }
  return value.trim();
}

function getStringList(value: unknown, field: string, index: number): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value)
    || value.length > 100
    || value.some((entry) => typeof entry !== "string" || entry.length > 2000)
  ) {
    throw new Error(`Vacancy ${index} has invalid ${field} details.`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function getOptionalNumber(value: unknown, field: string, index: number) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Vacancy ${index} has invalid ${field} details.`);
  }
  return value;
}

function getCircularDetails(value: unknown, index: number): Json {
  if (value !== undefined && !isRecord(value)) {
    throw new Error(`Vacancy ${index} has invalid extracted details.`);
  }
  const details = isRecord(value) ? value : {};
  const rawNumberOfPosts = details.numberOfPosts;
  const numberOfPosts = rawNumberOfPosts === null || rawNumberOfPosts === undefined
    ? null
    : typeof rawNumberOfPosts === "number"
      && Number.isInteger(rawNumberOfPosts)
      && rawNumberOfPosts > 0
      && rawNumberOfPosts <= 1000
      ? rawNumberOfPosts
      : (() => { throw new Error(`Vacancy ${index} has an invalid number of posts.`); })();

  return {
    grade: getText(details.grade, "grade", index, 100),
    directorate: getText(details.directorate, "directorate", index),
    jobPurpose: getText(details.jobPurpose, "job purpose", index),
    qualifications: getStringList(details.qualifications, "qualifications", index),
    experience: getText(details.experience, "experience", index),
    professionalRegistration: getText(details.professionalRegistration, "professional registration", index),
    driversLicense: getText(details.driversLicense, "driver's licence", index),
    skills: getStringList(details.skills, "skills", index),
    duties: getStringList(details.duties, "duties", index),
    applicationInstructions: getText(details.applicationInstructions, "application instructions", index),
    applicationEmails: getStringList(details.applicationEmails, "application emails", index),
    applicationMethods: getStringList(details.applicationMethods, "application methods", index),
    requiredDocuments: getStringList(details.requiredDocuments, "required documents", index),
    enquiries: getText(details.enquiries, "enquiries", index),
    telephone: getText(details.telephone, "telephone", index),
    centre: getText(details.centre, "centre", index),
    region: getText(details.region, "region", index),
    note: getText(details.note, "note", index),
    closingTime: getText(details.closingTime, "closing time", index, 10),
    contractDuration: getText(details.contractDuration, "contract duration", index, 100),
    numberOfPosts,
    salaryBasis: getText(details.salaryBasis, "salary basis", index, 100),
  };
}

function validateCircularJobs(
  value: unknown,
  pdfUrl: string,
): Database["public"]["Tables"]["jobs"]["Insert"][] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxBatchSize) {
    throw new Error(`Send between 1 and ${maxBatchSize} vacancies in each batch.`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Vacancy ${index + 1} is invalid.`);
    const title = getText(item.title, "title", index + 1, 180);
    const description = getText(item.description, "description", index + 1, 20_000);
    const department = getText(item.department, "department", index + 1, 180);
    const location = getText(item.location, "location", index + 1, 180);
    const referenceNumber = getText(item.reference_number, "reference number", index + 1, 250);
    const province = getText(item.province, "province", index + 1, 100);
    const employmentType = item.employment_type;
    const salaryText = getText(item.salary_text, "salary", index + 1);
    const jobLevel = getText(item.job_level, "job level", index + 1, 50);
    const postNumber = getText(item.dpsa_post_number, "post number", index + 1, 40);
    const sourcePublishedAt = getText(item.source_published_at, "publication date", index + 1, 10);
    const applicationUrl = getText(item.application_url, "application link", index + 1, 2048);
    const salaryMin = getOptionalNumber(item.salary_min, "salary", index + 1);
    const salaryMax = getOptionalNumber(item.salary_max, "salary", index + 1);
    const salaryCurrency = item.salary_currency;
    const closingDate = getText(item.closing_date, "closing date", index + 1, 10);

    if (title.length < 5) throw new Error(`Vacancy ${index + 1} needs a title of at least 5 characters.`);
    if (description.length < 20) throw new Error(`Vacancy ${index + 1} needs job details of at least 20 characters.`);
    if (closingDate && !isIsoDate(closingDate)) throw new Error(`Vacancy ${index + 1} has an invalid closing date.`);
    if (sourcePublishedAt && !isIsoDate(sourcePublishedAt)) {
      throw new Error(`Vacancy ${index + 1} has an invalid circular publication date.`);
    }
    if (applicationUrl && !/^https:\/\//i.test(applicationUrl)) {
      throw new Error(`Vacancy ${index + 1} must use a valid HTTPS application link.`);
    }
    if (
      employmentType !== null
      && employmentType !== undefined
      && (typeof employmentType !== "string" || !supportedEmploymentTypes.includes(employmentType))
    ) {
      throw new Error(`Vacancy ${index + 1} has an invalid employment type.`);
    }
    if (
      (salaryMin !== null && salaryMin < 0)
      || (salaryMax !== null && salaryMax < 0)
      || (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax)
    ) {
      throw new Error(`Vacancy ${index + 1} has invalid salary details.`);
    }
    if (salaryCurrency !== null && salaryCurrency !== undefined && salaryCurrency !== "ZAR") {
      throw new Error(`Vacancy ${index + 1} has an unsupported salary currency.`);
    }
    const validatedEmploymentType = typeof employmentType === "string" ? employmentType : null;
    const validatedSalaryCurrency = salaryCurrency === "ZAR" ? "ZAR" : null;

    return {
      title,
      slug: getJobSlug(title, description, pdfUrl),
      department: department || null,
      location: location || null,
      closing_date: closingDate || null,
      reference_number: referenceNumber || null,
      province: province || null,
      employment_type: validatedEmploymentType,
      salary_text: salaryText || null,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: validatedSalaryCurrency,
      job_level: jobLevel || null,
      dpsa_post_number: postNumber || null,
      source_url: pdfUrl,
      source_published_at: sourcePublishedAt || null,
      structured_details: getCircularDetails(item.extracted_details, index + 1),
      description,
      application_url: applicationUrl || null,
      status: "published",
    };
  });
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

async function readRequest(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    throw new Error("This batch is too large. Try publishing again to send a smaller batch.");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxRequestBytes) {
    throw new Error("This batch is too large. Try publishing again to send a smaller batch.");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The publish request was invalid. Please try again.");
  }
  if (!isRecord(value)) throw new Error("The publish request was invalid. Please try again.");
  return value;
}

function validateCircular(value: Record<string, unknown>) {
  const year = value.year;
  const number = value.number;
  if (
    typeof year !== "number"
    || !Number.isInteger(year)
    || year < 2000
    || year > new Date().getUTCFullYear() + 1
    || typeof number !== "number"
    || !Number.isInteger(number)
    || number < 1
    || number > 100
  ) {
    throw new Error("The DPSA circular details are invalid. Check for circular updates again.");
  }
  return { year, number, pdfUrl: buildDpsaCircularPdfUrl(year, number) };
}

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  try {
    const body = await readRequest(request);
    const action = body.action as ImportAction;
    const circular = validateCircular(body);
    if (body.pdfUrl !== circular.pdfUrl) {
      return Response.json({ error: "The DPSA circular details are invalid. Check for circular updates again." }, { status: 400 });
    }

    if (action === "check") {
      const { data, error } = await supabase
        .from("imported_dpsa_circulars")
        .select("job_count")
        .eq("year", circular.year)
        .eq("circular_number", circular.number)
        .maybeSingle();
      if (error) throw new Error(`Could not check the circular import status: ${error.message}`);
      return Response.json({ alreadyImported: Boolean(data), posted: data?.job_count ?? 0 });
    }

    if (action === "batch") {
      const jobs = validateCircularJobs(body.jobs, circular.pdfUrl);
      const postNumbers = jobs.flatMap((job) => job.dpsa_post_number ? [job.dpsa_post_number] : []);
      const existingByPostNumber = new Map<string, { id: string }>();
      if (postNumbers.length > 0) {
        const { data: existingJobs, error: existingJobsError } = await supabase
          .from("jobs")
          .select("id,dpsa_post_number")
          .eq("source_url", circular.pdfUrl)
          .in("dpsa_post_number", postNumbers);
        if (existingJobsError) throw new Error(`Could not resume circular publishing: ${existingJobsError.message}`);
        for (const job of existingJobs ?? []) {
          if (job.dpsa_post_number) existingByPostNumber.set(job.dpsa_post_number, { id: job.id });
        }
      }
      const usedIds = new Set<string>();
      const resumableJobs = jobs.map((job) => {
        const existing = job.dpsa_post_number
          ? existingByPostNumber.get(job.dpsa_post_number)
          : undefined;
        if (!existing || usedIds.has(existing.id)) return job;
        usedIds.add(existing.id);
        return { ...job, id: existing.id };
      });

      const { error } = await supabase.from("jobs").upsert(resumableJobs, { onConflict: "id" });
      if (error) throw new Error(`Could not publish this batch: ${error.message}`);
      revalidatePath("/");
      revalidatePath("/jobs");
      revalidatePath("/admin/jobs");
      return Response.json({ posted: jobs.length });
    }

    if (action === "finish") {
      const totalJobs = body.totalJobs;
      if (typeof totalJobs !== "number" || !Number.isInteger(totalJobs) || totalJobs < 1 || totalJobs > 1000) {
        return Response.json({ error: "The total number of vacancies is invalid." }, { status: 400 });
      }

      const { count, error: countError } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("source_url", circular.pdfUrl)
        .eq("status", "published");
      if (countError) throw new Error(`Could not verify published vacancies: ${countError.message}`);
      if (count !== totalJobs) {
        return Response.json({
          error: `Only ${count ?? 0} of ${totalJobs} vacancies are confirmed as posted. Retry publishing to finish the remaining jobs.`,
        }, { status: 409 });
      }

      const { error } = await supabase.from("imported_dpsa_circulars").insert({
        year: circular.year,
        circular_number: circular.number,
        source_pdf_url: circular.pdfUrl,
        job_count: totalJobs,
      });
      if (error && error.code !== "23505") throw new Error(`Could not finish recording the circular import: ${error.message}`);

      revalidatePath("/");
      revalidatePath("/jobs");
      revalidatePath("/admin/jobs");
      return Response.json({ posted: totalJobs, complete: true });
    }

    return Response.json({ error: "The publish request was invalid." }, { status: 400 });
  } catch (error) {
    console.error("Could not publish DPSA circular vacancies.", error);
    return Response.json({
      error: error instanceof Error ? error.message : "Could not publish this batch. Please try again.",
    }, { status: 500 });
  }
}
