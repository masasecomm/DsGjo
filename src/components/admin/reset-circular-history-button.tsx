"use client";

import { deleteAllImportedCirculars } from "@/app/actions";

export function ResetCircularHistoryButton({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <form action={deleteAllImportedCirculars} onSubmit={(event) => {
      const confirmation = window.prompt(
        `This permanently clears the imported history for ${count} circular${count === 1 ? "" : "s"} so they can be imported again. It does not change vacancies, subscribers, comments, or analytics.\n\nType RESET CIRCULAR HISTORY to continue.`,
      );
      if (confirmation !== "RESET CIRCULAR HISTORY") {
        event.preventDefault();
        return;
      }
      const input = event.currentTarget.elements.namedItem("confirmation");
      if (input instanceof HTMLInputElement) input.value = confirmation;
    }}>
      <input name="confirmation" type="hidden" value="" />
      <button className="danger" type="submit">Reset circular publishing history</button>
    </form>
  );
}
