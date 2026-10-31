"use client";

import Link from "next/link";
import Image from "next/image";
import { House, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <Link href="/" className="brand home-brand" aria-label="DPSA Government Jobs home">
        <Image src="/south-african-flag.png" alt="" width={560} height={560} loading="eager" />
        <span className="home-brand-copy">
          <span className="home-brand-title">DPSA</span>
          <span className="home-brand-subtitle">Government Jobs</span>
        </span>
      </Link>
      <button
        className="mobile-nav-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>
      <nav id="main-navigation" className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
        <Link href="/" className="nav-home" onClick={() => setMenuOpen(false)}><House size={16} aria-hidden="true" />Home</Link>
        <Link href="/jobs" onClick={() => setMenuOpen(false)}>Circular</Link>
        <Link href="/jobs#provinces" onClick={() => setMenuOpen(false)}>Province</Link>
        <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
      </nav>
    </header>
  );
}
