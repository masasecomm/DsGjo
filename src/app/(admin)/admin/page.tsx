import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminDashboard() {
  const supabase = await requireAdmin();
  const [jobs, comments, subscribers] = await Promise.all([
    supabase.from("jobs").select("id,title,slug,status,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(6),
    supabase.from("comments").select("id,author_name,content,status,created_at,jobs(title)", { count: "exact" }).eq("status", "pending").order("created_at", { ascending: false }).limit(6),
    supabase.from("job_alert_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  if (jobs.error) throw new Error(`Could not load vacancies: ${jobs.error.message}`);
  if (comments.error) throw new Error(`Could not load comments: ${comments.error.message}`);
  if (subscribers.error) throw new Error(`Could not load subscriber count: ${subscribers.error.message}`);

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
