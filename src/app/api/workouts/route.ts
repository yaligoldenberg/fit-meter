import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { WORKOUT_TYPE_ORDER } from "@/lib/workoutTypes";
import { rateWorkout } from "@/lib/difficulty";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";

/**
 * Only facts are accepted. Intensity is absent on purpose and zod strips it if a client
 * sends one anyway — difficulty is the server's to decide, so there is no field here for
 * anyone to inflate.
 */
const schema = z.object({
  type: z.enum(WORKOUT_TYPE_ORDER as [string, ...string[]]),
  duration: z.number().int().min(1).max(600),
  distanceKm: z.number().min(0).max(1000).nullable().optional(),
  note: z.string().max(280).optional(),
  date: z.string(),
});

/** How recently an identical workout must have been saved to count as the same save. */
const DUPLICATE_WINDOW_MS = 10_000;

export async function GET() {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const workouts = await prisma.workout.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    take: 500,
  });
  return NextResponse.json({ workouts });
}

export async function POST(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("invalid_input", locale) }, { status: 400 });
  }
  const { type, duration, distanceKm, note, date } = parsed.data;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: apiError("invalid_date", locale) }, { status: 400 });
  }

  // Derived here rather than taken from the request, and stored alongside the facts it
  // came from so queries and the research export can read it without re-rating.
  const { intensity } = rateWorkout({ type, duration, distanceKm });

  const data = {
    userId: session.userId,
    type,
    duration,
    intensity,
    distanceKm: distanceKm ?? null,
    note: note || null,
    date: parsedDate,
  };

  // An identical workout saved moments ago is the same save arriving twice — a double
  // tap, or Save pressed again because the form still showed the same sport and date.
  // The database has bursts of these, up to ten copies half a second apart, and each one
  // counted towards the score. The advisory lock serialises one user's saves so two
  // requests can't both miss each other's row; the second gets the first's workout back.
  const { workout, created } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.userId}))`;
    const duplicate = await tx.workout.findFirst({
      where: { ...data, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
      orderBy: { createdAt: "desc" },
    });
    if (duplicate) return { workout: duplicate, created: false };
    return { workout: await tx.workout.create({ data }), created: true };
  });
  return NextResponse.json({ workout }, { status: created ? 201 : 200 });
}
