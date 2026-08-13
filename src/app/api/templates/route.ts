import { NextResponse } from "next/server";
import {
  ARTIST_BASES,
  ARTIST_BASE_IDS,
  countTemplatesByTier,
} from "@/lib/signature";

export async function GET() {
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
    // Every template is free — reported as unlocked so older clients that still
    // draw lock badges from this list show them all as available.
    unlocked: ARTIST_BASE_IDS,
    counts: {
      total: ARTIST_BASES.length,
      free: countTemplatesByTier("free"),
      premium: countTemplatesByTier("premium"),
    },
    unlockCost: 0,
  });
}
