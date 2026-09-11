import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { WORKOUT_TYPE_ORDER } from "@/lib/workoutTypes";

const schema = z.object({
  type: z.enum(WORKOUT_TYPE_ORDER as [string, ...string[]]),
  duration: z.number().int().min(1).max(600),
  intensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  distanceKm: z.number().min(0).max(1000).nullable().optional(),
  note: z.string().max(280).optional(),
  date: z.string(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = await prisma.workout.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    take: 500,
  });
  return NextResponse.json({ workouts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { type, duration, intensity, distanceKm, note, date } = parsed.data;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const workout = await prisma.workout.create({
    data: {
      userId: session.userId,
      type,
      duration,
      intensity,
      distanceKm: distanceKm ?? null,
      note: note || null,
      date: parsedDate,
    },
  });
  return NextResponse.json({ workout }, { status: 201 });
}
