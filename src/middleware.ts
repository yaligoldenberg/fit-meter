import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "fitmeter_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-secret");

const PROTECTED_PATHS = ["/dashboard", "/history", "/friends", "/leaderboard", "/feed", "/profile"];
const AUTH_PATHS = ["/login", "/register"];

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
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
  matcher: ["/dashboard/:path*", "/history/:path*", "/friends/:path*", "/leaderboard/:path*", "/feed/:path*", "/profile/:path*", "/login", "/register"],
};
