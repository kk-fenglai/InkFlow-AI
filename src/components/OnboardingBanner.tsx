"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "inkflow-onboarding-done";

export default function OnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    trackEvent("onboarding_complete");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-lg p-md rounded-xl border border-tertiary/30 bg-tertiary/5 flex flex-col sm:flex-row sm:items-center gap-md justify-between">
      <div>
        <p className="font-label-md text-label-md text-on-surface">
          Welcome to InkFlow AI
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Pick a template, tune your ink (5 uses = 1 cr), save free templates to cloud,
          refine handwriting for free, then sign PDFs (1 cr) on{" "}
          <Link href="/sign" className="text-tertiary underline">
            Sign
          </Link>
          . New accounts get 5 free credits.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 px-md py-sm rounded bg-on-surface text-surface font-label-md text-label-md hover:bg-tertiary transition-colors"
      >
        Got it
      </button>
    </div>
  );
}
