import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { jwtSecret } from "@/lib/jwtSecret";

const SESSION_COOKIE = "fitmeter_session";

const PROTECTED_PATHS = ["/dashboard", "/history", "/friends", "/groups", "/leaderboard", "/feed", "/ranks", "/profile"];
const AUTH_PATHS = ["/login", "/register"];

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    // A missing secret in production throws here and reads as signed out — fail closed.
    await jwtVerify(token, jwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await isAuthed(req);

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/history/:path*", "/friends/:path*", "/groups/:path*", "/leaderboard/:path*", "/feed/:path*", "/ranks/:path*", "/profile/:path*", "/login", "/register"],
};
