import {
  WindowScoreResult,
  EFFORT_PER_VOLUME_POINT,
  CONSISTENCY_PER_DAY,
  CONSISTENCY_CAP,
  VARIETY_PER_TYPE,
  VARIETY_CAP,
} from "./scoring";
import { Locale, Gender, t, tn, DEFAULT_LOCALE } from "./i18n";

export type TitleTier = "LEGEND" | "STRONG" | "SOLID" | "LIGHT" | "RESET";

export interface WeekTitle {
  id: string;
  emoji: string;
  title: string;
  reason: string;
  tier: TitleTier;
  /** Score at which this title is earned. */
  minScore: number;
}

/** A concrete, single action that would move the user toward the next title. */
export interface TitleRoute {
  label: string;
  points: number;
}

export interface TitleProgress {
  current: WeekTitle;
  next: WeekTitle | null;
  /** Score points still needed for the next title (0 when at the top). */
  pointsToNext: number;
  /** 0–100, how far through the current band toward the next title. */
  percent: number;
  /** Ways to close the gap, best value first. */
  routes: TitleRoute[];
}

/** Who is being described: locale picks the language, gender picks the grammatical form. */
export interface TitleAudience {
  locale: Locale;
  gender: Gender | null;
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

/** [feminine, masculine] — Hebrew needs both; English mostly repeats itself. */
type Gendered = [string, string];

interface Rung {
  id: string;
  emoji: string;
  tier: TitleTier;
  minScore: number;
  title: Record<Locale, Gendered>;
  reason: Record<Locale, (r: WindowScoreResult, gender: Gender | null) => string>;
}

/**
 * The title ladder for the rolling 7-day window, lowest rung first.
 *
 * Deliberately mocking at the bottom and flattering at the top — the whole point of the
 * study is whether a name on the screen moves behaviour. Titles are earned purely on the
 * window score, which is what makes "you're N points away" answerable.
 *
 * ALL wording lives in this table. To retune the experiment, edit the strings and the
 * minScore thresholds here; nothing else in the app needs to change.
 */
const LADDER: Rung[] = [
  {
    id: "truck",
    emoji: "🚛",
    tier: "RESET",
    minScore: 0,
    title: { he: ["משאית", "טנק"], en: ["Truck", "Tank"] },
    reason: {
      he: () => "שבוע שלם בלי כלום. החברים שלך על הלוח, ואת/ה בחניה.",
      en: () => "A full week with nothing logged. Your friends are on the board. You're parked.",
    },
  },
  {
    id: "lazy",
    emoji: "🛋️",
    tier: "RESET",
    minScore: 1,
    title: { he: ["עצלנית", "עצלן"], en: ["Lazy Bum", "Lazy Bum"] },
    reason: {
      he: (r) => `${r.workoutCount} אימונים ב-7 ימים. זה בקושי נחשב.`,
      en: (r) => `${r.workoutCount} workout${r.workoutCount === 1 ? "" : "s"} in 7 days. That barely counts.`,
    },
  },
  {
    id: "waking",
    emoji: "🌱",
    tier: "LIGHT",
    minScore: 25,
    title: { he: ["מתעוררת", "מתעורר"], en: ["Waking Up", "Waking Up"] },
    reason: {
      he: (r) => `${r.effort} מאמץ ב-${r.activeDays} ימים. יש סימני חיים.`,
      en: (r) => `${r.effort} effort across ${r.activeDays} day${r.activeDays === 1 ? "" : "s"}. Signs of life.`,
    },
  },
  {
    id: "on-the-way",
    emoji: "🎯",
    tier: "SOLID",
    minScore: 42,
    title: { he: ["בדרך לשם", "בדרך לשם"], en: ["Getting There", "Getting There"] },
    reason: {
      he: (r) => `${r.activeDays} ימים פעילים, ${r.effort} מאמץ. זה כבר מתחיל להיראות כמו הרגל.`,
      en: (r) => `${r.activeDays} active days, ${r.effort} effort. Starting to look like a habit.`,
    },
  },
  {
    id: "good-looking",
    emoji: "💪",
    tier: "SOLID",
    minScore: 58,
    title: { he: ["חתיכה", "חתיך"], en: ["Looking Good", "Looking Good"] },
    reason: {
      he: (r) => `${r.score}/100. אנשים מתחילים לשים לב.`,
      en: (r) => `${r.score}/100. People are starting to notice.`,
    },
  },
  {
    id: "hottie",
    emoji: "🔥",
    tier: "STRONG",
    minScore: 72,
    title: { he: ["כוסית", "מפלצת"], en: ["Hottie", "Beast"] },
    reason: {
      he: (r) => `${r.effort} מאמץ ב-${r.activeDays} ימים. את/ה מכתיב/ה את הקצב — שירדפו אחריך.`,
      en: (r) => `${r.effort} effort over ${r.activeDays} days. You're setting the pace — make them chase it.`,
    },
  },
  {
    id: "certified",
    emoji: "⚡",
    tier: "STRONG",
    minScore: 83,
    title: { he: ["כוסית מוסמכת", "מפלצת מוסמכת"], en: ["Certified Hottie", "Certified Beast"] },
    reason: {
      he: (r) =>
        `${r.workoutCount} אימונים, ${r.distinctTypes} סוגים, ${r.effort} מאמץ. מעט מאוד שבועות נראים ככה.`,
      en: (r) =>
        `${r.workoutCount} sessions, ${r.distinctTypes} discipline${r.distinctTypes === 1 ? "" : "s"}, ${r.effort} effort. Very few weeks look like this.`,
    },
  },
  {
    id: "space",
    emoji: "🏆",
    tier: "LEGEND",
    minScore: 92,
    title: { he: ["כוסית על חלל", "מפלצת על חלל"], en: ["Hottie In Space", "Beast In Space"] },
    reason: {
      he: (r) => `${r.score}/100 על פני ${r.activeDays} ימים פעילים. זה השבוע שסוגר ויכוחים בקבוצה.`,
      en: (r) => `${r.score}/100 across ${r.activeDays} active days. This is the week that ends group chat arguments.`,
    },
  },
];

function rungFor(score: number): Rung {
  let earned = LADDER[0];
  for (const rung of LADDER) {
    if (score >= rung.minScore) earned = rung;
  }
  return earned;
}

function toTitle(rung: Rung, result: WindowScoreResult, audience: TitleAudience): WeekTitle {
  const [feminine, masculine] = rung.title[audience.locale];
  return {
    id: rung.id,
    emoji: rung.emoji,
    tier: rung.tier,
    minScore: rung.minScore,
    title: audience.gender === "F" ? feminine : masculine,
    reason: rung.reason[audience.locale](result, audience.gender),
  };
}

const FALLBACK_AUDIENCE: TitleAudience = { locale: DEFAULT_LOCALE, gender: null };

export function evaluateWeekTitle(
  result: WindowScoreResult,
  audience: TitleAudience = FALLBACK_AUDIENCE
): WeekTitle {
  return toTitle(rungFor(result.score), result, audience);
}

/** Roughly how many minutes of moderate cardio (~9.8 METs) buy a given amount of effort. */
function minutesForEffort(effort: number): number {
  return Math.max(1, Math.round(effort / 9.8));
}

/**
 * What the user needs to reach the next title, expressed in things they can actually do.
 * Routes are capped at what each component can still award, so we never suggest a fourth
 * activity type when variety is already maxed.
 */
export function titleProgress(
  result: WindowScoreResult,
  audience: TitleAudience = FALLBACK_AUDIENCE
): TitleProgress {
  const current = rungFor(result.score);
  const index = LADDER.findIndex((r) => r.id === current.id);
  const next = index < LADDER.length - 1 ? LADDER[index + 1] : null;

  if (!next) {
    return {
      current: toTitle(current, result, audience),
      next: null,
      pointsToNext: 0,
      percent: 100,
      routes: [],
    };
  }

  const pointsToNext = Math.max(1, next.minScore - result.score);
  const band = next.minScore - current.minScore;
  const percent = Math.max(0, Math.min(100, Math.round(((result.score - current.minScore) / band) * 100)));

  const routes: TitleRoute[] = [];

  const consistencyLeft = CONSISTENCY_CAP - result.consistencyPoints;
  if (consistencyLeft > 0 && result.activeDays < 7) {
    routes.push({
      label: t(audience.locale, "route_another_day"),
      points: Math.min(CONSISTENCY_PER_DAY, consistencyLeft),
    });
  }

  const varietyLeft = VARIETY_CAP - result.varietyPoints;
  if (varietyLeft > 0) {
    routes.push({
      label: t(audience.locale, "route_new_type"),
      points: Math.min(VARIETY_PER_TYPE, varietyLeft),
    });
  }

  if (result.volumePoints < 70) {
    const effortNeeded = Math.ceil(pointsToNext * EFFORT_PER_VOLUME_POINT);
    const cappedPoints = Math.min(pointsToNext, 70 - result.volumePoints);
    routes.push({
      label: tn(audience.locale, "route_cardio", minutesForEffort(effortNeeded)),
      points: Math.round(cappedPoints),
    });
  }

  routes.sort((a, b) => b.points - a.points);

  return {
    current: toTitle(current, result, audience),
    next: toTitle(next, result, audience),
    pointsToNext,
    percent,
    routes,
  };
}
