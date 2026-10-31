import Link from "next/link";
import Image from "next/image";
import { Banknote, Building2, BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react";
import { getJobProvince, getVacancyFact, isCircularJob, type Job } from "@/lib/jobs";

type VacancyCardJob = Pick<
  Job,
  "title" | "slug" | "department" | "location" | "closing_date" | "description"
>;

export function VacancyCard({ job }: { job: VacancyCardJob }) {
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
          <Image src="/south-african-coat-of-arms.png" alt="South African coat of arms" width={679} height={452} />
        </span>
      ) : (
        <span className="vacancy-card-icon" aria-hidden="true"><Building2 size={24} /></span>
      )}
      <div className="vacancy-card-content">
        <div className="vacancy-card-title">
          <h3><Link href={`/jobs/${job.slug}`}>{job.title}</Link></h3>
          <span className="vacancy-card-status">Open</span>
        </div>
        <div className="vacancy-card-meta">
          {job.department && <span><BriefcaseBusiness size={17} aria-hidden="true" />{job.department}</span>}
          {location && <span><MapPin size={17} aria-hidden="true" />{location}</span>}
          {salary && <span><Banknote size={17} aria-hidden="true" />{salary}</span>}
          {job.closing_date && (
            <span>
              <CalendarDays size={17} aria-hidden="true" />
              Closes {new Date(`${job.closing_date}T00:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        {(appointment || province) && (
          <div className="vacancy-card-tags">
            {appointment && <span className="vacancy-card-type">{appointment}</span>}
            {province && (
              <Link className="vacancy-card-type vacancy-card-province" href={`/jobs?q=${encodeURIComponent(province)}`}>
                {province}
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
