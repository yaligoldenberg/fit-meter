import {
  WorkoutTypeKey,
  IntensityKey,
  WORKOUT_TYPES,
  INTENSITIES,
  typeLabel,
  intensityLabel,
} from "./workoutTypes";

/**
 * Per-workout difficulty engine.
 *
 * Every session is converted to MET-minutes — metabolic equivalents multiplied by
 * duration — which is the standard way exercise physiology compares unlike activities.
 * One MET is resting metabolism, so a 10-MET effort burns ten times that rate.
 *
 * This is what lets the app say a 20K run is harder than a gym session which is harder
 * than a short interval set, without hand-tuning a weight per activity: the numbers fall
 * out of pace and duration. When distance is logged for a distance-based activity we
 * derive METs from actual speed; otherwise we fall back on the logged intensity.
 *
 * MET values follow the Compendium of Physical Activities (Ainsworth et al., 2011).
 */

export interface RateableWorkout {
  type: string;
  duration: number;
  intensity: string;
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
  /** Where the METs came from, so the UI can explain the number. */
  basis: "pace" | "intensity";
  /** Speed in km/h when distance was logged, else null. */
  speedKmh: number | null;
}

/**
 * METs by logged intensity, used when there's no distance to derive pace from.
 *
 * LOW is the recreational/technique end of each activity, MEDIUM a normal session,
 * HIGH competitive or all-out. Adding an activity means adding one row here plus a
 * label in workoutTypes — nothing else in the app needs to change.
 */
const TYPE_METS: Record<WorkoutTypeKey, Record<IntensityKey, number>> = {
  RUNNING: { LOW: 7.0, MEDIUM: 9.8, HIGH: 12.8 },
  CYCLING: { LOW: 5.8, MEDIUM: 8.0, HIGH: 12.0 },
  SWIMMING: { LOW: 5.8, MEDIUM: 8.3, HIGH: 10.3 },
  WALKING: { LOW: 3.0, MEDIUM: 3.8, HIGH: 5.0 },
  // Hiking scales with terrain and pack weight rather than speed.
  HIKING: { LOW: 4.5, MEDIUM: 5.3, HIGH: 7.8 },
  STRENGTH: { LOW: 3.5, MEDIUM: 5.0, HIGH: 6.0 },
  CROSSFIT: { LOW: 5.0, MEDIUM: 7.5, HIGH: 9.0 },
  HIIT: { LOW: 6.0, MEDIUM: 8.0, HIGH: 10.0 },
  ROWING: { LOW: 4.8, MEDIUM: 7.0, HIGH: 8.5 },
  ELLIPTICAL: { LOW: 4.6, MEDIUM: 5.0, HIGH: 7.0 },
  YOGA: { LOW: 2.3, MEDIUM: 3.0, HIGH: 4.0 },
  // Pilates sits just above yoga — controlled, but constant core load.
  PILATES: { LOW: 2.5, MEDIUM: 3.2, HIGH: 4.5 },
  // Racquet sports: doubles/social at the low end, singles match play at the top.
  TENNIS: { LOW: 5.0, MEDIUM: 7.3, HIGH: 8.5 },
  PADEL: { LOW: 4.8, MEDIUM: 6.5, HIGH: 8.0 },
  SOCCER: { LOW: 6.0, MEDIUM: 7.0, HIGH: 10.0 },
  BASKETBALL: { LOW: 4.5, MEDIUM: 6.5, HIGH: 8.0 },
  CLIMBING: { LOW: 5.0, MEDIUM: 7.5, HIGH: 9.0 },
  // Bag work through to full sparring.
  BOXING: { LOW: 5.5, MEDIUM: 7.8, HIGH: 12.8 },
  MARTIAL_ARTS: { LOW: 5.3, MEDIUM: 7.8, HIGH: 10.3 },
  DANCE: { LOW: 3.5, MEDIUM: 5.0, HIGH: 7.8 },
  SPORT: { LOW: 5.0, MEDIUM: 7.0, HIGH: 10.0 },
  OTHER: { LOW: 3.5, MEDIUM: 5.0, HIGH: 7.0 },
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

/** Scores a single workout. Same inputs always give the same rating — no user history involved. */
export function rateWorkout(w: RateableWorkout): WorkoutRating {
  const type = (w.type in TYPE_METS ? w.type : "OTHER") as WorkoutTypeKey;
  const intensity = (w.intensity in TYPE_METS[type] ? w.intensity : "MEDIUM") as IntensityKey;
  const duration = Math.max(0, w.duration);

  const paceTable = PACE_METS[type];
  const distance = w.distanceKm ?? 0;
  const canUsePace = !!paceTable && distance > 0 && duration > 0;

  let mets: number;
  let basis: "pace" | "intensity";
  let speedKmh: number | null = null;

  if (canUsePace) {
    speedKmh = distance / (duration / 60);
    mets = interpolate(paceTable!, speedKmh);
    basis = "pace";
  } else {
    mets = TYPE_METS[type][intensity];
    basis = "intensity";
  }

  mets = Math.min(MET_CEILING, Math.max(MET_FLOOR, mets));
  const effort = mets * duration * enduranceMultiplier(duration);

  return {
    effort: Math.round(effort),
    mets: Math.round(mets * 10) / 10,
    rating: Math.round(Math.min(10, effort / 100) * 10) / 10,
    tier: tierFor(effort),
    basis,
    speedKmh: speedKmh === null ? null : Math.round(speedKmh * 10) / 10,
  };
}

/** One-line explanation of why a workout scored what it did, for tooltips and detail rows. */
export function explainRating(
  w: RateableWorkout,
  rating: WorkoutRating,
  locale: "he" | "en" = "en"
): string {
  const typeKey = (w.type in WORKOUT_TYPES ? w.type : "OTHER") as WorkoutTypeKey;
  const intensityKey = (w.intensity in INTENSITIES ? w.intensity : "MEDIUM") as IntensityKey;
  const activity = typeLabel(typeKey, locale);
  const byPace = rating.basis === "pace" && rating.speedKmh !== null;

  if (locale === "he") {
    const how = byPace
      ? `בקצב ${rating.speedKmh} קמ"ש`
      : `בעצימות ${intensityLabel(intensityKey, "he")}`;
    return `${w.duration} דק׳ ${activity} ${how} ≈ ${rating.mets} METs ← ${rating.effort} מאמץ`;
  }

  const how = byPace
    ? `at ${rating.speedKmh} km/h`
    : `${INTENSITIES[intensityKey].label.toLowerCase()} effort`;
  return `${w.duration} min of ${activity.toLowerCase()} ${how} ≈ ${rating.mets} METs → ${rating.effort} effort`;
}
