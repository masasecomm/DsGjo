"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JobPagination } from "@/components/job-pagination";
import { VacancyCard } from "@/components/vacancy-card";
import { getJobProvince, isJobOpen, type Job } from "@/lib/job-utils";

type JobCardData = Pick<
  Job,
  "id" | "title" | "slug" | "department" | "location" | "province" | "closing_date" | "description" | "created_at"
>;

function isJobCardData(value: unknown): value is JobCardData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const job = value as Record<string, unknown>;
  return typeof job.id === "string"
    && typeof job.title === "string"
    && typeof job.slug === "string"
    && typeof job.description === "string"
    && typeof job.created_at === "string";
}

export function JobResultsBrowser({
  initialJobs,
  initialTotal,
  view,
}: {
  initialJobs: JobCardData[];
  initialTotal: number;
  view: "home" | "list";
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const pageSize = 10;

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/job-index.json", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load vacancies (${response.status}).`);
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isJobCardData)) {
          throw new Error("The vacancy list returned an invalid response.");
        }
        const params = new URLSearchParams(window.location.search);
        const query = params.get("q")?.trim() ?? "";
        const province = params.get("province")?.trim() ?? "";
        const department = params.get("department")?.trim() ?? "";
        const requestedPage = Number(params.get("page") ?? 1);
        const matchingJobs = data.filter((job) => {
          if (!isJobOpen(job)) return false;
          if (province && getJobProvince(job) !== province) return false;
          if (department && job.department?.toLowerCase() !== department.toLowerCase()) return false;
          const term = query.toLowerCase();
          return !term || [job.title, job.department, job.location, job.description]
            .some((value) => value?.toLowerCase().includes(term));
        });
        const pageCount = Math.max(1, Math.ceil(matchingJobs.length / pageSize));
        const currentPage = Number.isInteger(requestedPage) && requestedPage > 0
          ? Math.min(requestedPage, pageCount)
          : 1;
        setQuery(query);
        setPage(currentPage);
        setTotal(matchingJobs.length);
        setJobs(matchingJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize));
        if (view === "list" && query.length >= 2 && !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(query)) {
          void fetch("/api/analytics/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ searchTerm: query }),
            keepalive: true,
          }).then((analyticsResponse) => {
            if (!analyticsResponse.ok) console.error("Could not record an anonymous job search.", analyticsResponse.status);
          }).catch((error: unknown) => {
            console.error("Could not record an anonymous job search.", error);
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Could not load the full vacancy list.", error);
        }
      });
    return () => controller.abort();
  }, [view]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hrefForPage = (pageNumber: number) => {
    const params = new URLSearchParams(window.location.search);
    if (view === "home") params.delete("q");
    params.set("page", String(pageNumber));
    const query = params.toString();
    return `${view === "home" ? "/" : "/jobs"}${query ? `?${query}` : ""}${view === "home" ? "#latest-jobs" : ""}`;
  };

  return (
    <>
      <p className="admin-subtitle">
          {total} {total === 1 ? "opportunity" : "opportunities"}
          {query ? ` matching “${query}”` : ""}
          {total > 0 ? ` · Page ${page} of ${pageCount}` : ""}
      </p>
      {jobs.length > 0
        ? <div className={view === "home" ? "home-job-grid" : "list-grid"}>{jobs.map((job) => <VacancyCard job={job} key={job.id} />)}</div>
        : <div className={view === "home" ? "home-empty-jobs" : "empty-jobs"}>
          <h3>{view === "home" ? "New opportunities are on the way" : "No matching vacancies"}</h3>
          <p>{view === "home" ? "Check back soon or sign up for vacancy alerts to hear when new jobs are posted." : "Try changing your search terms or filters."}</p>
          {view === "home" && <Link href="#job-alerts" className="home-text-link">Get job alerts</Link>}
        </div>}
      <JobPagination
        page={page}
        totalItems={total}
        pageSize={pageSize}
        hrefForPage={hrefForPage}
      />
    </>
  );
}
