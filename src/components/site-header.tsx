"use client";

import Image from "next/image";
import Link from "next/link";
import { House, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublishedCircular } from "@/lib/jobs";

function isPublishedCircular(value: unknown): value is PublishedCircular {
  if (!value || typeof value !== "object" || !("year" in value) || !("number" in value)) return false;
  return Number.isInteger(value.year) && Number.isInteger(value.number);
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [circular, setCircular] = useState<PublishedCircular | null>(null);
  const circularTitle = circular ? `DPSA CIRCULAR ${circular.number} of ${circular.year}` : "";
  const circularHref = circular
    ? `/dpsa-circular-${circular.number}-of-${circular.year}`
    : "/jobs";

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    const controller = new AbortController();
    const loadCurrentCircular = async () => {
      try {
        const response = await fetch("/api/public/current-circular", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("circular" in payload)) {
          throw new Error("The current circular response was invalid.");
        }
        const result = payload.circular;
        if (result !== null && !isPublishedCircular(result)) {
          throw new Error("The current circular response was invalid.");
        }
        setCircular(result);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not load the current published DPSA circular.", error);
        }
      }
    };
    void loadCurrentCircular();

    return () => {
      controller.abort();
      window.removeEventListener("scroll", updateScrollState);
    };
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
        <Link href={circularHref} aria-label={circular ? `${circularTitle} vacancies` : "Circular vacancies"} onClick={() => setMenuOpen(false)}>
          {circular ? `DPSA Circular ${circular.number}` : "Circular"}
        </Link>
        <Link href="/jobs#provinces" onClick={() => setMenuOpen(false)}>Province</Link>
        <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
      </nav>
    </header>
  );
}
