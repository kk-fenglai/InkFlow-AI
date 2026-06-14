import { NextResponse } from "next/server";
import {
  deleteUserSignature,
  renameUserSignature,
} from "@/lib/saved-signatures-db";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const signature = await renameUserSignature(user.id, params.id, name);
  if (!signature) {
    return NextResponse.json({ error: "Signature not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, signature });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await deleteUserSignature(user.id, params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Signature not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
