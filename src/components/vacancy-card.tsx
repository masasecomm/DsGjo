import Link from "next/link";
import Image from "next/image";
import { Banknote, Building2, BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react";
import { getJobProvince, getVacancyFact, isCircularJob, type Job } from "@/lib/jobs";
import { SearchHighlight } from "@/components/search-highlight";

type VacancyCardJob = Pick<
  Job,
  "title" | "slug" | "department" | "location" | "closing_date" | "description"
>;

export function VacancyCard({ job, query = "" }: { job: VacancyCardJob; query?: string }) {
  const province = getJobProvince(job);
  const salary = getVacancyFact(job.description, "salary or stipend", "salary", "stipend")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/,\s*an all-inclusive.*$/i, "")
    .replace(/\s+-\s+/g, " – ")
    .trim();
  const appointment = getVacancyFact(job.description, "appointment", "employment type");
  const isCircular = isCircularJob(job);
  const location = job.location && job.location.toLowerCase() !== province.toLowerCase()
    ? job.location
    : "";

  return (
    <article className="vacancy-card">
      {isCircular ? (
        <span className="vacancy-card-art">
          <Image src="/dpsa-government-jobs.png" alt="DPSA Government Jobs" width={400} height={400} />
        </span>
      ) : (
        <span className="vacancy-card-icon" aria-hidden="true"><Building2 size={24} /></span>
      )}
      <div className="vacancy-card-content">
        <div className="vacancy-card-title">
          <h3><Link href={`/${job.slug}${query ? `?q=${encodeURIComponent(query)}` : ""}`}><SearchHighlight text={job.title} query={query} /></Link></h3>
          <span className="vacancy-card-status">Open</span>
        </div>
        <div className="vacancy-card-meta">
          {job.department && <span><BriefcaseBusiness size={17} aria-hidden="true" /><SearchHighlight text={job.department} query={query} /></span>}
          {location && <span><MapPin size={17} aria-hidden="true" /><SearchHighlight text={location} query={query} /></span>}
          {salary && <span><Banknote size={17} aria-hidden="true" /><SearchHighlight text={salary} query={query} /></span>}
          {job.closing_date && (
            <span>
              <CalendarDays size={17} aria-hidden="true" />
              <SearchHighlight
                text={`Closes ${new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
                query={query}
              />
            </span>
          )}
        </div>
        {(appointment || province) && (
          <div className="vacancy-card-tags">
            {appointment && <span className="vacancy-card-type"><SearchHighlight text={appointment} query={query} /></span>}
            {province && (
              <Link className="vacancy-card-type vacancy-card-province" href={`/jobs?province=${encodeURIComponent(province)}`}>
                <SearchHighlight text={province} query={query} />
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
