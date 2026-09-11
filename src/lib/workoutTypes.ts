export type WorkoutTypeKey =
  | "RUNNING"
  | "CYCLING"
  | "SWIMMING"
  | "WALKING"
  | "STRENGTH"
  | "HIIT"
  | "YOGA"
  | "SPORT"
  | "OTHER";

export const WORKOUT_TYPES: Record<
  WorkoutTypeKey,
  { label: string; weight: number; icon: string }
> = {
  RUNNING: { label: "Running", weight: 1.05, icon: "▲" },
  CYCLING: { label: "Cycling", weight: 0.85, icon: "●" },
  SWIMMING: { label: "Swimming", weight: 1.15, icon: "≈" },
  WALKING: { label: "Walking", weight: 0.55, icon: "–" },
  STRENGTH: { label: "Strength", weight: 1.0, icon: "✦" },
  HIIT: { label: "HIIT", weight: 1.3, icon: "⨯" },
  YOGA: { label: "Yoga / Mobility", weight: 0.6, icon: "○" },
  SPORT: { label: "Team Sport", weight: 1.1, icon: "◆" },
  OTHER: { label: "Other", weight: 0.8, icon: "•" },
};

export type IntensityKey = "LOW" | "MEDIUM" | "HIGH";

export const INTENSITIES: Record<
  IntensityKey,
  { label: string; multiplier: number; hint: string }
> = {
  LOW: { label: "Easy", multiplier: 0.7, hint: "Could hold a full conversation" },
  MEDIUM: { label: "Moderate", multiplier: 1.0, hint: "Breathing hard, could talk in short sentences" },
  HIGH: { label: "All-out", multiplier: 1.3, hint: "Max effort, couldn't say much" },
};

export const WORKOUT_TYPE_ORDER: WorkoutTypeKey[] = [
  "RUNNING",
  "CYCLING",
  "SWIMMING",
  "WALKING",
  "STRENGTH",
  "HIIT",
  "YOGA",
  "SPORT",
  "OTHER",
];
