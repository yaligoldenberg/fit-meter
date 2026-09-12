import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { membershipOf, MAX_GROUP_NAME } from "@/lib/groups";

const renameSchema = z.object({
  name: z.string().trim().min(1).max(MAX_GROUP_NAME),
});

/** Rename the group. Owner only. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  // 404 rather than 403 for non-members: group ids should not be probeable.
  const membership = await membershipOf(params.id, session.userId);
  if (!membership) return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });
  if (!membership.isOwner) {
    return NextResponse.json({ error: apiError("group_not_owner", locale) }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("group_name_required", locale) }, { status: 400 });
  }

  const group = await prisma.group.update({
    where: { id: params.id },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });

  return NextResponse.json(group);
}

/** Delete the group for everyone. Owner only; memberships cascade. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const membership = await membershipOf(params.id, session.userId);
  if (!membership) return NextResponse.json({ error: apiError("not_found", locale) }, { status: 404 });
  if (!membership.isOwner) {
    return NextResponse.json({ error: apiError("group_not_owner", locale) }, { status: 403 });
  }

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
