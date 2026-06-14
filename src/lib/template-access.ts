import { NextResponse } from "next/server";
import { isPremiumBase, type ArtistBaseId } from "@/lib/signature";
import { isTemplateUnlocked } from "@/lib/template-unlocks-db";

export async function premiumAccessResponse(
  userId: string,
  baseId: ArtistBaseId,
) {
  if (!isPremiumBase(baseId)) return null;
  const allowed = await isTemplateUnlocked(userId, baseId);
  if (allowed) return null;
  return NextResponse.json(
    {
      error: "Unlock this premium template before exporting or saving.",
      code: "TEMPLATE_LOCKED",
    },
    { status: 403 },
  );
}
