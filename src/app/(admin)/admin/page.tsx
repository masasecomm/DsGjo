import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";

async function AdminDashboardContent() {
  await connection();
  const supabase = await requireAdmin();
  const [jobs, comments, subscribers, searches, viewedPages] = await Promise.all([
    supabase.from("jobs").select("id,title,slug,status,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(6),
    supabase.from("comments").select("id,author_name,content,status,created_at,jobs(title)", { count: "exact" }).eq("status", "pending").order("created_at", { ascending: false }).limit(6),
    supabase.from("job_alert_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.rpc("get_admin_popular_job_searches", { p_limit: 5 }),
    supabase.rpc("get_admin_top_viewed_pages", { p_limit: 10 }),
  ]);
  if (jobs.error) throw new Error(`Could not load vacancies: ${jobs.error.message}`);
  if (comments.error) throw new Error(`Could not load comments: ${comments.error.message}`);
  if (subscribers.error) throw new Error(`Could not load subscriber count: ${subscribers.error.message}`);
  const analyticsErrors = [searches.error, viewedPages.error].filter((error) => error !== null);
  const isMigrationError = (error: NonNullable<typeof searches.error>) =>
    error.code === "PGRST202" || error.code === "42883" || error.message.includes("schema cache");
  const analyticsNeedsMigration = analyticsErrors.some(isMigrationError);
  const unexpectedAnalyticsErrors = analyticsErrors.filter((error) => !isMigrationError(error));
  if (unexpectedAnalyticsErrors.length) {
    throw new Error(`Could not load site analytics: ${unexpectedAnalyticsErrors.map((error) => error.message).join("; ")}`);
  }

  return (
    <>
      <h1>Dashboard</h1>
      <p className="admin-subtitle">Here’s what’s happening on your site.</p>
      <div className="stat-grid">
        <Link className="stat-card" href="/admin/jobs"><span>Vacancies</span><b>{jobs.count ?? 0}</b></Link>
        <Link className="stat-card" href="/admin/comments"><span>Comments to review</span><b>{comments.count ?? 0}</b></Link>
        <Link className="stat-card" href="/admin/subscribers"><span>Active job alerts</span><b>{subscribers.count ?? 0}</b></Link>
      </div>
      <div className="admin-content-grid">
        <section className="admin-panel">
          <h2>Top searches</h2>
          <p className="admin-subtitle">Most searched vacancy terms in the last 30 days.</p>
          {analyticsNeedsMigration ? <p className="admin-empty">Apply the job-search analytics migration, then the page-view analytics migration, to enable reports.</p> : searches.data?.length ? (
            <table className="admin-table"><thead><tr><th>Search term</th><th>Searches</th></tr></thead><tbody>{searches.data.map(({ search_term, search_count }) => <tr key={search_term}><td>{search_term}</td><td>{search_count}</td></tr>)}</tbody></table>
          ) : <p className="admin-empty">No searches have been recorded in the last 30 days.</p>}
        </section>
        <section className="admin-panel">
          <h2>Top viewed pages</h2>
          <p className="admin-subtitle">Most viewed pages and categories in the last 30 days.</p>
          {analyticsNeedsMigration ? <p className="admin-empty">Apply the job-search analytics migration, then the page-view analytics migration, to enable reports.</p> : viewedPages.data?.length ? (
            <table className="admin-table"><thead><tr><th>Page or category</th><th>Views</th></tr></thead><tbody>{viewedPages.data.map(({ page_path, page_title, view_count }) => <tr key={page_path}><td>{page_title}</td><td>{view_count}</td></tr>)}</tbody></table>
          ) : <p className="admin-empty">No page views have been recorded in the last 30 days.</p>}
        </section>
      </div>
      <div className="admin-content-grid">
        <section className="admin-panel">
          <h2>Recent vacancies</h2>
          {jobs.data.length ? <table className="admin-table"><thead><tr><th>Title</th><th>Status</th><th>Created</th></tr></thead><tbody>{jobs.data.map((job) => <tr key={job.id}><td>{job.title}</td><td><span className={`admin-status ${job.status}`}>{job.status}</span></td><td>{new Date(job.created_at).toLocaleDateString("en-ZA")}</td></tr>)}</tbody></table> : <p className="admin-empty">No vacancies yet.</p>}
          <Link className="text-link" href="/admin/jobs">Manage vacancies →</Link>
        </section>
        <section className="admin-panel">
          <h2>Comments to review</h2>
          {comments.data.length ? comments.data.map((comment) => <div className="comment" key={comment.id}><strong>{comment.author_name}</strong><p>{comment.content}</p><span className="admin-status pending">{comment.status}</span></div>) : <p className="admin-empty">You’re all caught up.</p>}
          <Link className="text-link" href="/admin/comments">Review comments →</Link>
        </section>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<p className="admin-empty">Loading dashboard...</p>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
