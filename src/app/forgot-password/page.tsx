"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [devUrl, setDevUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setDevUrl("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMsg(data.message ?? "Request submitted.");
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="We will send a reset link if this email is registered."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="text-tertiary underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-md py-sm font-body-md"
          />
        </label>
        {msg && <p className="font-body-md text-body-md text-on-surface-variant">{msg}</p>}
        {devUrl && (
          <p className="font-label-sm text-label-sm text-tertiary break-all">
            Dev link:{" "}
            <Link href={devUrl.replace(/^https?:\/\/[^/]+/, "") || devUrl} className="underline">
              Open reset page
            </Link>
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="bg-on-surface text-surface py-md rounded font-label-md disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main className="flex-grow grid place-items-center py-xxl">Loading…</main>}>
      <ForgotForm />
    </Suspense>
  );
}
