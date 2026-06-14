"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { FREE_STARTER_CREDITS } from "@/lib/constants";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      router.push(
        `/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Join the studio"
      subtitle={`Create an account and receive ${FREE_STARTER_CREDITS} free generation credits.`}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-tertiary hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Display name
          </span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-md py-sm font-body-md"
            placeholder="Your name"
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-md py-sm font-body-md"
            required
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-md py-sm font-body-md"
            minLength={8}
            required
          />
        </label>
        <p className="font-label-sm text-label-sm text-on-surface-variant -mt-sm">
          At least 8 characters with letters and numbers.
        </p>
        <label className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-md py-sm font-body-md"
            minLength={8}
            required
          />
        </label>
        {error && (
          <p className="font-label-sm text-label-sm text-error">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="bg-on-surface text-surface py-md rounded font-label-md text-label-md hover:bg-tertiary transition-colors disabled:opacity-50 mt-sm"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
          Loading…
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
