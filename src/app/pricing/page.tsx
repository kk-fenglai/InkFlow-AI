"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { CREDIT_PACKS, CREDIT_USAGE_ITEMS, PRICING_TIERS, SUBSCRIPTION_PLAN } from "@/lib/constants";

function BuyButton({ packId }: { packId: string }) {
  const { status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function buy() {
    if (status !== "authenticated") return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent("/pricing")}`}
        className="inline-block w-full text-center py-md rounded font-label-md text-label-md border border-tertiary text-tertiary hover:bg-tertiary/5 transition-colors"
      >
        Sign in to purchase
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={buy}
        className="w-full py-md bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 transition-colors disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Buy with Stripe"}
      </button>
      {msg && (
        <p className="font-label-sm text-label-sm text-error mt-sm text-center">
          {msg}
        </p>
      )}
    </>
  );
}

function SubscribeButton() {
  const { status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function subscribe() {
    if (status !== "authenticated") return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/stripe/subscribe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Subscription checkout failed.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent("/pricing#subscription")}`}
        className="inline-block w-full text-center py-md rounded font-label-md border border-tertiary text-tertiary hover:bg-tertiary/5"
      >
        Sign in to subscribe
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={subscribe}
        className="w-full py-md bg-tertiary text-on-tertiary rounded font-label-md hover:bg-tertiary/90 disabled:opacity-50"
      >
        {busy ? "Redirecting…" : `Subscribe — $${SUBSCRIPTION_PLAN.priceUsd}/mo`}
      </button>
      {msg && (
        <p className="font-label-sm text-label-sm text-error mt-sm text-center">{msg}</p>
      )}
    </>
  );
}

export default function PricingPage() {
  return (
    <main className="page-main">
      <header className="text-center max-w-2xl mx-auto mb-xxl">
        <span className="inline-block px-sm py-xs bg-tertiary/10 text-tertiary font-label-sm text-label-sm uppercase tracking-widest rounded border border-tertiary/20 mb-md">
          Studio Pricing
        </span>
        <h1 className="font-display-lg text-display-lg-mobile sm:text-display-lg text-on-surface mb-md">
          Invest in your mark.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Start free with live previews. Purchase credits when you need
          server-rendered final ink or professional refinements.
        </p>
      </header>

      {/* Plan tiers */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-xxl">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            id={tier.id === "pro" ? undefined : undefined}
            className={`flex flex-col p-lg rounded-xl border ${
              tier.highlighted
                ? "border-tertiary bg-tertiary/5 artisan-shadow md:scale-[1.02]"
                : "border-outline-variant/30 bg-surface-container-low"
            }`}
          >
            {tier.highlighted && (
              <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-widest mb-sm">
                Most popular
              </span>
            )}
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              {tier.name}
            </h2>
            <p className="font-display-lg text-display-lg-mobile text-on-surface mt-sm">
              {tier.priceLabel}
            </p>
            {tier.period && (
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                {tier.period}
              </p>
            )}
            <p className="font-body-md text-body-md text-on-surface-variant mt-md mb-lg flex-grow">
              {tier.description}
            </p>
            <ul className="space-y-sm mb-lg">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="font-body-md text-body-md text-on-surface-variant flex items-start gap-sm"
                >
                  <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 filled">
                    check
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={tier.href.startsWith("#") ? `/pricing${tier.href}` : tier.href}
              className={`text-center py-md rounded font-label-md text-label-md transition-colors ${
                tier.highlighted
                  ? "bg-on-surface text-surface hover:bg-tertiary"
                  : "border border-outline text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </section>

      <hr className="border-t border-outline-variant/30 w-24 mx-auto mb-xxl" />

      {/* Subscription */}
      <section id="subscription" className="scroll-mt-24 mb-xxl max-w-xl mx-auto">
        <div className="p-lg rounded-xl border-2 border-tertiary/40 bg-tertiary/5 text-center">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
            {SUBSCRIPTION_PLAN.label}
          </h2>
          <p className="font-display-lg text-display-lg-mobile text-on-surface">
            ${SUBSCRIPTION_PLAN.priceUsd.toFixed(2)}
            <span className="font-label-md text-label-md text-on-surface-variant"> / month</span>
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant mt-md mb-lg">
            {SUBSCRIPTION_PLAN.description}
          </p>
          <SubscribeButton />
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-md">
            Requires STRIPE_PRICE_PRO_MONTHLY in server env.
          </p>
        </div>
      </section>

      <hr className="border-t border-outline-variant/30 w-24 mx-auto mb-xxl" />

      {/* Credit packs */}
      <section id="credit-packs" className="scroll-mt-24">
        <div className="text-center mb-xl">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
            Generation credits
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto">
            Credits power final exports, cloud saves, template unlocks, AI tuning,
            SVG export, and PDF signing. Previews and practice stay free.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              id={pack.id}
              className={`flex flex-col p-lg rounded-xl border scroll-mt-24 ${
                "popular" in pack && pack.popular
                  ? "border-tertiary bg-surface-container-lowest artisan-shadow"
                  : "border-outline-variant/30 bg-surface-container-low"
              }`}
            >
              {"popular" in pack && pack.popular && (
                <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-widest mb-sm">
                  Best value
                </span>
              )}
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {pack.label}
              </h3>
              <p className="font-display-lg text-display-lg-mobile text-on-surface mt-sm">
                ${pack.priceUsd.toFixed(2)}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                ${(pack.priceUsd / pack.credits).toFixed(2)} per credit
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant mt-md mb-lg flex-grow">
                {pack.description}
              </p>
              <BuyButton packId={pack.id} />
            </div>
          ))}
        </div>
      </section>

      {/* Usage table */}
      <section className="mt-xxl p-lg bg-surface-container rounded-xl border border-outline-variant/30 max-w-2xl mx-auto">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md text-center">
          Credit usage
        </h3>
        <table className="w-full font-body-md text-body-md">
          <tbody>
            {CREDIT_USAGE_ITEMS.map((row, i) => (
              <tr
                key={row.action}
                className={
                  i < CREDIT_USAGE_ITEMS.length - 1
                    ? "border-b border-surface-variant"
                    : ""
                }
              >
                <td
                  className={`py-sm ${
                    row.free ? "text-on-surface-variant" : "text-on-surface"
                  }`}
                >
                  {row.action}
                </td>
                <td
                  className={`py-sm text-right font-label-md ${
                    row.free ? "text-on-surface-variant" : "text-tertiary"
                  }`}
                >
                  {row.free ? "Free" : `${row.cost} cr`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-lg">
          New accounts receive 5 free credits on registration.
        </p>
      </section>
    </main>
  );
}
