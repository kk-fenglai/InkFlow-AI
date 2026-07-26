import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { deleteSignedDocument, getSignedDocument } from "@/lib/signed-documents";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to open your documents.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const document = await getSignedDocument(user.id, params.id);
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, document });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to manage your documents.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const removed = await deleteSignedDocument(user.id, params.id);
  if (!removed) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
