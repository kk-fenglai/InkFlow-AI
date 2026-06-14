"use client";

import { useSession } from "next-auth/react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-xl",
  lg: "w-24 h-24 text-3xl",
};

/**
 * Profile avatar shown only on account-related pages (login, register, account dashboard).
 * Logged-in users see initials; guests see the Stitch placeholder photo.
 */
export default function AccountAvatar({ size = "md", className = "" }: Props) {
  const { data: session, status } = useSession();
  const sizeClass = SIZES[size];

  if (status === "authenticated" && session?.user?.name) {
    const initial = session.user.name.charAt(0).toUpperCase();
    return (
      <div
        className={`${sizeClass} rounded-full border-2 border-tertiary bg-surface-container-high flex items-center justify-center font-headline-sm text-on-surface shrink-0 ${className}`}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="Studio profile"
      src="/images/avatar.png"
      className={`${sizeClass} rounded-full border border-outline-variant object-cover shrink-0 ${className}`}
    />
  );
}
