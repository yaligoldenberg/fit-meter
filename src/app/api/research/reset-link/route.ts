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

/**
 * The public origin to put in the link. Under `next start` on Render, req.url is the
 * internal address (https://localhost:10000), so prefer an explicit APP_URL, then the
 * RENDER_EXTERNAL_URL Render sets on every web service, then the proxy's forwarded
 * headers, and only then req.url (fine for local dev).
 */
function publicOrigin(req: NextRequest): string {
  const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (host) {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

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

  const origin = publicOrigin(req);
  return NextResponse.json({
    username: user.username,
    url: `${origin}/reset?token=${token}`,
    expiresAt,
  });
}
