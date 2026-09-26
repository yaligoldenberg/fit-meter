import { STUDY_TIME_ZONE } from "./scoring";

/**
 * Training streaks — consecutive days with at least one logged session.
 *
 * The single most effective retention mechanic in consumer fitness and habit apps: a
 * number people don't want to reset. Days are counted in the study's time zone for the
 * same reason the score window is (see ./scoring), and "today not trained yet" does not
 * break a streak — only a fully missed day does, so opening the app in the morning never
 * shows a streak that has already collapsed.
 */

export interface StreakResult {
  /** Consecutive active days ending today or yesterday. */
  current: number;
  /** Best run ever recorded. */
  longest: number;
  /** True when today has a session, so the UI can say "keep it alive" vs "done today". */
  activeToday: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Built once: constructing an Intl.DateTimeFormat is far slower than using one, and
// localDay runs a couple of times per workout in a whole history on every dashboard load.
const LOCAL_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date in the study's time zone as YYYY-MM-DD. */
function localDay(date: Date): string {
  return LOCAL_DAY.format(date);
}

function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(Date.UTC(y, m - 1, d) - DAY_MS));
}

export function computeStreak(workouts: { date: Date }[], now: Date = new Date()): StreakResult {
  if (workouts.length === 0) return { current: 0, longest: 0, activeToday: false };

  const days = new Set(workouts.map((w) => localDay(w.date)));
  const today = localDay(now);
  const yesterday = previousDay(today);
  const activeToday = days.has(today);

  // A streak still counts if today simply hasn't happened yet.
  let cursor = activeToday ? today : days.has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && days.has(cursor)) {
    current++;
    cursor = previousDay(cursor);
  }

  // Longest run anywhere in history: walk the sorted days and reset on each gap.
  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && previousDay(day) === previous ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return { current, longest: Math.max(longest, current), activeToday };
}
