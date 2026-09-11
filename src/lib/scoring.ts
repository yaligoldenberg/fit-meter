import { rateWorkout, WorkoutRating } from "./difficulty";

export interface ScorableWorkout {
  type: string;
  duration: number;
  intensity: string;
  distanceKm?: number | null;
  date: Date;
}

export interface WindowScoreResult {
  score: number;
  grade: string;
  volumePoints: number;
  consistencyPoints: number;
  varietyPoints: number;
  /** Total MET-minutes across the window — the difficulty-weighted volume. */
  effort: number;
  activeDays: number;
  distinctTypes: number;
  totalMinutes: number;
  workoutCount: number;
  /** The single hardest session in the window, for "best effort" callouts. */
  hardest: { type: string; effort: number; rating: WorkoutRating } | null;
}

/**
 * MET-minutes for full volume marks over a 7-day window. The WHO floor for health is
 * 500–1000 MET-min/week, so this sits at the top of that band: roughly 150 minutes of
 * genuinely moderate work, one long run, or a handful of hard sessions.
 */
export const WINDOW_TARGET_EFFORT = 1000;

/** Volume is 70 of the 100 points, so this much effort buys one point. */
export const EFFORT_PER_VOLUME_POINT = WINDOW_TARGET_EFFORT / 70;

/** Points awarded per active day and per extra activity type, and their caps. */
export const CONSISTENCY_PER_DAY = 4;
export const CONSISTENCY_CAP = 20;
export const VARIETY_PER_TYPE = 5;
export const VARIETY_CAP = 10;

/** How many days the rolling score looks back over, today included. */
export const WINDOW_DAYS = 7;

export function scoreWindow(workouts: ScorableWorkout[]): WindowScoreResult {
  let effort = 0;
  let totalMinutes = 0;
  const activeDays = new Set<string>();
  const types = new Set<string>();
  let hardest: WindowScoreResult["hardest"] = null;

  for (const w of workouts) {
    const rating = rateWorkout(w);
    effort += rating.effort;
    totalMinutes += w.duration;
    activeDays.add(w.date.toISOString().slice(0, 10));
    types.add(w.type);
    if (!hardest || rating.effort > hardest.effort) {
      hardest = { type: w.type, effort: rating.effort, rating };
    }
  }

  const volumePoints = Math.min(70, (effort / WINDOW_TARGET_EFFORT) * 70);
  const consistencyPoints = Math.min(CONSISTENCY_CAP, activeDays.size * CONSISTENCY_PER_DAY);
  const varietyPoints = Math.min(VARIETY_CAP, Math.max(0, types.size - 1) * VARIETY_PER_TYPE);

  const rawScore = volumePoints + consistencyPoints + varietyPoints;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    grade: gradeFor(score),
    volumePoints: Math.round(volumePoints),
    consistencyPoints: Math.round(consistencyPoints),
    varietyPoints: Math.round(varietyPoints),
    effort: Math.round(effort),
    activeDays: activeDays.size,
    distinctTypes: types.size,
    totalMinutes,
    workoutCount: workouts.length,
    hardest,
  };
}

export function gradeFor(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case "S":
      return "text-volt";
    case "A":
      return "text-volt";
    case "B":
      return "text-bone";
    case "C":
      return "text-bone";
    case "D":
      return "text-coral";
    default:
      return "text-coral";
  }
}

/**
 * The rolling 7-day window ending with the reference day, as UTC [start, end).
 *
 * Scores are always "the last 7 days" rather than "since Monday" — on a Wednesday you're
 * rated on Thursday through today, so the number never collapses at the week boundary and
 * everyone on the leaderboard is measured over the same length of time.
 *
 * `offset` steps backwards in whole 7-day blocks: -1 is the week before this one.
 */
export function trailingWindow(reference: Date, offset = 0): { start: Date; end: Date } {
  const dayStart = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate()
  );
  const day = 24 * 60 * 60 * 1000;
  const end = new Date(dayStart + day + offset * WINDOW_DAYS * day);
  const start = new Date(end.getTime() - WINDOW_DAYS * day);
  return { start, end };
}
