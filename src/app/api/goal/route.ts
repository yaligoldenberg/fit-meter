import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { GOAL_LIMITS, isGoalType } from "@/lib/goals";

const schema = z.object({
  type: z.enum(["WORKOUTS", "DAYS", "EFFORT"]).nullable(),
  value: z.number().int().positive().nullable(),
});

/**
 * Sets or clears the participant's self-chosen weekly target. Sending nulls clears it —
 * a goal is opt-in, and abandoning one shouldn't require a separate endpoint.
 */
export async function POST(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  }

  const { type, value } = parsed.data;

  if (type === null || value === null) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { goalType: null, goalValue: null },
    });
    return NextResponse.json({ goalType: null, goalValue: null });
  }

  if (!isGoalType(type)) {
    return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  }

  // Clamp rather than reject: a slider that snaps to a sane number beats an error toast.
  const { min, max } = GOAL_LIMITS[type];
  const clamped = Math.min(max, Math.max(min, value));

  await prisma.user.update({
    where: { id: session.userId },
    data: { goalType: type, goalValue: clamped },
  });

  return NextResponse.json({ goalType: type, goalValue: clamped });
}
