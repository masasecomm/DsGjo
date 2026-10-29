"use client";

import { useActionState } from "react";
import { addComment, type FormState } from "@/app/actions";

const initialState: FormState = { message: "" };

export function CommentForm({ jobId }: { jobId: string }) {
  const actionWithJob = addComment.bind(null, jobId);
  const [state, action, pending] = useActionState(actionWithJob, initialState);

  return (
    <form action={action} className="site-form">
      <label>Your name<input autoComplete="name" maxLength={80} name="author_name" required /></label>
      <label>Your comment<textarea maxLength={2000} name="content" required /></label>
      <button className="form-button" disabled={pending} type="submit">{pending ? "Sending..." : "Post comment"}</button>
      {state.message && <p className={`form-message${state.error ? " error" : ""}`} aria-live="polite">{state.message}</p>}
      <small>Comments are reviewed before they appear publicly.</small>
    </form>
  );
}
