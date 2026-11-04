"use client";

import { useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

export function AdSenseAd() {
  const slotRef = useRef<HTMLModElement>(null);

  function initializeAd() {
    const slot = slotRef.current;
    if (!slot || slot.dataset.adsbygoogleStatus) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("Could not initialize the AdSense vacancy ad.", error);
    }
  }

  return (
    <aside className="adsense-ad" aria-label="Advertisement">
      <p className="adsense-label">Advertisement</p>
      <ins
        ref={slotRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: 250, width: "100%" }}
        data-ad-client="ca-pub-3860151941190347"
        data-ad-slot="4102953920"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script
        id="adsense-script"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3860151941190347"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        onReady={initializeAd}
        onError={(error) => console.error("Could not load the AdSense script.", error)}
      />
    </aside>
  );
}
