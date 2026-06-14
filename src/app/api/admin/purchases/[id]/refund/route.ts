import { NextResponse } from "next/server";
import { requireAdmin, verifyAdminPassword } from "@/lib/auth/admin";
import { refundPurchase } from "@/lib/billing/refund";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const adminPassword = req.headers.get("x-admin-password") ?? "";
  if (!adminPassword) {
    return NextResponse.json(
      { error: "X-Admin-Password header required.", code: "PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  const valid = await verifyAdminPassword(admin.user.id, adminPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid admin password.", code: "INVALID_PASSWORD" },
      { status: 403 },
    );
  }

  let body: { amountCents?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = await refundPurchase({
    purchaseId: params.id,
    amountCents: body.amountCents,
    reason: body.reason,
    operatorId: admin.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, refundId: result.refundId });
}
