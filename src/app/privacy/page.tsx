import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page-main max-w-2xl prose prose-neutral">
      <h1 className="font-display-lg text-display-lg text-on-surface mb-md">
        Privacy Policy
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        Last updated: 2026-07-17
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
        <p>
          Our native iOS app collects the same account and usage data as the
          website. Photo library access is used only when you choose an image
          for signature refinement; we do not scan your library in the
          background.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          How we use data
        </h2>
        <p>
          Data is used to provide signature generation, cloud library storage,
          credit billing, and PDF signing (SES). On the website, payments are
          processed by Stripe. In the iOS app, digital goods are sold only
          through Apple In-App Purchase; we receive transaction identifiers to
          grant credits and subscriptions.
        </p>
        <p>
          Optional AI-assisted features may send tuning prompts or image
          analysis data to configured providers (e.g. DeepSeek or OpenAI) when
          enabled on the server.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Retention & deletion
        </h2>
        <p>
          You may delete your account and all associated data from your{" "}
          <Link href="/account" className="text-tertiary underline">
            Account
          </Link>{" "}
          page on the web, or from the Account tab in the iOS app (Delete
          account). PDF files uploaded for signing are processed in memory and
          are not stored on our servers after the request completes.
        </p>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Contact
        </h2>
        <p>
          Questions: dengfenglai1210@gmail.com
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
