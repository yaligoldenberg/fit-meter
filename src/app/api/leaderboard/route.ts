import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { viewFor, recordEvent } from "@/lib/research";
import { trailingWindow } from "@/lib/scoring";
import { rankPeople, LeaderboardPerson, PERSON_FIELDS } from "@/lib/leaderboard";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { membershipOf } from "@/lib/groups";

export async function GET(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const weekOffset = Number(req.nextUrl.searchParams.get("weekOffset") ?? "0") || 0;
  const groupId = req.nextUrl.searchParams.get("groupId");
  // `all` ranks every account on the app; anything else keeps the friends board.
  const everyone = !groupId && req.nextUrl.searchParams.get("scope") === "all";
  const { start, end } = trailingWindow(new Date(), weekOffset);

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { ...PERSON_FIELDS, condition: true },
  });

  // Gate on the study arm, exactly like /api/feed — the page-level redirect alone would
  // leave this data one curl away for a control-arm participant, and invisibly so.
  if (!me || !viewFor(me.condition).showLeaderboard) {
    return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 403 });
  }

  const { condition: _condition, ...meRow } = me;
  const peopleMap = new Map<string, LeaderboardPerson>();
  peopleMap.set(meRow.id, meRow);

  let groupName: string | null = null;

  if (groupId) {
    // 404 for a group you are not in, so ids cannot be probed for member lists.
    const membership = await membershipOf(groupId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });
    }
    groupName = membership.group.name;

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { user: { select: PERSON_FIELDS } },
    });
    for (const m of members) peopleMap.set(m.user.id, m.user);
  } else if (everyone) {
    const users = await prisma.user.findMany({ select: PERSON_FIELDS });
    for (const u of users) peopleMap.set(u.id, u);
  } else {
    const relations = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: session.userId }, { addresseeId: session.userId }],
      },
      include: {
        requester: { select: PERSON_FIELDS },
        addressee: { select: PERSON_FIELDS },
      },
    });
    for (const r of relations) {
      const other = r.requesterId === session.userId ? r.addressee : r.requester;
      peopleMap.set(other.id, other);
    }
  }

  const people = Array.from(peopleMap.values());
  const ranked = (await rankPeople(people, { start, end })).map((r) => ({
    ...r,
    isMe: r.id === session.userId,
  }));

  await recordEvent(session.userId, "LEADERBOARD_VIEW", {
    condition: me.condition,
    source: "api",
    scope: groupId ? "group" : everyone ? "all" : "friends",
    groupId: groupId ?? undefined,
    people: ranked.length,
  });

  return NextResponse.json({
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    groupName,
    leaderboard: ranked,
  });
}
