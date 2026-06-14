import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page-main max-w-2xl prose prose-neutral">
      <h1 className="font-display-lg text-display-lg text-on-surface mb-md">
        Privacy Policy
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <section className="space-y-md font-body-md text-body-md text-on-surface-variant">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          What we collect
        </h2>
        <p>
          InkFlow AI stores your account email, display name, credit balance,
          saved signature stroke data, template unlocks, and document signing
          audit records (file name and timestamp — not document contents).
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          How we use data
        </h2>
        <p>
          Data is used to provide signature generation, cloud library storage,
          credit billing via Stripe, and PDF signing (SES). Optional OpenAI
          integration for natural-language tuning sends only your tuning prompt
          when configured.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Retention & deletion
        </h2>
        <p>
          You may delete your account and all associated data from your{" "}
          <Link href="/account" className="text-tertiary underline">
            Account
          </Link>{" "}
          page. PDF files uploaded for signing are processed in memory and are
          not stored on our servers after the request completes.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Contact
        </h2>
        <p>
          Questions: support@inkflow.ai (placeholder — update for production).
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
