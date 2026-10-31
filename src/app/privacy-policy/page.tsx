import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Learn what information DPSA Government Jobs collects, how it is used, and your privacy rights under POPIA.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const sections = [
  ["about", "About this policy"],
  ["information", "Information we handle"],
  ["use", "How information is used"],
  ["sharing", "Who information is shared with"],
  ["security", "Security and retention"],
  ["rights", "Your privacy rights"],
  ["contact", "Contact the Information Officer"],
] as const;

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="privacy-page">
        <section className="privacy-hero">
          <div className="privacy-hero-inner">
            <span className="privacy-eyebrow"><ShieldCheck size={15} /> YOUR PRIVACY MATTERS</span>
            <h1>Privacy, in plain language.</h1>
            <p>What information this independent vacancy site handles, why it is needed, and the choices available to you.</p>
            <p className="privacy-effective-date">Effective date <time dateTime="2025-11-03">3 November 2025</time></p>
          </div>
        </section>

        <div className="privacy-layout">
          <nav className="privacy-toc" aria-label="On this page">
            <span>ON THIS PAGE</span>
            {sections.map(([id, title], index) => (
              <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{title}</a>
            ))}
          </nav>

          <article className="privacy-article">
            <section className="privacy-intro">
              <span className="privacy-section-label">A NOTE BEFORE YOU APPLY</span>
              <p>DPSA Government Jobs is an independent resource that turns official DPSA circulars and other government vacancy notices into searchable listings. We are not the DPSA or a government application portal.</p>
              <p>We are committed to handling personal information responsibly and in line with South Africa’s <a href="https://popia.co.za/" target="_blank" rel="noreferrer">Protection of Personal Information Act (POPIA)<ArrowUpRight size={13} /></a>.</p>
            </section>

            <section className="privacy-section" id="about">
              <span className="privacy-section-number">01</span>
              <div>
                <h2>About this policy</h2>
                <p>This policy covers information handled through this website. We aim to collect only what is needed to operate the services currently available.</p>
                <div className="privacy-callout"><strong>Applying for a job?</strong><span>We do not ask for or collect your ID number, CV, qualifications, or banking details. When you follow an application link, you leave our site and the destination’s privacy policy applies.</span></div>
              </div>
            </section>

            <section className="privacy-section" id="information">
              <span className="privacy-section-number">02</span>
              <div>
                <h2>Information we handle</h2>
                <h3>Information you choose to provide</h3>
                <ul>
                  <li><strong>Job alerts:</strong> your name, email address and the time you consented to be added to the alerts list. Email notifications are not yet enabled.</li>
                  <li><strong>Comments:</strong> the name and comment you submit on a vacancy. Comments are reviewed and are shown publicly only after approval. Please do not include sensitive personal information.</li>
                  <li><strong>Administrator access:</strong> administrator account information is used to sign in and manage the website; visitors do not need an account to browse vacancies.</li>
                </ul>
                <h3>Technical information</h3>
                <p>When you search vacancies, we store the search term and daily search count in aggregate to show popular searches. We also record daily counts of public page views, including vacancy, province, and department pages. These analytics do not use cookies or visitor identifiers and are not linked to an account, name, or visitor profile. Search and page rankings use counts from the most recent 30 days. Our hosting and database providers may separately process technical information, such as IP address, browser details, and request logs, to deliver the site and help protect its security.</p>
                <p>Essential cookies may be used for administrator sign-in and session security. We do not use analytics or advertising cookies.</p>
              </div>
            </section>

            <section className="privacy-section" id="use">
              <span className="privacy-section-number">03</span>
              <div>
                <h2>How information is used</h2>
                <p>We use information for the purposes it was provided or collected for:</p>
                <ul>
                  <li>To maintain the job-alert signup list and record consent. Alert emails are not sent yet.</li>
                  <li>To review and, where appropriate, publish comments on vacancy pages.</li>
                  <li>To operate administrator sign-in, maintain the website, and help detect misuse or technical problems.</li>
                  <li>To respond to privacy requests and meet applicable legal obligations.</li>
                </ul>
              </div>
            </section>

            <section className="privacy-section" id="sharing">
              <span className="privacy-section-number">04</span>
              <div>
                <h2>Who information is shared with</h2>
                <p>We do not sell your personal information. We use service providers to run the site, including Vercel for hosting and Supabase for database and administrator authentication. They process information to provide their services.</p>
                <p>We do not send your personal information to the DPSA or government departments. If you follow an external application link, information you provide there is handled by that organisation under its own privacy practices. Information may also be disclosed where the law requires it.</p>
              </div>
            </section>

            <section className="privacy-section" id="security">
              <span className="privacy-section-number">05</span>
              <div>
                <h2>Security and retention</h2>
                <p>We use access controls and database protections intended to limit access to personal information. No online service can guarantee absolute security, but we work to protect information from unauthorised access, loss, or misuse.</p>
                <p>We keep information only as long as it is needed for the purposes above or as required by law. Alert signup details are retained while they remain on the list; comment details may remain with the vacancy and its moderation record. You can contact us to request access, correction, or deletion, subject to legal obligations.</p>
              </div>
            </section>

            <section className="privacy-section" id="rights">
              <span className="privacy-section-number">06</span>
              <div>
                <h2>Your privacy rights</h2>
                <p>Subject to the conditions in POPIA, you may ask us to:</p>
                <ul>
                  <li>Confirm whether we hold personal information about you and provide access to it.</li>
                  <li>Correct or update information that is inaccurate, incomplete, or misleading.</li>
                  <li>Delete information where we are not required or permitted by law to retain it.</li>
                  <li>Object to certain processing, including processing for direct marketing.</li>
                </ul>
                <p>You may also lodge a complaint with South Africa’s <a href="https://inforegulator.org.za/" target="_blank" rel="noreferrer">Information Regulator<ArrowUpRight size={13} /></a>.</p>
              </div>
            </section>

            <section className="privacy-section privacy-contact" id="contact">
              <span className="privacy-section-number">07</span>
              <div>
                <h2>Contact the Information Officer</h2>
                <p>Contact details for the designated Information Officer are not yet available. They should be added before the site is used to process personal information at scale.</p>
                <dl>
                  <div><dt>Information Officer</dt><dd>Details to be provided</dd></div>
                  <div><dt>Email</dt><dd>Details to be provided</dd></div>
                  <div><dt>Postal address</dt><dd>Details to be provided</dd></div>
                </dl>
              </div>
            </section>

            <div className="privacy-bottom-link">
              <span>Looking for current opportunities?</span>
              <Link href="/jobs">Browse vacancies <ArrowUpRight size={15} /></Link>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
