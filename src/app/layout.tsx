import type { Metadata } from "next";
import { Jost } from "next/font/google";
import { Suspense } from "react";
import { getSiteUrl } from "@/lib/site-url";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "DPSA Jobs | South African Government Vacancies",
    template: "%s | DPSA Jobs",
  },
  description:
    "Find the latest South African government vacancies, explore public service careers, and sign up for job alerts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={jost.variable}><body><Suspense fallback={null}><PageViewTracker /></Suspense>{children}</body></html>;
}
