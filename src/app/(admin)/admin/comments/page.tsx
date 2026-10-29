import { deleteComment, updateCommentStatus } from "@/app/actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminCommentsPage() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("comments")
    .select("id,author_name,content,status,created_at,jobs(title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load comments: ${error.message}`);

  return (
    <>
      <h1>Comments</h1>
      <p className="admin-subtitle">Review comments before approving them for public display.</p>
      <section className="admin-panel">
        <h2>All comments ({data.length})</h2>
        {data.length ? <table className="admin-table"><thead><tr><th>Comment</th><th>Vacancy</th><th>Status</th><th>Received</th><th>Actions</th></tr></thead><tbody>{data.map((comment) => <tr key={comment.id}><td><strong>{comment.author_name}</strong><br />{comment.content}</td><td>{comment.jobs?.title ?? "Vacancy removed"}</td><td><span className={`admin-status ${comment.status}`}>{comment.status}</span></td><td>{new Date(comment.created_at).toLocaleDateString("en-ZA")}</td><td><form action={updateCommentStatus}><input name="id" type="hidden" value={comment.id} /><input name="status" type="hidden" value={comment.status === "approved" ? "rejected" : "approved"} /><button type="submit">{comment.status === "approved" ? "Hide" : "Approve"}</button></form>{" "}<form action={deleteComment}><input name="id" type="hidden" value={comment.id} /><button className="danger" type="submit">Delete</button></form></td></tr>)}</tbody></table> : <p className="admin-empty">No comments have been submitted.</p>}
      </section>
    </>
  );
}
