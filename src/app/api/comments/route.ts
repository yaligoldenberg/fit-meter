import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { viewFor } from "@/lib/research";

const MAX_COMMENT_LENGTH = 280;

const postSchema = z.object({
  workoutId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

/**
 * Comments on a workout — the same social surface as reactions, so the same rules:
 * only the arm that sees the leaderboard may read or write them, and only friends'
 * (or your own) workouts are visible.
 */
async function gate(): Promise<
  { ok: true; userId: string; locale: "he" | "en" } | { ok: false; response: NextResponse }
> {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { condition: true },
  });
  if (!user || !viewFor(user.condition).showLeaderboard) {
    return {
      ok: false,
      response: NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 403 }),
    };
  }

  return { ok: true, userId: session.userId, locale };
}

/** Workouts the user is allowed to see: their own, or an accepted friend's. */
async function canSeeWorkout(userId: string, workoutId: string): Promise<boolean> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true },
  });
  if (!workout) return false;
  if (workout.userId === userId) return true;

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: workout.userId },
        { requesterId: workout.userId, addresseeId: userId },
      ],
    },
    select: { id: true },
  });
  return friendship !== null;
}

export async function GET(req: NextRequest) {
  const auth = await gate();
  if (!auth.ok) return auth.response;

  const workoutId = req.nextUrl.searchParams.get("workoutId");
  if (!workoutId || !(await canSeeWorkout(auth.userId, workoutId))) {
    return NextResponse.json({ error: apiError("not_found", auth.locale) }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { workoutId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, displayName: true, username: true } } },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      user: c.user,
      mine: c.userId === auth.userId,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await gate();
  if (!auth.ok) return auth.response;

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("invalid_input", auth.locale) }, { status: 400 });
  }

  const { workoutId, body } = parsed.data;
  if (!(await canSeeWorkout(auth.userId, workoutId))) {
    return NextResponse.json({ error: apiError("not_found", auth.locale) }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { workoutId, userId: auth.userId, body },
    include: { user: { select: { id: true, displayName: true, username: true } } },
  });

  return NextResponse.json({
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      user: comment.user,
      mine: true,
    },
  });
}

/** Authors delete their own comments; nobody deletes anyone else's. */
export async function DELETE(req: NextRequest) {
  const auth = await gate();
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: apiError("invalid_input", auth.locale) }, { status: 400 });
  }

  const deleted = await prisma.comment.deleteMany({ where: { id, userId: auth.userId } });
  if (deleted.count === 0) {
    return NextResponse.json({ error: apiError("not_found", auth.locale) }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
