import Link from "next/link";

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Sign PDF", href: "/sign" },
  { label: "Studio Guide", href: "/studio" },
];

export default function Footer() {
  return (
    <footer className="bg-surface-container-low w-full py-lg sm:py-xl border-t border-outline-variant/30 mt-auto pb-safe">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center justify-between gap-md px-md sm:flex-row sm:px-lg">
        <div className="font-headline-sm text-headline-sm text-on-surface-variant opacity-50">
          InkFlow AI
        </div>
        <div className="font-body-md text-body-md text-secondary text-center md:text-left">
          © {new Date().getFullYear()} InkFlow AI. Handcrafted for the digital
          artist.
        </div>
        <nav className="flex flex-wrap justify-center gap-md">
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-tertiary underline-offset-4 hover:underline transition-all"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
