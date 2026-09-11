import { WORKOUT_TYPES, INTENSITIES, WorkoutTypeKey, IntensityKey } from "./workoutTypes";

export interface ScorableWorkout {
  type: string;
  duration: number;
  intensity: string;
  date: Date;
}

export interface WeeklyScoreResult {
  score: number;
  grade: string;
  volumePoints: number;
  consistencyPoints: number;
  varietyPoints: number;
  weightedMinutes: number;
  activeDays: number;
  distinctTypes: number;
  totalMinutes: number;
  workoutCount: number;
}

const WEEKLY_TARGET_MINUTES = 150;

export function scoreWeek(workouts: ScorableWorkout[]): WeeklyScoreResult {
  let weightedMinutes = 0;
  let totalMinutes = 0;
  const activeDays = new Set<string>();
  const types = new Set<string>();

  for (const w of workouts) {
    const typeMeta = WORKOUT_TYPES[w.type as WorkoutTypeKey] ?? WORKOUT_TYPES.OTHER;
    const intensityMeta = INTENSITIES[w.intensity as IntensityKey] ?? INTENSITIES.MEDIUM;
    weightedMinutes += w.duration * typeMeta.weight * intensityMeta.multiplier;
    totalMinutes += w.duration;
    activeDays.add(w.date.toISOString().slice(0, 10));
    types.add(w.type);
  }

  const volumePoints = Math.min(70, (weightedMinutes / WEEKLY_TARGET_MINUTES) * 70);
  const consistencyPoints = Math.min(20, activeDays.size * 4);
  const varietyPoints = Math.min(10, Math.max(0, types.size - 1) * 5);

  const rawScore = volumePoints + consistencyPoints + varietyPoints;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    grade: gradeFor(score),
    volumePoints: Math.round(volumePoints),
    consistencyPoints: Math.round(consistencyPoints),
    varietyPoints: Math.round(varietyPoints),
    weightedMinutes: Math.round(weightedMinutes),
    activeDays: activeDays.size,
    distinctTypes: types.size,
    totalMinutes,
    workoutCount: workouts.length,
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

/** Returns the Monday 00:00 and following Monday 00:00 (exclusive) bounding a given date's ISO week. */
export function weekBounds(reference: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() + diffToMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

export function shiftWeek(reference: Date, weeks: number): Date {
  const d = new Date(reference);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}
