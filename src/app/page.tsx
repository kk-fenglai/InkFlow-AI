import Link from "next/link";

export default function HomePage() {
  return (
    <main className="w-full flex flex-col items-center justify-start pb-lg sm:pb-xxl">
      {/* Hero */}
      <section className="page-section w-full py-lg sm:py-xxl flex flex-col items-center text-center mt-md sm:mt-xl">
        <div className="inline-flex items-center justify-center px-sm py-xs bg-tertiary/10 rounded-full mb-lg">
          <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">
            Artisan Edition
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg-mobile sm:text-display-lg md:text-[64px] md:leading-[72px] text-on-surface max-w-3xl mb-md">
          The Art of the Signature, Reimagined.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-xl">
          Elevate your digital mark with artisanal AI. Craft a signature that
          carries the weight, texture, and undeniable presence of traditional
          ink on paper.
        </p>

        <div className="relative w-full max-w-4xl aspect-[21/9] bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden flex items-center justify-center mb-xl artisan-shadow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="A meticulously crafted, handwritten signature on heavy, cream-colored, textured paper."
            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
            src="/images/hero-signature.png"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/50 to-transparent" />
          <h2 className="relative font-display-lg text-display-lg text-on-surface italic ink-bleed-animation z-10 select-none">
            A. Harrison
          </h2>
        </div>

        <Link
          href="/studio"
          className="font-label-md text-label-md bg-on-surface text-surface px-lg py-md rounded-lg hover:bg-tertiary transition-colors duration-300 artisan-shadow flex items-center gap-sm"
        >
          <span>Start Crafting</span>
          <span className="material-symbols-outlined text-[18px]">draw</span>
        </Link>
      </section>

      <div className="page-section w-full">
        <hr className="border-t border-outline-variant/30 w-24 mx-auto my-xl" />
      </div>

      {/* Core features – bento grid */}
      <section className="page-section w-full py-lg sm:py-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Feature 1 – Curation */}
          <Link
            href="/studio"
            className="md:col-span-7 bg-surface-container-low border border-surface-variant rounded-xl overflow-hidden group relative min-h-[280px] sm:min-h-[400px] flex flex-col justify-end p-md sm:p-lg transition-colors hover:border-tertiary/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="A collection of beautifully styled signature templates laid out on a polished wooden desk alongside vintage calligraphy tools."
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 mix-blend-luminosity"
              src="/images/feature-curation.png"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent" />
            <div className="relative z-10">
              <Badge>01. Curation</Badge>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-sm">
                Template Customization
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                Begin with our library of curated artist signatures. Adjust
                slant, weight, and flourish to match your personal aesthetic,
                anchoring your identity in classical forms.
              </p>
            </div>
          </Link>

          {/* Feature 2 – Translation */}
          <Link
            href="/refine"
            className="md:col-span-5 bg-surface-container border border-surface-variant rounded-xl overflow-hidden group relative min-h-[280px] sm:min-h-[400px] flex flex-col justify-end p-md sm:p-lg transition-colors hover:border-tertiary/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="A close-up shot of a fountain pen resting next to a rough pencil sketch of a signature on a handmade journal page."
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-50 mix-blend-multiply"
              src="/images/feature-translation.png"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/90 to-transparent" />
            <div className="relative z-10">
              <Badge>02. Translation</Badge>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-sm">
                Handwriting Refinement
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Upload a raw sketch. Our AI interprets your natural strokes,
                refining inconsistencies while preserving the soul and intent of
                your original hand.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="page-section w-full py-lg sm:py-xxl text-center">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-md">
          Ready to make your mark?
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-xl max-w-md mx-auto">
          Step into the studio and begin crafting a signature that truly
          represents you.
        </p>
        <Link
          href="/studio"
          className="inline-block font-label-md text-label-md bg-on-surface text-surface px-xl py-md rounded-lg hover:bg-tertiary transition-colors duration-300 artisan-shadow"
        >
          Enter the Studio
        </Link>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center px-sm py-xs border border-outline-variant rounded-full mb-md bg-surface-container-lowest/80 backdrop-blur-sm">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}
