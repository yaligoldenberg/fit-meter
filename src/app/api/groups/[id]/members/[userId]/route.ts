import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { membershipOf } from "@/lib/groups";

/** Remove someone from the group. Owner only. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const membership = await membershipOf(params.id, session.userId);
  if (!membership) return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });
  if (!membership.isOwner) {
    return NextResponse.json({ error: apiError("group_not_owner", locale) }, { status: 403 });
  }

  // Removing yourself here would leave the group with no owner; leaving has its own
  // route, which hands the group on first.
  if (params.userId === session.userId) {
    return NextResponse.json({ error: apiError("group_cannot_remove_self", locale) }, { status: 400 });
  }

  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: params.userId } },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });

  await prisma.groupMember.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
