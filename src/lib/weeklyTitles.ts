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
  /** The rung below — what the rolling window drops them to if they coast. Null at the bottom. */
  previous: WeekTitle | null;
  /** Score points of cushion before falling to `previous`. Null at the bottom. */
  pointsToDrop: number | null;
  /** Whether that cushion is thin enough to be worth telling them about. */
  atRisk: boolean;
}

/** Who is being described: locale picks the language, gender picks the grammatical form. */
export interface TitleAudience {
  locale: Locale;
  gender: Gender | null;
}

/**
 * What to compare this week against. The copy is always comparative — a number on its own
 * doesn't move anyone, but "you're 90 behind Dana" does.
 */
export interface TitleContext {
  /** Score over the same 7-day window one week earlier. */
  previousScore?: number | null;
  /** The friend closest to the user on the board. */
  rival?: { name: string; effortGap: number; ahead: boolean } | null;
  /** Friends who were ahead last week and are behind now — the best news we can deliver. */
  overtaken?: string[];
  /** How many friends the user currently outranks, out of how many. */
  aheadOf?: number;
  friendCount?: number;
}

export function tierColor(tier: TitleTier): string {
  switch (tier) {
    case "LEGEND":
      return "text-signal";
    case "STRONG":
      return "text-ink";
    case "SOLID":
      return "text-ink";
    case "LIGHT":
      return "text-slate";
    case "RESET":
      return "text-flag-red";
  }
}

export function tierBorder(tier: TitleTier): string {
  switch (tier) {
    case "LEGEND":
      return "border-signal";
    case "STRONG":
      return "border-ink/40";
    case "SOLID":
      return "border-rule";
    case "LIGHT":
      return "border-rule";
    case "RESET":
      return "border-flag-red/40";
  }
}

/**
 * How thin the cushion has to get before we warn about losing the current title.
 *
 * Eight points is roughly two active days ageing out of the rolling window — close
 * enough that one skipped week costs the title, far enough that a participant sitting
 * comfortably mid-band isn't nagged. Raise it to make loss aversion louder.
 */
export const DROP_WARNING_POINTS = 8;

/** [feminine, masculine] — Hebrew needs both. */
type Gendered = [string, string];

const f = (gender: Gender | null, feminine: string, masculine: string) =>
  gender === "F" ? feminine : masculine;

interface Rung {
  id: string;
  emoji: string;
  tier: TitleTier;
  minScore: number;
  title: Record<Locale, Gendered>;
  /** The punchline. Comparative clauses are appended separately. */
  line: Record<Locale, (r: WindowScoreResult, g: Gender | null) => string>;
}

/**
 * The title ladder for the rolling 7-day window, lowest rung first.
 *
 * Names came from the study team; the register is deliberately loud, because the whole
 * question is whether a name on a screen moves behaviour. Titles are earned purely on the
 * window score, which is what makes "you're N points away" answerable.
 *
 * ALL wording lives in this table — retune the experiment by editing strings and
 * thresholds here, and nothing else in the app needs to change.
 */
const LADDER: Rung[] = [
  {
    id: "couch",
    emoji: "🛋️",
    tier: "RESET",
    minScore: 0,
    title: { he: ["כונפה", "כונפה"], en: ["Couch Locked", "Couch Locked"] },
    line: {
      he: (_r, g) =>
        `שבוע שלם על הספה. כולם על הלוח, ו${f(g, "את בכלל לא", "אתה בכלל לא")} בתחרות.`,
      en: () => "A full week on the couch. Everyone else is on the board; you're not even in the race.",
    },
  },
  {
    id: "truck",
    emoji: "🚛",
    tier: "RESET",
    minScore: 1,
    title: { he: ["משאית", "משאית"], en: ["Truck", "Truck"] },
    line: {
      he: (r) => `${r.workoutCount} אימונים ב-7 ימים. הטורבו כבוי לגמרי.`,
      en: (r) => `${r.workoutCount} session${r.workoutCount === 1 ? "" : "s"} in 7 days. Turbo completely off.`,
    },
  },
  {
    id: "waking",
    emoji: "🌱",
    tier: "LIGHT",
    minScore: 25,
    title: { he: ["מתעוררת", "מתעורר"], en: ["Defrosting", "Defrosting"] },
    line: {
      he: (r) => `${r.effort} מאמץ ב-${r.activeDays} ימים. המנוע התחיל להתחמם.`,
      en: (r) => `${r.effort} effort across ${r.activeDays} day${r.activeDays === 1 ? "" : "s"}. Engine's warming up.`,
    },
  },
  {
    id: "on-the-way",
    emoji: "🎯",
    tier: "SOLID",
    minScore: 42,
    title: { he: ["בדרך לשם", "בדרך לשם"], en: ["Getting There", "Getting There"] },
    line: {
      he: (r, g) => `${r.activeDays} ימים פעילים, ${r.effort} מאמץ. עוד קצת גז ו${f(g, "את", "אתה")} בפנים.`,
      en: (r) => `${r.activeDays} active days, ${r.effort} effort. A little more gas and you're in.`,
    },
  },
  {
    id: "good-looking",
    emoji: "💪",
    tier: "SOLID",
    minScore: 58,
    title: { he: ["חתיכה", "חתיך"], en: ["Looking Good", "Looking Good"] },
    line: {
      he: (r, g) => `${r.score}/100. מתחילים להסתכל ${f(g, "עלייך", "עליך")}.`,
      en: (r) => `${r.score}/100. People are starting to look.`,
    },
  },
  {
    id: "hottie",
    emoji: "🔥",
    tier: "STRONG",
    minScore: 72,
    title: { he: ["כוסית", "מפלצת"], en: ["Hottie", "Beast"] },
    line: {
      he: (r, g) =>
        `${r.effort} מאמץ ב-${r.activeDays} ימים. ${f(g, "את מכתיבה", "אתה מכתיב")} את הקצב — שירדפו ${f(g, "אחרייך", "אחריך")}.`,
      en: (r) => `${r.effort} effort over ${r.activeDays} days. You're setting the pace — make them chase it.`,
    },
  },
  {
    id: "super",
    emoji: "⚡",
    tier: "STRONG",
    minScore: 83,
    title: { he: ["כוסית על", "מפלצת על"], en: ["Super Hottie", "Super Beast"] },
    line: {
      he: (r) =>
        `${r.workoutCount} אימונים, ${r.distinctTypes} סוגים, ${r.effort} מאמץ. טורבו על מקסימום.`,
      en: (r) =>
        `${r.workoutCount} sessions, ${r.distinctTypes} discipline${r.distinctTypes === 1 ? "" : "s"}, ${r.effort} effort. Turbo maxed.`,
    },
  },
  {
    id: "certified",
    emoji: "🏆",
    tier: "LEGEND",
    minScore: 92,
    title: { he: ["כוסית מוסמכת", "מפלצת מוסמכת"], en: ["Certified Hottie", "Certified Beast"] },
    line: {
      he: (r) => `${r.score}/100 על ${r.activeDays} ימים פעילים. השבוע הזה סוגר ויכוחים בקבוצה.`,
      en: (r) => `${r.score}/100 across ${r.activeDays} active days. This is the week that ends group chat arguments.`,
    },
  },
];

/** "+12 points on last week" / "you dropped 8 — turbo's down." */
function trendClause(
  result: WindowScoreResult,
  context: TitleContext,
  audience: TitleAudience
): string | null {
  const previous = context.previousScore;
  if (previous === null || previous === undefined) return null;
  const delta = result.score - previous;

  if (audience.locale === "he") {
    if (delta > 0) return `🔥 ${delta} נקודות מעל השבוע שעבר.`;
    if (delta < 0) return `📉 ${Math.abs(delta)} מתחת לשבוע שעבר — הורדת טורבו.`;
    return "בדיוק כמו השבוע שעבר. אותו הדבר זה לא התקדמות.";
  }
  if (delta > 0) return `🔥 ${delta} points up on last week.`;
  if (delta < 0) return `📉 ${Math.abs(delta)} down on last week — turbo's dropping.`;
  return "Dead level with last week. Level isn't progress.";
}

/**
 * Where the user stands against their friends, best news first.
 *
 * Passing someone is the loudest social signal the app has, so it outranks everything
 * else; topping the board comes next; only then do we fall back to the nearest rival.
 */
function rivalClause(context: TitleContext, audience: TitleAudience): string | null {
  const g = audience.gender;
  const he = audience.locale === "he";
  const { overtaken, aheadOf, friendCount, rival } = context;

  // Someone you were behind last week is behind you now.
  if (overtaken && overtaken.length > 0) {
    const names = overtaken.slice(0, 2);
    const list = he ? names.join(" ו") : names.join(" and ");
    const more = overtaken.length > names.length ? overtaken.length - names.length : 0;
    if (he) {
      const extra = more > 0 ? ` ועוד ${more}` : "";
      return `🚀 עכשיו ${f(g, "את מעל", "אתה מעל")} ${list}${extra} — עברת ${f(g, "אותם", "אותם")} השבוע.`;
    }
    const extra = more > 0 ? ` and ${more} more` : "";
    return `🚀 You're now above ${list}${extra} — passed them this week.`;
  }

  // Top of the board outright.
  if (friendCount && friendCount > 0 && aheadOf === friendCount) {
    return he
      ? `${f(g, "את מעל כל", "אתה מעל כל")} ${friendCount} החברים שלך. ראש הטבלה.`
      : `You're above all ${friendCount} of your friends. Top of the board.`;
  }

  if (!rival) return null;
  const { name, effortGap, ahead } = rival;

  if (he) {
    return ahead
      ? `${name} ${f(g, "לפנייך", "לפניך")} ב-${effortGap} מאמץ. ${f(g, "תסגרי", "תסגור")} את הפער.`
      : `${f(g, "מובילה", "מוביל")} על ${name} ב-${effortGap} מאמץ. אל ${f(g, "תורידי", "תוריד")} טורבו.`;
  }
  return ahead
    ? `${name} is ${effortGap} effort ahead of you. Close it.`
    : `You're ${effortGap} effort up on ${name}. Don't ease off.`;
}

function rungFor(score: number): Rung {
  let earned = LADDER[0];
  for (const rung of LADDER) {
    if (score >= rung.minScore) earned = rung;
  }
  return earned;
}

function toTitle(
  rung: Rung,
  result: WindowScoreResult,
  audience: TitleAudience,
  context: TitleContext
): WeekTitle {
  const [feminine, masculine] = rung.title[audience.locale];
  const parts = [
    rung.line[audience.locale](result, audience.gender),
    trendClause(result, context, audience),
    rivalClause(context, audience),
  ].filter(Boolean);

  return {
    id: rung.id,
    emoji: rung.emoji,
    tier: rung.tier,
    minScore: rung.minScore,
    title: audience.gender === "F" ? feminine : masculine,
    reason: parts.join(" "),
  };
}

const FALLBACK_AUDIENCE: TitleAudience = { locale: DEFAULT_LOCALE, gender: null };

export function evaluateWeekTitle(
  result: WindowScoreResult,
  audience: TitleAudience = FALLBACK_AUDIENCE,
  context: TitleContext = {}
): WeekTitle {
  return toTitle(rungFor(result.score), result, audience, context);
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
  const below = index > 0 ? LADDER[index - 1] : null;

  // The window rolls, so a title is held rather than owned: the score falls out of this
  // band the moment it dips below the rung's threshold. That downward edge is the half of
  // the ladder the app has never shown, and it's the half people act on hardest.
  const pointsToDrop = below ? result.score - current.minScore + 1 : null;
  const downward = {
    previous: below ? toTitle(below, result, audience, {}) : null,
    pointsToDrop,
    atRisk: pointsToDrop !== null && pointsToDrop <= DROP_WARNING_POINTS,
  };

  if (!next) {
    return {
      current: toTitle(current, result, audience, {}),
      next: null,
      pointsToNext: 0,
      percent: 100,
      routes: [],
      ...downward,
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
    current: toTitle(current, result, audience, {}),
    next: toTitle(next, result, audience, {}),
    pointsToNext,
    percent,
    routes,
    ...downward,
  };
}

/** Points reachable with habit alone: 5 active days (20) plus 3 activity types (10). */
const FULL_HABIT_POINTS = CONSISTENCY_CAP + VARIETY_CAP;

/**
 * What a rung costs, on the two routes that bracket every other one: max out the cheap
 * habit points and buy the rest with volume, or buy the whole thing with volume alone.
 * Volume caps at 70 points, so the top rungs genuinely cannot be bought that way — which
 * is the most useful thing the rank list can tell someone.
 */
export interface RungRequirement {
  /** MET-minutes still needed once consistency and variety are both maxed. */
  effortWithFullHabit: number;
  minutesWithFullHabit: number;
  /** MET-minutes needed on volume alone, or null when volume can't reach this rung. */
  effortVolumeOnly: number | null;
  minutesVolumeOnly: number | null;
}

export interface LadderRung {
  id: string;
  emoji: string;
  tier: TitleTier;
  minScore: number;
  /** Both grammatical forms — the ladder is shown in full to everyone, whatever title they hold. */
  titleF: string;
  titleM: string;
  requirement: RungRequirement;
}

function requirementFor(minScore: number): RungRequirement {
  const fromVolume = Math.max(0, minScore - FULL_HABIT_POINTS);
  const effortWithFullHabit = Math.ceil(fromVolume * EFFORT_PER_VOLUME_POINT);
  const effortVolumeOnly = minScore <= 70 ? Math.ceil(minScore * EFFORT_PER_VOLUME_POINT) : null;

  return {
    effortWithFullHabit,
    minutesWithFullHabit: effortWithFullHabit > 0 ? minutesForEffort(effortWithFullHabit) : 0,
    effortVolumeOnly,
    minutesVolumeOnly:
      effortVolumeOnly !== null && effortVolumeOnly > 0 ? minutesForEffort(effortVolumeOnly) : effortVolumeOnly,
  };
}

/**
 * The whole ladder, lowest rung first, with both gendered names resolved.
 *
 * No score result is involved: this describes what is on offer, not what anyone has
 * earned, which is what lets a single list be shown identically to every participant.
 */
export function titleLadder(locale: Locale): LadderRung[] {
  return LADDER.map((rung) => ({
    id: rung.id,
    emoji: rung.emoji,
    tier: rung.tier,
    minScore: rung.minScore,
    titleF: rung.title[locale][0],
    titleM: rung.title[locale][1],
    requirement: requirementFor(rung.minScore),
  }));
}

/** Index into `titleLadder` of the rung a given score currently sits on. */
export function ladderIndexFor(score: number): number {
  let index = 0;
  LADDER.forEach((rung, i) => {
    if (score >= rung.minScore) index = i;
  });
  return index;
}
