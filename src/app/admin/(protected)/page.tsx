import { getAdminStats } from "@/lib/admin-stats";

// Server component: stats are queried in the same request that renders the
// page, instead of a second client fetch → second function invocation → second
// auth chain. The protected layout has already verified the admin session.
export default async function AdminDashboardPage() {
  let cards: { label: string; value: string }[] = [];
  let msg = "";

  try {
    const stats = await getAdminStats();
    cards = [
      { label: "Users", value: String(stats.users) },
      { label: "Completed purchases", value: String(stats.purchasesCompleted) },
      { label: "Revenue", value: `$${(stats.revenueCents / 100).toFixed(2)}` },
      { label: "Active AI styles", value: String(stats.stylesActive) },
      { label: "Refine references", value: String(stats.refsActive) },
    ];
  } catch {
    msg = "Could not load stats.";
  }

  return (
    <main className="page-main">
      <header className="mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Dashboard
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
          InkFlow platform overview
        </p>
      </header>

      {msg && (
        <p className="mb-md font-body-md text-body-md text-error">{msg}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
          >
            <p className="font-label-md text-label-sm text-on-surface-variant uppercase">
              {c.label}
            </p>
            <p className="font-headline-md text-headline-md text-on-surface mt-sm">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
