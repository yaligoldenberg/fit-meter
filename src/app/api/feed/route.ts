import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { viewFor, recordEvent } from "@/lib/research";
import { rateWorkout } from "@/lib/difficulty";

/**
 * Friends' recent workouts, newest first.
 *
 * This is a social feature: SCORE_ONLY and LOG_ONLY participants must never see
 * friends' activity, or the control arms are contaminated. Gated the same way as
 * /api/leaderboard, via `viewFor(condition).showLeaderboard`.
 */

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const ownerSelect = { id: true, displayName: true, username: true, gender: true } as const;

export async function GET(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { condition: true },
  });
  if (!me || !viewFor(me.condition).showLeaderboard) {
    // Same message and shape as a plain 401 — SCORE_ONLY/LOG_ONLY get no signal that a
    // feed exists at all, just as they get no leaderboard link in the UI.
    return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 403 });
  }

  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : DEFAULT_LIMIT)
  );

  const beforeParam = req.nextUrl.searchParams.get("before");
  let before: Date | null = null;
  if (beforeParam) {
    before = new Date(beforeParam);
    if (Number.isNaN(before.getTime())) {
      return NextResponse.json({ error: apiError("invalid_date", locale) }, { status: 400 });
    }
  }

  // Resolve ACCEPTED friendships both directions in one query — same approach as
  // /api/leaderboard. Never fan out into one query per friend.
  const relations = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: session.userId }, { addresseeId: session.userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const friendIds = relations.map((r) =>
    r.requesterId === session.userId ? r.addresseeId : r.requesterId
  );
  const ids = Array.from(new Set([session.userId, ...friendIds]));

  // One query for me + every friend's workouts, newest first.
  const workouts = await prisma.workout.findMany({
    where: {
      userId: { in: ids },
      ...(before ? { date: { lt: before } } : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: { user: { select: ownerSelect } },
  });

  const workoutIds = workouts.map((w) => w.id);

  // One query for every reaction on the returned page — grouped in memory below,
  // instead of a query per workout.
  const reactions = workoutIds.length
    ? await prisma.reaction.findMany({
        where: { workoutId: { in: workoutIds } },
        select: { workoutId: true, userId: true, emoji: true },
      })
    : [];

  const reactionsByWorkout = new Map<string, { userId: string; emoji: string }[]>();
  for (const r of reactions) {
    const list = reactionsByWorkout.get(r.workoutId);
    if (list) list.push(r);
    else reactionsByWorkout.set(r.workoutId, [r]);
  }

  const items = workouts.map((w) => {
    const forThis = reactionsByWorkout.get(w.id) ?? [];
    const mine = forThis.find((r) => r.userId === session.userId);
    const emojis = Array.from(new Set(forThis.map((r) => r.emoji)));
    const rating = rateWorkout(w);

    return {
      id: w.id,
      type: w.type,
      duration: w.duration,
      intensity: w.intensity,
      distanceKm: w.distanceKm,
      note: w.note,
      date: w.date.toISOString(),
      user: w.user,
      rating: { effort: rating.effort, tier: rating.tier, rating: rating.rating },
      reactionCount: forThis.length,
      emojis,
      myReaction: mine?.emoji ?? null,
    };
  });

  // Research telemetry: what the participant saw, not just what they logged.
  await recordEvent(session.userId, "FEED_VIEW", { count: items.length });

  const last = workouts[workouts.length - 1];
  const nextCursor = items.length === limit && last ? last.date.toISOString() : null;

  return NextResponse.json({ items, nextCursor });
}
