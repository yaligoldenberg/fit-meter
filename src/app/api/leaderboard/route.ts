import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { scoreWeek, weekBounds, shiftWeek } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekOffset = Number(req.nextUrl.searchParams.get("weekOffset") ?? "0") || 0;
  const reference = shiftWeek(new Date(), weekOffset);
  const { start, end } = weekBounds(reference);

  const relations = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: session.userId }, { addresseeId: session.userId }],
    },
    include: {
      requester: { select: { id: true, username: true, displayName: true } },
      addressee: { select: { id: true, username: true, displayName: true } },
    },
  });

  const peopleMap = new Map<string, { id: string; username: string; displayName: string }>();
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, displayName: true },
  });
  if (me) peopleMap.set(me.id, me);
  for (const r of relations) {
    const other = r.requesterId === session.userId ? r.addressee : r.requester;
    peopleMap.set(other.id, other);
  }

  const people = Array.from(peopleMap.values());

  const results = await Promise.all(
    people.map(async (person) => {
      const workouts = await prisma.workout.findMany({
        where: { userId: person.id, date: { gte: start, lt: end } },
      });
      const result = scoreWeek(workouts);
      return { ...person, isMe: person.id === session.userId, ...result };
    })
  );

  results.sort((a, b) => b.score - a.score || b.weightedMinutes - a.weightedMinutes);
  const ranked = results.map((r, i) => ({ ...r, rank: i + 1 }));

  return NextResponse.json({
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    leaderboard: ranked,
  });
}
