"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; theme: "auto" }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const isTurnstileConfigured = Boolean(siteKey);

export function TurnstileField({ pending }: { pending: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const wasPendingRef = useRef(false);
  const scriptId = useId();
  const [widgetError, setWidgetError] = useState(false);

  function renderWidget() {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
      });
    } catch (error) {
      console.error("Could not render the Cloudflare Turnstile widget.", error);
      setWidgetError(true);
    }
  }

  useEffect(() => () => {
    if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
  }, []);

  useEffect(() => {
    if (wasPendingRef.current && !pending && widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current);
    }
    wasPendingRef.current = pending;
  }, [pending]);

  return (
    <div className="turnstile-field">
      {siteKey && (
        <>
          <div ref={containerRef} />
          <Script
            id={`turnstile-script-${scriptId}`}
            onError={() => setWidgetError(true)}
            onReady={renderWidget}
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
          />
        </>
      )}
      {!siteKey && <p className="turnstile-error" role="alert">Spam protection is not configured. Please try again later.</p>}
      {widgetError && <p className="turnstile-error" role="alert">Spam protection could not load. Please refresh and try again.</p>}
    </div>
  );
}
