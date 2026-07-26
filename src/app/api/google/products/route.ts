import { googleProductCatalog } from "@/lib/google/products";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function GET(req: Request) {
  return jsonWithMobileCors(req, {
    ok: true,
    products: googleProductCatalog(),
  });
}
