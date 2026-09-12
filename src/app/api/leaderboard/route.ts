import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { scoreWindow, trailingWindow, ScorableWorkout } from "@/lib/scoring";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";

export async function GET(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const weekOffset = Number(req.nextUrl.searchParams.get("weekOffset") ?? "0") || 0;
  const { start, end } = trailingWindow(new Date(), weekOffset);

  const relations = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: session.userId }, { addresseeId: session.userId }],
    },
    include: {
      requester: { select: { id: true, username: true, displayName: true, gender: true } },
      addressee: { select: { id: true, username: true, displayName: true, gender: true } },
    },
  });

  const peopleMap = new Map<string, { id: string; username: string; displayName: string; gender: string | null }>();
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, displayName: true, gender: true },
  });
  if (me) peopleMap.set(me.id, me);
  for (const r of relations) {
    const other = r.requesterId === session.userId ? r.addressee : r.requester;
    peopleMap.set(other.id, other);
  }

  const people = Array.from(peopleMap.values());
  const ids = people.map((p) => p.id);

  // One query for everyone's workouts in the window instead of one per person — with the
  // DB in a different region, a per-friend round trip adds up fast on a big friend list.
  const allWorkouts = ids.length
    ? await prisma.workout.findMany({
        where: { userId: { in: ids }, date: { gte: start, lt: end } },
      })
    : [];

  const workoutsByUser = new Map<string, ScorableWorkout[]>();
  for (const w of allWorkouts) {
    const list = workoutsByUser.get(w.userId);
    if (list) list.push(w);
    else workoutsByUser.set(w.userId, [w]);
  }

  const results = people.map((person) => {
    const workouts = workoutsByUser.get(person.id) ?? [];
    const result = scoreWindow(workouts);
    return { ...person, isMe: person.id === session.userId, ...result };
  });

  results.sort((a, b) => b.score - a.score || b.effort - a.effort);
  const ranked = results.map((r, i) => ({ ...r, rank: i + 1 }));

  return NextResponse.json({
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    leaderboard: ranked,
  });
}
