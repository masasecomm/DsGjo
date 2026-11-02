"use client";

import { deleteAllJobs } from "@/app/actions";

export function DeleteAllJobsButton({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <form action={deleteAllJobs} onSubmit={(event) => {
      const confirmation = window.prompt(
        `This permanently deletes all ${count} vacancies. Imported circular history will be kept.\n\nType DELETE ALL to continue.`,
      );
      if (confirmation !== "DELETE ALL") {
        event.preventDefault();
        return;
      }
      const input = event.currentTarget.elements.namedItem("confirmation");
      if (input instanceof HTMLInputElement) input.value = confirmation;
    }}>
      <input name="confirmation" type="hidden" value="" />
      <button className="danger" type="submit">Delete all posts</button>
    </form>
  );
}
