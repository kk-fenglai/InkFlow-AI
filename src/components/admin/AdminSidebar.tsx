"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "space_dashboard" },
  { href: "/admin/styles", label: "AI Styles", icon: "palette" },
  { href: "/admin/refine-refs", label: "Refine References", icon: "photo_library" },
  { href: "/admin/refine-test", label: "Refine Test", icon: "experiment" },
  { href: "/admin/users", label: "Users", icon: "group" },
  { href: "/admin/purchases", label: "Purchases", icon: "receipt_long" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  const links = NAV_ITEMS.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-sm rounded px-md py-sm font-label-md text-label-md whitespace-nowrap transition-colors ${
          active
            ? "bg-tertiary/10 text-tertiary"
            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        }`}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-surface-container-low border-r border-outline-variant/30">
        <div className="px-md py-lg">
          <Link href="/admin" className="block">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              InkFlow Admin
            </span>
          </Link>
        </div>
        <nav className="flex flex-col gap-xs px-sm">{links}</nav>
        <div className="mt-auto px-md py-lg border-t border-outline-variant/30">
          <p className="font-body-md text-label-sm text-on-surface-variant truncate">
            {email}
          </p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="font-label-md text-label-sm text-tertiary hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-surface-container-low border-b border-outline-variant/30">
        <div className="flex items-center justify-between px-md py-sm">
          <span className="font-headline-sm text-[18px] text-on-surface">
            InkFlow Admin
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="font-label-md text-label-sm text-tertiary hover:underline"
          >
            Sign out
          </button>
        </div>
        <nav className="touch-scroll-x flex gap-xs px-sm pb-sm">{links}</nav>
      </div>
      {/* Spacer so content clears the fixed mobile bar */}
      <div className="md:hidden h-[104px] shrink-0" aria-hidden />
    </>
  );
}
