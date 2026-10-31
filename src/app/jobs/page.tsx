import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { VacancyCard } from "@/components/vacancy-card";
import {
  getPublishedDepartments,
  getPublishedJobs,
  getPublishedProvinces,
  recordPopularJobSearch,
} from "@/lib/jobs";

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
  searchParams: Promise<{ q?: string; province?: string; department?: string }>;
}) {
  await connection();
  const { q = "", province = "", department = "" } = await searchParams;
  const [jobs, provinces, departments] = await Promise.all([
    getPublishedJobs(100, q, { province, department }),
    getPublishedProvinces(),
    getPublishedDepartments(100),
  ]);
  if (q.trim()) await recordPopularJobSearch(q);
  const activeProvince = provinces.find((name) =>
    name.toLowerCase() === (province || q).trim().toLowerCase(),
  );
  const hasFilters = Boolean(q.trim() || province.trim() || department.trim());

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="inner-hero"><span className="section-kicker">MAKE YOUR NEXT MOVE</span><h1>Government vacancies</h1><p>Search current opportunities across South Africa’s public service.</p></section>
        <section className="page-content">
          <form action="/jobs" className="list-toolbar">
            <input aria-label="Search vacancies" defaultValue={q} name="q" placeholder="Search title, department or location" />
            <select aria-label="Province" name="province" defaultValue={province}>
              <option value="">All Provinces</option>
              {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select aria-label="Department" name="department" defaultValue={department}>
              <option value="">All Departments</option>
              {departments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <button className="form-button" type="submit"><Search size={16} /> Search</button>
          </form>
          <ProvinceFilters provinces={provinces} activeProvince={activeProvince} />
          <p className="admin-subtitle">{jobs.length} {jobs.length === 1 ? "opportunity" : "opportunities"}{q ? ` matching “${q}”` : ""}</p>
          {jobs.length ? <div className="list-grid">{jobs.map((job) => (
            <VacancyCard job={job} key={job.id} />
          ))}</div> : <div className="empty-jobs"><h3>{hasFilters ? "No matching vacancies" : "No vacancies published yet"}</h3><p>{hasFilters ? "Try changing your search terms or filters." : "Check back soon for new public service opportunities."}</p><Link href="/#job-alerts" className="text-link">Get job alerts <span aria-hidden="true">→</span></Link></div>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
