import { requireAdmin } from "@/lib/admin";
import { updateSubscriberStatus } from "@/app/actions";

export default async function AdminSubscribersPage() {
  const supabase = await requireAdmin();
  const { data, error, count } = await supabase
    .from("job_alert_subscribers")
    .select("id,email,status,created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load job alert subscribers: ${error.message}`);

  return (
    <>
      <h1>Job alert subscribers</h1>
      <p className="admin-subtitle">People who asked to receive vacancy updates. {count ?? 0} total.</p>
      <section className="admin-panel">
        <h2>Email list</h2>
        {data.length ? <table className="admin-table"><thead><tr><th>Email</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>{data.map((subscriber) => <tr key={subscriber.id}><td>{subscriber.email}</td><td><span className={`admin-status ${subscriber.status}`}>{subscriber.status}</span></td><td>{new Date(subscriber.created_at).toLocaleDateString("en-ZA")}</td><td><form action={updateSubscriberStatus}><input name="id" type="hidden" value={subscriber.id} /><input name="status" type="hidden" value={subscriber.status === "active" ? "unsubscribed" : "active"} /><button type="submit">{subscriber.status === "active" ? "Unsubscribe" : "Reactivate"}</button></form></td></tr>)}</tbody></table> : <p className="admin-empty">No one has signed up for alerts yet.</p>}
      </section>
      <div className="admin-banner">Email addresses are private and visible only to admins. Automated delivery is not configured yet; connect a mail provider before promising email alerts.</div>
    </>
  );
}
