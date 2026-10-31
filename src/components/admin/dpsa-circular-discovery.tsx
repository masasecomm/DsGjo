"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, FileText, LoaderCircle, RefreshCw } from "lucide-react";
import { createImportedDpsaCircularJobs } from "@/app/actions";
import { parseDpsaCircularText, type ParsedVacancy } from "@/lib/dpsa-circular-parser";
import type { DpsaCircular } from "@/lib/dpsa-circular-discovery";
import { extractDpsaPdfText } from "@/lib/dpsa-pdf-text";

type ParsedCircular = {
  circular: DpsaCircular;
  vacancies: ParsedVacancy[];
};

function isDpsaCircular(value: unknown): value is DpsaCircular {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const circular = value as Record<string, unknown>;
  return Number.isInteger(circular.year)
    && Number.isInteger(circular.number)
    && typeof circular.label === "string"
    && typeof circular.postingDate === "string"
    && typeof circular.listingUrl === "string"
    && typeof circular.pdfUrl === "string";
}

function PublishAllButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button className="form-button" disabled={pending || count === 0} type="submit">
      {pending ? "Publishing vacancies..." : `Publish all ${count} ${count === 1 ? "vacancy" : "vacancies"}`}
    </button>
  );
}

export function DpsaCircularDiscovery() {
  const [circulars, setCirculars] = useState<DpsaCircular[]>([]);
  const [parsedCirculars, setParsedCirculars] = useState<ParsedCircular[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [parsingKey, setParsingKey] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function checkForUpdates() {
    setIsChecking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/circulars", { cache: "no-store" });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(response.redirected
          ? "Your administrator session has expired. Sign in again."
          : "The circular checker returned an invalid response.");
      }
      const result = await response.json() as {
        circulars?: unknown;
        checkedAt?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(typeof result.error === "string"
          ? result.error
          : `Could not check DPSA circulars (HTTP ${response.status}).`);
      }
      if (
        !Array.isArray(result.circulars)
        || !result.circulars.every(isDpsaCircular)
        || typeof result.checkedAt !== "string"
      ) throw new Error("The DPSA circular checker returned invalid data.");

      setCirculars(result.circulars);
      setCheckedAt(result.checkedAt);
      setMessage(result.circulars.length
        ? `Found ${result.circulars.length} recent unimported circular${result.circulars.length === 1 ? "" : "s"}.`
        : "No new DPSA vacancy circulars were found.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not check the DPSA circular listing.");
    } finally {
      setIsChecking(false);
    }
  }

  async function parseCircular(circular: DpsaCircular) {
    const key = `${circular.year}-${circular.number}`;
    setParsingKey(key);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/circulars/${circular.year}/${circular.number}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || `Could not download the circular (HTTP ${response.status}).`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = await extractDpsaPdfText(bytes);
      const parsed = parseDpsaCircularText(text, {
        circularName: `DPSA CIRCULAR ${circular.number} of ${circular.year}`,
        circularDate: circular.postingDate,
        circularLink: circular.pdfUrl,
      });
      if (parsed.length === 0) {
        throw new Error("No “POST [number]:” vacancy entries were found. Scanned/image-only circulars are not supported.");
      }

      const parsedCircular: ParsedCircular = {
        circular,
        vacancies: parsed,
      };
      setParsedCirculars((current) => [...current.filter((item) =>
        item.circular.year !== circular.year || item.circular.number !== circular.number,
      ), parsedCircular]);
      setMessage(`Parsed ${parsed.length} ${parsed.length === 1 ? "vacancy" : "vacancies"} from ${circular.label}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not parse ${circular.label}.`);
    } finally {
      setParsingKey("");
    }
  }

  return (
    <section className="admin-panel circular-discovery">
      <h2>Find new DPSA vacancy circulars</h2>
      <p className="circular-import-intro">
        Check the official DPSA listing for the five newest circulars not yet imported. Parse a circular to see its vacancies in a spreadsheet, then publish them all together.
      </p>
      <div className="circular-import-picker">
        <button className="admin-action" disabled={isChecking || Boolean(parsingKey)} onClick={() => void checkForUpdates()} type="button">
          {isChecking
            ? <><LoaderCircle className="circular-spinner" size={15} /> Checking DPSA...</>
            : <><RefreshCw size={15} /> Check for circular updates</>}
        </button>
        {checkedAt && <span className="circular-file-hint">Last checked {new Date(checkedAt).toLocaleString()}</span>}
      </div>
      {error && <p className="circular-message error" role="alert">{error}</p>}
      {message && <p className="circular-message" role="status">{message}</p>}

      {circulars.length > 0 && (
        <div className="circular-discovery-list">
          {circulars.map((circular) => {
            const key = `${circular.year}-${circular.number}`;
            const isParsing = parsingKey === key;
            return (
              <article className="circular-discovery-card" key={key}>
                <div>
                  <strong>{circular.label}</strong>
                  <span className="circular-posting-date">
                    Posted {new Date(`${circular.postingDate}T00:00:00.000Z`).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                      year: "numeric",
                    })}
                  </span>
                  <a href={circular.listingUrl} rel="noreferrer" target="_blank">
                    Official details <ExternalLink size={12} />
                  </a>
                </div>
                <button
                  className="admin-action"
                  disabled={Boolean(parsingKey) || isChecking}
                  onClick={() => void parseCircular(circular)}
                  type="button"
                >
                  {isParsing
                    ? <><LoaderCircle className="circular-spinner" size={15} /> Parsing PDF...</>
                    : <><FileText size={15} /> Parse circular</>}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {parsedCirculars.map(({ circular, vacancies }) => {
        const jobs = vacancies.map((vacancy) => ({
          title: vacancy.title,
          department: vacancy.department,
          location: vacancy.location,
          closing_date: vacancy.closing_date,
          reference_number: vacancy.reference_number,
          province: vacancy.province,
          employment_type: vacancy.employment_type,
          salary_text: [vacancy.salary, vacancy.stipend].filter(Boolean).join(" "),
          salary_min: vacancy.salary_min,
          salary_max: vacancy.salary_max,
          salary_currency: vacancy.salary_currency,
          job_level: vacancy.level,
          dpsa_post_number: vacancy.post_number,
          source_url: vacancy.source_url,
          source_published_at: vacancy.source_published_at,
          extracted_details: vacancy.extracted_details,
          description: vacancy.description,
          application_url: vacancy.application_url,
          status: "published",
        }));
        return (
          <form action={createImportedDpsaCircularJobs} className="circular-import-results" key={`${circular.year}-${circular.number}`}>
            <input name="year" type="hidden" value={circular.year} />
            <input name="number" type="hidden" value={circular.number} />
            <input name="pdf_url" type="hidden" value={circular.pdfUrl} />
            <input name="jobs" type="hidden" value={JSON.stringify(jobs)} />
            <div className="circular-results-heading">
              <div>
                <h3>{circular.label}: parsed vacancies</h3>
                <span>{vacancies.length} vacancies ready to publish</span>
              </div>
            </div>
            <div className="circular-sheet-scroll">
              <table className="circular-sheet">
                <caption>{circular.label} parsed vacancy spreadsheet</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Job title</th>
                    <th scope="col">Department</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Employment</th>
                    <th scope="col">Province</th>
                    <th scope="col">Location</th>
                    <th scope="col">Closing date</th>
                    <th scope="col">Salary / stipend</th>
                    <th scope="col">Job details</th>
                  </tr>
                </thead>
                <tbody>
                  {vacancies.map((vacancy, index) => (
                    <tr key={vacancy.id}>
                      <td className="circular-sheet-number">{index + 1}</td>
                      <td>{vacancy.title}</td>
                      <td>{vacancy.department || "—"}</td>
                      <td>{vacancy.reference_number || "—"}</td>
                      <td>{vacancy.employment_type || "Not stated"}</td>
                      <td>{vacancy.province || "—"}</td>
                      <td>{vacancy.location || "—"}</td>
                      <td>{vacancy.closing_date || "—"}</td>
                      <td>{vacancy.salary_amount || vacancy.salary || "—"}</td>
                      <td className="circular-sheet-details">{vacancy.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="circular-save-row">
              <span>One click publishes all {vacancies.length} parsed vacancies from this circular to the website.</span>
              <PublishAllButton count={vacancies.length} />
            </div>
          </form>
        );
      })}
    </section>
  );
}
