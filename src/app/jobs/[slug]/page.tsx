import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, Banknote, CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { CommentForm } from "@/components/comment-form";
import { SiteHeader } from "@/components/site-header";
import { getApprovedComments, getPublishedJob, isJobOpen } from "@/lib/jobs";
import type { Job } from "@/lib/jobs";

export const instant = false;

type CopySection = "about" | "requirements" | "duties" | "skills" | "experience" | "application" | "notes" | "details" | "facts";

function cleanCopy(value: string) {
  return value
    .replace(/Circular PDF:\s*https?:\/\/\S+/gi, "")
    .replace(/\band\s+\d{1,3}\s+(?=[a-z])/gi, "and ")
    .replace(/\borganization\b/gi, "organisation")
    .replace(/\borganizations\b/gi, "organisations")
    .replace(/\blicense\b/gi, "licence")
    .replace(/\blicenses\b/gi, "licences")
    .replace(/\bcenter\b/gi, "centre")
    .replace(/\bcenters\b/gi, "centres")
    .replace(/\bprogram\b/gi, "programme")
    .replace(/\bprograms\b/gi, "programmes")
    .replace(/\brecognized\b/gi, "recognised")
    .replace(/\brecognize\b/gi, "recognise")
    .replace(/\brecognizing\b/gi, "recognising")
    .replace(/\borganize\b/gi, "organise")
    .replace(/\borganizing\b/gi, "organising")
    .replace(/\banalyze\b/gi, "analyse")
    .replace(/\bbehavior\b/gi, "behaviour")
    .replace(/\bcolor\b/gi, "colour")
    .replace(/\blabor\b/gi, "labour")
    .replace(/\blabeled\b/gi, "labelled")
    .replace(/\btraveling\b/gi, "travelling")
    .replace(/\bcanceled\b/gi, "cancelled")
    .replace(/\benrollment\b/gi, "enrolment")
    .replace(/\bthree\s*\(3\)\s*years?\s+experience\b/gi, "three years' experience")
    .replace(/\bin an Assistant Director\/Junior Management level at Warehousing Management environment\b/i, "at Assistant Director or junior management level in a warehouse management environment")
    .replace(/\bKnowledge in LOGIS System Controller\b/gi, "Knowledge of LOGIS System Controller")
    .replace(/\bChange management Purchasing management\b/gi, "Change management and purchasing management")
    .replace(/\bPatriotic, Honesty\b/gi, "Patriotism, honesty")
    .replace(/\bAdvice business units\b/gi, "Advise business units")
    .replace(/\bDevelop and implementation of policy and procedure, directive acts and regulations\b/gi, "Develop and implement policies and procedures, directives, acts and regulations")
    .replace(/\bnon compliance\b/gi, "non-compliance")
    .replace(/\bIntegrity\b/g, "integrity")
    .replace(/\bAccountability\b/g, "accountability")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function getDescriptionSections(description: string): Partial<Record<CopySection, string[]>> {
  const sections: Partial<Record<CopySection, string[]>> = {};
  const headings: Array<[CopySection, RegExp]> = [
    ["facts", /\b(?:VACANCY FACT SHEET|At a glance)(?=\s|$)/g],
    ["details", /\b(?:MORE VACANCY DETAILS|Role details)(?=\s|$)/g],
    ["about", /\b(?:JOB PURPOSE|About the role)(?=\s|$)/g],
    ["requirements", /\b(?:JOB REQUIREMENTS|What you will need)(?=\s|$)/g],
    ["duties", /\b(?:DUTIES(?:\s*\([^)]{0,120}\))?|KEY RESPONSIBILITIES|Key responsibilities)(?=\s|$)/g],
    ["skills", /\b(?:SKILLS AND COMPETENCIES|Skills and competencies)(?=\s|$)/g],
    ["experience", /\b(?:EXPERIENCE|Experience)(?=\s|$)/g],
    ["application", /\b(?:HOW TO APPLY|How to apply)(?=\s|$)/g],
    ["notes", /\b(?:NOTE|PLEASE NOTE|Please note)(?=\s|$)/g],
  ];
  const matches = headings.flatMap(([section, pattern]) =>
    [...description.matchAll(pattern)].map((match) => ({
      section,
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    })),
  ).sort((left, right) => left.index - right.index);
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const nextIndex = matches[index + 1]?.index ?? description.length;
    sections[match.section] ??= [];
    sections[match.section]!.push(description.slice(match.end, nextIndex));
  }
  return sections;
}

function sectionItems(lines: string[] | undefined) {
  return (lines ?? [])
    .flatMap((line) => line.split(/\s*•\s*/))
    .map((item) => cleanCopy(item.replace(/^\s*[-*]\s*/, "")))
    .filter(Boolean);
}

function cleanDuty(value: string) {
  return cleanCopy(value.replace(/^The successful candidate will be responsible for,?\s*(?:amongst|among) others,?\s*the following specific tasks:\s*/i, ""));
}

function detailText(details: Record<string, unknown> | null, key: string) {
  const value = details?.[key];
  return typeof value === "string" ? cleanCopy(value) : "";
}

function detailList(details: Record<string, unknown> | null, key: string) {
  const value = details?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map(cleanCopy).filter(Boolean)
    : [];
}

function labelledValues(items: string[] | undefined) {
  const values = new Map<string, string>();
  for (const item of items ?? []) {
    const separator = item.indexOf(":");
    if (separator <= 0) continue;
    values.set(item.slice(0, separator).trim().toLowerCase(), cleanCopy(item.slice(separator + 1)));
  }
  return values;
}

function safeCircularUrl(job: Job) {
  const candidate = job.source_url
    || job.description.match(/Circular PDF:\s*(https:\/\/\S+)/i)?.[1]?.replace(/[),.;]+$/g, "")
    || "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && (url.hostname === "dpsa.gov.za" || url.hostname === "www.dpsa.gov.za")
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function circularName(description: string) {
  const match = description.match(/\bDPSA\s+CIRCULAR\s+(\d{1,3})\s+of\s+(20\d{2})\b/i);
  return match ? `DPSA Circular ${match[1]} of ${match[2]}` : "Official DPSA circular";
}

function introduction(job: Job, employmentType: string, province: string) {
  const department = cleanCopy(job.department || "The hiring department");
  const position = cleanCopy(job.title);
  const appointment = cleanCopy(employmentType || "permanent").toLowerCase();
  const place = cleanCopy(province || job.location || "");
  const article = /^[aeiou]/i.test(appointment) ? "an" : "a";
  const institution = /^the\b/i.test(department) ? department : `The ${department}`;
  return `${institution} is looking for a ${position}. This is ${article} ${appointment} role${place ? ` based in ${place}` : ""}.`;
}

function formatClosingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return cleanCopy(value);
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CopySectionView({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="vacancy-copy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) return { title: "Vacancy not found" };
  const isOpen = isJobOpen(job);
  const sections = getDescriptionSections(job.description);
  const facts = labelledValues(sectionItems(sections.facts));
  const province = cleanCopy(job.province || facts.get("province") || "");
  const closingDateValue = job.closing_date || facts.get("closing date") || "";
  const deadline = closingDateValue ? ` Apply by ${formatClosingDate(closingDateValue)}.` : "";
  const department = cleanCopy(job.department || "the South African public service");
  const employer = /^department\b/i.test(department) ? `the ${department}` : department;
  const descriptionBody = `${cleanCopy(job.title)} at ${employer}${province ? `, ${province}` : ""}. Salary, requirements and application details.`;
  const description = descriptionBody.length + deadline.length <= 160
    ? `${descriptionBody}${deadline}`
    : `${descriptionBody.slice(0, 159 - deadline.length).replace(/\s+\S*$/, "").trimEnd()}…${deadline}`;
  return {
    title: `${cleanCopy(job.title)}${job.department ? ` – ${cleanCopy(job.department)}` : ""}`,
    description,
    alternates: {
      canonical: `/jobs/${job.slug}`,
    },
    ...(!isOpen && { robots: { index: false, follow: true } }),
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) notFound();

  const comments = await getApprovedComments(job.id);
  const isOpen = isJobOpen(job);
  const structuredDetails: Record<string, unknown> | null = typeof job.structured_details === "object"
    && job.structured_details !== null
    && !Array.isArray(job.structured_details)
    ? job.structured_details
    : null;
  const descriptionSections = getDescriptionSections(job.description);
  const factValues = labelledValues(sectionItems(descriptionSections.facts));
  const extraValues = labelledValues(sectionItems(descriptionSections.details));
  const factValue = (...labels: string[]) => labels.map((label) => factValues.get(label)).find(Boolean) || "";
  const extraValue = (...labels: string[]) => labels.map((label) => extraValues.get(label)).find(Boolean) || "";
  const employmentType = cleanCopy(job.employment_type || factValue("employment type", "appointment"));
  const province = cleanCopy(job.province || factValue("province"));
  const referenceNumber = cleanCopy(job.reference_number || factValue("reference number"));
  const closingDateValue = job.closing_date || factValue("closing date");
  const closingTimeValue = detailText(structuredDetails, "closingTime");
  const closingTime = /^\d{2}:\d{2}$/.test(closingTimeValue)
    ? closingTimeValue
    : "23:59";
  const experienceRequirements = detailText(structuredDetails, "experience")
    || sectionItems(descriptionSections.experience).join(" ");
  const experienceCopy = experienceRequirements
    ? `${experienceRequirements[0].toLocaleUpperCase()}${experienceRequirements.slice(1)}`
    : "";
  const requirements = sectionItems(descriptionSections.requirements);
  const qualifications = requirements.length
    ? requirements.filter((item) => item.toLowerCase() !== "required")
      .filter((item) => !experienceRequirements || !/\b(?:experience|years?\s+of\s+service)\b/i.test(item))
    : detailList(structuredDetails, "qualifications");
  const duties = (detailList(structuredDetails, "duties").length
    ? detailList(structuredDetails, "duties").map(cleanDuty)
    : sectionItems(descriptionSections.duties).map(cleanDuty))
    .filter((item) => !/\b(?:regulatory|with|for|and|of|to)$/i.test(item));
  const skills = detailList(structuredDetails, "skills").length
    ? detailList(structuredDetails, "skills")
    : sectionItems(descriptionSections.skills);
  const applicationValues = labelledValues(sectionItems(descriptionSections.application));
  const applicationInstructions = applicationValues.get("application procedure")
    || detailText(structuredDetails, "applicationInstructions");
  const applicationEmails = detailList(structuredDetails, "applicationEmails");
  const applicationMethods = detailList(structuredDetails, "applicationMethods");
  const requiredDocuments = detailList(structuredDetails, "requiredDocuments");
  const extractedEmails = applicationInstructions.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? [];
  const emails = applicationEmails.length ? applicationEmails : [...new Set([
    ...extractedEmails,
    ...(applicationValues.get("application email")?.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? []),
  ])];
  const methods = applicationMethods.length
    ? applicationMethods
    : (applicationValues.get("application method") || "").split(/,\s*/).filter(Boolean);
  const documents = requiredDocuments.length
    ? requiredDocuments
    : (applicationValues.get("documents to include") || "").split(/,\s*/).filter(Boolean);
  const enquiries = detailText(structuredDetails, "enquiries") || applicationValues.get("enquiries") || "";
  const telephone = detailText(structuredDetails, "telephone") || applicationValues.get("tel no") || "";
  const jobPurpose = detailText(structuredDetails, "jobPurpose")
    || sectionItems(descriptionSections.about).join(" ");
  const notes = detailList(structuredDetails, "note").length
    ? detailList(structuredDetails, "note")
    : sectionItems(descriptionSections.notes);
  const salaryText = cleanCopy(job.salary_text || extraValue("salary", "stipend", "salary or stipend"));
  const salaryDisplay = salaryText
    .replace(/\s+-\s+/g, " – ")
    .replace(/,\s*An all-inclusive/i, ", an all-inclusive");
  const applicationSummary = job.application_url && methods.some((method) => /online/i.test(method))
    ? "Apply online using the application link below. Follow the application directions in the official circular."
    : applicationInstructions;
  const circularUrl = safeCircularUrl(job);
  const circularLabel = circularName(job.description);
  const postReference = job.description.match(/\bPost\s+([\d/]+)(?:,\s*page\s+(\d+))?/i);
  const roleFacts = [
    ["Reference number", referenceNumber],
    ["Appointment", employmentType],
    ["Province", province],
    ["Closing date", closingDateValue ? formatClosingDate(closingDateValue) : ""],
    ["Job level", job.job_level || extraValue("job level")],
    ["Centre", detailText(structuredDetails, "centre") || extraValue("centres", "centre")],
    ["Region", detailText(structuredDetails, "region") || extraValue("region")],
    ["Directorate", detailText(structuredDetails, "directorate") || extraValue("directorate")],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
  const numberOfPosts = structuredDetails?.numberOfPosts ?? Number(extraValue("number of posts"));
  if (typeof numberOfPosts === "number" && Number.isInteger(numberOfPosts) && numberOfPosts > 0) {
    roleFacts.splice(4, 0, ["Number of posts", String(numberOfPosts)]);
  }
  const professionalRegistration = detailText(structuredDetails, "professionalRegistration");
  const driversLicense = detailText(structuredDetails, "driversLicense");
  const contractDuration = detailText(structuredDetails, "contractDuration") || extraValue("contract duration");
  const salaryAmounts = Array.from(salaryText.matchAll(/\bR\s*([0-9][0-9 ,]*(?:\.[0-9]+)?)/gi))
    .map((match) => Number(match[1].replace(/[ ,]/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount >= 0);
  const parsedSalaryMin = salaryAmounts.length ? Math.min(...salaryAmounts) : null;
  const parsedSalaryMax = salaryAmounts.length ? Math.max(...salaryAmounts) : null;
  const salaryMin = typeof job.salary_min === "number" && Number.isFinite(job.salary_min) && job.salary_min >= 0
    ? job.salary_min
    : parsedSalaryMin;
  const salaryMax = typeof job.salary_max === "number" && Number.isFinite(job.salary_max) && job.salary_max >= 0
    ? job.salary_max
    : parsedSalaryMax;
  const salaryBasis = detailText(structuredDetails, "salaryBasis") || salaryText;
  const salaryUnit = salaryBasis
    ? /\b(?:per\s+(?:annum|year)|annually|yearly)\b/i.test(salaryBasis)
      ? "YEAR"
      : /\b(?:per\s+month|monthly)\b/i.test(salaryBasis)
        ? "MONTH"
        : /\b(?:per\s+week|weekly)\b/i.test(salaryBasis)
          ? "WEEK"
          : /\b(?:per\s+day|daily)\b/i.test(salaryBasis)
            ? "DAY"
            : /\b(?:per\s+hour|hourly)\b/i.test(salaryBasis)
              ? "HOUR"
              : undefined
    : undefined;
  const salaryRangeIsValid = salaryMin === null || salaryMax === null || salaryMin <= salaryMax;
  const salaryNumber = salaryMin ?? salaryMax;
  const salaryValue = salaryMin !== null && salaryMax !== null && salaryMin !== salaryMax
    ? { "@type": "QuantitativeValue", minValue: salaryMin, maxValue: salaryMax, ...(salaryUnit && { unitText: salaryUnit }) }
    : salaryNumber !== null && salaryUnit
      ? { "@type": "QuantitativeValue", value: salaryNumber, unitText: salaryUnit }
      : salaryNumber;
  const baseSalary = salaryRangeIsValid
    && salaryValue !== null
    && (typeof job.salary_currency === "string" && /^[A-Z]{3}$/.test(job.salary_currency)
      || /\bR\s*\d/i.test(salaryText))
    ? {
        "@type": "MonetaryAmount",
        currency: job.salary_currency && /^[A-Z]{3}$/.test(job.salary_currency) ? job.salary_currency : "ZAR",
        value: salaryValue,
      }
    : undefined;
  const jobPosting = isOpen && (job.location || job.province || province)
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: [
          introduction(job, employmentType, province),
          jobPurpose,
          ...qualifications,
          experienceCopy,
          ...skills,
          ...duties,
          applicationInstructions,
        ].filter(Boolean).join(" "),
        identifier: referenceNumber
          ? {
              "@type": "PropertyValue",
              name: job.department || "South African Government",
              value: referenceNumber,
            }
          : undefined,
        datePosted: job.source_published_at || job.created_at.slice(0, 10),
        validThrough: job.closing_date
          ? `${job.closing_date}T${closingTime}:59+02:00`
          : undefined,
        ...(baseSalary && { baseSalary }),
        ...(experienceRequirements && { experienceRequirements }),
        employmentType: ({
          permanent: "FULL_TIME",
          "full-time": "FULL_TIME",
          "part-time": "PART_TIME",
          contract: "CONTRACTOR",
          internship: "INTERN",
          temporary: "TEMPORARY",
          sessional: "PER_DIEM",
        } as Record<string, string>)[employmentType.toLowerCase()],
        hiringOrganization: {
          "@type": "Organization",
          name: job.department || "South African Government",
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            ...(job.location && { addressLocality: job.location }),
            ...(province && { addressRegion: province }),
            addressCountry: "ZA",
          },
        },
      }
    : null;
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap">
        <Link href="/jobs" className="back-link"><ArrowLeft size={16} /> All vacancies</Link>
        {jobPosting && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jobPosting).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <article className="detail-card">
          <span className="section-kicker">{job.department || "PUBLIC SERVICE VACANCY"}</span>
          <h1>{job.title}</h1>
          {salaryText && (
            <div className="vacancy-salary">
              <Banknote size={22} aria-hidden="true" />
              <div><span>Salary or stipend</span><strong>{salaryDisplay}</strong></div>
            </div>
          )}
          <p className="vacancy-introduction">{introduction(job, employmentType, province)}</p>
          <div className="job-meta">
            {(job.location || province) && <span><MapPin size={15} />{job.location || province}</span>}
            {closingDateValue && <span><CalendarDays size={15} />Applications close {formatClosingDate(closingDateValue)}</span>}
          </div>
          {circularUrl && (
            <p className="vacancy-source">
              Source: <a href={circularUrl} rel="noreferrer" target="_blank">{circularLabel}<ArrowUpRight size={14} aria-hidden="true" /></a>
              {postReference?.[1] && <span>Post {postReference[1]}{postReference[2] ? `, page ${postReference[2]}` : ""}</span>}
            </p>
          )}
          {roleFacts.length > 0 && (
            <dl className="vacancy-facts">
              {roleFacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{cleanCopy(value)}</dd></div>)}
            </dl>
          )}
          <div className="vacancy-copy">
            {jobPurpose && <CopySectionView title="About the role"><p>{jobPurpose}</p></CopySectionView>}
            {qualifications.length > 0 && <CopySectionView title="What you will need"><ul>{qualifications.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></CopySectionView>}
            {experienceCopy && <CopySectionView title="Experience"><p>{experienceCopy}</p></CopySectionView>}
            {professionalRegistration && <CopySectionView title="Professional registration"><p>{professionalRegistration}</p></CopySectionView>}
            {driversLicense && <CopySectionView title="Driver's licence"><p>{driversLicense}</p></CopySectionView>}
            {skills.length > 0 && <CopySectionView title="Skills and competencies"><ul>{skills.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></CopySectionView>}
            {duties.length > 0 && <CopySectionView title="Key responsibilities"><ul>{duties.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></CopySectionView>}
            {(contractDuration || detailText(structuredDetails, "grade")) && (
              <CopySectionView title="Additional details">
                <ul>
                  {contractDuration && <li>Contract length: {contractDuration}</li>}
                  {detailText(structuredDetails, "grade") && <li>Grade: {detailText(structuredDetails, "grade")}</li>}
                </ul>
              </CopySectionView>
            )}
            {(applicationInstructions || emails.length || methods.length || documents.length || enquiries || telephone) && (
              <CopySectionView title="How to apply">
                {applicationSummary && <p>{applicationSummary}</p>}
                {(methods.length > 0 || emails.length > 0 || documents.length > 0 || enquiries || telephone) && (
                  <ul>
                    {methods.map((item) => <li key={item}>Application method: {item}</li>)}
                    {emails.map((item) => <li key={item}>Email: <a href={`mailto:${item}`}>{item}</a></li>)}
                    {documents.length > 0 && <li>Documents to include: {documents.join(", ")}</li>}
                    {enquiries && <li>Enquiries: {enquiries}</li>}
                    {telephone && <li>Telephone: {telephone}</li>}
                  </ul>
                )}
              </CopySectionView>
            )}
            {notes.length > 0 && <CopySectionView title="Please note"><ul>{notes.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></CopySectionView>}
            {!jobPurpose && qualifications.length === 0 && !experienceRequirements && duties.length === 0 && skills.length === 0 && !applicationInstructions && (
              <p>{cleanCopy(job.description.replace(/Circular PDF:\s*https?:\/\/\S+/gi, ""))}</p>
            )}
          </div>
          {isOpen && job.application_url && <a className="apply-link" href={job.application_url} rel="noreferrer" target="_blank">Go to application <ArrowUpRight size={17} /></a>}
          {!isOpen && <p className="admin-subtitle">Applications for this vacancy have closed.</p>}
        </article>
        <section className="comments">
          <h2><MessageCircle size={20} /> Discussion</h2>
          {comments.map((comment) => <article className="comment" key={comment.id}><strong>{comment.author_name}</strong><time>{new Date(comment.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</time><p>{comment.content}</p></article>)}
          {!comments.length && <p className="admin-subtitle">No comments yet. Be the first to ask a question.</p>}
          <h3 className="section-kicker">LEAVE A COMMENT</h3>
          <CommentForm jobId={job.id} />
        </section>
      </main>
    </>
  );
}
