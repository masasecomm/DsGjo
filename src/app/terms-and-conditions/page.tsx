import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileCheck2, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "Terms for using DPSA Government Jobs, an independent government vacancy listing service.",
  alternates: {
    canonical: "/terms-and-conditions",
  },
};

const sections = [
  ["service", "Our service"],
  ["accuracy", "Vacancy information"],
  ["use", "Using this website"],
  ["external-sites", "External websites"],
  ["availability", "Availability and access"],
  ["law", "Governing law"],
  ["changes", "Changes to these terms"],
] as const;

export default function TermsAndConditionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="terms-page">
        <section className="terms-hero">
          <div className="terms-hero-inner">
            <span className="terms-eyebrow"><FileCheck2 size={15} /> THE ESSENTIALS</span>
            <h1>Clear terms for using this site.</h1>
            <p>Please take a moment to understand what this service does, what to verify before applying, and what we ask of visitors.</p>
            <p className="terms-effective-date">EFFECTIVE DATE <time dateTime="2025-11-06">6 November 2025</time></p>
          </div>
          <span className="terms-hero-mark" aria-hidden="true">§</span>
        </section>

        <div className="terms-layout">
          <nav className="terms-toc" aria-label="Terms sections">
            <span>IN THIS AGREEMENT</span>
            {sections.map(([id, title], index) => (
              <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{title}</a>
            ))}
          </nav>

          <article className="terms-article">
            <section className="terms-intro">
              <ShieldCheck size={19} />
              <p>By visiting or using DPSA Government Jobs, you agree to these terms and our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/cookie-statement">Cookie Statement</Link>. If you do not agree, please do not use the website.</p>
            </section>

            <section className="terms-section" id="service">
              <span className="terms-section-number">01</span>
              <div>
                <h2>Our service</h2>
                <p>DPSA Government Jobs is an independent, non-official vacancy listing service. We organise information from published DPSA circulars and other public sources into searchable listings to make vacancy information easier to browse.</p>
                <div className="terms-notice"><strong>We are not a government body or recruitment agency.</strong><span>We are not the Department of Public Service and Administration (DPSA), any government department, or an employment agency. We do not accept or process applications, screen candidates, arrange interviews, or promise employment. Applications must be made using the official instructions in the vacancy notice.</span></div>
              </div>
            </section>

            <section className="terms-section" id="accuracy">
              <span className="terms-section-number">02</span>
              <div>
                <h2>Vacancy information</h2>
                <p>We work to present vacancy information clearly, but listings may contain omissions or errors, including errors present in source documents or introduced during extraction and formatting. A listing on this site is provided for convenience and is not a substitute for the official circular or department notice.</p>
                <p><strong>Before applying, verify the details against the official source.</strong> In particular, check the closing date, reference number, application address or method, eligibility requirements, and supporting documents. If details differ, follow the official notice or contact the recruiting department using its published contact information.</p>
                <p>We do not guarantee that a vacancy remains open, that a department will receive an application, or that an application will be considered or successful.</p>
              </div>
            </section>

            <section className="terms-section" id="use">
              <span className="terms-section-number">03</span>
              <div>
                <h2>Using this website</h2>
                <p>You may use the site to browse public vacancy information and related features for lawful purposes. You agree not to:</p>
                <ul>
                  <li>Use the site in a way that breaks the law or infringes another person’s rights.</li>
                  <li>Attempt to disrupt, damage, gain unauthorised access to, or interfere with the security or operation of the site.</li>
                  <li>Upload or transmit malicious code, or misuse comments and forms.</li>
                  <li>Systematically copy or republish site content in a way that misrepresents its source or infringes applicable rights.</li>
                </ul>
                <p>The public site does not currently offer applicant accounts or saved searches. Administrator accounts are restricted to authorised site operators; administrators are responsible for protecting their sign-in credentials.</p>
                <p>Original site design and editorial material are protected by applicable intellectual-property laws. Official circulars, government notices, logos, and other third-party material remain subject to the rights and terms of their respective owners or publishers.</p>
              </div>
            </section>

            <section className="terms-section" id="external-sites">
              <span className="terms-section-number">04</span>
              <div>
                <h2>External websites</h2>
                <p>Vacancy listings may link to official government websites or other external sources. We do not operate or control those websites and are not responsible for their content, availability, privacy practices, terms, or application processes. When you follow an external link, the other site’s terms and policies apply.</p>
              </div>
            </section>

            <section className="terms-section" id="availability">
              <span className="terms-section-number">05</span>
              <div>
                <h2>Availability and access</h2>
                <p>We aim to keep the service available, but do not guarantee uninterrupted or error-free access. Features or access may be changed, suspended, or withdrawn, including where reasonably needed for maintenance, security, or misuse prevention.</p>
                <p>To the extent permitted by law, we are not liable for loss arising from reliance on inaccurate or outdated listing information, missed application deadlines, third-party websites, or temporary unavailability of the service. Nothing in these terms limits a right or liability that cannot lawfully be limited or excluded.</p>
              </div>
            </section>

            <section className="terms-section" id="law">
              <span className="terms-section-number">06</span>
              <div>
                <h2>Governing law</h2>
                <p>These terms are governed by the laws of the Republic of South Africa. Disputes are subject to the jurisdiction of the courts of South Africa, as applicable under law.</p>
              </div>
            </section>

            <section className="terms-section" id="changes">
              <span className="terms-section-number">07</span>
              <div>
                <h2>Changes to these terms</h2>
                <p>We may update these terms to reflect changes to the service or applicable requirements. The effective date at the top of this page shows when the current version took effect. Continued use of the website after an update means you agree to the revised terms, to the extent permitted by law.</p>
              </div>
            </section>

            <div className="terms-footer-note">
              <span>Use vacancy details as a starting point, then confirm everything in the official notice.</span>
              <Link href="/jobs">Find vacancies <ArrowUpRight size={15} /></Link>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
