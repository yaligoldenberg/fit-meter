import { WindowScoreResult, WINDOW_TARGET_EFFORT } from "./scoring";

/**
 * Self-set weekly targets, measured over the same rolling 7-day window as the score.
 *
 * Six shapes because people think about training differently: some count sessions, some
 * count days, some count minutes or kilometres, and some think in load or in breadth.
 * Breadth matters on its own — a goal the participant picked themselves is the part that
 * supports autonomy, and one target shape for everyone quietly withdraws that choice.
 *
 * Every type is read off the window result that has already been computed, so adding a
 * goal shape costs no extra queries. That is the constraint on what belongs here: a
 * target that needs a second window ("beat last week") does not fit this model.
 */

export type GoalType = "WORKOUTS" | "DAYS" | "MINUTES" | "DISTANCE" | "EFFORT" | "VARIETY";

export const GOAL_TYPES: GoalType[] = [
  "WORKOUTS",
  "DAYS",
  "MINUTES",
  "DISTANCE",
  "EFFORT",
  "VARIETY",
];

export function isGoalType(value: unknown): value is GoalType {
  return (GOAL_TYPES as readonly unknown[]).includes(value);
}

/** Sensible bounds so a typo can't create an unreachable or meaningless target. */
export const GOAL_LIMITS: Record<GoalType, { min: number; max: number; step: number; suggested: number }> = {
  WORKOUTS: { min: 1, max: 21, step: 1, suggested: 4 },
  DAYS: { min: 1, max: 7, step: 1, suggested: 4 },
  // 150 min/week of moderate activity is the WHO floor, so it is the obvious default.
  MINUTES: { min: 10, max: 1500, step: 10, suggested: 150 },
  DISTANCE: { min: 1, max: 300, step: 1, suggested: 20 },
  EFFORT: { min: 100, max: 5000, step: 100, suggested: WINDOW_TARGET_EFFORT },
  // Variety caps at three types in the score, so a fourth adds nothing to the ladder.
  VARIETY: { min: 2, max: 7, step: 1, suggested: 3 },
};

export interface GoalProgress {
  type: GoalType;
  target: number;
  current: number;
  /** 0–100, capped. */
  percent: number;
  met: boolean;
  remaining: number;
}

/** Where each goal shape reads its progress from the already-computed window. */
function currentFor(type: GoalType, result: WindowScoreResult): number {
  switch (type) {
    case "WORKOUTS":
      return result.workoutCount;
    case "DAYS":
      return result.activeDays;
    case "MINUTES":
      return result.totalMinutes;
    case "DISTANCE":
      return result.totalDistanceKm;
    case "EFFORT":
      return result.effort;
    case "VARIETY":
      return result.distinctTypes;
  }
}

export function goalProgress(
  type: GoalType,
  target: number,
  result: WindowScoreResult
): GoalProgress {
  const current = currentFor(type, result);
  const safeTarget = Math.max(1, target);
  return {
    type,
    target: safeTarget,
    current,
    percent: Math.min(100, Math.round((current / safeTarget) * 100)),
    met: current >= safeTarget,
    remaining: Math.round(Math.max(0, safeTarget - current) * 10) / 10,
  };
}
