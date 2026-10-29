import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DPSA Jobs | South African Government Vacancies",
    template: "%s | DPSA Jobs",
  },
  description:
    "Find the latest South African government vacancies, explore public service careers, and sign up for job alerts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
