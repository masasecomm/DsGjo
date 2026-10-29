import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="DPSA Jobs home">
        <span className="brand-mark">D</span>
        <span className="brand-name">DPSA<span>JOBS</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/jobs">Find jobs</Link>
        <Link href="/#latest-jobs">Latest vacancies</Link>
        <Link href="/#job-alerts" className="nav-cta">Get job alerts <ArrowUpRight size={15} /></Link>
      </nav>
    </header>
  );
}
