import { prisma } from "@/lib/prisma";
import { ARTIST_BASE_IDS } from "@/lib/signature-bases";
import {
  isPremiumBase,
  isValidBaseId,
  type ArtistBaseId,
} from "@/lib/signature";

export async function listUnlockedTemplateIds(
  userId: string,
): Promise<ArtistBaseId[]> {
  const rows = await prisma.templateUnlock.findMany({
    where: { userId },
    select: { baseId: true },
  });
  return rows
    .map((r) => r.baseId)
    .filter((id): id is ArtistBaseId => isValidBaseId(id));
}

export async function hasTemplateUnlock(
  userId: string,
  baseId: ArtistBaseId,
): Promise<boolean> {
  const row = await prisma.templateUnlock.findUnique({
    where: { userId_baseId: { userId, baseId } },
  });
  return !!row;
}

export async function isTemplateUnlocked(
  userId: string,
  baseId: ArtistBaseId,
): Promise<boolean> {
  if (!isPremiumBase(baseId)) return true;
  return hasTemplateUnlock(userId, baseId);
}

export async function unlockTemplateForUser(
  userId: string,
  baseId: ArtistBaseId,
): Promise<void> {
  if (!isValidBaseId(baseId) || !isPremiumBase(baseId)) {
    throw new Error("This template is free or invalid.");
  }

  await prisma.templateUnlock.create({
    data: { userId, baseId },
  });
}

export function assertValidPremiumBaseId(baseId: string): ArtistBaseId {
  if (!isValidBaseId(baseId)) {
    throw new Error("Invalid template.");
  }
  if (!isPremiumBase(baseId)) {
    throw new Error("This template is already free.");
  }
  return baseId;
}

export { ARTIST_BASE_IDS };
