import { NextResponse } from "next/server";
import { listUnlockedTemplateIds } from "@/lib/template-unlocks-db";
import { getSessionUser } from "@/lib/session";
import {
  ARTIST_BASES,
  countTemplatesByTier,
} from "@/lib/signature";
import { CREDIT_COST } from "@/lib/constants";

export async function GET() {
  const user = await getSessionUser();
  const unlocked = user ? await listUnlockedTemplateIds(user.id) : [];

  return NextResponse.json({
    ok: true,
    templates: ARTIST_BASES.map((t) => ({
      id: t.id,
      name: t.name,
      blurb: t.blurb,
      tier: t.tier,
      category: t.category,
      previewClass: t.previewClass,
    })),
    unlocked,
    counts: {
      total: ARTIST_BASES.length,
      free: countTemplatesByTier("free"),
      premium: countTemplatesByTier("premium"),
    },
    unlockCost: CREDIT_COST.TEMPLATE_UNLOCK,
  });
}
