import { getAuthenticatedUser } from "@/lib/session";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonWithMobileCors(
      req,
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  return jsonWithMobileCors(req, {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      plan: user.plan,
      role: user.role,
    },
  });
}
