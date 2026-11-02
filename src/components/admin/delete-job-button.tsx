"use client";

import { deleteJob } from "@/app/actions";

export function DeleteJobButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={deleteJob} onSubmit={(event) => {
      if (!window.confirm(`Permanently delete “${title}”? This cannot be undone.`)) {
        event.preventDefault();
      }
    }}>
      <input name="id" type="hidden" value={id} />
      <button className="danger" type="submit">Delete</button>
    </form>
  );
}
