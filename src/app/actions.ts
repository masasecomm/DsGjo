"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FormState = { message: string; error?: boolean };

export async function subscribeToAlerts(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { message: "Job alerts will be available once the site is connected to its database.", error: true };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { message: "Enter a valid email address.", error: true };
  }
  if (formData.get("consent") !== "on") {
    return { message: "Please agree to the privacy policy to sign up.", error: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("job_alert_subscribers").insert({
    email,
    status: "active",
    consent_at: new Date().toISOString(),
  });

  if (error?.code === "23505") {
    return { message: "Thanks. If this address was not already registered, it is now on the list." };
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Sign-in failed. Check your credentials and try again.", error: true };
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

  const slugBase = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("jobs").insert({
    title,
    slug,
    department: department || null,
    location: location || null,
    closing_date: closingDate || null,
    description,
    application_url: applicationUrl || null,
    status,
  });

  if (error) throw new Error(`Could not create vacancy: ${error.message}`);
  revalidatePath("/");
  revalidatePath("/jobs");
  redirect("/admin/jobs");
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
