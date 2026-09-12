import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { isResearcher } from "@/lib/research";

/**
 * Researcher-only password reset issuer — there's no mail provider in this study, so a
 * researcher generates a link and hands it to the participant directly (in person, over
 * chat, however). Only the SHA-256 hash of the token is ever stored: the raw token
 * exists solely in this response and in whatever channel the researcher relays it over.
 */

const schema = z.object({ username: z.string().min(1) });

export async function POST(req: NextRequest) {
  // 404, not 401 — a researcher-only endpoint shouldn't announce its own existence.
  if (!isResearcher(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { username: string }" }, { status: 400 });
  }

  const username = parsed.data.username.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "No user with that username" }, { status: 404 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    username: user.username,
    url: `${origin}/reset?token=${token}`,
    expiresAt,
  });
}
