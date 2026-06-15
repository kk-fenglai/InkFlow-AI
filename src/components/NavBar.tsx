"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useCredits } from "@/hooks/useCredits";

const NAV_LINKS = [
  { href: "/studio", label: "Hand-drawn AI" },
  { href: "/library", label: "Cloud Library" },
  { href: "/sign", label: "Sign PDF" },
  { href: "/refine", label: "Refinement" },
  { href: "/pricing", label: "Pricing" },
];

const AUTH_BTN =
  "font-label-md text-label-md px-md py-sm rounded-lg hidden sm:inline-flex items-center justify-center min-w-[96px] h-[40px] transition-colors duration-200";

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={
        active
          ? "font-label-md text-label-md text-primary font-bold border-b-2 border-primary py-sm block"
          : "font-label-md text-label-md text-on-surface-variant hover:text-tertiary transition-colors duration-300 py-sm block"
      }
    >
      {label}
    </Link>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const { status } = useSession();
  const { credits, authenticated, loading } = useCredits();
  const authReady = !loading;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const creditsPill = (
    <Link
      href="/account"
      aria-hidden={!authenticated}
      tabIndex={authenticated ? 0 : -1}
      onClick={() => setMenuOpen(false)}
      className={`inline-flex items-center gap-xs px-sm h-[32px] rounded-full border border-outline-variant/50 bg-surface-container-low hover:border-tertiary/50 transition-opacity duration-200 min-w-[72px] justify-center ${
        authenticated ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      title="Your credits"
    >
      <span className="material-symbols-outlined text-tertiary text-[18px] filled">
        toll
      </span>
      <span className="font-label-sm text-label-sm text-on-surface tabular-nums">
        {credits} cr
      </span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-container bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex h-14 max-w-container-max items-center justify-between gap-sm px-md sm:h-16 sm:gap-md sm:px-lg sm:py-md">
        <div className="flex min-w-0 items-center gap-md sm:gap-xl">
          <Link
            href="/"
            className="truncate font-headline-md text-[22px] leading-tight text-on-surface tracking-tight sm:text-headline-md"
          >
            InkFlow AI
          </Link>
          <nav className="hidden items-center gap-lg md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname === link.href}
              />
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-xs sm:gap-md">
          <div className="hidden sm:block">{creditsPill}</div>

          <Link
            href="/studio"
            className="inline-flex h-9 items-center gap-xs rounded-lg bg-on-surface px-sm py-sm font-label-md text-label-md text-surface transition-colors duration-300 hover:bg-tertiary sm:h-[40px] sm:gap-sm sm:px-md"
          >
            <span className="hidden sm:inline">Create New</span>
            <span className="sm:hidden">Create</span>
            <span className="material-symbols-outlined text-[18px] sm:hidden">
              draw
            </span>
          </Link>

          {!authReady ? (
            <span
              className={`${AUTH_BTN} bg-surface-container-low text-transparent select-none`}
              aria-hidden
            >
              ···
            </span>
          ) : authenticated ? (
            <Link
              href="/account"
              className={`${AUTH_BTN} border border-transparent text-on-surface-variant hover:text-tertiary`}
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className={`${AUTH_BTN} border border-outline text-on-surface hover:bg-surface-container-low`}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container-low md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined text-[22px]">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-on-surface/40 transition-opacity duration-200 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <nav
          className={`absolute right-0 top-0 flex h-full w-[min(100vw-2.5rem,320px)] flex-col border-l border-outline-variant/30 bg-background shadow-xl transition-transform duration-200 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-surface-container px-md py-md">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
              Menu
            </span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-container-low"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex flex-col gap-xs overflow-y-auto px-md py-md pb-safe">
            {authenticated && (
              <div className="mb-sm flex justify-start">{creditsPill}</div>
            )}

            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname === link.href}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}

            <hr className="my-md border-outline-variant/30" />

            {authReady && !authenticated && (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-outline py-sm text-center font-label-md text-label-md text-on-surface"
              >
                Sign in
              </Link>
            )}
            {authReady && authenticated && (
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-outline-variant/50 py-sm text-center font-label-md text-label-md text-on-surface-variant"
              >
                Account settings
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
