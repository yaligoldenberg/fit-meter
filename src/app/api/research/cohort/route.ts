import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isResearcher } from "@/lib/research";

/**
 * Researcher-only bulk cohort connector: turns a list of usernames into a fully
 * connected friend network, so a 100-person study cohort doesn't have to be wired up
 * by hand, one add-friend click at a time.
 *
 * Every unordered pair among the resolved usernames ends up with an ACCEPTED Friendship.
 * A pair that already has a row in EITHER direction gets no new one (the unique
 * constraint is on [requesterId, addresseeId], so an existing A→B must stop us creating
 * B→A too); if that row is still PENDING it is accepted in place instead.
 */

const schema = z.object({
  usernames: z.array(z.string().min(1)).min(2).max(100),
});

export async function POST(req: NextRequest) {
  // 404, not 401 — a researcher-only endpoint shouldn't announce its own existence.
  if (!isResearcher(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected { usernames: string[] } with 2-100 entries" },
      { status: 400 }
    );
  }

  // Usernames are stored lowercase at registration — normalise and dedupe the same way.
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of parsed.data.usernames) {
    const u = raw.trim().toLowerCase();
    if (u && !seen.has(u)) {
      seen.add(u);
      normalized.push(u);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: { username: { in: normalized } },
      select: { id: true, username: true },
    });
    const foundUsernames = new Set(users.map((u) => u.username));
    const notFound = normalized.filter((u) => !foundUsernames.has(u));
    const ids = users.map((u) => u.id).sort();

    if (ids.length < 2) {
      return { created: 0, accepted: 0, skipped: 0, notFound };
    }

    // Existing friendships (either direction) among this cohort only.
    const existing = await tx.friendship.findMany({
      where: { requesterId: { in: ids }, addresseeId: { in: ids } },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });
    const existingPairs = new Set(existing.map((f) => [f.requesterId, f.addresseeId].sort().join("::")));

    // A pending request would otherwise count as "exists" and never become a friendship.
    const pendingIds = existing.filter((f) => f.status === "PENDING").map((f) => f.id);
    const accepted =
      pendingIds.length > 0
        ? (await tx.friendship.updateMany({ where: { id: { in: pendingIds } }, data: { status: "ACCEPTED" } })).count
        : 0;

    const toCreate: { requesterId: string; addresseeId: string; status: string }[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("::");
        if (existingPairs.has(key)) continue;
        toCreate.push({ requesterId: ids[i], addresseeId: ids[j], status: "ACCEPTED" });
      }
    }

    const totalPairs = (ids.length * (ids.length - 1)) / 2;

    if (toCreate.length === 0) {
      return { created: 0, accepted, skipped: totalPairs - accepted, notFound };
    }

    const created = await tx.friendship.createMany({ data: toCreate, skipDuplicates: true });
    return { created: created.count, accepted, skipped: totalPairs - created.count - accepted, notFound };
  });

  return NextResponse.json(result);
}
