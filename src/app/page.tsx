import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  MapPin,
  Search,
} from "lucide-react";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { VacancyCard } from "@/components/vacancy-card";
import {
  getPopularJobSearches,
  getPublishedDepartments,
  getPublishedJobs,
  getPublishedProvinces,
} from "@/lib/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function Home() {
  await connection();
  const [jobs, provinces, departments, popularSearches] = await Promise.all([
    getPublishedJobs(6),
    getPublishedProvinces(),
    getPublishedDepartments(100),
    getPopularJobSearches(),
  ]);

  return (
    <div className="home-page">
      <SiteHeader />
      <main>
        <section className="home-hero">
          <div className="home-hero-orb home-hero-orb-one" aria-hidden="true" />
          <div className="home-hero-orb home-hero-orb-two" aria-hidden="true" />
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <h1>Popular Searches</h1>
              <p>Find government vacancies by job title, province or department.</p>
              <form action="/jobs" className="home-search">
                <label className="home-search-field home-search-keywords">
                  <Search size={21} aria-hidden="true" />
                  <input aria-label="Job title or keywords" name="q" placeholder="Job title, keywords..." />
                </label>
                <label className="home-search-field">
                  <MapPin size={21} aria-hidden="true" />
                  <select aria-label="Province" name="province" defaultValue="">
                    <option value="">All Provinces</option>
                    {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </label>
                <label className="home-search-field">
                  <Building2 size={20} aria-hidden="true" />
                  <select aria-label="Department" name="department" defaultValue="">
                    <option value="">All Departments</option>
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </label>
                <button type="submit">Find Jobs <ArrowRight size={17} /></button>
              </form>
              <div className="home-popular-searches">
                <strong>Popular Searches:</strong>
                {popularSearches.length ? popularSearches.map(({ search_term }) => (
                  <Link href={`/jobs?q=${encodeURIComponent(search_term)}`} key={search_term}>{search_term}</Link>
                )) : <span>Popular terms will appear as vacancy searches are made.</span>}
              </div>
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
          <ProvinceFilters provinces={provinces} />
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
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
