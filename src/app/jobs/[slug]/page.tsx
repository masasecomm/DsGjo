import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { CommentForm } from "@/components/comment-form";
import { SiteHeader } from "@/components/site-header";
import { getApprovedComments, getPublishedJob, isJobOpen } from "@/lib/jobs";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) return { title: "Vacancy not found" };
  const isOpen = isJobOpen(job);
  const summary = job.description.replace(/\s+/g, " ").trim().slice(0, 120);
  return {
    title: `${job.title}${job.department ? ` – ${job.department}` : ""}`,
    description: [
      `${job.title}${job.location ? ` in ${job.location}` : ""}.`,
      job.department,
      job.closing_date ? `Apply by ${job.closing_date}.` : "",
      summary,
    ].filter(Boolean).join(" ").slice(0, 300),
    alternates: {
      canonical: `/jobs/${job.slug}`,
    },
    ...(!isOpen && { robots: { index: false, follow: true } }),
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
  const isOpen = isJobOpen(job);
  const closingTime = typeof job.structured_details === "object"
    && job.structured_details !== null
    && !Array.isArray(job.structured_details)
    && typeof job.structured_details.closingTime === "string"
    && /^\d{2}:\d{2}$/.test(job.structured_details.closingTime)
    ? job.structured_details.closingTime
    : "23:59";
  const jobPosting = isOpen && (job.location || job.province)
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: job.description,
        identifier: job.reference_number
          ? {
              "@type": "PropertyValue",
              name: job.department || "South African Government",
              value: job.reference_number,
            }
          : undefined,
        datePosted: job.source_published_at || job.created_at.slice(0, 10),
        validThrough: job.closing_date
          ? `${job.closing_date}T${closingTime}:59+02:00`
          : undefined,
        employmentType: ({
          permanent: "FULL_TIME",
          "full-time": "FULL_TIME",
          "part-time": "PART_TIME",
          contract: "CONTRACTOR",
          internship: "INTERN",
          temporary: "TEMPORARY",
          sessional: "PER_DIEM",
        } as Record<string, string>)[job.employment_type?.toLowerCase() ?? ""],
        hiringOrganization: {
          "@type": "Organization",
          name: job.department || "South African Government",
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            ...(job.location && { addressLocality: job.location }),
            ...(job.province && { addressRegion: job.province }),
            addressCountry: "ZA",
          },
        },
      }
    : null;
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap">
        <Link href="/jobs" className="back-link"><ArrowLeft size={16} /> All vacancies</Link>
        {jobPosting && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jobPosting).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <article className="detail-card">
          <span className="section-kicker">{job.department || "PUBLIC SERVICE VACANCY"}</span>
          <h1>{job.title}</h1>
          <div className="job-meta">
            {job.location && <span><MapPin size={15} />{job.location}</span>}
            {job.closing_date && <span><CalendarDays size={15} />Closes {new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>}
          </div>
          <div className="detail-description">{job.description}</div>
          {isOpen && job.application_url && <a className="apply-link" href={job.application_url} rel="noreferrer" target="_blank">Go to application <ArrowUpRight size={17} /></a>}
          {!isOpen && <p className="admin-subtitle">Applications for this vacancy have closed.</p>}
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
