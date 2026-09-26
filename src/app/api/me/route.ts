import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { usernameSchema, displayNameSchema, uniqueViolationTarget } from "@/lib/accountRules";

const USER_FIELDS = { id: true, username: true, displayName: true, email: true, createdAt: true } as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: USER_FIELDS,
  });
  return NextResponse.json({ user });
}

const patchSchema = z.object({
  username: z.string().optional(),
  displayName: z.string().optional(),
});

/**
 * Rename: the @username people log in with and add friends by, and/or the display name.
 * Same rules as registration (./lib/accountRules). The session token carries the
 * username, so a changed one gets a fresh cookie — otherwise the old handle would linger
 * in the token until it expired.
 */
export async function PATCH(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  }

  const data: { username?: string; displayName?: string } = {};
  if (parsed.data.displayName !== undefined) {
    const displayName = parsed.data.displayName.trim();
    if (!displayNameSchema.safeParse(displayName).success) {
      return NextResponse.json(
        { error: apiError("display_name_invalid", locale), field: "displayName" },
        { status: 400 }
      );
    }
    data.displayName = displayName;
  }
  if (parsed.data.username !== undefined) {
    const username = parsed.data.username.trim().replace(/^@/, "");
    if (!usernameSchema.safeParse(username).success) {
      return NextResponse.json(
        { error: apiError("username_invalid", locale), field: "username" },
        { status: 400 }
      );
    }
    data.username = username.toLowerCase();
  }

  const current = await prisma.user.findUnique({ where: { id: session.userId }, select: USER_FIELDS });
  if (!current) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  // Drop fields that wouldn't change anything, so an untouched username never trips the
  // uniqueness check against itself.
  if (data.username === current.username) delete data.username;
  if (data.displayName === current.displayName) delete data.displayName;
  if (!data.username && !data.displayName) return NextResponse.json({ user: current });

  if (data.username) {
    const taken = await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } });
    if (taken) {
      return NextResponse.json({ error: apiError("username_taken", locale), field: "username" }, { status: 409 });
    }
  }

  let user;
  try {
    user = await prisma.user.update({ where: { id: session.userId }, data, select: USER_FIELDS });
  } catch (e) {
    // Two people claiming the same handle at once can both pass the check above.
    if (!uniqueViolationTarget(e)) throw e;
    return NextResponse.json({ error: apiError("username_taken", locale), field: "username" }, { status: 409 });
  }

  const res = NextResponse.json({ user });
  if (data.username) {
    const token = await createSessionToken({ userId: user.id, username: user.username });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
