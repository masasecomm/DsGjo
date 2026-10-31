"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPageKey(pathname: string, province: string, department: string) {
  if (pathname === "/jobs" && province) return `/jobs/province/${toSlug(province)}`;
  if (pathname === "/jobs" && department) return `/jobs/department/${toSlug(department)}`;
  return pathname;
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const provinceParam = searchParams.get("province") ?? "";
  const query = searchParams.get("q") ?? "";
  const department = searchParams.get("department") ?? "";
  const province = provinceParam || provinces.find((name) => name.toLowerCase() === query.trim().toLowerCase()) || "";

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    const pagePath = getPageKey(pathname, province, department);

    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagePath }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) console.error("Could not record an anonymous page view.", response.status);
    }).catch((error: unknown) => {
      console.error("Could not record an anonymous page view.", error);
    });
  }, [pathname, province, department]);

  return null;
}
