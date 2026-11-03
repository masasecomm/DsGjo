"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions";
import { isTurnstileConfigured, TurnstileField } from "@/components/turnstile-field";

const initialState: FormState = { message: "" };

export function AdminLoginForm({
  configured,
  lockoutConfigured,
  showNotAdmin,
  showSetup,
}: {
  configured: boolean;
  lockoutConfigured: boolean;
  showNotAdmin: boolean;
  showSetup: boolean;
}) {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <main className="login-shell">
      <section className="login-card">
        <Link href="/" className="brand" aria-label="DPSA Government Jobs home"><span className="brand-mark" aria-hidden="true" /><span className="brand-name">DPSA Government Jobs</span></Link>
        <h1>Welcome back.</h1>
        <p>Sign in to manage vacancies, comments, and job alerts.</p>
        {showSetup && !configured && <div className="admin-banner">Connect a Supabase project first. Add the project URL and publishable key to <code>.env.local</code>, then run the setup SQL in <code>supabase/schema.sql</code>.</div>}
        {showNotAdmin && <div className="admin-banner">This account is not an administrator. Ask the site owner to grant admin access.</div>}
        {configured && !lockoutConfigured && <div className="admin-banner">Admin sign-in is disabled until <code>SUPABASE_SERVICE_ROLE_KEY</code> is configured on the server and the migration in <code>supabase/migrations/20261103_admin_login_lockout.sql</code> is applied.</div>}
        <form action={action} className="site-form">
          <label>Email address<input autoComplete="email" name="email" required type="email" /></label>
          <label>Password<input autoComplete="current-password" name="password" required type="password" /></label>
          <TurnstileField pending={pending} />
          <button className="form-button" disabled={pending || !configured || !lockoutConfigured || !isTurnstileConfigured} type="submit">{pending ? "Signing in..." : "Sign in"}</button>
          {state.message && <p className={`form-message${state.error ? " error" : ""}`} aria-live="polite">{state.message}</p>}
        </form>
      </section>
    </main>
  );
}
