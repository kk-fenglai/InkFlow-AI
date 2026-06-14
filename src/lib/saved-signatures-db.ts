import { prisma } from "@/lib/prisma";
import type { SignatureStrokeData } from "@/lib/stroke-data";
import type { SavedSignature as ClientSavedSignature } from "@/lib/signature-library";

const MAX_SIGNATURES_PER_USER = 50;

export function parseStrokeData(raw: string): SignatureStrokeData | null {
  try {
    const parsed = JSON.parse(raw) as SignatureStrokeData;
    if (parsed?.version !== 1 || !Array.isArray(parsed.strokes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toClientSignature(row: {
  id: string;
  name: string;
  strokeData: string;
  createdAt: Date;
}): ClientSavedSignature {
  const strokeData = parseStrokeData(row.strokeData);
  if (!strokeData) {
    throw new Error("Invalid stroke data in database.");
  }
  return {
    id: row.id,
    name: row.name,
    strokeData,
    savedAt: row.createdAt.toISOString(),
    source: "cloud",
  };
}

export async function listUserSignatures(
  userId: string,
): Promise<ClientSavedSignature[]> {
  const rows = await prisma.savedSignature.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_SIGNATURES_PER_USER,
  });
  return rows.map(toClientSignature);
}

export async function createUserSignature(
  userId: string,
  name: string,
  strokeData: SignatureStrokeData,
): Promise<ClientSavedSignature> {
  const count = await prisma.savedSignature.count({ where: { userId } });
  if (count >= MAX_SIGNATURES_PER_USER) {
    throw new Error("Signature library full (50 max). Delete one to save more.");
  }

  const row = await prisma.savedSignature.create({
    data: {
      userId,
      name: name.slice(0, 60),
      strokeData: JSON.stringify(strokeData),
    },
  });
  return toClientSignature(row);
}

export async function renameUserSignature(
  userId: string,
  id: string,
  name: string,
): Promise<ClientSavedSignature | null> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return null;

  const existing = await prisma.savedSignature.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const row = await prisma.savedSignature.update({
    where: { id },
    data: { name: trimmed },
  });
  return toClientSignature(row);
}

export async function deleteUserSignature(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.savedSignature.findFirst({
    where: { id, userId },
  });
  if (!existing) return false;
  await prisma.savedSignature.delete({ where: { id } });
  return true;
}

export async function getUserSignature(
  userId: string,
  id: string,
): Promise<ClientSavedSignature | null> {
  const row = await prisma.savedSignature.findFirst({
    where: { id, userId },
  });
  if (!row) return null;
  return toClientSignature(row);
}
