"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import { createImportedJobs } from "@/app/actions";
import { parseDpsaCircularText, type ParsedVacancy } from "@/lib/dpsa-circular-parser";
import { extractDpsaPdfText } from "@/lib/dpsa-pdf-text";

type ImportRow = ParsedVacancy & {
  included: boolean;
  source: string;
  status: "draft" | "published";
};

const maxFileSize = 25 * 1024 * 1024;
const maxBatchSize = 100;

async function extractText(file: File) {
  return extractDpsaPdfText(new Uint8Array(await file.arrayBuffer()));
}

function SaveImportedButton({ count, maxCount, hasOversizedDescription }: {
  count: number;
  maxCount: number;
  hasOversizedDescription: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="form-button" disabled={pending || count === 0 || count > maxCount || hasOversizedDescription} type="submit">
      {pending ? "Saving vacancies..." : `Save ${count} selected ${count === 1 ? "vacancy" : "vacancies"}`}
    </button>
  );
}

export function CircularImporter() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const includedCount = rows.filter((row) => row.included).length;
  const hasOversizedDescription = rows.some((row) => row.included && row.description.length > 20_000);
  const jobsToSave = rows.filter((row) => row.included).map((row) => ({
    title: row.title,
    department: row.department,
    location: row.location,
    closing_date: row.closing_date,
    description: row.description,
    application_url: row.application_url,
    status: row.status,
  }));

  async function parseFiles(formData: FormData) {
    const files = formData.getAll("circular_files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    setError("");
    setMessage("");
    if (files.length === 0) {
      setError("Choose one or more DPSA circular PDF files first.");
      return;
    }
    if (files.length > 10) {
      setError("Choose no more than 10 PDF files at a time.");
      return;
    }
    if (files.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) {
      setError("The selected PDFs exceed the 50 MB total limit. Parse fewer files at a time.");
      return;
    }

    setIsParsing(true);
    const addedRows: ImportRow[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`${file.name}: select a PDF file.`);
        continue;
      }
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: the file is larger than 25 MB.`);
        continue;
      }

      try {
        const text = await extractText(file);
        const parsed = parseDpsaCircularText(text);
        if (parsed.length === 0) {
          errors.push(`${file.name}: no “POST [number]:” vacancy entries were found. Scanned/image-only PDFs are not supported.`);
          continue;
        }
        const importId = `${file.name}-${crypto.randomUUID()}`;
        addedRows.push(...parsed.map((vacancy) => ({
          ...vacancy,
          id: `${importId}-${vacancy.id}`,
          included: true,
          source: file.name,
          status: "draft" as const,
        })));
      } catch (reason) {
        errors.push(`${file.name}: ${reason instanceof Error ? reason.message : "The PDF could not be read."}`);
      }
    }

    setRows((current) => [...current, ...addedRows]);
    setIsParsing(false);
    if (errors.length) setError(errors.join(" "));
    if (addedRows.length) {
      setMessage(`Found ${addedRows.length} vacancy ${addedRows.length === 1 ? "entry" : "entries"}. Review the details before saving.`);
    }
  }

  function updateRow(index: number, patch: Partial<ImportRow>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  return (
    <section className="admin-panel circular-import">
      <h2>Import DPSA circular PDFs</h2>
      <p className="circular-import-intro">
        Select text-based DPSA circular PDFs. The importer extracts each “POST” entry in your browser; review and edit the results before saving.
        New vacancies are drafts by default. Scanned PDFs without selectable text are not supported.
      </p>
      <form action={parseFiles} className="circular-import-picker">
        <label className="circular-file-label">
          <Upload size={18} />
          <span>Select PDF circulars</span>
          <input accept="application/pdf,.pdf" multiple name="circular_files" type="file" />
        </label>
        <button className="admin-action" disabled={isParsing} type="submit">
          {isParsing ? <><LoaderCircle className="circular-spinner" size={15} /> Reading PDFs...</> : "Parse selected PDFs"}
        </button>
        <span className="circular-file-hint">Up to 10 files, 25 MB each</span>
      </form>
      {error && <p className="circular-message error" role="alert">{error}</p>}
      {message && <p className="circular-message" role="status">{message}</p>}

      {rows.length > 0 && (
        <form action={createImportedJobs} className="circular-import-results">
          <input
            name="jobs"
            type="hidden"
            value={JSON.stringify(jobsToSave)}
          />
          <div className="circular-results-heading">
            <div><h3>Review extracted vacancies</h3><span>{includedCount} of {rows.length} selected</span></div>
            <button className="admin-action" onClick={() => setRows([])} type="button">Clear import</button>
          </div>
          <div className="circular-job-list">
            {rows.map((row, index) => (
              <fieldset className={`circular-job${row.included ? "" : " excluded"}`} key={row.id}>
                <legend>
                  <label className="circular-include">
                    <input checked={row.included} onChange={(event) => updateRow(index, { included: event.target.checked })} type="checkbox" />
                    <span><FileText size={15} /> {row.title || `Vacancy ${index + 1}`}</span>
                  </label>
                  <button aria-label={`Remove ${row.title || `vacancy ${index + 1}`}`} className="circular-remove" onClick={() => setRows((current) => current.filter((_item, rowIndex) => rowIndex !== index))} type="button">
                    <Trash2 size={15} />
                  </button>
                </legend>
                <p className="circular-source">From {row.source}</p>
                <div className="circular-fields">
                  <label>Job title<input maxLength={180} onChange={(event) => updateRow(index, { title: event.target.value })} required={row.included} value={row.title} /></label>
                  <label>Department<input maxLength={180} onChange={(event) => updateRow(index, { department: event.target.value })} value={row.department} /></label>
                  <label>Location<input maxLength={180} onChange={(event) => updateRow(index, { location: event.target.value })} value={row.location} /></label>
                  <label>Closing date<input onChange={(event) => updateRow(index, { closing_date: event.target.value })} type="date" value={row.closing_date} /></label>
                  <label>Application link<input maxLength={2048} onChange={(event) => updateRow(index, { application_url: event.target.value })} placeholder="https://..." type="url" value={row.application_url} /></label>
                  <label>After saving<select onChange={(event) => updateRow(index, { status: event.target.value === "published" ? "published" : "draft" })} value={row.status}><option value="draft">Save as draft</option><option value="published">Publish now</option></select></label>
                  <label className="circular-description">Job details and requirements<textarea onChange={(event) => updateRow(index, { description: event.target.value })} required={row.included} value={row.description} /><small className={row.description.length > 20_000 ? "circular-limit-error" : ""}>{row.description.length.toLocaleString()} / 20,000 characters</small></label>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="circular-save-row">
            <span>
              Check each title, department, location and closing date before publishing.
              {includedCount > maxBatchSize && <> Select no more than {maxBatchSize} vacancies per save.</>}
              {hasOversizedDescription && <> Shorten descriptions to 20,000 characters or fewer.</>}
            </span>
            <SaveImportedButton count={includedCount} maxCount={maxBatchSize} hasOversizedDescription={hasOversizedDescription} />
          </div>
        </form>
      )}
    </section>
  );
}
