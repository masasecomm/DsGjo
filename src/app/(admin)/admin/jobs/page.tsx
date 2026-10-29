import { createJob, updateJobStatus } from "@/app/actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminJobsPage() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,slug,department,location,closing_date,description,application_url,status,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load vacancies: ${error.message}`);
  const jobs = data ?? [];

  return (
    <>
      <h1>Vacancies</h1>
      <p className="admin-subtitle">Create and manage the opportunities published on your site.</p>
      <section className="admin-panel">
        <h2>Add a vacancy</h2>
        <form action={createJob} className="admin-inline-form">
          <input className="grow" maxLength={180} name="title" placeholder="Job title" required />
          <input name="department" placeholder="Department" />
          <input name="location" placeholder="Location" />
          <input name="closing_date" type="date" aria-label="Closing date" />
          <textarea maxLength={20000} name="description" placeholder="Job details and requirements" required />
          <input className="grow" name="application_url" placeholder="Application link (https://...)" type="url" />
          <select aria-label="Initial status" defaultValue="draft" name="status"><option value="draft">Save as draft</option><option value="published">Publish now</option></select>
          <button className="form-button" type="submit">Save vacancy</button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>All vacancies ({jobs.length})</h2>
        {jobs.length ? <table className="admin-table"><thead><tr><th>Title</th><th>Department</th><th>Status</th><th>Closing date</th><th>Actions</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td><a className="text-link" href={`/admin/jobs/${job.id}/edit`}>{job.title}</a><br /><small>/{job.slug}/</small></td><td>{job.department || "—"}</td><td><span className={`admin-status ${job.status}`}>{job.status}</span></td><td>{job.closing_date || "—"}</td><td><form action={updateJobStatus}><input name="id" type="hidden" value={job.id} /><input name="status" type="hidden" value={job.status === "published" ? "closed" : "published"} /><button type="submit">{job.status === "published" ? "Close" : "Publish"}</button></form></td></tr>)}</tbody></table> : <p className="admin-empty">Create your first vacancy above.</p>}
      </section>
    </>
  );
}
