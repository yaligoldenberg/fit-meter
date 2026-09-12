import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { viewFor, recordEvent } from "@/lib/research";

/**
 * Kudos on a friend's workout — the social loop the study is actually about.
 *
 * Gated the same way as /api/feed: SCORE_ONLY and LOG_ONLY participants must never be
 * able to react to (or discover, via a 404 vs. 403 distinction) a workout that isn't
 * already visible to them.
 */

// Small fixed allowlist — kudos, not free-text.
const ALLOWED_EMOJIS = ["🔥", "💪", "👏", "😮", "🤝"] as const;

const bodySchema = z.object({
  workoutId: z.string().min(1),
  emoji: z.enum(ALLOWED_EMOJIS),
});

async function canSeeWorkout(userId: string, ownerId: string): Promise<boolean> {
  if (ownerId === userId) return true;
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: ownerId },
        { requesterId: ownerId, addresseeId: userId },
      ],
    },
    select: { id: true },
  });
  return !!friendship;
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  }
  const { workoutId, emoji } = parsed.data;

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { id: true, userId: true },
  });
  if (!workout || !(await canSeeWorkout(session.userId, workout.userId))) {
    return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });
  }

  // Upsert on the [workoutId, userId] unique constraint: reacting again changes the
  // emoji instead of erroring.
  await prisma.reaction.upsert({
    where: { workoutId_userId: { workoutId, userId: session.userId } },
    create: { workoutId, userId: session.userId, emoji },
    update: { emoji },
  });

  const reactionCount = await prisma.reaction.count({ where: { workoutId } });

  await recordEvent(session.userId, "KUDOS_GIVEN", { workoutId, emoji });

  return NextResponse.json({ reactionCount, myReaction: emoji });
}

export async function DELETE(req: NextRequest) {
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
    return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 403 });
  }

  const workoutId = req.nextUrl.searchParams.get("workoutId");
  if (!workoutId) {
    return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  }

  // Scoped to this user's own reaction, so it's safe (and correct) to be a no-op when
  // there's nothing to delete — deleting twice must succeed both times.
  await prisma.reaction.deleteMany({ where: { workoutId, userId: session.userId } });

  const reactionCount = await prisma.reaction.count({ where: { workoutId } });

  return NextResponse.json({ reactionCount, myReaction: null });
}
