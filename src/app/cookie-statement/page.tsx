import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Cookie, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Cookie statement",
  description: "Find out which cookies DPSA Government Jobs uses and how to manage them.",
  alternates: {
    canonical: "/cookie-statement",
  },
};

const cookieTypes = [
  {
    number: "01",
    title: "Essential",
    status: "IN USE",
    description: "Necessary for site security and administrator sign-in. Supabase authentication may use session cookies when an administrator logs in. The public vacancy pages do not require an account.",
    tone: "essential",
  },
  {
    number: "02",
    title: "Preferences",
    status: "NOT IN USE",
    description: "The site does not currently use cookies to save preferred provinces, departments, search filters, or language choices.",
    tone: "optional",
  },
  {
    number: "03",
    title: "Analytics",
    status: "NOT IN USE",
    description: "We do not currently use Google Analytics or other analytics cookies to track visits or measure browsing activity.",
    tone: "optional",
  },
  {
    number: "04",
    title: "Advertising & other third parties",
    status: "NOT IN USE",
    description: "The site does not currently use advertising cookies or third-party tracking cookies. Following an external job application link takes you to another site with its own cookie practices.",
    tone: "optional",
  },
] as const;

export default function CookieStatementPage() {
  return (
    <>
      <SiteHeader />
      <main className="cookie-page">
        <section className="cookie-hero">
          <div className="cookie-hero-inner">
            <div className="cookie-hero-icon"><Cookie size={25} strokeWidth={1.6} /></div>
            <span className="cookie-eyebrow">A CLEAR VIEW OF YOUR SETTINGS</span>
            <h1>Cookies, without the mystery.</h1>
            <p>A short guide to the small files this site may use, what they do, and how you can manage them.</p>
            <p className="cookie-updated">LAST UPDATED <time dateTime="2025-11-06">6 November 2025</time></p>
          </div>
          <div className="cookie-orbit cookie-orbit-one" aria-hidden="true" />
          <div className="cookie-orbit cookie-orbit-two" aria-hidden="true" />
        </section>

        <div className="cookie-content">
          <section className="cookie-intro">
            <div className="cookie-intro-icon"><ShieldCheck size={20} /></div>
            <div>
              <h2>What are cookies?</h2>
              <p>Cookies are small text files a website can store in your browser. Some are needed for basic functions, such as keeping a secure administrator session. Others can remember preferences or measure site usage.</p>
              <p>This independent site turns DPSA circulars and other government vacancy notices into searchable listings. We currently use only cookies needed for essential site functions; optional preference, analytics, and advertising cookies are not in use.</p>
            </div>
          </section>

          <div className="cookie-heading">
            <div><span>COOKIE CATEGORIES</span><h2>What’s active on this site</h2></div>
            <p>We’ll update this statement if our cookie use changes.</p>
          </div>

          <section className="cookie-grid" aria-label="Cookie categories">
            {cookieTypes.map((type) => (
              <article className={`cookie-card ${type.tone}`} key={type.number}>
                <div className="cookie-card-top"><span>{type.number}</span><span className="cookie-status">{type.status}</span></div>
                <h3>{type.title}</h3>
                <p>{type.description}</p>
              </article>
            ))}
          </section>

          <section className="cookie-controls">
            <span className="cookie-controls-label">YOUR CHOICES</span>
            <h2>Managing cookies in your browser</h2>
            <p>Most browsers let you view, block, or delete cookies in their privacy or security settings. Because this site does not currently use optional cookies, there is no cookie-preference banner. Blocking essential cookies may prevent administrator sign-in or other secure site functions from working correctly.</p>
            <p>If we introduce non-essential cookies in future, we’ll update this page and provide appropriate choices before using them where required.</p>
          </section>

          <section className="cookie-contact">
            <div><span>QUESTIONS?</span><h2>Need more information?</h2></div>
            <p>For information about personal data and privacy requests, read our <Link href="/privacy-policy">Privacy Policy <ArrowUpRight size={14} /></Link>. Information Officer contact details are not yet available.</p>
          </section>
        </div>
      </main>
      <footer className="site-footer">
        <Link href="/" className="brand footer-brand"><span className="brand-mark">D</span><span className="brand-name">DPSA<span>JOBS</span></span></Link>
        <span>Helping you find your next public service opportunity.</span>
        <Link href="/privacy-policy" className="footer-admin">Privacy policy</Link>
        <Link href="/contact" className="footer-admin">Contact</Link>
        <Link href="/terms-and-conditions" className="footer-admin">Terms</Link>
        <span className="footer-copy">DPSA Jobs</span>
      </footer>
    </>
  );
}
