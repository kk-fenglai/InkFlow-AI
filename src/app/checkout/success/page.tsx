"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCredits } from "@/hooks/useCredits";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId");
  const { refresh } = useCredits();
  const [status, setStatus] = useState<string>("pending");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!purchaseId) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/stripe/purchases/${purchaseId}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.purchase?.status === "completed") {
          setStatus("completed");
          setCredits(data.purchase.credits);
          refresh();
          return;
        }

        if (data.purchase?.status === "failed" || data.purchase?.status === "closed") {
          setStatus(data.purchase.status);
          return;
        }

        attempts += 1;
        if (attempts < 30) {
          setTimeout(poll, 2000);
        } else {
          setStatus("timeout");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [purchaseId, refresh]);

  return (
    <main className="page-main max-w-lg text-center">
      <span className="material-symbols-outlined text-tertiary text-[48px] mb-md filled">
        {status === "completed" ? "check_circle" : "hourglass_top"}
      </span>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-md">
        {status === "completed" ? "Payment successful" : "Confirming payment…"}
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
        {status === "completed" && credits != null
          ? `${credits} credits have been added to your account.`
          : status === "timeout"
            ? "Payment is still processing. Check your orders on Account."
            : "We are waiting for Stripe to confirm your payment (WeChat / Alipay may take a moment)."}
      </p>
      <div className="flex flex-col sm:flex-row gap-md justify-center">
        <Link
          href={purchaseId ? `/account?purchase=${purchaseId}` : "/account"}
          className="px-lg py-md bg-tertiary text-on-tertiary rounded font-label-md"
        >
          Go to Account
        </Link>
        <Link
          href="/studio"
          className="px-lg py-md border border-outline-variant rounded font-label-md text-on-surface"
        >
          Open Studio
        </Link>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
          Loading…
        </main>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
