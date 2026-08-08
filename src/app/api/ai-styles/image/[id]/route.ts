import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Serve an admin-uploaded style image. URLs are ?v=-versioned, so cache hard. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  // No `active` filter: the catalog controls visibility; the admin grid still
  // needs thumbnails for deactivated styles.
  const row = await prisma.aiStyleAsset.findUnique({
    where: { id: params.id },
    select: { image: true, mimeType: true },
  });
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(Buffer.from(row.image), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
