import Link from "next/link";
import { notFound } from "next/navigation";
import { updateJob } from "@/app/actions";
import { requireAdmin } from "@/lib/admin";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await requireAdmin();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,title,department,location,closing_date,description,application_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load vacancy: ${error.message}`);
  if (!job) notFound();

  return (
    <>
      <Link href="/admin/jobs" className="back-link">← All vacancies</Link>
      <h1>Edit vacancy</h1>
      <p className="admin-subtitle">Update the details shown to job seekers.</p>
      <section className="admin-panel">
        <form action={updateJob} className="site-form">
          <input name="id" type="hidden" value={job.id} />
          <label>Job title<input maxLength={180} name="title" required defaultValue={job.title} /></label>
          <label>Department<input name="department" defaultValue={job.department ?? ""} /></label>
          <label>Location<input name="location" defaultValue={job.location ?? ""} /></label>
          <label>Closing date<input name="closing_date" type="date" defaultValue={job.closing_date ?? ""} /></label>
          <label>Job details<textarea maxLength={20000} name="description" required defaultValue={job.description} /></label>
          <label>Application link<input name="application_url" type="url" defaultValue={job.application_url ?? ""} /></label>
          <button className="form-button" type="submit">Save changes</button>
        </form>
      </section>
    </>
  );
}
