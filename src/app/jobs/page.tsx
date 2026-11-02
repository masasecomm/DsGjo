import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { JobSearchForm } from "@/components/job-search-form";
import { JobPagination } from "@/components/job-pagination";
import { VacancyCard } from "@/components/vacancy-card";
import {
  getPublishedJobFacets,
  getPublishedJobPage,
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
  searchParams: Promise<{ q?: string; province?: string; department?: string; page?: string | string[] }>;
}) {
  await connection();
  const { q = "", province = "", department = "", page: pageParam } = await searchParams;
  const facets = await getPublishedJobFacets();
  const activeProvince = facets.provinces.find(({ name }) => name.toLowerCase() === province.trim().toLowerCase())?.name ?? "";
  const departments = activeProvince ? facets.departmentsByProvince[activeProvince] ?? [] : facets.departments;
  const activeDepartment = departments.find((name) => name.toLowerCase() === department.trim().toLowerCase()) ?? "";
  const requestedPage = Number(Array.isArray(pageParam) ? pageParam[0] : pageParam);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  let result = await getPublishedJobPage(page, 10, q, {
    province: activeProvince,
    department: activeDepartment,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / 10));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) {
    result = await getPublishedJobPage(currentPage, 10, q, {
      province: activeProvince,
      department: activeDepartment,
    });
  }
  const jobs = result.jobs;
  if (q.trim()) await recordPopularJobSearch(q);
  const hasFilters = Boolean(q.trim() || province.trim() || department.trim());
  const hrefForPage = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (activeProvince) params.set("province", activeProvince);
    if (activeDepartment) params.set("department", activeDepartment);
    params.set("page", String(pageNumber));
    return `/jobs?${params.toString()}`;
  };

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="inner-hero"><span className="section-kicker">MAKE YOUR NEXT MOVE</span><h1>Government vacancies</h1><p>Search current opportunities across South Africa’s public service.</p></section>
        <section className="page-content">
          <JobSearchForm
            key={`${q}:${activeProvince}:${activeDepartment}`}
            variant="list"
            provinces={facets.provinces.map(({ name }) => name)}
            departments={departments}
            query={q}
            province={activeProvince}
            department={activeDepartment}
          />
          <ProvinceFilters provinces={facets.provinces} activeProvince={activeProvince} totalCount={facets.total} />
          <p className="admin-subtitle">
            {result.total} {result.total === 1 ? "opportunity" : "opportunities"}
            {q ? ` matching “${q}”` : ""}
            {result.total > 0 ? ` · Page ${currentPage} of ${pageCount}` : ""}
          </p>
          {jobs.length ? <div className="list-grid">{jobs.map((job) => (
            <VacancyCard job={job} key={job.id} query={q} />
          ))}</div> : <div className="empty-jobs"><h3>{hasFilters ? "No matching vacancies" : "No vacancies published yet"}</h3><p>{hasFilters ? "Try changing your search terms or filters." : "Check back soon for new public service opportunities."}</p><Link href="/#job-alerts" className="text-link">Get job alerts <span aria-hidden="true">→</span></Link></div>}
          <JobPagination
            page={currentPage}
            totalItems={result.total}
            pageSize={10}
            hrefForPage={hrefForPage}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
