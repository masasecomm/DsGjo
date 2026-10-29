import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { CommentForm } from "@/components/comment-form";
import { SiteHeader } from "@/components/site-header";
import { getApprovedComments, getPublishedJob } from "@/lib/jobs";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) return { title: "Vacancy not found" };
  return {
    title: `${job.title}${job.department ? ` – ${job.department}` : ""}`,
    description: `${job.title}${job.location ? ` in ${job.location}` : ""}. View details and application information.`,
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) notFound();

  const comments = await getApprovedComments(job.id);
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap">
        <Link href="/jobs" className="back-link"><ArrowLeft size={16} /> All vacancies</Link>
        <article className="detail-card">
          <span className="section-kicker">{job.department || "PUBLIC SERVICE VACANCY"}</span>
          <h1>{job.title}</h1>
          <div className="job-meta">
            {job.location && <span><MapPin size={15} />{job.location}</span>}
            {job.closing_date && <span><CalendarDays size={15} />Closes {new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>}
          </div>
          <div className="detail-description">{job.description}</div>
          {job.application_url && <a className="apply-link" href={job.application_url} rel="noreferrer" target="_blank">Go to application <ArrowUpRight size={17} /></a>}
        </article>
        <section className="comments">
          <h2><MessageCircle size={20} /> Discussion</h2>
          {comments.map((comment) => <article className="comment" key={comment.id}><strong>{comment.author_name}</strong><time>{new Date(comment.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</time><p>{comment.content}</p></article>)}
          {!comments.length && <p className="admin-subtitle">No comments yet. Be the first to ask a question.</p>}
          <h3 className="section-kicker">LEAVE A COMMENT</h3>
          <CommentForm jobId={job.id} />
        </section>
      </main>
    </>
  );
}
