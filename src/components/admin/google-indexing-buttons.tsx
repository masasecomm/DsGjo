"use client";

import { useActionState, useState } from "react";
import {
  getIndexableJobIds,
  requestAllJobIndexing,
  requestJobIndexing,
  type GoogleIndexingBatchState,
  type FormState,
} from "@/app/actions";

const initialFormState: FormState = { message: "" };

export function IndexJobButton({
  jobId,
  eligible,
  configured,
}: {
  jobId: string;
  eligible: boolean;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(requestJobIndexing, initialFormState);
  const disabled = pending || !eligible || !configured;

  return (
    <div className="google-indexing-control">
      <form action={action}>
        <input name="id" type="hidden" value={jobId} />
        <button className="form-button" disabled={disabled} type="submit">
          {pending ? "Requesting..." : "Index"}
        </button>
      </form>
      {!configured && <p className="form-message error">Google Indexing is not configured yet.</p>}
      {configured && !eligible && <p className="form-message">Only published, open vacancies with location details can be submitted.</p>}
      {state.message && <p className={`form-message${state.error ? " error" : ""}`} role="status">{state.message}</p>}
    </div>
  );
}

export function IndexAllButton({
  configured,
}: {
  configured: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");

  async function indexAll() {
    setPending(true);
    setProgress("Finding eligible vacancies...");
    let submitted = 0;
    let failed = 0;

    try {
      const jobIds = await getIndexableJobIds();
      if (jobIds.length === 0) {
        setProgress("There are no currently eligible vacancies to submit.");
        return;
      }

      for (let offset = 0; offset < jobIds.length; offset += 10) {
        const jobBatch = jobIds.slice(offset, offset + 10);
        const batch: GoogleIndexingBatchState = await requestAllJobIndexing(jobBatch);
        submitted += batch.submitted;
        failed += batch.failed;
        setProgress(`Submitted ${submitted} of ${jobIds.length} eligible vacancies to Google.`);

        if (batch.message) {
          const remaining = jobIds.length - offset - jobBatch.length;
          setProgress(`${batch.message} ${submitted} submitted; ${failed} failed; ${remaining} not submitted.`);
          return;
        }
      }

      setProgress(`Finished: ${submitted} submitted; ${failed} failed. Google will decide when to crawl them.`);
    } catch (error) {
      console.error("Could not complete the Google Index All request.", error);
      setProgress(`Indexing stopped. ${submitted} submitted; ${failed} failed. Please try again.`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="google-indexing-control">
      <button className="form-button" disabled={pending || !configured} onClick={() => void indexAll()} type="button">
        {pending ? "Indexing..." : "Index All"}
      </button>
      {!configured && <p className="form-message error">Google Indexing is not configured yet.</p>}
      {progress && <p className="form-message" role="status" aria-live="polite">{progress}</p>}
    </div>
  );
}
