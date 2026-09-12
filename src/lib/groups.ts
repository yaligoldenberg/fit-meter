import { randomInt } from "crypto";
import { prisma } from "./db";
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from "./groupLimits";

/**
 * Groups: a named set of people with their own leaderboard.
 *
 * Deliberately not friendship. Friendship is mutual consent and symmetric, which is the
 * right model for "compare me to my friends" but the wrong one for a gym class, a team,
 * or a family — there, one person makes the group and everyone else joins with a code,
 * and being in it is enough to be ranked against everyone else in it.
 */

const CODE_ALPHABET = JOIN_CODE_ALPHABET;
const CODE_LENGTH = JOIN_CODE_LENGTH;

export { MAX_GROUP_NAME, MAX_GROUPS_PER_USER, MAX_GROUP_MEMBERS } from "./groupLimits";

/**
 * Codes are typed by hand, so accept what people actually send: lowercase, with the
 * spaces or dashes they add themselves.
 */
export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isWellFormedJoinCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

function randomJoinCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

export interface GroupSummary {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  isOwner: boolean;
  joinedAt: string;
}

/**
 * Creates the group and its owner's membership together — a group whose creator is not
 * in it would be invisible on their own /groups page.
 *
 * 32^6 is about a billion codes, so a collision is vanishingly unlikely, but the unique
 * constraint is the real arbiter: retry on P2002 rather than trusting the odds.
 */
export async function createGroup(ownerId: string, name: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = randomJoinCode();
    try {
      return await prisma.group.create({
        data: {
          name,
          joinCode,
          ownerId,
          members: { create: { userId: ownerId } },
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate a unique join code");
}

/** Every group the user belongs to, newest membership first. */
export async function groupsForUser(userId: string): Promise<GroupSummary[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          joinCode: true,
          ownerId: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    joinCode: m.group.joinCode,
    memberCount: m.group._count.members,
    isOwner: m.group.ownerId === userId,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

/**
 * Membership check used by every group-scoped read. Returns null rather than throwing so
 * callers can answer 404 for both "no such group" and "not yours" — a member list should
 * not be discoverable by trying ids.
 */
export async function membershipOf(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, joinCode: true, ownerId: true, createdAt: true },
  });
  if (!group) return null;

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true },
  });
  if (!member) return null;

  return { group, isOwner: group.ownerId === userId };
}
