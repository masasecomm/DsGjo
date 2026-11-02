"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, FileText, LoaderCircle, RefreshCw } from "lucide-react";
import { parseDpsaCircularText, type ParsedVacancy } from "@/lib/dpsa-circular-parser";
import type { DpsaCircular } from "@/lib/dpsa-circular-discovery";
import { extractDpsaPdfText } from "@/lib/dpsa-pdf-text";

const publishBatchSize = 25;

type ParsedCircular = {
  circular: DpsaCircular;
  vacancies: ParsedVacancy[];
};

type PublishProgress = {
  key: string;
  total: number;
  completed: number;
  skipped: number;
  startedAt: number;
  estimatedMilliseconds: number | null;
  complete: boolean;
};

type PublishedCircularHistory = {
  year: number;
  number: number;
  importedAt: string;
  jobCount: number;
};

type ImportResponse = {
  existingCount?: number;
  posted?: number;
  processed?: number;
  skipped?: number;
  error?: string;
};

type ConflictPolicy = "rewrite" | "skip";

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

function isPublishedCircularHistory(value: unknown): value is PublishedCircularHistory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const circular = value as Record<string, unknown>;
  return Number.isInteger(circular.year)
    && Number.isInteger(circular.number)
    && typeof circular.importedAt === "string"
    && Number.isInteger(circular.jobCount);
}

function PublishAllButton({ count, pending, complete, completed, disabled }: {
  count: number;
  pending: boolean;
  complete: boolean;
  completed: number;
  disabled?: boolean;
}) {
  return (
    <button className="form-button" disabled={pending || disabled || count === 0 || complete} type="submit">
      {pending
        ? `Publishing ${completed} of ${count}...`
        : complete
          ? `Finished all ${count} vacancies`
          : completed > 0
            ? `Retry remaining ${count - completed}`
            : `Publish all ${count} ${count === 1 ? "vacancy" : "vacancies"}`}
    </button>
  );
}

function PublishProgressView({ progress, label }: { progress: PublishProgress; label: string }) {
  const remaining = Math.max(0, progress.total - progress.completed);
  return (
    <div className="circular-publish-progress" role="status" aria-live="polite">
      <div className="circular-publish-progress-label">
        <span>{progress.completed - progress.skipped} posted or rewritten</span>
        <span>{remaining} remaining</span>
      </div>
      {progress.skipped > 0 && <span>{progress.skipped} skipped</span>}
      <progress aria-label={`Publishing ${label}`} max={progress.total} value={progress.completed} />
      {!progress.complete && (
        <span>
          Estimated time remaining: {progress.estimatedMilliseconds === null
            ? "calculating..."
            : formatRemainingTime(progress.estimatedMilliseconds)}
        </span>
      )}
    </div>
  );
}

async function sendImportRequest(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/circulars/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(response.redirected
      ? "Your administrator session has expired. Sign in again."
      : "The publishing service returned an invalid response. Please try again.");
  }
  const result = await response.json() as ImportResponse;
  if (!response.ok) {
    throw new Error(result.error || `Publishing failed (HTTP ${response.status}).`);
  }
  return result;
}

function formatRemainingTime(milliseconds: number) {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
}

function getCurrentTime() {
  return Date.now();
}

function withoutKey<T>(values: Record<string, T>, key: string): Record<string, T> {
  const updated = { ...values };
  delete updated[key];
  return updated;
}

export function DpsaCircularDiscovery({
  initialPublishedCirculars,
}: {
  initialPublishedCirculars: PublishedCircularHistory[];
}) {
  const [circulars, setCirculars] = useState<DpsaCircular[]>([]);
  const [publishedCirculars, setPublishedCirculars] = useState(initialPublishedCirculars);
  const [parsedCirculars, setParsedCirculars] = useState<ParsedCircular[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [parsingKey, setParsingKey] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publishingKey, setPublishingKey] = useState("");
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [existingCounts, setExistingCounts] = useState<Record<string, number>>({});
  const [conflictPolicies, setConflictPolicies] = useState<Record<string, ConflictPolicy>>({});
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

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
        publishedCirculars?: unknown;
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
        || !Array.isArray(result.publishedCirculars)
        || !result.publishedCirculars.every(isPublishedCircularHistory)
        || typeof result.checkedAt !== "string"
      ) throw new Error("The DPSA circular checker returned invalid data.");

      setCirculars(result.circulars);
      setPublishedCirculars(result.publishedCirculars);
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
      setParsedCirculars([parsedCircular]);
      setPublishProgress((current) => current?.key === key ? null : current);
      setExistingCounts((current) => withoutKey(current, key));
      setConflictPolicies((current) => withoutKey(current, key));
      setPublishErrors((current) => withoutKey(current, key));
      setMessage(`Parsed ${parsed.length} ${parsed.length === 1 ? "vacancy" : "vacancies"} from ${circular.label}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not parse ${circular.label}.`);
    } finally {
      setParsingKey("");
    }
  }

  async function publishCircular(
    event: FormEvent<HTMLFormElement>,
    circular: DpsaCircular,
    jobs: Record<string, unknown>[],
  ) {
    event.preventDefault();
    if (publishingKey || jobs.length === 0) return;

    const key = `${circular.year}-${circular.number}`;
    const previousProgress = publishProgress?.key === key && publishProgress.total === jobs.length
      ? publishProgress
      : null;
    if (previousProgress?.complete) return;

    const startedAt = previousProgress?.startedAt ?? getCurrentTime();
    let completed = previousProgress?.completed ?? 0;
    let skipped = previousProgress?.skipped ?? 0;
    let estimatedMilliseconds = previousProgress?.estimatedMilliseconds ?? null;
    setPublishingKey(key);
    setError("");
    setMessage("");
    setPublishErrors((current) => withoutKey(current, key));
    setPublishProgress({
      key,
      total: jobs.length,
      completed,
      skipped,
      startedAt,
      estimatedMilliseconds,
      complete: false,
    });

    try {
      const status = await sendImportRequest({
        action: "check",
        year: circular.year,
        number: circular.number,
        pdfUrl: circular.pdfUrl,
      });
      const existingCount = status.existingCount ?? 0;
      setExistingCounts((current) => ({ ...current, [key]: existingCount }));
      if (existingCount > 0 && !conflictPolicies[key]) {
        setMessage(`Found ${existingCount} existing ${existingCount === 1 ? "vacancy" : "vacancies"} from ${circular.label}. Choose whether to rewrite or skip them, then press Publish again.`);
        return;
      }

      const conflictPolicy = conflictPolicies[key] ?? "rewrite";
      for (let offset = completed; offset < jobs.length; offset += publishBatchSize) {
        const batch = jobs.slice(offset, offset + publishBatchSize);
        const result = await sendImportRequest({
          action: "batch",
          year: circular.year,
          number: circular.number,
          pdfUrl: circular.pdfUrl,
          conflictPolicy,
          jobs: batch,
        });
        completed += result.processed ?? batch.length;
        skipped += result.skipped ?? 0;
        const remaining = jobs.length - completed;
        estimatedMilliseconds = remaining > 0
          ? (getCurrentTime() - startedAt) * remaining / completed
          : 0;
        setPublishProgress({ key, total: jobs.length, completed, skipped, startedAt, estimatedMilliseconds, complete: false });
      }

      await sendImportRequest({
        action: "finish",
        year: circular.year,
        number: circular.number,
        pdfUrl: circular.pdfUrl,
        totalJobs: jobs.length,
      });
      setPublishProgress({ key, total: jobs.length, completed, skipped, startedAt, estimatedMilliseconds: 0, complete: true });
      setMessage(`Finished ${completed} vacancies from ${circular.label}: ${completed - skipped} posted or rewritten, ${skipped} skipped.`);
    } catch (reason) {
      const failure = reason instanceof Error
        ? reason.name === "TimeoutError"
          ? "The server took too long to answer. Any completed batches are saved; press Publish again to safely retry."
          : reason.message
        : "Publishing stopped. Any completed batches are saved; press Publish again to safely retry.";
      setPublishProgress({ key, total: jobs.length, completed, skipped, startedAt, estimatedMilliseconds: null, complete: false });
      setPublishErrors((current) => ({ ...current, [key]: failure }));
    } finally {
      setPublishingKey("");
    }
  }

  return (
    <section className="admin-panel circular-discovery">
      <h2>Find new DPSA vacancy circulars</h2>
      <p className="circular-import-intro">
        Check the official DPSA listing for the five newest circulars not yet imported. Parse a circular to review its vacancies, then publish them in small batches with live progress.
      </p>
      <div className="circular-import-picker">
        <button className="admin-action" disabled={isChecking || Boolean(parsingKey) || Boolean(publishingKey)} onClick={() => void checkForUpdates()} type="button">
          {isChecking
            ? <><LoaderCircle className="circular-spinner" size={15} /> Checking DPSA...</>
            : <><RefreshCw size={15} /> Check for circular updates</>}
        </button>
        {checkedAt && <span className="circular-file-hint">Last checked {new Date(checkedAt).toLocaleString()}</span>}
      </div>
      {error && <p className="circular-message error" role="alert">{error}</p>}
      {message && <p className="circular-message" role="status">{message}</p>}

      {publishedCirculars.length > 0 && (
        <section className="circular-history" aria-labelledby="circular-history-heading">
          <h3 id="circular-history-heading">Imported circular history</h3>
          <div className="circular-discovery-list">
            {publishedCirculars.map((circular) => (
              <article className="circular-discovery-card" key={`${circular.year}-${circular.number}`}>
                <div>
                  <strong>DPSA Circular {circular.number} of {circular.year}</strong>
                  <span>{circular.jobCount} vacancies originally imported</span>
                </div>
                <span className="admin-status published">Published</span>
              </article>
            ))}
          </div>
        </section>
      )}

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
                  disabled={Boolean(parsingKey) || isChecking || Boolean(publishingKey)}
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
        const key = `${circular.year}-${circular.number}`;
        const currentProgress = publishProgress?.key === key ? publishProgress : null;
        const existingCount = existingCounts[key];
        const conflictPolicy = conflictPolicies[key];
        return (
          <form
            className="circular-import-results"
            key={key}
            onSubmit={(event) => void publishCircular(event, circular, jobs)}
          >
            <div className="circular-results-heading">
              <div>
                <h3>{circular.label}: parsed vacancies</h3>
                <span>{vacancies.length} vacancies ready to publish</span>
              </div>
            </div>
            <div className="circular-publish-progress-top">
              <div className="circular-save-row circular-save-row-top">
                <span>Publish all {vacancies.length} vacancies in quick, small batches.</span>
                <PublishAllButton
                  complete={Boolean(currentProgress?.complete)}
                  completed={currentProgress?.completed ?? 0}
                  count={vacancies.length}
                  disabled={(Boolean(publishingKey) && publishingKey !== key)
                    || (typeof existingCount === "number" && existingCount > 0 && !conflictPolicy)}
                  pending={publishingKey === key}
                />
              </div>
              {currentProgress && <PublishProgressView label={circular.label} progress={currentProgress} />}
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
              <span>Publish all {vacancies.length} vacancies in quick, small batches.</span>
              <PublishAllButton
                complete={Boolean(currentProgress?.complete)}
                completed={currentProgress?.completed ?? 0}
                count={vacancies.length}
                disabled={(Boolean(publishingKey) && publishingKey !== key)
                  || (typeof existingCount === "number" && existingCount > 0 && !conflictPolicy)}
                pending={publishingKey === key}
              />
            </div>
            {typeof existingCount === "number" && existingCount > 0 && (
              <fieldset className="circular-conflict-policy">
                <legend>{existingCount} existing {existingCount === 1 ? "vacancy" : "vacancies"} found for this circular</legend>
                <label>
                  <input
                    checked={conflictPolicy === "rewrite"}
                    name={`conflict-policy-${key}`}
                    onChange={() => setConflictPolicies((current) => ({ ...current, [key]: "rewrite" }))}
                    type="radio"
                  />
                  Rewrite existing vacancies with this circular’s latest details
                </label>
                <label>
                  <input
                    checked={conflictPolicy === "skip"}
                    name={`conflict-policy-${key}`}
                    onChange={() => setConflictPolicies((current) => ({ ...current, [key]: "skip" }))}
                    type="radio"
                  />
                  Skip existing vacancies and publish only missing ones
                </label>
              </fieldset>
            )}
            {currentProgress && (
              <PublishProgressView label={circular.label} progress={currentProgress} />
            )}
            {publishErrors[key] && <p className="circular-message error" role="alert">{publishErrors[key]}</p>}
          </form>
        );
      })}
    </section>
  );
}
