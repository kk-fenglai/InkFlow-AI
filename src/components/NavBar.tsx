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

function NavLink({
  href,
  label,
  active,
  onNavigate,
  mobileChip = false,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  mobileChip?: boolean;
}) {
  if (mobileChip) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={
          active
            ? "shrink-0 whitespace-nowrap rounded-full border border-tertiary/30 bg-tertiary/10 px-sm py-xs font-label-md text-label-md text-tertiary"
            : "shrink-0 whitespace-nowrap rounded-full border border-outline-variant/40 bg-surface-container-low px-sm py-xs font-label-md text-label-md text-on-surface-variant"
        }
      >
        {label}
      </Link>
    );
  }

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
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant/40 bg-background pt-safe shadow-[0_1px_0_rgba(29,28,22,0.06)]">
      <div className="mx-auto flex h-14 max-w-container-max items-center justify-between gap-xs px-sm sm:h-16 sm:gap-md sm:px-lg sm:py-md">
        <div className="flex min-w-0 flex-1 items-center gap-sm sm:gap-xl">
          <Link
            href="/"
            className="truncate font-headline-md text-[20px] leading-tight text-on-surface tracking-tight sm:text-headline-md"
          >
            InkFlow AI
          </Link>
          <nav className="hidden items-center gap-lg lg:flex">
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
          <div className="hidden md:block">{creditsPill}</div>

          <Link
            href="/studio"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-on-surface text-surface transition-colors duration-300 hover:bg-tertiary sm:h-[40px] sm:w-auto sm:gap-sm sm:px-md"
            aria-label="Create new signature"
            title="Create new signature"
          >
            <span className="material-symbols-outlined text-[20px]">draw</span>
            <span className="hidden sm:inline font-label-md text-label-md">
              Create New
            </span>
          </Link>

          {authReady && authenticated ? (
            <Link
              href="/account"
              className="hidden md:inline-flex h-[40px] min-w-[96px] items-center justify-center rounded-lg px-md py-sm font-label-md text-label-md text-on-surface-variant transition-colors duration-200 hover:text-tertiary"
            >
              Account
            </Link>
          ) : authReady ? (
            <Link
              href="/login"
              className="hidden md:inline-flex h-[40px] min-w-[96px] items-center justify-center rounded-lg border border-outline px-md py-sm font-label-md text-label-md text-on-surface transition-colors duration-200 hover:bg-surface-container-low"
            >
              Sign in
            </Link>
          ) : (
            <span
              className="hidden md:inline-flex h-[40px] min-w-[96px] select-none items-center justify-center rounded-lg bg-surface-container-low px-md py-sm font-label-md text-label-md text-transparent"
              aria-hidden
            >
              ···
            </span>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline bg-surface-container-low text-on-surface shadow-sm lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      <nav
        className="touch-scroll-x flex gap-xs overflow-x-auto border-t border-outline-variant/20 bg-surface-container-low/80 px-sm py-sm lg:hidden"
        aria-label="Primary"
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={pathname === link.href}
            mobileChip
          />
        ))}
      </nav>

      <div
        className={`fixed inset-0 z-[60] lg:hidden ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
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
          <div className="flex items-center justify-between border-b border-surface-container px-md py-md pt-safe">
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
