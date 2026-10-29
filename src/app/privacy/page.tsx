import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How DPSA Jobs handles email alert signups and comments.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap">
        <Link href="/" className="back-link">← Home</Link>
        <article className="detail-card">
          <span className="section-kicker">YOUR INFORMATION</span>
          <h1>Privacy policy</h1>
          <p className="detail-description">When you sign up for vacancy updates, we store your email address and the time you gave consent so the site administrators can manage the alert list. Email addresses are not displayed publicly. If you post a comment, your name and comment are stored and only shown publicly after a moderator approves the comment.</p>
          <p className="detail-description">The website uses Supabase to store this information and manage administrator access. The current version collects email signups but does not yet send vacancy emails. When email notifications are enabled, the signup form and this policy must be updated to explain how to unsubscribe and how to contact the site about your information.</p>
          <p className="detail-description">Do not include sensitive personal information in public comments. This policy must be reviewed and completed with the site owner’s contact details before the website is launched.</p>
        </article>
      </main>
    </>
  );
}
