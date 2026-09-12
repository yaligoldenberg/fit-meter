import { WindowScoreResult, WINDOW_TARGET_EFFORT } from "./scoring";

/**
 * Self-set weekly targets, measured over the same rolling 7-day window as the score.
 *
 * Three shapes because people think about training differently: some count sessions,
 * some count days, and some think in load. All three are read off the window result
 * that has already been computed, so a goal costs no extra queries.
 */

export type GoalType = "WORKOUTS" | "DAYS" | "EFFORT";

export const GOAL_TYPES: GoalType[] = ["WORKOUTS", "DAYS", "EFFORT"];

export function isGoalType(value: unknown): value is GoalType {
  return value === "WORKOUTS" || value === "DAYS" || value === "EFFORT";
}

/** Sensible bounds so a typo can't create an unreachable or meaningless target. */
export const GOAL_LIMITS: Record<GoalType, { min: number; max: number; step: number; suggested: number }> = {
  WORKOUTS: { min: 1, max: 21, step: 1, suggested: 4 },
  DAYS: { min: 1, max: 7, step: 1, suggested: 4 },
  EFFORT: { min: 100, max: 5000, step: 100, suggested: WINDOW_TARGET_EFFORT },
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

export function goalProgress(
  type: GoalType,
  target: number,
  result: WindowScoreResult
): GoalProgress {
  const current =
    type === "WORKOUTS" ? result.workoutCount : type === "DAYS" ? result.activeDays : result.effort;

  const safeTarget = Math.max(1, target);
  return {
    type,
    target: safeTarget,
    current,
    percent: Math.min(100, Math.round((current / safeTarget) * 100)),
    met: current >= safeTarget,
    remaining: Math.max(0, safeTarget - current),
  };
}
