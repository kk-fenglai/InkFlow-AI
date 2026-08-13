import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page-main max-w-2xl prose prose-neutral">
      <h1 className="font-display-lg text-display-lg text-on-surface mb-md">
        Privacy Policy
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        Last updated: 2026-08-13
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
          Advertising & cookies
        </h2>
        <p>
          We use Google Ads conversion tracking (gtag.js) to measure which
          campaigns lead to sign-ups and purchases. It may set advertising
          cookies and send your IP address and page URL to Google.
        </p>
        <p>
          In the EEA, the UK, and Switzerland these cookies stay disabled until
          you accept them in the consent banner. Elsewhere you can decline at
          any time using the same banner. Declining stops all data being shared
          with Google; the rest of the site works unchanged. Your choice is kept
          in your browser&apos;s local storage — clear site data to be asked
          again.
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
