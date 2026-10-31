import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  MapPin,
  Search,
} from "lucide-react";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProvinceFilters } from "@/components/province-filters";
import { VacancyCard } from "@/components/vacancy-card";
import { getPublishedJobs, getPublishedProvinces } from "@/lib/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function Home() {
  await connection();
  const [jobs, provinces] = await Promise.all([
    getPublishedJobs(6),
    getPublishedProvinces(),
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
              <span className="home-eyebrow"><span /> SOUTH AFRICAN PUBLIC SERVICE CAREERS</span>
              <h1>Find your place<br />in <span>public service.</span></h1>
              <p>Discover government opportunities across South Africa and take the next step in a career that serves our communities.</p>
              <form action="/jobs" className="home-search">
                <Search size={19} aria-hidden="true" />
                <input aria-label="Search vacancies" name="q" placeholder="Job title, department or location" />
                <button type="submit">Find vacancies <ArrowRight size={16} /></button>
              </form>
              <div className="home-search-hint"><MapPin size={14} /> Opportunities from across South Africa</div>
            </div>
            <div className="home-hero-visual" aria-label="DPSA Government Jobs">
              <div className="home-visual-ring home-visual-ring-one" />
              <div className="home-visual-ring home-visual-ring-two" />
              <div className="home-logo-card">
                <Image
                  src="/south-african-flag.png"
                  alt="Round South African flag"
                  width={560}
                  height={560}
                  loading="eager"
                />
              </div>
              <div className="home-visual-note">
                <span><CheckCircle2 size={20} /></span>
                <div><strong>Your next opportunity</strong><small>Start your search today</small></div>
              </div>
              <span className="home-visual-star home-visual-star-one" aria-hidden="true">✦</span>
              <span className="home-visual-star home-visual-star-two" aria-hidden="true">✧</span>
            </div>
          </div>
          <div className="home-hero-bottom">
            <span>{jobs.length ? `${jobs.length} recent opportunities` : "Explore a career with purpose"}</span>
            <span className="home-hero-rule" />
            <span>Across South Africa</span>
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
