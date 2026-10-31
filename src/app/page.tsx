import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { connection } from "next/server";
import { SubscribeForm } from "@/components/subscribe-form";
import { SiteHeader } from "@/components/site-header";
import { getPublishedJobs } from "@/lib/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

const sectors = [
  { name: "Administration", query: "administration", icon: Building2, note: "Public service operations" },
  { name: "Education", query: "education", icon: GraduationCap, note: "Schools and learning" },
  { name: "Health", query: "health", icon: HeartPulse, note: "Care and wellbeing" },
  { name: "Community services", query: "community", icon: UsersRound, note: "Support for communities" },
  { name: "Communications", query: "communications", icon: Megaphone, note: "Public information" },
  { name: "Public service", query: "government", icon: ShieldCheck, note: "Roles across government" },
];

export default async function Home() {
  await connection();
  const jobs = await getPublishedJobs(6);

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
                  src="/dpsa-government-jobs.png"
                  alt="DPSA Government Jobs"
                  width={400}
                  height={400}
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
              <h2>Latest vacancies</h2>
              <p>Explore current public service roles and find the right opportunity for you.</p>
            </div>
            <Link href="/jobs" className="home-text-link">Browse all vacancies <ArrowRight size={16} /></Link>
          </div>
          {!isSupabaseConfigured() && <div className="home-setup-notice">Connect your Supabase project and publish vacancies from the admin dashboard to show live listings here.</div>}
          <div className="home-job-grid">
            {jobs.length > 0 ? jobs.map((job) => (
              <article className="home-job-card" key={job.id}>
                <div className="home-job-card-top">
                  <span className="home-job-icon"><BriefcaseBusiness size={19} /></span>
                  <span className="home-job-badge">OPEN</span>
                </div>
                <span className="home-job-department">{job.department || "Public service"}</span>
                <h3><Link href={`/jobs/${job.slug}`}>{job.title}</Link></h3>
                <div className="home-job-meta">
                  {job.location && <span><MapPin size={14} />{job.location}</span>}
                  {job.closing_date && <span><CalendarDays size={14} />Closes {new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>}
                </div>
                <Link href={`/jobs/${job.slug}`} className="home-job-link">View vacancy <ArrowRight size={15} /></Link>
              </article>
            )) : (
              <div className="home-empty-jobs">
                <span><BriefcaseBusiness size={24} /></span>
                <div><h3>New opportunities are on the way</h3><p>Check back soon or sign up for vacancy alerts to hear when new jobs are posted.</p></div>
                <Link href="#job-alerts" className="home-text-link">Get job alerts <ArrowRight size={16} /></Link>
              </div>
            )}
          </div>
        </section>

        <section className="home-how" id="how-it-works">
          <div className="home-section-heading home-how-heading">
            <div>
              <span className="home-kicker">A CLEARER WAY FORWARD</span>
              <h2>Your search, made simpler.</h2>
              <p>Everything you need to take a confident next step in your public service career.</p>
            </div>
          </div>
          <div className="home-how-grid">
            <article className="home-how-card">
              <span className="home-how-number">01</span><span className="home-how-icon"><Search size={23} /></span>
              <h3>Find a role</h3><p>Search vacancies by role, department or location.</p>
            </article>
            <article className="home-how-card">
              <span className="home-how-number">02</span><span className="home-how-icon"><BriefcaseBusiness size={23} /></span>
              <h3>Prepare to apply</h3><p>Review the vacancy details and follow its application instructions.</p>
            </article>
            <article className="home-how-card">
              <span className="home-how-number">03</span><span className="home-how-icon"><CheckCircle2 size={23} /></span>
              <h3>Take your next step</h3><p>Keep an eye on closing dates and submit your application on time.</p>
            </article>
          </div>
        </section>

        <section className="home-section home-sectors" id="sectors">
          <div className="home-section-heading">
            <div>
              <span className="home-kicker">EXPLORE DIFFERENT PATHS</span>
              <h2>Browse by field</h2>
              <p>Start with an area of work that interests you.</p>
            </div>
            <Link href="/jobs" className="home-text-link">See all vacancies <ArrowRight size={16} /></Link>
          </div>
          <div className="home-sector-grid">
            {sectors.map(({ name, query, icon: Icon, note }) => (
              <Link className="home-sector-card" href={`/jobs?q=${encodeURIComponent(query)}`} key={name}>
                <span className="home-sector-icon"><Icon size={20} /></span>
                <span className="home-sector-copy"><strong>{name}</strong><small>{note}</small></span>
                <ArrowRight className="home-sector-arrow" size={16} />
              </Link>
            ))}
          </div>
        </section>

        <section className="home-guidance">
          <div className="home-guidance-inner">
            <div className="home-guidance-art" aria-hidden="true">
              <span className="home-guidance-circle"><GraduationCap size={43} /></span>
              <span className="home-guidance-spark">✦</span>
              <span className="home-guidance-lines"><i /><i /><i /></span>
            </div>
            <div className="home-guidance-copy">
              <span className="home-kicker">READY FOR WHAT’S NEXT?</span>
              <h2>Make your next move count.</h2>
              <p>Explore current vacancies, prepare your application carefully, and give yourself time to meet every requirement before the closing date.</p>
              <Link href="/jobs" className="home-primary-link">Explore vacancies <ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>

        <section className="home-alert" id="job-alerts">
          <div className="home-alert-inner">
            <div className="home-alert-copy">
              <span className="home-kicker">VACANCY UPDATES</span>
              <h2>Keep new opportunities<br />within reach.</h2>
              <p>Sign up to be included on the list for future vacancy updates.</p>
            </div>
            <div className="home-alert-form">
              <SubscribeForm />
              <span className="home-alert-privacy"><ShieldCheck size={14} /> Your email is visible only to site administrators.</span>
            </div>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <div className="home-footer-main">
          <div className="home-footer-brand">
            <Link href="/" className="home-footer-logo" aria-label="DPSA Government Jobs home">
              <Image src="/dpsa-government-jobs.png" alt="" width={400} height={400} />
            </Link>
            <p>Helping South Africans discover meaningful public service careers.</p>
          </div>
          <div className="home-footer-column"><strong>Explore</strong><Link href="/jobs">Find vacancies</Link><Link href="/#sectors">Browse by field</Link><Link href="/#job-alerts">Job alerts</Link></div>
          <div className="home-footer-column"><strong>For applicants</strong><Link href="/jobs">Search opportunities</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/cookie-statement">Cookie statement</Link><Link href="/terms-and-conditions">Terms and conditions</Link></div>
          <div className="home-footer-column"><strong>Site</strong><Link href="/about">About us</Link><Link href="/contact">Contact</Link><Link href="/admin/login">Admin sign in</Link><Link href="/sitemap.xml">Sitemap</Link></div>
        </div>
        <div className="home-footer-bottom"><span>© {new Date().getFullYear()} DPSA Government Jobs</span><span>Public service opportunities, all in one place.</span></div>
      </footer>
    </div>
  );
}
