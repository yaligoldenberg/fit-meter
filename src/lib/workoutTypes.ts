export type WorkoutTypeKey =
  | "RUNNING"
  | "CYCLING"
  | "SWIMMING"
  | "WALKING"
  | "HIKING"
  | "STRENGTH"
  | "CROSSFIT"
  | "HIIT"
  | "ROWING"
  | "ELLIPTICAL"
  | "YOGA"
  | "PILATES"
  | "TENNIS"
  | "PADEL"
  | "SOCCER"
  | "BASKETBALL"
  | "CLIMBING"
  | "BOXING"
  | "MARTIAL_ARTS"
  | "DANCE"
  | "SPORT"
  | "OTHER";

// Difficulty is derived from METs in ./difficulty — this table is labels and icons only.
export const WORKOUT_TYPES: Record<WorkoutTypeKey, { label: string; labelHe: string; icon: string }> = {
  RUNNING: { label: "Running", labelHe: "ריצה", icon: "▲" },
  CYCLING: { label: "Cycling", labelHe: "אופניים", icon: "●" },
  SWIMMING: { label: "Swimming", labelHe: "שחייה", icon: "≈" },
  WALKING: { label: "Walking", labelHe: "הליכה", icon: "–" },
  HIKING: { label: "Hiking", labelHe: "טיול רגלי", icon: "⛰" },
  STRENGTH: { label: "Strength", labelHe: "כוח", icon: "✦" },
  CROSSFIT: { label: "CrossFit", labelHe: "קרוספיט", icon: "◈" },
  HIIT: { label: "HIIT", labelHe: "אינטרוולים", icon: "⨯" },
  ROWING: { label: "Rowing", labelHe: "חתירה", icon: "⟷" },
  ELLIPTICAL: { label: "Elliptical", labelHe: "אליפטי", icon: "◌" },
  YOGA: { label: "Yoga", labelHe: "יוגה", icon: "○" },
  PILATES: { label: "Pilates", labelHe: "פילאטיס", icon: "◍" },
  TENNIS: { label: "Tennis", labelHe: "טניס", icon: "◐" },
  PADEL: { label: "Padel", labelHe: "פאדל", icon: "◑" },
  SOCCER: { label: "Soccer", labelHe: "כדורגל", icon: "⬢" },
  BASKETBALL: { label: "Basketball", labelHe: "כדורסל", icon: "⬣" },
  CLIMBING: { label: "Climbing", labelHe: "טיפוס", icon: "⌃" },
  BOXING: { label: "Boxing", labelHe: "אגרוף", icon: "✊" },
  MARTIAL_ARTS: { label: "Martial Arts", labelHe: "אומנויות לחימה", icon: "⚔" },
  DANCE: { label: "Dance", labelHe: "ריקוד", icon: "♪" },
  SPORT: { label: "Other Sport", labelHe: "ספורט אחר", icon: "◆" },
  OTHER: { label: "Other", labelHe: "אחר", icon: "•" },
};

export type IntensityKey = "LOW" | "MEDIUM" | "HIGH";

export const INTENSITIES: Record<IntensityKey, { label: string; labelHe: string; hint: string; hintHe: string }> = {
  LOW: { label: "Easy", labelHe: "קל", hint: "Could hold a full conversation", hintHe: "אפשר לנהל שיחה שלמה" },
  MEDIUM: { label: "Moderate", labelHe: "בינוני", hint: "Breathing hard, could talk in short sentences", hintHe: "נושמים חזק, מדברים במשפטים קצרים" },
  HIGH: { label: "All-out", labelHe: "על הפנים", hint: "Max effort, couldn't say much", hintHe: "מאמץ מקסימלי, אין אוויר לדבר" },
};

/** Order the picker shows — most commonly logged first. */
export const WORKOUT_TYPE_ORDER: WorkoutTypeKey[] = [
  "RUNNING",
  "STRENGTH",
  "CYCLING",
  "SWIMMING",
  "WALKING",
  "HIKING",
  "HIIT",
  "CROSSFIT",
  "ROWING",
  "ELLIPTICAL",
  "YOGA",
  "PILATES",
  "TENNIS",
  "PADEL",
  "SOCCER",
  "BASKETBALL",
  "CLIMBING",
  "BOXING",
  "MARTIAL_ARTS",
  "DANCE",
  "SPORT",
  "OTHER",
];

/** Activity name in the viewer's language. */
export function typeLabel(key: WorkoutTypeKey, locale: "he" | "en"): string {
  const meta = WORKOUT_TYPES[key] ?? WORKOUT_TYPES.OTHER;
  return locale === "he" ? meta.labelHe : meta.label;
}

/** Intensity name in the viewer's language. */
export function intensityLabel(key: IntensityKey, locale: "he" | "en"): string {
  const meta = INTENSITIES[key] ?? INTENSITIES.MEDIUM;
  return locale === "he" ? meta.labelHe : meta.label;
}

/** Intensity hint text in the viewer's language. */
export function intensityHint(key: IntensityKey, locale: "he" | "en"): string {
  const meta = INTENSITIES[key] ?? INTENSITIES.MEDIUM;
  return locale === "he" ? meta.hintHe : meta.hint;
}
