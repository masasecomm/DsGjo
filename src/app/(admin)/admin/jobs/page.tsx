import { Suspense } from "react";
import { connection } from "next/server";
import { updateJobStatus } from "@/app/actions";
import { DpsaCircularDiscovery } from "@/components/admin/dpsa-circular-discovery";
import { requireAdmin } from "@/lib/admin";

async function AdminJobsContent({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string | string[] }>;
}) {
  const { imported: importedParam } = await searchParams;
  const importedCount = typeof importedParam === "string" ? Number(importedParam) : 0;
  await connection();
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
      <p className="admin-subtitle">Find DPSA vacancy circulars, publish their vacancies, and manage posts on your site.</p>
      {Number.isInteger(importedCount) && importedCount > 0 && (
        <div className="admin-banner circular-success" role="status">
          {importedCount} {importedCount === 1 ? "vacancy was" : "vacancies were"} published successfully.
        </div>
      )}
      <DpsaCircularDiscovery />
      <section className="admin-panel">
        <h2>All vacancies ({jobs.length})</h2>
        {jobs.length ? <table className="admin-table"><thead><tr><th>Title</th><th>Department</th><th>Status</th><th>Closing date</th><th>Actions</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td><a className="text-link" href={`/admin/jobs/${job.id}/edit`}>{job.title}</a><br /><small>/{job.slug}/</small></td><td>{job.department || "—"}</td><td><span className={`admin-status ${job.status}`}>{job.status}</span></td><td>{job.closing_date || "—"}</td><td><form action={updateJobStatus}><input name="id" type="hidden" value={job.id} /><input name="status" type="hidden" value={job.status === "published" ? "closed" : "published"} /><button type="submit">{job.status === "published" ? "Close" : "Publish"}</button></form></td></tr>)}</tbody></table> : <p className="admin-empty">Imported vacancies will appear here.</p>}
      </section>
    </>
  );
}

export default function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="admin-empty">Loading vacancies...</p>}>
      <AdminJobsContent searchParams={searchParams} />
    </Suspense>
  );
}
