"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import AuthShell from "@/components/AuthShell";

type Status =
  | { state: "verifying" }
  | { state: "success"; credited: boolean; credits: number }
  | { state: "error"; message: string };

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>({ state: "verifying" });
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus({
            state: "error",
            message: data.error ?? "Verification failed.",
          });
          return;
        }
        setStatus({
          state: "success",
          credited: Boolean(data.credited),
          credits: Number(data.credits ?? 0),
        });
      } catch {
        setStatus({ state: "error", message: "Network error. Try again." });
      }
    })();
  }, [token]);

  if (!token) {
    return (
      <AuthShell
        title="Invalid link"
        subtitle="This verification link is missing its token."
      >
        <Link href="/login" className="text-tertiary underline font-label-md">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  if (status.state === "verifying") {
    return (
      <AuthShell title="Verifying…" subtitle="Checking your verification link.">
        <p className="font-body-md text-body-md text-on-surface-variant">
          One moment…
        </p>
      </AuthShell>
    );
  }

  if (status.state === "error") {
    return (
      <AuthShell
        title="Verification failed"
        subtitle={status.message}
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          The link may have expired. Sign in and request a new verification
          email from the studio.
        </p>
        <Link
          href="/login"
          className="inline-block mt-md bg-on-surface text-surface px-lg py-md rounded font-label-md text-label-md hover:bg-tertiary transition-colors"
        >
          Sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Email verified"
      subtitle={
        status.credited
          ? `Welcome to the studio — ${status.credits} credits are now in your account.`
          : "Your email was already verified."
      }
    >
      <Link
        href="/studio"
        className="inline-block bg-on-surface text-surface px-lg py-md rounded font-label-md text-label-md hover:bg-tertiary transition-colors"
      >
        Open the studio
      </Link>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
          Loading…
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
