import { prisma } from "./db";

/**
 * Study plumbing: experimental conditions, event telemetry, and researcher auth.
 *
 * Everything here exists for the study rather than the product. Conditions must be
 * assigned before data collection starts (you cannot retroactively randomise), and
 * events must be recorded as they happen (you cannot recover a view you never logged).
 */

export type Condition = "TITLES" | "SCORE_ONLY" | "LOG_ONLY";

export const CONDITIONS: Condition[] = ["TITLES", "SCORE_ONLY", "LOG_ONLY"];

export function isCondition(value: unknown): value is Condition {
  return value === "TITLES" || value === "SCORE_ONLY" || value === "LOG_ONLY";
}

/** What each arm of the study is allowed to see. */
export interface ConditionView {
  /** Titles, the ladder and progress to the next rung. */
  showTitles: boolean;
  /** The friends leaderboard, including the nav link to it. */
  showLeaderboard: boolean;
  /** The user's own 0–100 score and its breakdown. */
  showScore: boolean;
}

/**
 * The three-arm split has been retired: every user now sees the whole app.
 *
 * The call sites still ask before rendering titles, the leaderboard or the score, so
 * restoring the study means putting the switch back here and nothing else. The
 * `condition` column is likewise left in place — still stored, no longer consulted.
 */
export function viewFor(_condition: string): ConditionView {
  return { showTitles: true, showLeaderboard: true, showScore: true };
}

/**
 * Assigns the next participant to the smallest arm, keeping the three groups balanced
 * as people trickle in. Ties break randomly so the order of arrival can't bias which
 * arm a given person lands in.
 *
 * Nothing calls this now that every user sees the full app — registration lets the
 * column fall to its schema default. Kept so the randomised design can be restored
 * without having to write it again.
 */
export async function assignCondition(): Promise<Condition> {
  const counts = await prisma.user.groupBy({ by: ["condition"], _count: { _all: true } });
  const sizeOf = (c: Condition) =>
    counts.find((row) => row.condition === c)?._count._all ?? 0;

  const smallest = Math.min(...CONDITIONS.map(sizeOf));
  const candidates = CONDITIONS.filter((c) => sizeOf(c) === smallest);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export type EventType =
  | "DASHBOARD_VIEW"
  | "LEADERBOARD_VIEW"
  | "RANKS_VIEW"
  | "HISTORY_VIEW"
  | "PROFILE_VIEW"
  | "FEED_VIEW"
  | "KUDOS_GIVEN"
  | "TITLE_CHANGE"
  | "WORKOUT_LOGGED";

/**
 * Telemetry is off unless TELEMETRY=on.
 *
 * One row per page view made Event the fastest-growing table in the schema, and the
 * database has little headroom to spare. With the arms retired there is no analysis
 * waiting on these rows, so the default is to write nothing.
 */
const TELEMETRY_ENABLED = process.env.TELEMETRY === "on";

/**
 * Records what a participant saw. Never throws: a telemetry failure must not break
 * the page the participant is trying to use.
 */
export async function recordEvent(
  userId: string,
  type: EventType,
  meta?: Record<string, unknown>
): Promise<void> {
  if (!TELEMETRY_ENABLED) return;
  try {
    await prisma.event.create({
      data: { userId, type, meta: meta ? JSON.stringify(meta) : null },
    });
  } catch {
    // Swallow — losing one event is preferable to a 500 on the dashboard.
  }
}

/**
 * Researcher-only endpoints are gated by a shared token in RESEARCH_TOKEN, supplied as
 * `Authorization: Bearer <token>` or `?token=`. Deliberately not a user role: the
 * researcher account shouldn't need to exist as a participant, and participants must
 * never be able to reach export or cohort tooling.
 */
export function isResearcher(req: Request): boolean {
  const expected = process.env.RESEARCH_TOKEN;
  if (!expected || expected.length < 16) return false;

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
  const query = new URL(req.url).searchParams.get("token");
  const supplied = bearer ?? query;
  if (!supplied || supplied.length !== expected.length) return false;

  // Constant-time compare so the token can't be guessed a character at a time.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return diff === 0;
}
