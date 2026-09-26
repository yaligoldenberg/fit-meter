import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, safeNextPath } from "@/lib/auth";

/**
 * Where pages send a session that is signed but no longer good — the user was deleted, or
 * a password reset bumped their sessionVersion. The edge middleware only checks the
 * signature, so it would bounce /login straight back to /dashboard, which would bounce
 * to /login again, forever. Clearing the cookie here breaks that loop.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  const location = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  // A relative Location, so the redirect can't pick up the internal host the server
  // sees behind Render's proxy.
  const res = new NextResponse(null, { status: 307, headers: { Location: location } });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
