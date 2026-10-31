import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { VacancyCard } from "@/components/vacancy-card";
import { getPublishedJobs, getPublishedProvinces } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Government vacancies",
  description: "Search the latest South African government and public service vacancies.",
  alternates: {
    canonical: "/jobs",
  },
};

export const instant = false;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q = "" } = await searchParams;
  const [jobs, provinces] = await Promise.all([
    getPublishedJobs(100, q),
    getPublishedProvinces(),
  ]);
  const activeProvince = provinces.find((province) => province.toLowerCase() === q.trim().toLowerCase());

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
          <ProvinceFilters provinces={provinces} activeProvince={activeProvince} />
          <p className="admin-subtitle">{jobs.length} {jobs.length === 1 ? "opportunity" : "opportunities"}{q ? ` matching “${q}”` : ""}</p>
          {jobs.length ? <div className="list-grid">{jobs.map((job) => (
            <VacancyCard job={job} key={job.id} />
          ))}</div> : <div className="empty-jobs"><h3>{q ? "No matching vacancies" : "No vacancies published yet"}</h3><p>{q ? "Try a different search term." : "Check back soon for new public service opportunities."}</p><Link href="/#job-alerts" className="text-link">Get job alerts <span aria-hidden="true">→</span></Link></div>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
