import Link from "next/link";
import {
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { JobSearchForm } from "@/components/job-search-form";
import { JobResultsBrowser } from "@/components/job-results-browser";
import {
  getPublishedJobFacets,
  getPublishedJobPage,
} from "@/lib/jobs";
import { getSiteUrl } from "@/lib/site-url";

export default async function Home() {
  const [jobPage, facets] = await Promise.all([
    getPublishedJobPage(1, 10),
    getPublishedJobFacets(),
  ]);
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
              <JobSearchForm
                variant="home"
                provinces={facets.provinces.map(({ name }) => name)}
                departments={facets.departments}
                departmentsByProvince={facets.departmentsByProvince}
              />
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
          <ProvinceFilters provinces={facets.provinces} totalCount={facets.total} />
          <JobResultsBrowser initialJobs={jobPage.jobs} initialTotal={jobPage.total} view="home" />
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
