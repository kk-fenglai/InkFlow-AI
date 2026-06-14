"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutCancelContent() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId");

  return (
    <main className="page-main max-w-lg text-center">
      <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md">
        cancel
      </span>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-md">
        Checkout cancelled
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
        No charges were made. You can return to pricing and try again anytime.
      </p>
      <div className="flex flex-col sm:flex-row gap-md justify-center">
        <Link
          href="/pricing"
          className="px-lg py-md bg-tertiary text-on-tertiary rounded font-label-md"
        >
          Back to Pricing
        </Link>
        {purchaseId && (
          <Link
            href={`/account?purchase=${purchaseId}`}
            className="px-lg py-md border border-outline-variant rounded font-label-md text-on-surface"
          >
            View orders
          </Link>
        )}
      </div>
    </main>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
          Loading…
        </main>
      }
    >
      <CheckoutCancelContent />
    </Suspense>
  );
}
