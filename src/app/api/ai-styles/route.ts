import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_PHOTO_STYLES } from "@/lib/ai-photo-styles";

// Admin uploads must show up without a redeploy — never statically bake this.
export const dynamic = "force-dynamic";

/** Public style catalog: built-in styles + active admin-uploaded styles. */
export async function GET() {
  const rows = await prisma.aiStyleAsset.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, blurb: true, updatedAt: true },
  });

  const styles = [
    ...AI_PHOTO_STYLES.map((s) => ({
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      thumb: s.thumb,
    })),
    ...rows.map((r) => ({
      id: r.id,
      name: r.name,
      blurb: r.blurb,
      thumb: `/api/ai-styles/image/${r.id}?v=${r.updatedAt.getTime()}`,
    })),
  ];

  return NextResponse.json(
    { ok: true, styles },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
