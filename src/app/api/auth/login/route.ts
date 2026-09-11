import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your username/email and password" }, { status: 400 });
  }
  const { identifier, password } = parsed.data;
  const id = identifier.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { username: id }] },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect username/email or password" }, { status: 401 });
  }

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
