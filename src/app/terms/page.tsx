import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="page-main max-w-2xl">
      <h1 className="font-display-lg text-display-lg text-on-surface mb-md">
        Terms of Service
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <section className="space-y-md font-body-md text-body-md text-on-surface-variant">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Service
        </h2>
        <p>
          InkFlow AI provides digital signature design, practice tools, and PDF
          signing using Simple Electronic Signature (SES). The service is
          provided &quot;as is&quot; for creative and everyday document use.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Credits & payments
        </h2>
        <p>
          Premium actions consume credits purchased through Stripe. Credits are
          non-refundable except where required by law. See{" "}
          <Link href="/pricing" className="text-tertiary underline">
            Pricing
          </Link>{" "}
          for current costs.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Electronic signatures
        </h2>
        <p>
          SES signatures may not satisfy all legal requirements. You are
          responsible for determining whether SES is appropriate for your
          document and jurisdiction.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Acceptable use
        </h2>
        <p>
          Do not use InkFlow AI for fraud, impersonation, or signing documents
          you are not authorized to sign. We may suspend accounts that abuse
          the service.
        </p>
      </section>

      <Link
        href="/"
        className="inline-block mt-xl text-tertiary font-label-md underline underline-offset-4"
      >
        ← Back home
      </Link>
    </main>
  );
}
