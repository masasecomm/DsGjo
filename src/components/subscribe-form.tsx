"use client";

import { useActionState } from "react";
import { subscribeToAlerts, type FormState } from "@/app/actions";

const initialState: FormState = { message: "" };

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribeToAlerts, initialState);

  return (
    <form action={action}>
      <div className="subscribe-form">
        <input aria-label="Email address" autoComplete="email" name="email" placeholder="Your email address" required type="email" />
        <button disabled={pending} type="submit">{pending ? "Joining..." : "Get job alerts"}</button>
      </div>
      <label className="consent-check"><input name="consent" required type="checkbox" />I agree to the <a href="/privacy-policy">privacy policy</a> and to my email being stored for vacancy updates.</label>
      <p className={`form-message${state.error ? " error" : ""}`} aria-live="polite">{state.message}</p>
    </form>
  );
}
