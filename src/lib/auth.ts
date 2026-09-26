import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "fitmeter_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-secret");

export interface SessionPayload {
  userId: string;
  username: string;
  /**
   * The user's sessionVersion when the token was issued. Bumping the column (on a
   * password reset) invalidates every token signed before it.
   */
  sv: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string" && typeof payload.username === "string") {
      // Tokens issued before sessionVersion existed carry no `sv`; they count as version
      // 0, the column's default, so the deploy that added it didn't sign everyone out.
      const sv = typeof payload.sv === "number" ? payload.sv : 0;
      return { userId: payload.userId, username: payload.username, sv };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user, or null. Unlike the edge middleware, which only checks the
 * signature, this also confirms the user still exists and the token hasn't been revoked
 * by a sessionVersion bump.
 */
/**
 * The signed-in session, or null. Memoised per request with React's cache(): the root
 * layout, getAudience and the page itself all ask, and each ask costs a DB round trip now
 * that the session version is checked against the user row.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.sv) return null;
  return session;
});

/**
 * A post-login destination from `?next=`, or null. Only same-site relative paths pass:
 * "//host" and "/\host" are protocol-relative to browsers and would leave the site.
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;
  return next;
}

/** Cookie options for the session token, shared by every route that signs someone in. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;
