import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const workout = await prisma.workout.findUnique({ where: { id: params.id } });
  if (!workout || workout.userId !== session.userId) {
    return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });
  }
  await prisma.workout.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
