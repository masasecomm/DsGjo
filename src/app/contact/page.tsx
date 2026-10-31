import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BriefcaseBusiness, CircleHelp, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "Find the right place to direct questions about DPSA Government Jobs, vacancy applications, and privacy.",
  alternates: {
    canonical: "/contact",
  },
};

const contactTopics = [
  {
    icon: BriefcaseBusiness,
    title: "Applying for a vacancy",
    description: "We are an independent listings site and cannot receive applications or answer on behalf of a hiring department. Use the contact details and application instructions in the official vacancy circular.",
    link: { href: "/jobs", label: "Browse vacancies" },
  },
  {
    icon: ShieldCheck,
    title: "Privacy or personal information",
    description: "Our Information Officer contact details have not yet been published. The Privacy Policy explains the information currently handled by this site and your rights.",
    link: { href: "/privacy-policy", label: "Read the Privacy Policy" },
  },
  {
    icon: CircleHelp,
    title: "Website feedback",
    description: "A direct website contact channel is not available yet. Please do not include sensitive personal information in public vacancy comments.",
    link: { href: "/terms-and-conditions", label: "Read the site terms" },
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="contact-page">
        <section className="contact-hero">
          <div className="contact-hero-inner">
            <span className="contact-eyebrow"><CircleHelp size={15} /> HOW CAN WE HELP?</span>
            <h1>Let’s get your question to the right place.</h1>
            <p>DPSA Government Jobs is an independent vacancy listings site, not a government department or recruitment agency. Choose the topic that best matches your question.</p>
            <a className="contact-hero-link" href="#contact-options">See contact options <ArrowDown size={15} /></a>
          </div>
          <span className="contact-hero-mark" aria-hidden="true">?</span>
        </section>

        <section className="contact-content" id="contact-options">
          <div className="contact-content-heading">
            <span>START HERE</span>
            <h2>Who should you contact?</h2>
          </div>
          <div className="contact-cards">
            {contactTopics.map(({ icon: Icon, title, description, link }) => (
              <article className="contact-card" key={title}>
                <span className="contact-card-icon"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link href={link.href}>{link.label} <ArrowUpRight size={14} /></Link>
              </article>
            ))}
          </div>
          <aside className="contact-note">
            <strong>Looking for a general contact email?</strong>
            <p>A direct contact email or postal address has not yet been provided for this site, so we cannot publish one here. We’ll update this page when an official contact channel is available.</p>
          </aside>
        </section>
      </main>
      <footer className="site-footer">
        <Link href="/" className="brand footer-brand"><span className="brand-mark">D</span><span className="brand-name">DPSA<span>JOBS</span></span></Link>
        <span>Helping you find your next public service opportunity.</span>
        <Link href="/privacy-policy" className="footer-admin">Privacy policy</Link>
        <Link href="/cookie-statement" className="footer-admin">Cookies</Link>
        <Link href="/terms-and-conditions" className="footer-admin">Terms</Link>
        <span className="footer-copy">DPSA Jobs</span>
      </footer>
    </>
  );
}
