import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SocialLinks } from "@/components/social-links";

export const metadata: Metadata = {
  title: "About us",
  description: "Learn how DPSA Government Jobs makes South African public service vacancy information easier to find and understand.",
  alternates: {
    canonical: "/about",
  },
};

const sections = [
  ["purpose", "Why this site exists"],
  ["how-it-works", "How listings are prepared"],
  ["independent", "Independent, not official"],
  ["applicants", "For applicants"],
] as const;

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="terms-page">
        <section className="terms-hero">
          <div className="terms-hero-inner">
            <span className="terms-eyebrow"><BookOpenCheck size={15} /> ABOUT DPSA GOVERNMENT JOBS</span>
            <h1>Making public service opportunities easier to find.</h1>
            <p>We turn vacancy information from public sources into clear, searchable listings for people exploring government careers in South Africa.</p>
          </div>
          <span className="terms-hero-mark" aria-hidden="true">D</span>
        </section>

        <div className="terms-layout">
          <nav className="terms-toc" aria-label="About this site">
            <span>ABOUT THIS SITE</span>
            {sections.map(([id, title], index) => (
              <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{title}</a>
            ))}
          </nav>

          <article className="terms-article">
            <section className="terms-intro">
              <BriefcaseBusiness size={19} />
              <p>DPSA Government Jobs is an independent website that helps visitors browse public service vacancies in one place. Our aim is to make published opportunities more accessible and easier to compare.</p>
            </section>

            <section className="terms-section" id="purpose">
              <span className="terms-section-number">01</span>
              <div>
                <h2>Why this site exists</h2>
                <p>Finding a suitable public service vacancy can mean working through lengthy circulars and notices. We organise the information into individual listings with details such as department, location, closing date, salary, requirements, and application instructions when these are available in the source.</p>
                <p>Listings are intended to help you discover opportunities and navigate to the official information. They do not replace the original circular or the recruiting department’s notice.</p>
              </div>
            </section>

            <section className="terms-section" id="how-it-works">
              <span className="terms-section-number">02</span>
              <div>
                <h2>How listings are prepared</h2>
                <p>We identify public vacancy circulars and extract their vacancy details into searchable posts. The source information may be reorganised and summarised for readability, so an extracted listing can contain omissions or errors.</p>
                <p>Before applying, compare the vacancy with its official source. Confirm the reference number, eligibility criteria, required documents, application method, and deadline. Where available, each listing links to the source circular and includes the department’s application instructions.</p>
                <Link className="terms-footer-note" href="/jobs">Browse current vacancies <ArrowRight size={15} /></Link>
              </div>
            </section>

            <section className="terms-section" id="independent">
              <span className="terms-section-number">03</span>
              <div>
                <h2>Independent, not official</h2>
                <p>This site is not the Department of Public Service and Administration (DPSA), a South African government department, or a recruitment agency. We do not hire candidates, assess applications, or make employment decisions.</p>
                <p>Applications must be sent to the recruiting department using the official instructions. We cannot accept applications or guarantee that a vacancy is still open.</p>
              </div>
            </section>

            <section className="terms-section" id="applicants">
              <span className="terms-section-number">04</span>
              <div>
                <h2>For applicants</h2>
                <p>Use the site to discover vacancies, then follow the application process stated by the hiring department. Be cautious of anyone asking for payment or sensitive information in exchange for a job opportunity; verify requests directly with the department through its official channels.</p>
                <p>For more on how the site operates, see our <Link href="/terms-and-conditions">Terms and Conditions</Link>. For questions about the website, visit <Link href="/contact">Contact</Link>.</p>
                <div className="terms-footer-note">
                  <span><ShieldCheck size={16} /> Check details against the official vacancy notice before applying.</span>
                  <Link href="/contact">Contact <ArrowRight size={15} /></Link>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
      <footer className="site-footer">
        <Link href="/" className="brand footer-brand"><span className="brand-mark" aria-hidden="true" /><span className="brand-name">DPSA Government Jobs</span></Link>
        <span>Helping you find your next public service opportunity.</span>
        <SocialLinks />
        <Link href="/contact" className="footer-admin">Contact</Link>
        <Link href="/privacy-policy" className="footer-admin">Privacy policy</Link>
        <Link href="/terms-and-conditions" className="footer-admin">Terms</Link>
        <span className="footer-copy">DPSA Jobs</span>
      </footer>
    </>
  );
}
