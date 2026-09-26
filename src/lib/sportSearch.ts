import { WORKOUT_TYPES, WORKOUT_TYPE_ORDER, WorkoutTypeKey } from "./workoutTypes";

/**
 * Search-as-you-type for the sport picker.
 *
 * Both languages are always searched, whatever the UI locale — people type "spin" in the
 * Hebrew UI and "ספינינג" in the English one. Matching is tiered so the obvious answer
 * wins: an exact name, then a name that starts with what was typed, then any word in it
 * that does, then the letters appearing anywhere (spaces ignored, so "cross fit" finds
 * CrossFit), and last a one-or-two-letter typo allowance ("pilatis", "hirox").
 */

export interface SportMatch {
  key: WorkoutTypeKey;
  /** The alias that matched, when it wasn't the sport's own name — shown as a hint. */
  via: string | null;
}

const HEBREW_FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

// Built from a string because the tsconfig targets ES2017, where TypeScript rejects
// Unicode property escapes in a regex literal; every browser the app supports has them.
const NON_WORD = new RegExp("[^\\p{L}\\p{N}]+", "gu");

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-֑ͯ-ׇ]/g, "")
    .replace(/['’׳״"`]/g, "")
    .replace(/[ךםןףץ]/g, (c) => HEBREW_FINALS[c])
    .replace(NON_WORD, " ")
    .trim();
}

/** Levenshtein distance, bailing out once it can't come in under `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, row[j]);
    }
    if (rowMin > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

interface Term {
  text: string;
  words: string[];
  compact: string;
  /** Original spelling, kept for aliases so the hint reads the way it was written. */
  alias: string | null;
}

function term(raw: string, alias: boolean): Term {
  const text = normalize(raw);
  return { text, words: text.split(" "), compact: text.replace(/ /g, ""), alias: alias ? raw : null };
}

// Built once: 50-odd sports × a handful of terms each.
const INDEX = WORKOUT_TYPE_ORDER.map((key) => {
  const meta = WORKOUT_TYPES[key];
  return {
    key,
    terms: [term(meta.label, false), term(meta.labelHe, false), ...meta.aliases.map((a) => term(a, true))],
  };
});

/** Higher is better; 0 means no match. Typo tolerance is a separate, last-resort pass. */
function scoreTerm(t: Term, q: string, qCompact: string): number {
  if (t.text === q) return 100;
  if (t.text.startsWith(q)) return 90;
  if (t.words.some((w) => w.startsWith(q))) return 80;
  if (t.compact.includes(qCompact)) return 70;
  return 0;
}

/**
 * Smallest edit distance from the query to the start of any word, or Infinity. Compared
 * against prefixes of about the query's length so a half-typed long name still counts.
 * The first letter has to be right — typos there are rare, and allowing them makes
 * three-letter queries match half the list.
 */
function typoDistance(t: Term, qCompact: string, max: number): number {
  let best = Infinity;
  for (const w of [...t.words, t.compact]) {
    if (w[0] !== qCompact[0]) continue;
    for (let len = qCompact.length - 1; len <= qCompact.length + 1; len++) {
      if (len < 1 || len > w.length) continue;
      const d = editDistance(qCompact, w.slice(0, len), max);
      if (d <= max) best = Math.min(best, d);
    }
  }
  return best;
}

type Scored = { key: WorkoutTypeKey; via: string | null; score: number; order: number };

function rank(score: (t: Term) => number): Scored[] {
  const results: Scored[] = [];
  INDEX.forEach(({ key, terms }, order) => {
    let best = 0;
    let nameMatched = false;
    let via: string | null = null;
    for (const t of terms) {
      const s = score(t);
      if (s <= 0) continue;
      // Own names outrank aliases, so typing "fit" puts CrossFit above "fitness racing".
      const weighted = s + (t.alias === null ? 25 : 0);
      if (t.alias === null) nameMatched = true;
      if (weighted > best) {
        best = weighted;
        via = t.alias;
      }
    }
    // The alias is only worth showing when the name itself gives no clue why it matched.
    if (best > 0) results.push({ key, via: nameMatched ? null : via, score: best, order });
  });
  return results.sort((a, b) => b.score - a.score || a.order - b.order);
}

export function searchSports(query: string): SportMatch[] {
  const q = normalize(query);
  if (!q) return [];
  const qCompact = q.replace(/ /g, "");

  let results = rank((t) => scoreTerm(t, q, qCompact));
  if (results.length === 0 && qCompact.length >= 4) {
    const max = qCompact.length >= 7 ? 2 : 1;
    results = rank((t) => {
      const d = typoDistance(t, qCompact, max);
      return d === Infinity ? 0 : 50 - d * 10;
    });
  }
  return results.map(({ key, via }) => ({ key, via }));
}
