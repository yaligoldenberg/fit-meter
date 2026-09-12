import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import {
  normalizeJoinCode,
  isWellFormedJoinCode,
  MAX_GROUP_MEMBERS,
  MAX_GROUPS_PER_USER,
} from "@/lib/groups";

const schema = z.object({ code: z.string().min(1).max(32) });

export async function POST(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("group_code_invalid", locale) }, { status: 400 });
  }

  const code = normalizeJoinCode(parsed.data.code);
  if (!isWellFormedJoinCode(code)) {
    return NextResponse.json({ error: apiError("group_code_invalid", locale) }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true, _count: { select: { members: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: apiError("group_not_found", locale) }, { status: 404 });
  }

  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.userId } },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json({ error: apiError("group_already_member", locale) }, { status: 409 });
  }

  if (group._count.members >= MAX_GROUP_MEMBERS) {
    return NextResponse.json({ error: apiError("group_full", locale) }, { status: 409 });
  }

  const mine = await prisma.groupMember.count({ where: { userId: session.userId } });
  if (mine >= MAX_GROUPS_PER_USER) {
    return NextResponse.json({ error: apiError("group_limit_reached", locale) }, { status: 400 });
  }

  try {
    await prisma.groupMember.create({ data: { groupId: group.id, userId: session.userId } });
  } catch (e) {
    // Two taps on the same button race past the check above; the unique constraint is
    // the real arbiter, and arriving twice at a group you're in is not an error.
    if ((e as { code?: string })?.code !== "P2002") throw e;
  }

  return NextResponse.json({ id: group.id, name: group.name });
}
