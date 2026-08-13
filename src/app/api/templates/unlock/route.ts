import { NextResponse } from "next/server";
import { getBase, isValidBaseId } from "@/lib/signature";

/**
 * Premium templates are free — nothing to buy. Kept so older app builds that
 * still call this endpoint get a success instead of a 404, at no credit cost.
 */
export async function POST(req: Request) {
  let body: { baseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const baseId = String(body.baseId ?? "");
  if (!isValidBaseId(baseId)) {
    return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    baseId,
    name: getBase(baseId).name,
    alreadyOwned: true,
  });
}
