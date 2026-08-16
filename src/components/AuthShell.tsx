import Link from "next/link";
import AccountAvatar from "@/components/AccountAvatar";

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** "admin" swaps the studio badge for a restricted-access treatment. */
  variant?: "studio" | "admin";
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  variant = "studio",
}: Props) {
  const isAdmin = variant === "admin";
  return (
    <main className="page-main">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-xl">
          <AccountAvatar size="lg" className="mb-lg" />
          {isAdmin ? (
            <span className="inline-flex items-center gap-xs px-sm py-xs bg-on-surface text-surface font-label-sm text-label-sm uppercase tracking-widest rounded mb-md">
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                lock
              </span>
              Admin Access
            </span>
          ) : (
            <span className="inline-block px-sm py-xs bg-tertiary/10 text-tertiary font-label-sm text-label-sm uppercase tracking-widest rounded border border-tertiary/20 mb-md">
              Studio Access
            </span>
          )}
          <h1 className="font-display-lg text-display-lg-mobile text-on-surface mb-sm">
            {title}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {subtitle}
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg artisan-shadow">
          {children}
        </div>

        {footer && (
          <p className="text-center font-body-md text-body-md text-on-surface-variant mt-lg">
            {footer}
          </p>
        )}

        <p className="text-center font-label-sm text-label-sm text-outline mt-xl">
          <Link href="/pricing" className="text-tertiary hover:underline underline-offset-4">
            View pricing
          </Link>
          {" · "}
          <Link href="/" className="hover:text-tertiary transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
