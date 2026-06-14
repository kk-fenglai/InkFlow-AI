"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed.");
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="Request a new password reset.">
        <Link href="/forgot-password" className="text-tertiary underline font-label-md">
          Forgot password
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="At least 8 characters with letters and numbers.">
      <form onSubmit={submit} className="flex flex-col gap-md">
        <input
          type="password"
          placeholder="New password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-surface-container-lowest border-b-2 border-outline-variant px-md py-sm font-body-md"
        />
        <input
          type="password"
          placeholder="Confirm password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-surface-container-lowest border-b-2 border-outline-variant px-md py-sm font-body-md"
        />
        {error && <p className="font-label-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bg-on-surface text-surface py-md rounded font-label-md disabled:opacity-50"
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex-grow grid place-items-center py-xxl">Loading…</main>}>
      <ResetForm />
    </Suspense>
  );
}
