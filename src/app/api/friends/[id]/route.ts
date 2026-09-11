import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || friendship.addresseeId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "decline") {
    await prisma.friendship.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.friendship.update({
    where: { id: params.id },
    data: { status: "ACCEPTED" },
  });
  return NextResponse.json({ friendship: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.requesterId !== session.userId && friendship.addresseeId !== session.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
