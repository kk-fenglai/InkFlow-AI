export type AnalyticsEvent =
  | "register"
  | "purchase_credits"
  | "unlock_template"
  | "save_signature"
  | "sign_pdf"
  | "export_svg"
  | "generate_final"
  | "onboarding_complete";

export function trackEvent(
  name: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  const payload = { name, props: props ?? {}, ts: new Date().toISOString() };

  if (process.env.NODE_ENV === "development") {
    console.info("[InkFlow analytics]", payload);
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
