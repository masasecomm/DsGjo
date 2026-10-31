import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { SubscribeForm } from "@/components/subscribe-form";
import { SocialLinks } from "@/components/social-links";
import { getPublishedDepartments, getPublishedProvinces } from "@/lib/jobs";

const aboutLinks = [
  ["About us", "/about"],
  ["Contact", "/contact"],
  ["Privacy policy", "/privacy-policy"],
  ["Cookie statement", "/cookie-statement"],
  ["Terms and conditions", "/terms-and-conditions"],
  ["Admin sign in", "/admin/login"],
] as const;

async function DepartmentLinks() {
  await connection();
  const departments = await getPublishedDepartments(8);
  return departments.map((department) => (
    <Link href={`/jobs?department=${encodeURIComponent(department)}`} key={department}>{department}</Link>
  ));
}

async function ProvinceLinks() {
  await connection();
  const provinces = await getPublishedProvinces();
  return provinces.map((province) => (
    <Link href={`/jobs?province=${encodeURIComponent(province)}`} key={province}>{province}</Link>
  ));
}

async function Copyright() {
  await connection();
  return <span>© {new Date().getFullYear()} DPSA Government Jobs</span>;
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <section className="site-footer-signup" id="job-alerts" aria-labelledby="footer-signup-title">
        <h2 id="footer-signup-title">Stay informed about new opportunities</h2>
        <p>Sign up for updates on South African government jobs.</p>
        <SubscribeForm />
      </section>

      <div className="site-footer-main">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo" aria-label="DPSA Government Jobs home">
            <Image src="/south-african-flag.png" alt="" width={560} height={560} />
            <span>DPSA Government Jobs</span>
          </Link>
          <address className="site-footer-address">
            <MapPin size={17} aria-hidden="true" />
            <span>Office 531, 5th Floor, Barend van Erkom Building, 217 Pretorius Street, Pretoria Central, Pretoria, 0002</span>
          </address>
        </div>

        <nav className="site-footer-column" aria-label="Vacancies by province">
          <h3>Provinces</h3>
          <Suspense fallback={<Link href="/jobs">Browse all vacancies</Link>}>
            <ProvinceLinks />
          </Suspense>
        </nav>

        <nav className="site-footer-column" aria-label="Vacancies by department">
          <h3>Departments</h3>
          <Suspense fallback={<Link href="/jobs">Browse all vacancies</Link>}>
            <DepartmentLinks />
          </Suspense>
          <Link href="/jobs">Browse all vacancies</Link>
        </nav>

        <nav className="site-footer-column" aria-label="About DPSA Government Jobs">
          <h3>About us</h3>
          {aboutLinks.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>

        <section className="site-footer-column site-footer-about" aria-labelledby="footer-about-title">
          <h3 id="footer-about-title">About us</h3>
          <p>DPSA Government Jobs makes South African government jobs easier to find, understand and apply for.</p>
          <Link href="/jobs">Explore current vacancies</Link>
        </section>
      </div>

      <div className="site-footer-bottom">
        <Suspense fallback={<span>© 2026 DPSA Government Jobs</span>}>
          <Copyright />
        </Suspense>
        <SocialLinks className="site-footer-socials" />
      </div>
    </footer>
  );
}
