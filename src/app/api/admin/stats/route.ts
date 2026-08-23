import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminStats } from "@/lib/admin-stats";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code },
      { status: admin.status },
    );
  }

  const stats = await getAdminStats();
  return NextResponse.json({ ok: true, stats });
}
