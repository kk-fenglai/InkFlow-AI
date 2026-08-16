"use client";

import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/account";
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState(false);
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
    if (res?.error) {
      setBusy(false);
      if (res.error === "NETWORK_ERROR") {
        setNetworkError(true);
      } else {
        setError("Email or password is incorrect.");
      }
      return;
    }
    // Admins are a backend-only role — send them to the dashboard rather than
    // the studio, so they never land on the normal user interface.
    const session = await getSession();
    const destination =
      session?.user?.role === "admin" ? "/admin" : callbackUrl;
    // Hard navigation, not router.push: the destination is usually the
    // middleware-protected /account, and a soft push races the session cookie
    // (plus router.refresh aborts the in-flight push), which bounced the user
    // straight back to this form with the session already established.
    window.location.assign(destination);
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-tertiary outline-none pl-md pr-10 py-sm font-body-md"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-tertiary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
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
      {networkError && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-md"
        >
          <div className="w-full max-w-sm bg-surface rounded p-lg flex flex-col gap-md text-center">
            <span className="material-symbols-outlined text-[36px] text-error mx-auto">
              wifi_off
            </span>
            <p className="font-label-md text-label-md text-on-surface">
              Network connection failed
            </p>
            <p className="font-body-md text-on-surface-variant">
              We couldn&apos;t reach the server. Please check your internet
              connection and try again.
            </p>
            <button
              type="button"
              onClick={() => setNetworkError(false)}
              className="bg-on-surface text-surface py-sm rounded font-label-md text-label-md hover:bg-tertiary transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
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
