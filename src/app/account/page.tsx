"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AccountAvatar from "@/components/AccountAvatar";
import { useCredits } from "@/hooks/useCredits";

function AccountDashboard() {
  const { data: session } = useSession();
  const { credits, refresh, loading } = useCredits();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  return (
    <main className="page-main">
      {checkout === "success" && (
        <div className="mb-lg p-md bg-tertiary/10 border border-tertiary/30 rounded-lg text-center font-body-md text-on-surface max-w-xl mx-auto">
          Payment received — credits will appear shortly.{" "}
          <button
            type="button"
            onClick={() => refresh()}
            className="text-tertiary underline underline-offset-4"
          >
            Refresh balance
          </button>
        </div>
      )}
      {checkout === "cancel" && (
        <div className="mb-lg p-md bg-surface-container border border-outline-variant rounded-lg text-center font-body-md text-on-surface-variant max-w-xl mx-auto">
          Checkout cancelled.{" "}
          <Link href="/pricing" className="text-tertiary underline">
            Return to pricing
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-xl items-start">
        <aside className="w-full md:w-72 shrink-0 bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg text-center">
          <AccountAvatar size="lg" className="mx-auto mb-md" />
          <h1 className="font-headline-sm text-headline-sm text-on-surface">
            {session?.user?.name ?? "Studio Artist"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs break-all">
            {session?.user?.email}
          </p>
          <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mt-md">
            {session?.user?.plan ?? "free"} plan
            {session?.user?.role === "admin" && " · admin"}
          </p>
          {session?.user?.role === "admin" && (
            <Link
              href="/admin/purchases"
              className="mt-md inline-block font-label-sm text-tertiary underline"
            >
              Admin payments
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-lg w-full py-sm border border-outline-variant rounded font-label-md text-label-md text-on-surface-variant hover:text-tertiary hover:border-tertiary transition-colors"
          >
            Sign out
          </button>
        </aside>

        <div className="flex-grow flex flex-col gap-xl min-w-0">
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg">
            <div className="flex flex-wrap justify-between items-start gap-md mb-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Credit balance
              </h2>
              <Link
                href="/pricing"
                className="font-label-md text-label-md text-tertiary hover:underline underline-offset-4 flex items-center gap-xs"
              >
                Buy credits
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className="flex items-baseline gap-sm">
              <span className="font-display-lg text-display-lg text-tertiary">
                {loading ? "…" : credits}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                credits
              </span>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-md font-label-sm text-label-sm text-on-surface-variant hover:text-tertiary transition-colors"
            >
              Refresh balance
            </button>
          </section>

          <SubscriptionSection />

          <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
              Quick links
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <QuickLink href="/studio" icon="draw" label="Hand-drawn AI" />
              <QuickLink href="/sign" icon="draw" label="Sign PDF" />
              <QuickLink href="/refine" icon="auto_awesome" label="Refinement" />
            </div>
          </section>

          <DeleteAccountSection />

          <PurchaseHistory />

          <TransactionHistory />
        </div>
      </div>
    </main>
  );
}

function SubscriptionSection() {
  const { authenticated } = useCredits();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function openPortal() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Could not open billing portal.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated) return null;

  return (
    <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg">
      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
        Subscription
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-md">
        Studio Pro subscribers receive 50 credits each billing period. Manage or
        cancel in the Stripe customer portal.
      </p>
      <div className="flex flex-wrap gap-md">
        <Link
          href="/pricing#subscription"
          className="px-md py-sm border border-tertiary text-tertiary rounded font-label-md"
        >
          View plans
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void openPortal()}
          className="px-md py-sm bg-on-surface text-surface rounded font-label-md disabled:opacity-50"
        >
          {busy ? "Opening…" : "Manage billing"}
        </button>
      </div>
      {msg && (
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm">{msg}</p>
      )}
    </section>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-sm p-md rounded-lg border border-surface-variant bg-surface-container-lowest hover:border-tertiary/50 transition-colors"
    >
      <span className="material-symbols-outlined text-tertiary">{icon}</span>
      <span className="font-label-md text-label-md text-on-surface">{label}</span>
    </Link>
  );
}

function DeleteAccountSection() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function deleteAccount() {
    if (confirm !== "DELETE") {
      setMsg('Type DELETE to confirm.');
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setMsg(data.error ?? "Could not delete account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-surface-container-low border border-error/30 rounded-xl p-lg">
      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
        Privacy & data
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-md">
        Delete your account, cloud signatures, template unlocks, and signing
        history. This cannot be undone. See our{" "}
        <Link href="/privacy" className="text-tertiary underline">
          Privacy Policy
        </Link>
        .
      </p>
      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
        Type DELETE to confirm
      </label>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full max-w-xs p-sm rounded border border-outline-variant/50 bg-surface-container-lowest font-body-md mb-md"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void deleteAccount()}
        className="px-md py-sm rounded border border-error text-error font-label-md hover:bg-error/5 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete my account"}
      </button>
      {msg && (
        <p className="font-body-md text-body-md text-error mt-sm">{msg}</p>
      )}
    </section>
  );
}

function PurchaseHistory() {
  const { authenticated } = useCredits();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("purchase");
  const [items, setItems] = useState<
    {
      id: string;
      packId: string | null;
      credits: number;
      amountCents: number;
      currency: string;
      status: string;
      createdAt: string;
      paidAt: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/stripe/purchases")
      .then((r) => r.json())
      .then((d) => {
        if (d.purchases) setItems(d.purchases);
      })
      .catch(() => {});
  }, [authenticated]);

  return (
    <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg">
      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
        Credit purchases
      </h2>
      {items.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No purchases yet.{" "}
          <Link href="/pricing" className="text-tertiary underline">
            Buy credits
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-surface-variant">
          {items.map((p) => (
            <li
              key={p.id}
              className={`py-sm flex flex-wrap justify-between items-center gap-sm font-body-md text-body-md ${
                highlightId === p.id ? "bg-tertiary/5 -mx-sm px-sm rounded" : ""
              }`}
            >
              <span className="text-on-surface-variant">
                {p.credits} credits ·{" "}
                {new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency: (p.currency ?? "eur").toUpperCase(),
                }).format(p.amountCents / 100)}
              </span>
              <span
                className={`font-label-sm text-label-sm uppercase tracking-wide ${
                  p.status === "completed"
                    ? "text-tertiary"
                    : p.status === "pending"
                      ? "text-on-surface-variant"
                      : "text-outline"
                }`}
              >
                {p.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TransactionHistory() {
  const { authenticated } = useCredits();
  const [items, setItems] = useState<
    { amount: number; reason: string; at: string }[]
  >([]);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        if (d.transactions) setItems(d.transactions);
      })
      .catch(() => {});
  }, [authenticated]);

  return (
    <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg">
      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
        Recent activity
      </h2>
      {items.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No transactions yet. Use credits in the Studio or Refinement workbench.
        </p>
      ) : (
        <ul className="divide-y divide-surface-variant">
          {items.map((t, i) => (
            <li
              key={i}
              className="py-sm flex justify-between items-center font-body-md text-body-md"
            >
              <span className="text-on-surface-variant capitalize">
                {t.reason.replace(/_/g, " ")}
              </span>
              <span
                className={t.amount >= 0 ? "text-tertiary" : "text-on-surface"}
              >
                {t.amount >= 0 ? "+" : ""}
                {t.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
          Loading account…
        </main>
      }
    >
      <AccountDashboard />
    </Suspense>
  );
}
