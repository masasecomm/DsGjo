import type { Metadata } from "next";
import { Jost } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
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
  icons: {
    icon: "/dpsa-government-jobs.png",
    apple: "/dpsa-government-jobs.png",
  },
  alternates: {
    canonical: "/",
  },
  title: {
    default: "South African Government Jobs and Vacancies | DPSA Jobs",
    template: "%s | DPSA Jobs",
  },
  description:
    "Find current South African government and DPSA vacancies. Search public service jobs by title, province or department, and view application details.",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: "/",
    siteName: "DPSA Jobs",
    title: "South African Government Jobs and Vacancies | DPSA Jobs",
    description:
      "Find current South African government and DPSA vacancies. Search public service jobs by title, province or department, and view application details.",
    images: [
      {
        url: "/dpsa-government-jobs.png",
        width: 400,
        height: 400,
        alt: "DPSA Government Jobs",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "South African Government Jobs and Vacancies | DPSA Jobs",
    description:
      "Find current South African government and DPSA vacancies. Search public service jobs by title, province or department, and view application details.",
    images: ["/dpsa-government-jobs.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={jost.variable}>
      <body>
        <Suspense fallback={null}><PageViewTracker /></Suspense>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-69H0HQGRT9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-69H0HQGRT9');
          `}
        </Script>
      </body>
    </html>
  );
}
