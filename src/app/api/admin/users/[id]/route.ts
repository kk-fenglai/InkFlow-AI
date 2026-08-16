import { NextResponse } from "next/server";
import { requireAdmin, verifyAdminPassword } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Grant credits and/or change a user's plan. Admin session required. */
export async function PATCH(
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

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, subscriptionEnd: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "User not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  let body: { plan?: string; planDays?: number; grantCredits?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { plan, planDays, grantCredits } = body;

  if (plan !== undefined && plan !== "free" && plan !== "pro") {
    return NextResponse.json(
      { error: "plan must be 'free' or 'pro'.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  if (
    grantCredits !== undefined &&
    (!Number.isInteger(grantCredits) || grantCredits <= 0 || grantCredits > 100000)
  ) {
    return NextResponse.json(
      { error: "grantCredits must be a positive integer.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  if (plan !== undefined) {
    if (plan === "pro") {
      const days =
        Number.isInteger(planDays) && (planDays as number) > 0 ? planDays! : 30;
      // Extend from the later of now or the current expiry, so upgrading an
      // already-active subscription adds time rather than shortening it.
      const base =
        target.subscriptionEnd && target.subscriptionEnd > new Date()
          ? target.subscriptionEnd.getTime()
          : Date.now();
      await prisma.user.update({
        where: { id: target.id },
        data: {
          plan: "pro",
          subscriptionEnd: new Date(base + days * DAY_MS),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: target.id },
        data: { plan: "free", subscriptionEnd: null },
      });
    }
  }

  if (grantCredits !== undefined) {
    await addCredits(target.id, grantCredits, "admin_grant");
  }

  const updated = await prisma.user.findUnique({
    where: { id: target.id },
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      plan: true,
      role: true,
      subscriptionEnd: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}

/** Permanently delete a user and their related rows (cascade). Requires the
 *  admin's password as a second factor, mirroring the refund flow. */
export async function DELETE(
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

  if (params.id === admin.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account.", code: "SELF_DELETE" },
      { status: 400 },
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

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "User not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (target.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted here.", code: "ADMIN_TARGET" },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: target.id } });

  return NextResponse.json({ ok: true });
}
