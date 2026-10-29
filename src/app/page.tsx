import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, MapPin, Search, ShieldCheck } from "lucide-react";
import { connection } from "next/server";
import { SubscribeForm } from "@/components/subscribe-form";
import { SiteHeader } from "@/components/site-header";
import { getPublishedJobs } from "@/lib/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function Home() {
  await connection();
  const jobs = await getPublishedJobs(6);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> SOUTH AFRICA’S PUBLIC SERVICE JOB BOARD</span>
              <h1>Find work that<br /><span>makes a difference.</span></h1>
              <p className="hero-description">Explore the latest government vacancies, get practical application guidance, and be first to hear when new jobs are posted.</p>
              <form action="/jobs" className="search-bar">
                <Search size={20} aria-hidden="true" />
                <input aria-label="Search jobs" name="q" placeholder="Job title, department or keyword" />
                <button type="submit">Search jobs <ArrowRight size={17} /></button>
              </form>
              <div className="hero-trust"><ShieldCheck size={17} /> New opportunities, clearly organised.</div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-glow" />
              <div className="art-card art-card-main">
                <div className="art-card-top"><span className="art-icon"><BriefcaseBusiness size={19} /></span><span className="art-live">OPEN NOW</span></div>
                <div className="art-lines"><i /><i /><i /></div>
                <div className="art-card-bottom"><span>PUBLIC SERVICE</span><span className="art-arrow"><ArrowRight size={16} /></span></div>
              </div>
              <div className="art-badge"><span className="badge-check">✓</span><span><b>Make your next move</b><small>Find opportunities across SA</small></span></div>
              <div className="art-spark art-spark-one">✳</div><div className="art-spark art-spark-two">✳</div>
            </div>
          </div>
          <div className="hero-bottom"><span>OPPORTUNITY IS OUT THERE</span><span className="hero-bottom-line" /><span>LET’S FIND YOURS</span></div>
        </section>

        <section className="content-section jobs-section" id="latest-jobs">
          <div className="section-heading">
            <div><span className="section-kicker">YOUR NEXT OPPORTUNITY</span><h2>Latest opportunities</h2><p>Browse current vacancies and take the next step in your career.</p></div>
            <Link href="/jobs" className="text-link">Browse all jobs <ArrowRight size={17} /></Link>
          </div>
          {!isSupabaseConfigured() && <div className="setup-notice">Connect your Supabase project and publish jobs from the admin dashboard to show live listings here.</div>}
          <div className="job-grid">
            {jobs.length > 0 ? jobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-card-top"><span className="job-category">{job.department || "Public service"}</span><span className="job-dot" /></div>
                <h3><Link href={`/jobs/${job.slug}`}>{job.title}</Link></h3>
                <div className="job-meta">
                  {job.location && <span><MapPin size={15} />{job.location}</span>}
                  {job.closing_date && <span><CalendarDays size={15} />Closes {new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>}
                </div>
                <Link href={`/jobs/${job.slug}`} className="job-card-link">View opportunity <ArrowRight size={16} /></Link>
              </article>
            )) : (
              <div className="empty-jobs"><BriefcaseBusiness size={24} /><h3>New opportunities are on the way</h3><p>Check back soon or sign up for job alerts so you don’t miss the next listing.</p><a href="#job-alerts" className="text-link">Get job alerts <ArrowRight size={16} /></a></div>
            )}
          </div>
        </section>

        <section className="alert-section" id="job-alerts">
          <div className="alert-copy"><span className="section-kicker">VACANCY UPDATES</span><h2>Be ready for your<br />next opportunity.</h2><p>Join the email list for future vacancy updates. Email notifications will be enabled once delivery is connected.</p></div>
          <SubscribeForm />
          <div className="alert-footnote">Free to join. Your address is only visible to site administrators.</div>
        </section>

        <section className="content-section guide-section">
          <div className="guide-card"><div className="guide-number">01</div><div><span className="section-kicker">START WITH CONFIDENCE</span><h2>A better way to find your next role.</h2><p>Explore opportunities in one place, prepare a strong application, and keep an eye on closing dates.</p></div><Link href="/jobs" className="guide-cta" aria-label="Explore government vacancies"><ArrowRight size={21} /></Link></div>
          <div className="guide-side"><span className="guide-star">✳</span><p>Your skills can help build a stronger South Africa.</p><span className="section-kicker">YOUR NEXT CHAPTER STARTS HERE</span></div>
        </section>
      </main>
      <footer className="site-footer"><Link href="/" className="brand footer-brand"><span className="brand-mark">D</span><span className="brand-name">DPSA<span>JOBS</span></span></Link><span>Helping you find your next public service opportunity.</span><Link href="/admin/login" className="footer-admin">Admin</Link><span className="footer-copy">© {new Date().getFullYear()} DPSA Jobs</span></footer>
    </>
  );
}
