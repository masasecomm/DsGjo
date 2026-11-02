"use client";

import { deleteAllImportedCirculars } from "@/app/actions";

export function ResetCircularHistoryButton({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <form action={deleteAllImportedCirculars}>
      <p>
        Resetting clears the imported history for {count} circular{count === 1 ? "" : "s"} so they can
        be imported again. It does not change vacancies, subscribers, comments, or analytics.
      </p>
      <label>
        Type RESET CIRCULAR HISTORY to confirm
        <input
          autoComplete="off"
          name="confirmation"
          pattern="RESET CIRCULAR HISTORY"
          required
          type="text"
        />
      </label>
      <button className="danger" type="submit">Reset circular publishing history</button>
    </form>
  );
}
