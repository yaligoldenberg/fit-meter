import { rateWorkout } from "./difficulty";
import { WorkoutTypeKey } from "./workoutTypes";

/**
 * Personal records — the celebratory counterpart to the title ladder.
 *
 * Titles measure a whole week against everyone else; records measure one session against
 * your own history, which is the only comparison available to someone who is last on the
 * board but still improving. Both matter for the study's motivation question.
 */

export interface RecordWorkout {
  id: string;
  type: string;
  duration: number;
  intensity: string;
  distanceKm?: number | null;
  date: Date;
}

export interface PersonalRecords {
  /** Highest single-session effort ever. */
  hardestSession: { id: string; effort: number; type: string; date: Date } | null;
  /** Longest session by wall-clock minutes. */
  longestSession: { id: string; duration: number; type: string; date: Date } | null;
  /** Furthest single session per activity, for activities where distance is logged. */
  furthestByType: { type: WorkoutTypeKey; distanceKm: number; id: string; date: Date }[];
}

/** True when this workout set a new effort or duration record at the time it was logged. */
export function isRecordBreaking(workout: RecordWorkout, history: RecordWorkout[]): boolean {
  const earlier = history.filter((w) => w.id !== workout.id && w.date <= workout.date);
  if (earlier.length === 0) return false;

  const effort = rateWorkout(workout).effort;
  const bestEffort = Math.max(...earlier.map((w) => rateWorkout(w).effort));
  const bestDuration = Math.max(...earlier.map((w) => w.duration));

  return effort > bestEffort || workout.duration > bestDuration;
}

export function computeRecords(workouts: RecordWorkout[]): PersonalRecords {
  if (workouts.length === 0) {
    return { hardestSession: null, longestSession: null, furthestByType: [] };
  }

  let hardest = workouts[0];
  let hardestEffort = rateWorkout(workouts[0]).effort;
  let longest = workouts[0];

  const furthest = new Map<string, RecordWorkout>();

  for (const w of workouts) {
    const effort = rateWorkout(w).effort;
    if (effort > hardestEffort) {
      hardest = w;
      hardestEffort = effort;
    }
    if (w.duration > longest.duration) longest = w;

    const distance = w.distanceKm ?? 0;
    if (distance > 0) {
      const best = furthest.get(w.type);
      if (!best || distance > (best.distanceKm ?? 0)) furthest.set(w.type, w);
    }
  }

  return {
    hardestSession: { id: hardest.id, effort: hardestEffort, type: hardest.type, date: hardest.date },
    longestSession: { id: longest.id, duration: longest.duration, type: longest.type, date: longest.date },
    furthestByType: Array.from(furthest.values())
      .map((w) => ({
        type: w.type as WorkoutTypeKey,
        distanceKm: w.distanceKm ?? 0,
        id: w.id,
        date: w.date,
      }))
      .sort((a, b) => b.distanceKm - a.distanceKm),
  };
}
