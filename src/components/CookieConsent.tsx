"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONSENT_SIGNALS,
  CONSENT_STORAGE_KEY,
} from "@/lib/consent";

type Choice = "granted" | "denied";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only ask once — a stored choice was already replayed to gtag by the
    // consent-defaults script before the tag loaded.
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored !== "granted" && stored !== "denied") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(choice: Choice) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
      // Private mode — the choice still applies to this page view.
    }
    window.gtag?.(
      "consent",
      "update",
      Object.fromEntries(CONSENT_SIGNALS.map((s) => [s, choice])),
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/40 bg-surface-container-low/95 backdrop-blur px-md py-md shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body-md text-body-md text-on-surface-variant">
          We use advertising cookies to measure our ad campaigns. Decline and
          nothing is shared with Google. See our{" "}
          <Link href="/privacy" className="text-tertiary underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-sm">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="px-md py-sm rounded font-label-md text-label-md border border-outline text-on-surface hover:bg-surface-container-high"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="px-md py-sm rounded font-label-md text-label-md bg-on-surface text-surface hover:bg-tertiary"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
