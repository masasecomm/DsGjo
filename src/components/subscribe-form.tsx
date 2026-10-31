"use client";

import { useActionState } from "react";
import { subscribeToAlerts, type FormState } from "@/app/actions";

const initialState: FormState = { message: "" };

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribeToAlerts, initialState);

  return (
    <form action={action}>
      <div className="subscribe-form">
        <input aria-label="Your name" autoComplete="name" maxLength={80} minLength={2} name="name" placeholder="Your name" required type="text" />
        <input aria-label="Email address" autoComplete="email" maxLength={254} name="email" placeholder="Your email" required type="email" />
        <button disabled={pending} type="submit">{pending ? "Please wait..." : "Notify Me"}</button>
      </div>
      <label className="consent-check"><input name="consent" required type="checkbox" />I agree to the <a href="/privacy-policy">privacy policy</a> and to my name and email being stored for vacancy updates.</label>
      <p className={`form-message${state.error ? " error" : ""}`} aria-live="polite">{state.message}</p>
    </form>
  );
}
