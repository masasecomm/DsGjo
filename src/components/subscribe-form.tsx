"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { isTurnstileConfigured, TurnstileField } from "@/components/turnstile-field";

export function SubscribeForm() {
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setHasError(false);
    setPending(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          consent: formData.get("consent") === "on",
          turnstileToken: formData.get("cf-turnstile-response"),
        }),
      });
      const result = await response.json() as { message?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not save your signup.");
      setMessage(typeof result.message === "string" ? result.message : "You’re on the list.");
      form.reset();
    } catch (reason) {
      setHasError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not save your signup.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="subscribe-form">
        <input aria-label="Your name" autoComplete="name" maxLength={80} minLength={2} name="name" placeholder="Your name" required type="text" />
        <input aria-label="Email address" autoComplete="email" maxLength={254} name="email" placeholder="Your email" required type="email" />
        <button disabled={pending || !isTurnstileConfigured} type="submit">{pending ? "Please wait..." : "Notify Me"}</button>
      </div>
      <label className="consent-check"><input name="consent" required type="checkbox" />I agree to the <Link href="/privacy-policy">privacy policy</Link> and to my name and email being stored for vacancy updates.</label>
      <TurnstileField pending={pending} />
      <p className={`form-message${hasError ? " error" : ""}`} aria-live="polite">{message}</p>
    </form>
  );
}
