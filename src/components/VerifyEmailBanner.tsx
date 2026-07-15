"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FREE_STARTER_CREDITS } from "@/lib/constants";

export default function VerifyEmailBanner() {
  const { status: sessionStatus } = useSession();
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setUnverified(false);
      return;
    }
    let cancelled = false;
    fetch("/api/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) setUnverified(!data.emailVerified);
      })
      .catch(() => {
        /* keep hidden on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  async function resend() {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Could not send the email.");
        return;
      }
      setNotice("Verification email sent — check your inbox.");
    } catch {
      setNotice("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!unverified) return null;

  return (
    <div className="mb-lg p-md rounded-xl border border-tertiary/30 bg-tertiary/5 flex flex-col sm:flex-row sm:items-center gap-md justify-between">
      <div>
        <p className="font-label-md text-label-md text-on-surface">
          Verify your email to claim {FREE_STARTER_CREDITS} free credits
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          {notice ||
            "We sent you a verification link when you signed up. Click it to unlock your welcome credits."}
        </p>
      </div>
      <button
        type="button"
        onClick={resend}
        disabled={busy}
        className="shrink-0 px-md py-sm rounded bg-on-surface text-surface font-label-md text-label-md hover:bg-tertiary transition-colors disabled:opacity-50"
      >
        {busy ? "Sending…" : "Resend email"}
      </button>
    </div>
  );
}
