import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
} from "lucide-react";
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
} from "@/lib/jobs";
import { getSiteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await connection();
  const { page: pageParam } = await searchParams;
  const requestedPage = Number(Array.isArray(pageParam) ? pageParam[0] : pageParam);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [jobPage, facets] = await Promise.all([
    getPublishedJobPage(page, 10),
    getPublishedJobFacets(),
  ]);
  const pageCount = Math.max(1, Math.ceil(jobPage.total / 10));
  const currentPage = Math.min(page, pageCount);
  const result = currentPage === page
    ? jobPage
    : await getPublishedJobPage(currentPage, 10);
  const jobs = result.jobs;
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DPSA Jobs",
    url: getSiteUrl(),
    description:
      "Find current South African government and DPSA vacancies. Search public service jobs by title, province or department, and view application details.",
    inLanguage: "en-ZA",
  };

  return (
    <div className="home-page">
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c"),
          }}
        />
        <section className="home-hero">
          <div className="home-hero-orb home-hero-orb-one" aria-hidden="true" />
          <div className="home-hero-orb home-hero-orb-two" aria-hidden="true" />
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <h1>South African Government Jobs</h1>
              <p>Find current government vacancies by job title, province or department.</p>
              <JobSearchForm variant="home" provinces={facets.provinces.map(({ name }) => name)} departments={facets.departments} />
            </div>
          </div>
        </section>

        <section className="home-section home-featured" id="latest-jobs">
          <div className="home-section-heading">
            <div>
              <span className="home-kicker">TAKE THE NEXT STEP</span>
              <h2>GOVERNMENT JOBS</h2>
              <p>Explore current public service roles and find the right opportunity for you.</p>
            </div>
            <Link href="/jobs" className="home-text-link">Browse all vacancies <ArrowRight size={16} /></Link>
          </div>
          {!isSupabaseConfigured() && <div className="home-setup-notice">Connect your Supabase project and publish vacancies from the admin dashboard to show live listings here.</div>}
          <ProvinceFilters provinces={facets.provinces} totalCount={facets.total} />
          {result.total > 0 && (
            <p className="admin-subtitle">
              {result.total} {result.total === 1 ? "opportunity" : "opportunities"}
              {` · Page ${currentPage} of ${pageCount}`}
            </p>
          )}
          <div className="home-job-grid">
            {jobs.length > 0 ? jobs.map((job) => (
              <VacancyCard job={job} key={job.id} />
            )) : (
              <div className="home-empty-jobs">
                <span><BriefcaseBusiness size={24} /></span>
                <div><h3>New opportunities are on the way</h3><p>Check back soon or sign up for vacancy alerts to hear when new jobs are posted.</p></div>
                <Link href="#job-alerts" className="home-text-link">Get job alerts <ArrowRight size={16} /></Link>
              </div>
            )}
          </div>
          <JobPagination
            page={currentPage}
            totalItems={result.total}
            pageSize={10}
            hrefForPage={(pageNumber) => `/?page=${pageNumber}#latest-jobs`}
          />
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
