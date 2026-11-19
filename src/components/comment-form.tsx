"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isTurnstileConfigured, TurnstileField } from "@/components/turnstile-field";

type Comment = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

function isComment(value: unknown): value is Comment {
  return typeof value === "object"
    && value !== null
    && "id" in value
    && typeof value.id === "string"
    && "author_name" in value
    && typeof value.author_name === "string"
    && "content" in value
    && typeof value.content === "string"
    && "created_at" in value
    && typeof value.created_at === "string";
}

export function CommentList({ jobSlug }: { jobSlug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/comments?jobSlug=${encodeURIComponent(jobSlug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load comments (${response.status}).`);
        const result: unknown = await response.json();
        if (!Array.isArray(result) || !result.every(isComment)) throw new Error("The comments response was invalid.");
        setComments(result);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load comments.");
        }
      });
    return () => controller.abort();
  }, [jobSlug]);

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <article className="comment" key={comment.id}>
          <strong>{comment.author_name}</strong>
          <time>{new Date(comment.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</time>
          <p>{comment.content}</p>
        </article>
      ))}
      {!comments.length && !error && <p className="admin-subtitle">No comments yet. Be the first to ask a question.</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
    </div>
  );
}

export function CommentForm({ jobSlug }: { jobSlug: string }) {
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setHasError(false);
    setIsPending(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSlug,
          authorName: formData.get("author_name"),
          content: formData.get("content"),
          turnstileToken: formData.get("cf-turnstile-response"),
        }),
      });
      const result = await response.json() as { message?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not submit your comment.");
      setMessage(typeof result.message === "string" ? result.message : "Your comment has been submitted for review.");
      form.reset();
    } catch (reason) {
      setHasError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not submit your comment.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="site-form">
      <label>Your name<input autoComplete="name" maxLength={80} name="author_name" required /></label>
      <label>Your comment<textarea maxLength={2000} name="content" required /></label>
      <TurnstileField pending={isPending} />
      <button className="form-button" disabled={isPending || !isTurnstileConfigured} type="submit">{isPending ? "Sending..." : "Post comment"}</button>
      {message && <p className={`form-message${hasError ? " error" : ""}`} aria-live="polite">{message}</p>}
      <small>Comments are reviewed before they appear publicly.</small>
    </form>
  );
}
