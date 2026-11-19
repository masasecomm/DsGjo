import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { JobSearchForm } from "@/components/job-search-form";
import { JobResultsBrowser } from "@/components/job-results-browser";
import {
  getPublishedJobFacets,
  getPublishedJobPage,
} from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Government vacancies",
  description: "Search the latest South African government and public service vacancies.",
  alternates: {
    canonical: "/jobs",
  },
};

export default async function JobsPage() {
  const facets = await getPublishedJobFacets();
  const jobPage = await getPublishedJobPage(1, 10);
  const departments = facets.departments;

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="inner-hero"><span className="section-kicker">MAKE YOUR NEXT MOVE</span><h1>Government vacancies</h1><p>Search current opportunities across South Africa’s public service.</p></section>
        <section className="page-content">
          <JobSearchForm
            variant="list"
            provinces={facets.provinces.map(({ name }) => name)}
            departments={departments}
            departmentsByProvince={facets.departmentsByProvince}
          />
          <ProvinceFilters provinces={facets.provinces} totalCount={facets.total} />
          <JobResultsBrowser initialJobs={jobPage.jobs} initialTotal={facets.total} view="list" />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
