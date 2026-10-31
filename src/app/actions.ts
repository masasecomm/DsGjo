"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildDpsaCircularPdfUrl,
} from "@/lib/dpsa-circular-discovery";
import { getJobSlug } from "@/lib/job-slugs";

export type FormState = { message: string; error?: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateImportedJobs(rawJobs: FormDataEntryValue | null) {
  if (typeof rawJobs !== "string" || new TextEncoder().encode(rawJobs).byteLength > 7_000_000) {
    throw new Error("The imported vacancy data is missing or too large. Parse the circular again and save fewer vacancies at a time.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJobs);
  } catch {
    throw new Error("The imported vacancy data is invalid. Parse the circular again before saving.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 1000) {
    throw new Error("Select between 1 and 1,000 vacancies to save.");
  }

  return parsed.map((item, index): Database["public"]["Tables"]["jobs"]["Insert"] => {
    if (!isRecord(item)) throw new Error(`Imported vacancy ${index + 1} is invalid.`);
    const job = item;
    const title = typeof job.title === "string" ? job.title.trim() : "";
    const department = typeof job.department === "string" ? job.department.trim() : "";
    const location = typeof job.location === "string" ? job.location.trim() : "";
    const closingDate = typeof job.closing_date === "string" ? job.closing_date.trim() : "";
    const description = typeof job.description === "string" ? job.description.trim() : "";
    const applicationUrl = typeof job.application_url === "string" ? job.application_url.trim() : "";
    const referenceNumber = typeof job.reference_number === "string" ? job.reference_number.trim() : "";
    const province = typeof job.province === "string" ? job.province.trim() : "";
    const employmentType = job.employment_type === null || job.employment_type === undefined
      ? null
      : typeof job.employment_type === "string"
        ? job.employment_type.trim() || null
        : (() => { throw new Error(`Vacancy ${index + 1} has an invalid employment type.`); })();
    const salaryText = typeof job.salary_text === "string" ? job.salary_text.trim() : "";
    const optionalSalaryNumber = (key: "salary_min" | "salary_max") => {
      const value = job[key];
      if (value === null || value === undefined) return null;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Vacancy ${index + 1} has invalid salary details.`);
      }
      return value;
    };
    const salaryMin = optionalSalaryNumber("salary_min");
    const salaryMax = optionalSalaryNumber("salary_max");
    const salaryCurrency = job.salary_currency === null || job.salary_currency === undefined
      ? null
      : typeof job.salary_currency === "string"
        ? job.salary_currency
        : (() => { throw new Error(`Vacancy ${index + 1} has an unsupported salary currency.`); })();
    const jobLevel = typeof job.job_level === "string" ? job.job_level.trim() : "";
    const postNumber = typeof job.dpsa_post_number === "string" ? job.dpsa_post_number.trim() : "";
    const sourceUrl = typeof job.source_url === "string" ? job.source_url.trim() : "";
    const sourcePublishedAt = typeof job.source_published_at === "string" ? job.source_published_at.trim() : "";
    const status = job.status;
    if (job.extracted_details !== undefined && !isRecord(job.extracted_details)) {
      throw new Error(`Vacancy ${index + 1} has invalid extracted details.`);
    }
    const inputDetails = isRecord(job.extracted_details) ? job.extracted_details : {};
    const detailsText = (key: string, maxLength = 5000) => {
      const value = inputDetails[key];
      if (value === undefined) return "";
      if (typeof value !== "string" || value.length > maxLength) {
        throw new Error(`Vacancy ${index + 1} has invalid extracted ${key} details.`);
      }
      return value.trim();
    };
    const detailsList = (key: string) => {
      const value = inputDetails[key];
      if (value === undefined) return [];
      if (!Array.isArray(value) || value.length > 100 || value.some((entry) => typeof entry !== "string" || entry.length > 2000)) {
        throw new Error(`Vacancy ${index + 1} has invalid extracted ${key} details.`);
      }
      return value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean);
    };
    const rawNumberOfPosts = inputDetails.numberOfPosts;
    const numberOfPosts = rawNumberOfPosts === null || rawNumberOfPosts === undefined
      ? null
      : typeof rawNumberOfPosts === "number" && Number.isInteger(rawNumberOfPosts) && rawNumberOfPosts > 0 && rawNumberOfPosts <= 1000
        ? rawNumberOfPosts
        : (() => { throw new Error(`Vacancy ${index + 1} has an invalid number of posts.`); })();
    const structuredDetails: Json = {
      grade: detailsText("grade", 100),
      directorate: detailsText("directorate"),
      jobPurpose: detailsText("jobPurpose"),
      qualifications: detailsList("qualifications"),
      experience: detailsText("experience"),
      professionalRegistration: detailsText("professionalRegistration"),
      driversLicense: detailsText("driversLicense"),
      skills: detailsList("skills"),
      duties: detailsList("duties"),
      applicationInstructions: detailsText("applicationInstructions"),
      applicationEmails: detailsList("applicationEmails"),
      applicationMethods: detailsList("applicationMethods"),
      requiredDocuments: detailsList("requiredDocuments"),
      enquiries: detailsText("enquiries"),
      telephone: detailsText("telephone"),
      centre: detailsText("centre"),
      region: detailsText("region"),
      note: detailsText("note"),
      closingTime: detailsText("closingTime", 10),
      contractDuration: detailsText("contractDuration", 100),
      numberOfPosts,
      salaryBasis: detailsText("salaryBasis", 100),
    };

    if (title.length < 5 || title.length > 180) {
      throw new Error(`Vacancy ${index + 1} needs a title between 5 and 180 characters.`);
    }
    if (department.length > 180 || location.length > 180 || province.length > 100 || referenceNumber.length > 250 || postNumber.length > 40 || jobLevel.length > 50) {
      throw new Error(`Vacancy ${index + 1} has a department or location longer than 180 characters.`);
    }
    if (description.length < 20 || description.length > 20_000) {
      throw new Error(`Vacancy ${index + 1} needs job details between 20 and 20,000 characters.`);
    }
    const parsedClosingDate = /^\d{4}-\d{2}-\d{2}$/.test(closingDate)
      ? new Date(`${closingDate}T00:00:00.000Z`)
      : null;
    if (closingDate && (
      !parsedClosingDate ||
      Number.isNaN(parsedClosingDate.valueOf()) ||
      parsedClosingDate.toISOString().slice(0, 10) !== closingDate
    )) throw new Error(`Vacancy ${index + 1} has an invalid closing date.`);
    if (applicationUrl && (applicationUrl.length > 2048 || !/^https:\/\//i.test(applicationUrl))) {
      throw new Error(`Vacancy ${index + 1} must use a valid HTTPS application link.`);
    }
    if (sourceUrl && (sourceUrl.length > 2048 || !/^https:\/\//i.test(sourceUrl))) {
      throw new Error(`Vacancy ${index + 1} has an invalid source link.`);
    }
    const parsedSourceDate = /^\d{4}-\d{2}-\d{2}$/.test(sourcePublishedAt)
      ? new Date(`${sourcePublishedAt}T00:00:00.000Z`)
      : null;
    if (sourcePublishedAt && (
      !parsedSourceDate
      || Number.isNaN(parsedSourceDate.valueOf())
      || parsedSourceDate.toISOString().slice(0, 10) !== sourcePublishedAt
    )) throw new Error(`Vacancy ${index + 1} has an invalid circular publication date.`);
    if (employmentType && !["Permanent", "Contract", "Internship", "Temporary", "Sessional", "Full-time", "Part-time"].includes(employmentType)) {
      throw new Error(`Vacancy ${index + 1} has an invalid employment type.`);
    }
    if ((salaryMin !== null && salaryMin < 0) || (salaryMax !== null && salaryMax < 0) || (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax)) {
      throw new Error(`Vacancy ${index + 1} has invalid salary details.`);
    }
    if (salaryCurrency && salaryCurrency !== "ZAR") throw new Error(`Vacancy ${index + 1} has an unsupported salary currency.`);
    if (status !== "draft" && status !== "published") {
      throw new Error(`Vacancy ${index + 1} has an invalid publishing status.`);
    }
    const validatedStatus = status === "published" ? "published" : "draft";

    return {
      title,
      slug: getJobSlug(title, description, referenceNumber),
      department: department || null,
      location: location || null,
      closing_date: closingDate || null,
      reference_number: referenceNumber || null,
      province: province || null,
      employment_type: employmentType,
      salary_text: salaryText || null,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: salaryCurrency,
      job_level: jobLevel || null,
      dpsa_post_number: postNumber || null,
      source_url: sourceUrl || null,
      source_published_at: sourcePublishedAt || null,
      structured_details: structuredDetails,
      description,
      application_url: applicationUrl || null,
      status: validatedStatus,
    };
  });
}

export async function subscribeToAlerts(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { message: "Job alerts will be available once the site is connected to its database.", error: true };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 80) {
    return { message: "Enter a name between 2 and 80 characters.", error: true };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { message: "Enter a valid email address.", error: true };
  }
  if (formData.get("consent") !== "on") {
    return { message: "Please agree to the privacy policy to sign up.", error: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("job_alert_subscribers").insert({
    name,
    email,
    status: "active",
    consent_at: new Date().toISOString(),
  });

  if (error?.code === "23505") {
    return { message: "Thanks. If this address was not already registered, it is now on the list." };
  }
  if ((error?.code === "42703" || error?.code === "PGRST204") && error.message.toLowerCase().includes("name")) {
    console.error("Could not save job alert subscription: apply the subscriber-name database migration.", error.code);
    return {
      message: "Sign-up is temporarily unavailable while the site database is updated. Please try again later.",
      error: true,
    };
  }
  if (error) {
    console.error("Could not save job alert subscription.", error.code);
    return {
      message: "We couldn’t save your signup. Please try again in a moment.",
      error: true,
    };
  }

  return { message: "You’re on the list. Email alerts will start once notifications are enabled." };
}

export async function addComment(
  jobId: string,
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { message: "Comments will be available once the site is connected to its database.", error: true };
  }
  const authorName = String(formData.get("author_name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (authorName.length < 2 || authorName.length > 80) {
    return { message: "Enter a name between 2 and 80 characters.", error: true };
  }
  if (content.length < 2 || content.length > 2000) {
    return { message: "Comments must be between 2 and 2,000 characters.", error: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("comments").insert({
    job_id: jobId,
    author_name: authorName,
    content,
    status: "pending",
  });

  if (error) {
    console.error("Could not submit a vacancy comment.", error.code);
    return {
      message: "We couldn’t submit your comment. Please try again.",
      error: true,
    };
  }

  return { message: "Thanks. Your comment has been sent for review." };
}

export async function signIn(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { message: "Connect your Supabase project before signing in.", error: true };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { message: "Enter your email and password.", error: true };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Sign-in failed. Check your credentials and try again.", error: true };
  if (!data.session) {
    return { message: "Sign-in succeeded, but no session was created. Please try again.", error: true };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/admin/login");
}

export async function createJob(formData: FormData) {
  const supabase = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const closingDate = String(formData.get("closing_date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const applicationUrl = String(formData.get("application_url") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");

  if (title.length < 5 || title.length > 180 || description.length < 20) {
    throw new Error("Provide a job title (5–180 characters) and a description of at least 20 characters.");
  }
  if (status !== "draft" && status !== "published") throw new Error("Invalid job status.");
  if (closingDate && !/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) throw new Error("Invalid closing date.");
  if (applicationUrl && !/^https:\/\//i.test(applicationUrl)) throw new Error("Application links must use HTTPS.");

  const referenceNumber = description.match(/\b(?:reference(?:\s+number)?|ref\.?(?:\s*(?:no\.?|number))?)\s*[:.\u2013\u2014-]\s*([^\r\n•]+)/i)?.[1]?.trim() || null;
  const slug = getJobSlug(title, description, referenceNumber);
  const { error } = await supabase.from("jobs").insert({
    title,
    slug,
    department: department || null,
    location: location || null,
    closing_date: closingDate || null,
    reference_number: referenceNumber,
    description,
    application_url: applicationUrl || null,
    status,
  });

  if (error) throw new Error(`Could not create vacancy: ${error.message}`);
  revalidatePath("/");
  revalidatePath("/jobs");
  redirect("/admin/jobs");
}

export async function createImportedJobs(formData: FormData) {
  const supabase = await requireAdmin();
  const inserts = validateImportedJobs(formData.get("jobs"));

  const { error } = await supabase.from("jobs").insert(inserts);
  if (error) throw new Error(`Could not import vacancies: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs?imported=${inserts.length}`);
}

export async function createImportedDpsaCircularJobs(formData: FormData) {
  const supabase = await requireAdmin();
  const yearValue = formData.get("year");
  const numberValue = formData.get("number");
  const pdfUrlValue = formData.get("pdf_url");
  const year = typeof yearValue === "string" && /^\d{4}$/.test(yearValue) ? Number(yearValue) : 0;
  const number = typeof numberValue === "string" && /^\d{1,3}$/.test(numberValue) ? Number(numberValue) : 0;
  const expectedPdfUrl = buildDpsaCircularPdfUrl(year, number);
  if (
    year < 2000 ||
    year > new Date().getUTCFullYear() + 1 ||
    number < 1 ||
    number > 100 ||
    pdfUrlValue !== expectedPdfUrl
  ) {
    throw new Error("The DPSA circular details are invalid. Check for circular updates again.");
  }

  const inserts = validateImportedJobs(formData.get("jobs"));
  const rpcJobs: Json[] = inserts.map((job) => ({
    title: job.title,
    slug: job.slug,
    department: job.department ?? null,
    location: job.location ?? null,
    closing_date: job.closing_date ?? null,
    reference_number: job.reference_number ?? null,
    province: job.province ?? null,
    employment_type: job.employment_type ?? null,
    salary_text: job.salary_text ?? null,
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    salary_currency: job.salary_currency ?? null,
    job_level: job.job_level ?? null,
    dpsa_post_number: job.dpsa_post_number ?? null,
    source_url: job.source_url ?? null,
    source_published_at: job.source_published_at ?? null,
    structured_details: job.structured_details ?? {},
    description: job.description,
    application_url: job.application_url ?? null,
    status: "published",
  }));
  const { data: importedCount, error } = await supabase.rpc("import_dpsa_circular_jobs", {
    p_year: year,
    p_circular_number: number,
    p_pdf_url: expectedPdfUrl,
    p_jobs: rpcJobs,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("This DPSA circular has already been imported. Check for updates again.");
    }
    throw new Error(`Could not import this DPSA circular. Apply the circular-tracking database migration, then try again. ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs?imported=${importedCount}`);
}

export async function updateJobStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "draft" && status !== "published" && status !== "closed")) {
    throw new Error("Invalid vacancy status update.");
  }

  const { error } = await supabase.from("jobs").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Could not update vacancy: ${error.message}`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
}

export async function updateJob(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const closingDate = String(formData.get("closing_date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const applicationUrl = String(formData.get("application_url") ?? "").trim();

  if (!id || title.length < 5 || title.length > 180 || description.length < 20) {
    throw new Error("Provide a job title (5–180 characters) and a description of at least 20 characters.");
  }
  if (closingDate && !/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) throw new Error("Invalid closing date.");
  if (applicationUrl && !/^https:\/\//i.test(applicationUrl)) throw new Error("Application links must use HTTPS.");

  const { error } = await supabase.from("jobs").update({
    title,
    department: department || null,
    location: location || null,
    closing_date: closingDate || null,
    description,
    application_url: applicationUrl || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(`Could not update vacancy: ${error.message}`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function updateCommentStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "approved" && status !== "rejected")) {
    throw new Error("Invalid comment moderation action.");
  }

  const { error } = await supabase.from("comments").update({ status }).eq("id", id);
  if (error) throw new Error(`Could not moderate comment: ${error.message}`);
  revalidatePath("/admin/comments");
  revalidatePath("/jobs", "page");
}

export async function updateSubscriberStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "active" && status !== "unsubscribed")) {
    throw new Error("Invalid subscriber status update.");
  }

  const { error } = await supabase.from("job_alert_subscribers").update({ status }).eq("id", id);
  if (error) throw new Error(`Could not update subscriber: ${error.message}`);
  revalidatePath("/admin/subscribers");
}

export async function deleteComment(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing comment ID.");
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw new Error(`Could not delete comment: ${error.message}`);
  revalidatePath("/admin/comments");
}
