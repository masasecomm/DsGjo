import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getPublishedJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Government vacancies",
  description: "Search the latest South African government and public service vacancies.",
};

export const instant = false;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q = "" } = await searchParams;
  const jobs = await getPublishedJobs(100, q);

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="inner-hero"><span className="section-kicker">MAKE YOUR NEXT MOVE</span><h1>Government vacancies</h1><p>Search current opportunities across South Africa’s public service.</p></section>
        <section className="page-content">
          <form action="/jobs" className="list-toolbar">
            <input aria-label="Search vacancies" defaultValue={q} name="q" placeholder="Search title, department or location" />
            <button className="form-button" type="submit"><Search size={16} /> Search</button>
          </form>
          <p className="admin-subtitle">{jobs.length} {jobs.length === 1 ? "opportunity" : "opportunities"}{q ? ` matching “${q}”` : ""}</p>
          {jobs.length ? <div className="list-grid">{jobs.map((job) => (
            <article className="job-card" key={job.id}>
              <div className="job-card-top"><span className="job-category">{job.department || "Public service"}</span><span className="job-dot" /></div>
              <h3><Link href={`/jobs/${job.slug}`}>{job.title}</Link></h3>
              <div className="job-meta">
                {job.location && <span>{job.location}</span>}
                {job.closing_date && <span>Closes {new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>}
              </div>
              <Link href={`/jobs/${job.slug}`} className="job-card-link">View opportunity <span aria-hidden="true">→</span></Link>
            </article>
          ))}</div> : <div className="empty-jobs"><h3>{q ? "No matching vacancies" : "No vacancies published yet"}</h3><p>{q ? "Try a different search term." : "Check back soon for new public service opportunities."}</p><Link href="/#job-alerts" className="text-link">Get job alerts <span aria-hidden="true">→</span></Link></div>}
        </section>
      </main>
      <footer className="site-footer"><Link href="/" className="brand footer-brand"><span className="brand-mark">D</span><span className="brand-name">DPSA<span>JOBS</span></span></Link><span>Helping you find your next public service opportunity.</span><Link href="/admin/login" className="footer-admin">Admin</Link><span className="footer-copy">© {new Date().getFullYear()} DPSA Jobs</span></footer>
    </>
  );
}
