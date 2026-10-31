import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand home-brand" aria-label="DPSA Government Jobs home">
        <Image src="/dpsa-government-jobs.png" alt="" width={400} height={400} loading="eager" />
        <span className="brand-name">DPSA<span>GOVERNMENT JOBS</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/jobs">Find vacancies</Link>
        <Link href="/about">About us</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#sectors">Browse by field</Link>
        <Link href="/#job-alerts" className="nav-cta">Get job alerts <ArrowUpRight size={15} /></Link>
      </nav>
    </header>
  );
}
