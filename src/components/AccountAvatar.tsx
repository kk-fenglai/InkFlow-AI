"use client";

import { useSession } from "next-auth/react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "w-10 h-10 text-sm", icon: "text-[20px]" },
  md: { box: "w-16 h-16 text-xl", icon: "text-[28px]" },
  lg: { box: "w-24 h-24 text-3xl", icon: "text-[40px]" },
};

function profileInitial(name?: string | null, email?: string | null): string | null {
  const fromName = name?.trim();
  if (fromName) return fromName.charAt(0).toUpperCase();
  const fromEmail = email?.trim();
  if (fromEmail) return fromEmail.charAt(0).toUpperCase();
  return null;
}

/**
 * Profile avatar on account-related pages — initials or a person icon, no photos.
 */
export default function AccountAvatar({ size = "md", className = "" }: Props) {
  const { data: session, status } = useSession();
  const { box: sizeClass, icon: iconClass } = SIZES[size];
  const baseClass = `${sizeClass} rounded-full border-2 border-tertiary/40 bg-surface-container-high flex items-center justify-center shrink-0 ${className}`;

  if (status === "authenticated") {
    const initial = profileInitial(session?.user?.name, session?.user?.email);
    if (initial) {
      return (
        <div
          className={`${baseClass} font-headline-sm text-tertiary`}
          aria-hidden
        >
          {initial}
        </div>
      );
    }
  }

  return (
    <div
      className={`${baseClass} text-on-surface-variant`}
      aria-hidden
    >
      <span className={`material-symbols-outlined ${iconClass}`}>person</span>
    </div>
  );
}
