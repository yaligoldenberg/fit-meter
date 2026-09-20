import { WorkoutTypeKey, IntensityKey, WORKOUT_TYPES, typeLabel } from "./workoutTypes";

/**
 * Per-workout difficulty engine.
 *
 * Every session is converted to MET-minutes — metabolic equivalents multiplied by
 * duration — which is the standard way exercise physiology compares unlike activities.
 * One MET is resting metabolism, so a 10-MET effort burns ten times that rate.
 *
 * This is what lets the app say a 20K run is harder than a gym session which is harder
 * than a short interval set, without hand-tuning a weight per activity: the numbers fall
 * out of pace and duration.
 *
 * Nothing here is self-reported. The app never asks how hard a session felt, because the
 * answer is both unverifiable and unevenly given: two people doing the identical session
 * will rate it differently, some inflate it, and a score built on it is neither fair nor
 * comparable across the leaderboard. Difficulty comes from what can be checked instead —
 * the activity, how long it lasted, and, where it means something, how fast it was
 * covered. The same inputs always produce the same number, for everybody.
 *
 * MET values follow the Compendium of Physical Activities (Ainsworth et al., 2011).
 */

export interface RateableWorkout {
  type: string;
  duration: number;
  distanceKm?: number | null;
}

export type DifficultyTier = "LIGHT" | "MODERATE" | "HARD" | "BRUTAL" | "EPIC";

export interface WorkoutRating {
  /** MET-minutes — the raw difficulty currency the weekly score adds up. */
  effort: number;
  /** Metabolic equivalents sustained during the session. */
  mets: number;
  /** 0–10 headline number for display. */
  rating: number;
  tier: DifficultyTier;
  /**
   * The intensity band the engine *derived* for this session. Never an input — it exists
   * so the UI can put a familiar word next to the number.
   */
  intensity: IntensityKey;
  /** Where the METs came from, so the UI can explain the number. */
  basis: "pace" | "typical";
  /** Speed in km/h when a usable distance was logged, else null. */
  speedKmh: number | null;
}

/**
 * The MET map: what each activity costs, per minute, before duration is applied.
 *
 * `typical` is the one that does the work — it's what a session of this activity is
 * assumed to cost when there's no pace to measure, and it's deliberately a single fixed
 * number so that an hour of strength work is worth exactly an hour of strength work no
 * matter who logs it.
 *
 * `easy` and `hard` are not alternatives to it. They're the reference points the engine
 * measures a pace-derived MET value against when it labels a session Easy / Moderate /
 * All-out, and they mark the recreational and competitive ends of the activity.
 *
 * Adding an activity means adding one row here plus a label in workoutTypes — nothing
 * else in the app needs to change.
 */
const ACTIVITY_METS: Record<WorkoutTypeKey, { easy: number; typical: number; hard: number }> = {
  RUNNING: { easy: 7.0, typical: 9.8, hard: 12.8 },
  CYCLING: { easy: 5.8, typical: 8.0, hard: 12.0 },
  SWIMMING: { easy: 5.8, typical: 8.3, hard: 10.3 },
  WALKING: { easy: 3.0, typical: 3.8, hard: 5.0 },
  // Hiking scales with terrain and pack weight rather than speed.
  HIKING: { easy: 4.5, typical: 5.3, hard: 7.8 },
  STRENGTH: { easy: 3.5, typical: 5.0, hard: 6.0 },
  CROSSFIT: { easy: 5.0, typical: 7.5, hard: 9.0 },
  HIIT: { easy: 6.0, typical: 8.0, hard: 10.0 },
  ROWING: { easy: 4.8, typical: 7.0, hard: 8.5 },
  ELLIPTICAL: { easy: 4.6, typical: 5.0, hard: 7.0 },
  YOGA: { easy: 2.3, typical: 3.0, hard: 4.0 },
  // Pilates sits just above yoga — controlled, but constant core load.
  PILATES: { easy: 2.5, typical: 3.2, hard: 4.5 },
  // Racquet sports: doubles/social at the low end, singles match play at the top.
  TENNIS: { easy: 5.0, typical: 7.3, hard: 8.5 },
  PADEL: { easy: 4.8, typical: 6.5, hard: 8.0 },
  SOCCER: { easy: 6.0, typical: 7.0, hard: 10.0 },
  BASKETBALL: { easy: 4.5, typical: 6.5, hard: 8.0 },
  CLIMBING: { easy: 5.0, typical: 7.5, hard: 9.0 },
  // Bag work through to full sparring.
  BOXING: { easy: 5.5, typical: 7.8, hard: 12.8 },
  MARTIAL_ARTS: { easy: 5.3, typical: 7.8, hard: 10.3 },
  DANCE: { easy: 3.5, typical: 5.0, hard: 7.8 },
  SPORT: { easy: 5.0, typical: 7.0, hard: 10.0 },
  OTHER: { easy: 3.5, typical: 5.0, hard: 7.0 },
};

/** Speed (km/h) → METs, interpolated between points. Only for activities where pace is meaningful. */
const PACE_METS: Partial<Record<WorkoutTypeKey, [number, number][]>> = {
  RUNNING: [
    [6.4, 6.0],
    [8.0, 8.3],
    [9.7, 9.8],
    [11.3, 11.0],
    [12.9, 11.8],
    [14.5, 12.8],
    [16.1, 14.5],
    [17.7, 16.0],
  ],
  CYCLING: [
    [16.0, 6.8],
    [19.3, 8.0],
    [22.5, 10.0],
    [25.7, 12.0],
    [30.6, 15.8],
  ],
  SWIMMING: [
    [1.6, 5.8],
    [2.4, 8.3],
    [3.2, 9.8],
    [4.0, 10.3],
  ],
  WALKING: [
    [3.2, 2.8],
    [4.8, 3.5],
    [5.6, 4.3],
    [6.4, 5.0],
    [7.2, 7.0],
  ],
  ROWING: [
    [8.0, 4.8],
    [10.0, 7.0],
    [12.0, 8.5],
    [14.0, 12.0],
  ],
};

/**
 * Fastest speed (km/h) a person plausibly sustains for a whole logged session, a little
 * above world-record pace for each activity.
 *
 * Pace is now the only lever anyone has on their own difficulty, so it has to be the one
 * number the engine refuses to believe blindly. A session that comes back faster than
 * this is a mistyped distance or an attempt to buy METs; either way the pace is thrown
 * away and the activity's typical cost is used instead, which is never the better deal.
 */
const MAX_PLAUSIBLE_KMH: Partial<Record<WorkoutTypeKey, number>> = {
  RUNNING: 24,
  CYCLING: 60,
  SWIMMING: 8,
  WALKING: 12,
  ROWING: 20,
};

/**
 * Long sessions cost more than their minutes suggest — fatigue, fuelling and impact all
 * accumulate. Adds up to +25% for efforts past 75 minutes, reached at the 4-hour mark.
 * Tune here to change how much the app rewards endurance over frequency.
 */
const ENDURANCE = { startsAfterMinutes: 75, maxBonus: 0.25, reachesMaxAfterMinutes: 240 };

/** Sanity rails so a mistyped distance can't produce an absurd score. */
const MET_FLOOR = 2;
const MET_CEILING = 20;

/** MET-minute cutoffs for each tier label. */
const TIER_CUTOFFS: [DifficultyTier, number][] = [
  ["LIGHT", 150],
  ["MODERATE", 350],
  ["HARD", 650],
  ["BRUTAL", 1000],
];

export const TIER_META: Record<DifficultyTier, { label: string; className: string }> = {
  LIGHT: { label: "Light", className: "border-rule text-slate-light" },
  MODERATE: { label: "Moderate", className: "border-rule text-slate" },
  HARD: { label: "Hard", className: "border-ink/30 text-ink" },
  BRUTAL: { label: "Brutal", className: "border-flag-red/40 text-flag-red" },
  EPIC: { label: "Epic", className: "border-flag-red text-flag-red" },
};

function interpolate(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

function enduranceMultiplier(minutes: number): number {
  if (minutes <= ENDURANCE.startsAfterMinutes) return 1;
  const span = ENDURANCE.reachesMaxAfterMinutes - ENDURANCE.startsAfterMinutes;
  const progress = Math.min(1, (minutes - ENDURANCE.startsAfterMinutes) / span);
  return 1 + ENDURANCE.maxBonus * progress;
}

export function tierFor(effort: number): DifficultyTier {
  for (const [tier, cutoff] of TIER_CUTOFFS) {
    if (effort < cutoff) return tier;
  }
  return "EPIC";
}

/**
 * Which band a MET value falls in for its activity, splitting at the midpoints between
 * the easy, typical and hard anchors. A session rated off its typical cost always lands
 * on MEDIUM, which is the honest answer: without a pace there is nothing to distinguish
 * it from any other session of the same activity.
 */
function bandFor(type: WorkoutTypeKey, mets: number): IntensityKey {
  const { easy, typical, hard } = ACTIVITY_METS[type];
  if (mets < (easy + typical) / 2) return "LOW";
  if (mets < (typical + hard) / 2) return "MEDIUM";
  return "HIGH";
}

/**
 * Scores a single workout from facts alone — activity, minutes, distance.
 *
 * Same inputs always give the same rating: no user history, no self-report, nothing the
 * person logging can talk up.
 */
export function rateWorkout(w: RateableWorkout): WorkoutRating {
  const type = (w.type in ACTIVITY_METS ? w.type : "OTHER") as WorkoutTypeKey;
  const duration = Math.max(0, w.duration);

  const paceTable = PACE_METS[type];
  const distance = w.distanceKm ?? 0;
  const rawSpeed = distance > 0 && duration > 0 ? distance / (duration / 60) : null;
  const plausible = rawSpeed !== null && rawSpeed <= (MAX_PLAUSIBLE_KMH[type] ?? Infinity);

  let mets: number;
  let basis: "pace" | "typical";
  let speedKmh: number | null = null;

  if (paceTable && rawSpeed !== null && plausible) {
    speedKmh = rawSpeed;
    mets = interpolate(paceTable, speedKmh);
    basis = "pace";
  } else {
    mets = ACTIVITY_METS[type].typical;
    basis = "typical";
  }

  mets = Math.min(MET_CEILING, Math.max(MET_FLOOR, mets));
  const effort = mets * duration * enduranceMultiplier(duration);

  return {
    effort: Math.round(effort),
    mets: Math.round(mets * 10) / 10,
    rating: Math.round(Math.min(10, effort / 100) * 10) / 10,
    tier: tierFor(effort),
    intensity: bandFor(type, mets),
    basis,
    speedKmh: speedKmh === null ? null : Math.round(speedKmh * 10) / 10,
  };
}

/**
 * One-line explanation of why a workout scored what it did, for tooltips and detail rows.
 * It names the inputs the engine actually used, so the number never looks arbitrary and
 * nobody has to wonder where their own rating went.
 */
export function explainRating(
  w: RateableWorkout,
  rating: WorkoutRating,
  locale: "he" | "en" = "en"
): string {
  const typeKey = (w.type in WORKOUT_TYPES ? w.type : "OTHER") as WorkoutTypeKey;
  const activity = typeLabel(typeKey, locale);
  const byPace = rating.basis === "pace" && rating.speedKmh !== null;

  if (locale === "he") {
    const how = byPace ? `בקצב ${rating.speedKmh} קמ"ש` : "לפי העומס האופייני לפעילות";
    return `${w.duration} דק׳ ${activity} ${how} ≈ ${rating.mets} METs ← ${rating.effort} מאמץ`;
  }

  const how = byPace ? `at ${rating.speedKmh} km/h` : "at the activity's typical load";
  return `${w.duration} min of ${activity.toLowerCase()} ${how} ≈ ${rating.mets} METs → ${rating.effort} effort`;
}
