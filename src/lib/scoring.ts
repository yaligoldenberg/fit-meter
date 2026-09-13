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
  /** Kilometres logged in the window; workouts without a distance contribute nothing. */
  totalDistanceKm: number;
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
  let totalDistanceKm = 0;
  const activeDays = new Set<string>();
  const types = new Set<string>();
  let hardest: WindowScoreResult["hardest"] = null;

  for (const w of workouts) {
    const rating = rateWorkout(w);
    effort += rating.effort;
    totalMinutes += w.duration;
    totalDistanceKm += w.distanceKm ?? 0;
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
    // One decimal: distances are logged to the tenth, and summing floats drifts.
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
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
      return "text-signal";
    case "A":
      return "text-ink";
    case "B":
      return "text-ink";
    case "C":
      return "text-slate";
    case "D":
      return "text-flag-red";
    default:
      return "text-flag-red";
  }
}

/**
 * Time zone the study's days are measured in. Workout dates are calendar dates, so the
 * window has to agree with the participant's calendar: in UTC, "today" would end at
 * 02:00–03:00 Israeli time and a late-night session would land on the previous day,
 * quietly distorting the consistency component of everyone's score.
 */
export const STUDY_TIME_ZONE = "Asia/Jerusalem";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar date at `instant` in the study's time zone, as [year, month, day]. */
function localDateParts(instant: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  const [y, m, d] = parts.split("-").map(Number);
  return [y, m, d];
}

/**
 * The rolling 7-day window ending with the reference day, as [start, end).
 *
 * Scores are always "the last 7 days" rather than "since Monday" — on a Wednesday you're
 * rated on Thursday through today, so the number never collapses at the week boundary and
 * everyone on the leaderboard is measured over the same length of time.
 *
 * Boundaries are the UTC midnights that workout dates are stored at, but the day they
 * belong to is decided in Israeli local time.
 *
 * `offset` steps backwards in whole 7-day blocks: -1 is the week before this one.
 */
export function trailingWindow(reference: Date, offset = 0): { start: Date; end: Date } {
  const [year, month, day] = localDateParts(reference);
  const todayStart = Date.UTC(year, month - 1, day);
  const end = new Date(todayStart + DAY_MS + offset * WINDOW_DAYS * DAY_MS);
  const start = new Date(end.getTime() - WINDOW_DAYS * DAY_MS);
  return { start, end };
}
