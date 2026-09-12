import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { apiError } from "@/lib/apiErrors";
import { isLocale } from "@/lib/i18n";

/**
 * Participant-facing completion of a researcher-issued password reset. The token
 * arrives raw (from the URL the researcher handed out) and is hashed here to compare
 * against the stored hash — the raw value is never persisted anywhere.
 */

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("invalid_input") }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, username: true, locale: true } } },
  });

  if (!reset) {
    return NextResponse.json({ error: apiError("reset_invalid") }, { status: 400 });
  }

  const locale = isLocale(reset.user.locale) ? reset.user.locale : "he";

  if (reset.usedAt) {
    return NextResponse.json({ error: apiError("reset_used", locale) }, { status: 400 });
  }
  if (reset.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: apiError("reset_expired", locale) }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: apiError("password_too_short", locale) }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.user.id }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  const sessionToken = await createSessionToken({ userId: reset.user.id, username: reset.user.username });
  const res = NextResponse.json({ id: reset.user.id, username: reset.user.username });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
