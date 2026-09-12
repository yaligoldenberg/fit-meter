import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { recordEvent } from "@/lib/research";
import { apiError } from "@/lib/apiErrors";

const schema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  displayName: z.string().min(1).max(40),
  password: z.string().min(6).max(72),
  gender: z.enum(["F", "M"]),
  locale: z.enum(["he", "en"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, username, displayName, password, gender, locale } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.email === email.toLowerCase() ? "Email already registered" : "Username taken" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName,
        passwordHash,
        gender,
        locale: locale ?? "he",
      },
    });
  } catch (e) {
    // Two simultaneous signups can both clear the check above; the unique constraint is
    // the real arbiter, so translate its violation instead of returning a 500.
    const target = (e as { code?: string; meta?: { target?: string[] } })?.code === "P2002"
      ? (e as { meta?: { target?: string[] } }).meta?.target ?? []
      : null;
    if (!target) throw e;
    const key = target.includes("email") ? "email_taken" : "username_taken";
    return NextResponse.json({ error: apiError(key, locale ?? "he") }, { status: 409 });
  }

  await recordEvent(user.id, "DASHBOARD_VIEW", { source: "registration" });

  const token = await createSessionToken({ userId: user.id, username: user.username });
  const res = NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
