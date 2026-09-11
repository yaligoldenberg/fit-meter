import { WeeklyScoreResult, ScorableWorkout } from "./scoring";
import { WORKOUT_TYPES, WorkoutTypeKey } from "./workoutTypes";

export type TitleTier = "LEGEND" | "STRONG" | "SOLID" | "LIGHT" | "RESET";

export interface WeekTitle {
  id: string;
  emoji: string;
  title: string;
  reason: string;
  tier: TitleTier;
}

export function tierColor(tier: TitleTier): string {
  switch (tier) {
    case "LEGEND":
      return "text-volt";
    case "STRONG":
      return "text-volt";
    case "SOLID":
      return "text-bone";
    case "LIGHT":
      return "text-bone/70";
    case "RESET":
      return "text-coral/80";
  }
}

export function tierBorder(tier: TitleTier): string {
  switch (tier) {
    case "LEGEND":
      return "border-volt/50 shadow-[0_0_30px_rgba(215,255,63,0.15)]";
    case "STRONG":
      return "border-volt/30";
    case "SOLID":
      return "border-coal-600";
    case "LIGHT":
      return "border-coal-600";
    case "RESET":
      return "border-coral/20";
  }
}

/**
 * Tunable thresholds for the weekly title engine — change these to reshape
 * what counts as an "amazing week" without touching the rule logic below.
 */
const THRESHOLDS = {
  perfectScore: 90,
  allInWorkouts: 7,
  crossTrainerTypes: 4,
  consistencyDays: 5,
  focusedTypeCount: 2,
  focusedMinWorkouts: 4,
  solidScore: 65,
};

interface RuleContext {
  result: WeeklyScoreResult;
  typeCounts: Record<string, number>;
  dominantType: WorkoutTypeKey | null;
  dominantCount: number;
}

interface Rule {
  id: string;
  tier: TitleTier;
  match: (ctx: RuleContext) => boolean;
  build: (ctx: RuleContext) => Omit<WeekTitle, "id" | "tier">;
}

// Evaluated top to bottom — first match wins, so order roughly by rarity/impressiveness.
const RULES: Rule[] = [
  {
    id: "perfect-week",
    tier: "LEGEND",
    match: ({ result }) => result.score >= THRESHOLDS.perfectScore,
    build: ({ result }) => ({
      emoji: "🏆",
      title: "Perfect Week",
      reason: `A ${result.score}/100 across ${result.activeDays} active days. This is the week that ends group chat arguments.`,
    }),
  },
  {
    id: "all-in-week",
    tier: "LEGEND",
    match: ({ result }) => result.workoutCount >= THRESHOLDS.allInWorkouts,
    build: ({ result }) => ({
      emoji: "🔥",
      title: "All In Week",
      reason: `${result.workoutCount} workouts logged in a single week. You basically lived at the gym.`,
    }),
  },
  {
    id: "cross-trainer-week",
    tier: "STRONG",
    match: ({ result }) => result.distinctTypes >= THRESHOLDS.crossTrainerTypes,
    build: ({ result }) => ({
      emoji: "🧭",
      title: "Cross-Trainer Week",
      reason: `You mixed in ${result.distinctTypes} different disciplines — nothing gets neglected on your watch.`,
    }),
  },
  {
    id: "consistency-week",
    tier: "STRONG",
    match: ({ result }) => result.activeDays >= THRESHOLDS.consistencyDays,
    build: ({ result }) => ({
      emoji: "📅",
      title: "Consistency Week",
      reason: `${result.activeDays} out of 7 days had a workout on the board. That's the habit doing the work.`,
    }),
  },
  {
    id: "type-focused-week",
    tier: "STRONG",
    match: ({ dominantCount, result }) =>
      dominantCount >= THRESHOLDS.focusedTypeCount && result.workoutCount >= THRESHOLDS.focusedMinWorkouts,
    build: ({ dominantType, dominantCount, result }) => {
      const meta = dominantType ? WORKOUT_TYPES[dominantType] : WORKOUT_TYPES.OTHER;
      return {
        emoji: meta.icon,
        title: `${meta.label}-Focused Week`,
        reason: `${result.workoutCount} workouts this week, ${dominantCount} of them ${meta.label.toLowerCase()}. Clear focus, real reps.`,
      };
    },
  },
  {
    id: "solid-week",
    tier: "SOLID",
    match: ({ result }) => result.score >= THRESHOLDS.solidScore,
    build: ({ result }) => ({
      emoji: "💪",
      title: "Solid Week",
      reason: `A dependable ${result.score}/100 — no fireworks, just steady work.`,
    }),
  },
  {
    id: "building-week",
    tier: "LIGHT",
    match: ({ result }) => result.workoutCount >= 1,
    build: ({ result }) => ({
      emoji: "🌱",
      title: "Building Week",
      reason: `${result.workoutCount} workout${result.workoutCount === 1 ? "" : "s"} logged — the base is there, now stack another one.`,
    }),
  },
  {
    id: "reset-week",
    tier: "RESET",
    match: () => true,
    build: () => ({
      emoji: "🌤️",
      title: "Reset Week",
      reason: "Nothing logged this week. Every week is a fresh start — log one session to get back on the board.",
    }),
  },
];

export function evaluateWeekTitle(result: WeeklyScoreResult, workouts: ScorableWorkout[]): WeekTitle {
  const typeCounts: Record<string, number> = {};
  for (const w of workouts) {
    typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1;
  }
  let dominantType: WorkoutTypeKey | null = null;
  let dominantCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantType = type as WorkoutTypeKey;
    }
  }

  const ctx: RuleContext = { result, typeCounts, dominantType, dominantCount };
  const rule = RULES.find((r) => r.match(ctx))!;
  return { id: rule.id, tier: rule.tier, ...rule.build(ctx) };
}
