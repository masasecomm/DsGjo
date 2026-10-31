import type { Metadata } from "next";
import { Cardo, Inter } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-home-inter",
});

const cardo = Cardo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-home-cardo",
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
  return <html lang="en" className={`${inter.variable} ${cardo.variable}`}><body>{children}</body></html>;
}
