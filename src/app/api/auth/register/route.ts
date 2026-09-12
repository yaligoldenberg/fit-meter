import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { assignCondition, recordEvent } from "@/lib/research";

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

  // Randomised here and fixed for the study — a condition cannot be assigned after
  // the fact, so every account must get one at the moment it is created.
  const condition = await assignCondition();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      displayName,
      passwordHash,
      gender,
      locale: locale ?? "he",
      condition,
    },
  });

  await recordEvent(user.id, "DASHBOARD_VIEW", { source: "registration", condition });

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
