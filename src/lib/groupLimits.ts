/**
 * Group limits, kept apart from ./groups so the forms can import them.
 *
 * ./groups pulls in Prisma; anything a "use client" component imports ends up in the
 * browser bundle, so the shared constants live here on their own.
 */

export const MAX_GROUP_NAME = 40;
export const MAX_GROUPS_PER_USER = 20;
/** Enough for a class or a team; the leaderboard loads every member's week at once. */
export const MAX_GROUP_MEMBERS = 100;

/** Length of a join code, and the alphabet it is drawn from (no I/O/0/1). */
export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
