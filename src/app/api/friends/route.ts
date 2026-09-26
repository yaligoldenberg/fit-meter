import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";

const userSelect = { id: true, username: true, displayName: true } as const;

export async function GET() {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const relations = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: session.userId }, { addresseeId: session.userId }] },
    include: { requester: { select: userSelect }, addressee: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const r of relations) {
    const isRequester = r.requesterId === session.userId;
    const other = isRequester ? r.addressee : r.requester;
    if (r.status === "ACCEPTED") {
      friends.push({ friendshipId: r.id, ...other });
    } else if (r.status === "PENDING" && isRequester) {
      outgoing.push({ friendshipId: r.id, ...other });
    } else if (r.status === "PENDING" && !isRequester) {
      incoming.push({ friendshipId: r.id, ...other });
    }
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

const schema = z.object({ username: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: apiError("username_missing", locale) }, { status: 400 });

  const targetUsername = parsed.data.username.toLowerCase().trim().replace(/^@/, "");
  const target = await prisma.user.findUnique({ where: { username: targetUsername } });
  if (!target) return NextResponse.json({ error: apiError("no_such_user", locale) }, { status: 404 });

  // By id, not username: the username in the session token goes stale after a rename.
  if (target.id === session.userId) {
    return NextResponse.json({ error: apiError("cannot_add_self", locale) }, { status: 400 });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: session.userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: apiError("already_friends", locale) }, { status: 409 });
    }
    if (existing.requesterId === session.userId) {
      return NextResponse.json({ error: apiError("request_already_sent", locale) }, { status: 409 });
    }
    // They already requested us — auto-accept.
    const updated = await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED" },
    });
    return NextResponse.json({ friendship: updated, autoAccepted: true });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: session.userId, addresseeId: target.id, status: "PENDING" },
  });
  return NextResponse.json({ friendship }, { status: 201 });
}
