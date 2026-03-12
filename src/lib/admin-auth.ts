import { NextRequest, NextResponse } from "next/server";

/**
 * Check if the request has a valid admin secret.
 * Checks Authorization header (Bearer <secret>) or ?admin_key= query param.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_SECRET not set" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const queryKey = req.nextUrl.searchParams.get("admin_key");

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token === secret || queryKey === secret) {
    return null; // Authorized
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
