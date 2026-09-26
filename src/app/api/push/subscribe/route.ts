import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { isPushEndpoint, MAX_SUBSCRIPTIONS_PER_USER } from "@/lib/push";

// The shape PushSubscription.toJSON() produces in the browser. The endpoint is where the
// server will POST each morning, so only the browser vendors' push services are accepted.
const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048).refine(isPushEndpoint),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url().max(2048) });

/** Save this browser's push subscription for the signed-in user. */
export async function POST(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  const { endpoint, keys } = parsed.data;

  // Keyed on the endpoint, not the user: a shared laptop that someone else signs in on
  // should notify the person using it now, not the one who subscribed it first.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: session.userId },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.userId },
  });

  // Cap each person's browsers, dropping the oldest — never the one being saved right now.
  const stale = await prisma.pushSubscription.findMany({
    where: { userId: session.userId, endpoint: { not: endpoint } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: MAX_SUBSCRIPTIONS_PER_USER - 1,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
  return NextResponse.json({ ok: true });
}

/** Forget this browser's subscription. */
export async function DELETE(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const parsed = unsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: session.userId },
  });
  return NextResponse.json({ ok: true });
}
