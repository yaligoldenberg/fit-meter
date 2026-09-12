import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { membershipOf } from "@/lib/groups";

/**
 * Leave the group.
 *
 * An owner who leaves hands the group to whoever has been in it longest, rather than
 * taking everyone else's leaderboard down with them. If they were the last one in it,
 * there is nobody to hand it to and the group goes.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const membership = await membershipOf(params.id, session.userId);
  if (!membership) return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.delete({
      where: { groupId_userId: { groupId: params.id, userId: session.userId } },
    });

    if (!membership.isOwner) return;

    const heir = await tx.groupMember.findFirst({
      where: { groupId: params.id },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });

    if (heir) {
      await tx.group.update({ where: { id: params.id }, data: { ownerId: heir.userId } });
    } else {
      await tx.group.delete({ where: { id: params.id } });
    }
  });

  return NextResponse.json({ ok: true });
}
