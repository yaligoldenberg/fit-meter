import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAudience } from "@/lib/audience";
import { apiError } from "@/lib/apiErrors";
import { createGroup, groupsForUser, MAX_GROUP_NAME, MAX_GROUPS_PER_USER } from "@/lib/groups";

const schema = z.object({
  name: z.string().trim().min(1).max(MAX_GROUP_NAME),
});

/** Every group the caller belongs to. */
export async function GET() {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  return NextResponse.json({ groups: await groupsForUser(session.userId) });
}

export async function POST(req: NextRequest) {
  const { locale } = await getAudience();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: apiError("unauthorized", locale) }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: apiError("group_name_required", locale) }, { status: 400 });
  }

  // Counted over memberships, not ownership: twenty groups is twenty leaderboards to
  // load on the index page whether you made them or joined them.
  const existing = await prisma.groupMember.count({ where: { userId: session.userId } });
  if (existing >= MAX_GROUPS_PER_USER) {
    return NextResponse.json({ error: apiError("group_limit_reached", locale) }, { status: 400 });
  }

  const group = await createGroup(session.userId, parsed.data.name);

  return NextResponse.json(
    { id: group.id, name: group.name, joinCode: group.joinCode, memberCount: 1, isOwner: true },
    { status: 201 }
  );
}
