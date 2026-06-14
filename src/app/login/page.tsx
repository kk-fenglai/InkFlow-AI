"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/account";
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Email or password is incorrect.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your studio account to use credits and save your work."
      footer={
        <>
          No account?{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-tertiary hover:underline underline-offset-4"
          >
            Create one
          </Link>
        </>
      }
    >
      {registered && (
        <p className="mb-md p-sm bg-tertiary/10 border border-tertiary/20 rounded font-label-sm text-label-sm text-on-surface text-center">
          Account created — sign in below.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none px-md py-sm font-body-md"
            required
          />
          <Link
            href="/forgot-password"
            className="font-label-sm text-label-sm text-tertiary hover:underline self-end"
          >
            Forgot password?
          </Link>
        </label>
        {error && (
          <p className="font-label-sm text-label-sm text-error">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="bg-on-surface text-surface py-md rounded font-label-md text-label-md hover:bg-tertiary transition-colors disabled:opacity-50 mt-sm"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="font-label-sm text-label-sm text-on-surface-variant mt-md text-center">
        Demo: <strong>studio@inkflow.ai</strong> / <strong>inkflow2024</strong>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
