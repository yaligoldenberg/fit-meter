import { z } from "zod";

/**
 * What a username and display name may look like. Shared by registration and the profile
 * editor so an account can never be renamed into something it couldn't have signed up with.
 * Usernames are stored lowercased; the case-insensitive regex just accepts either on input.
 */
export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only");

export const displayNameSchema = z.string().min(1).max(40);

/** The unique-constraint violation Prisma raises, with the columns it hit — or null. */
export function uniqueViolationTarget(e: unknown): string[] | null {
  const err = e as { code?: string; meta?: { target?: string[] } };
  return err?.code === "P2002" ? err.meta?.target ?? [] : null;
}
