"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { gradeColor, WindowScoreResult } from "@/lib/scoring";
import { evaluateWeekTitle, tierColor } from "@/lib/weeklyTitles";
import { Locale, t, tn } from "@/lib/i18n";

interface LeaderboardRow extends WindowScoreResult {
  /** Drives כוסית vs מפלצת for this person, not the viewer. */
  gender: string | null;
  id: string;
  username: string;
  displayName: string;
  isMe: boolean;
  rank: number;
}

interface LeaderboardResponse {
  weekStart: string;
  weekEnd: string;
  groupName: string | null;
  leaderboard: LeaderboardRow[];
}

/** Who the board ranks: the people you added, or every account on the app. */
type Scope = "friends" | "all";

/** Rows shown before the board folds behind "see more". */
const TOP_N = 10;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatWeekRange(startIso: string, endIso: string, locale: Locale): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  end.setUTCDate(end.getUTCDate() - 1); // end is exclusive; show the inclusive last day
  const localeTag = locale === "he" ? "he-IL" : "en-US";
  const fmt = (d: Date) => d.toLocaleDateString(localeTag, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function Row({ row, locale }: { row: LeaderboardRow; locale: Locale }) {
  const top3 = row.rank <= 3;
  const title = evaluateWeekTitle(row, {
    locale,
    gender: row.gender === "F" || row.gender === "M" ? row.gender : null,
  });
  return (
    <li className={row.isMe ? "border-s-[3px] border-signal bg-chalk" : ""}>
      {/* The whole row opens the person's page — a big target on phones. */}
      <Link
        href={`/profile/${encodeURIComponent(row.username)}`}
        className={`group flex items-center gap-3 py-3.5 outline-none transition-colors hover:bg-chalk focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink sm:gap-4 ${
          row.isMe ? "ps-3" : ""
        }`}
      >
        <span
          className={`w-7 shrink-0 text-center font-display text-3xl leading-none num-tabular ${
            top3 ? "text-ink" : "text-slate-light"
          }`}
        >
          {row.rank}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule text-[13px] font-semibold text-slate">
          {initials(row.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink underline-offset-4 group-hover:underline">
            {row.displayName}
            {row.isMe && (
              <span className="ms-1.5 font-normal text-slate-light">{t(locale, "you_marker")}</span>
            )}
          </p>
          <p className={`truncate text-[13px] font-semibold ${tierColor(title.tier)}`}>
            {title.emoji} {title.title}
          </p>
          <p className="text-[13px] text-slate-light">
            {tn(locale, "lb_days", row.activeDays)} · {tn(locale, "lb_workouts", row.workoutCount)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-3xl leading-none ${gradeColor(row.grade)}`}>
              {row.grade}
            </span>
            <span className="num-tabular w-8 text-end text-sm text-slate">{row.score}</span>
          </div>
          <span className="num-tabular text-[13px] text-slate-light">
            {row.effort} {t(locale, "lb_effort")}
          </span>
        </div>
      </Link>
    </li>
  );
}

/**
 * Ranks people for a week. Without `groupId` the board toggles between your friends
 * and everyone on the app; with one it is that group's members, friends or not.
 * Long boards fold to the top ten, with your own row kept in view below the fold.
 */
export default function LeaderboardClient({
  locale,
  groupId,
}: {
  locale: Locale;
  /** Scope the board to one group instead of the friends / everyone toggle. */
  groupId?: string;
}) {
  const [scope, setScope] = useState<Scope>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ weekOffset: String(offset) });
        if (groupId) params.set("groupId", groupId);
        else if (scope === "all") params.set("scope", "all");
        const res = await fetch(`/api/leaderboard?${params}`);
        if (!res.ok) throw new Error("Failed to load leaderboard");
        const json = await res.json();
        setData(json);
      } catch {
        setError(t(locale, "leaderboard_load_error"));
      } finally {
        setLoading(false);
      }
    },
    [locale, groupId, scope]
  );

  useEffect(() => {
    load(weekOffset);
  }, [weekOffset, load]);

  function switchScope(next: Scope) {
    if (next === scope) return;
    setScope(next);
    setExpanded(false);
  }

  const rows = data?.leaderboard ?? [];
  const folded = !expanded && rows.length > TOP_N;
  const visible = folded ? rows.slice(0, TOP_N) : rows;
  // Your own row, when the fold would otherwise hide it.
  const meBelowFold = folded ? rows.find((r) => r.isMe && r.rank > TOP_N) : undefined;
  const friendsScope = !groupId && scope === "friends";

  return (
    <div className="rise-in sheet p-5 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="min-w-0 break-words font-display text-4xl leading-none text-ink sm:text-5xl">
          {t(locale, groupId ? "groups_leaderboard" : "leaderboard_title")}
        </h1>
        {weekOffset === 0 && !loading && !error && (
          <span className="rounded-full border border-signal px-3 py-0.5 text-[11px] font-medium text-signal">
            {t(locale, "lb_last_7")}
          </span>
        )}
      </div>

      {!groupId && (
        <div className="mt-5 flex gap-2" role="group" aria-label={t(locale, "leaderboard_title")}>
          {(["all", "friends"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={scope === option}
              onClick={() => switchScope(option)}
              className={`chip flex-1 justify-center sm:flex-none ${scope === option ? "chip-on" : ""}`}
            >
              {t(locale, option === "all" ? "lb_scope_everyone" : "lb_scope_friends")}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="text-sm text-slate underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {t(locale, "lb_earlier")}
        </button>
        <span className="text-[13px] font-medium text-slate num-tabular">
          {data ? formatWeekRange(data.weekStart, data.weekEnd, locale) : " "}
        </span>
        <button
          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
          disabled={weekOffset === 0}
          className="text-sm text-slate underline-offset-4 transition-colors hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:no-underline"
        >
          {t(locale, "lb_later")}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-chalk" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-flag-red">{error}</p>
          <button onClick={() => load(weekOffset)} className="btn-primary">
            {t(locale, "retry")}
          </button>
        </div>
      )}

      {!loading && !error && data && rows.length <= 1 && (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <p className="font-display text-4xl leading-none text-ink">{t(locale, "lb_alone")}</p>
          {(groupId || friendsScope) && (
            <p className="max-w-xs text-sm text-slate">
              {t(locale, groupId ? "groups_alone_hint" : "lb_alone_hint")}
            </p>
          )}
          {friendsScope && (
            <Link href="/friends" className="btn-primary mt-3">
              {t(locale, "add_friends")}
            </Link>
          )}
        </div>
      )}

      {!loading && !error && data && rows.length > 1 && (
        <>
          <ul className="divide-y divide-rule border-t border-rule">
            {visible.map((row) => (
              <Row key={row.id} row={row} locale={locale} />
            ))}
          </ul>

          {rows.length > TOP_N && (
            <div className="border-t border-rule pt-4 text-center">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="btn-quiet"
              >
                {folded ? tn(locale, "lb_see_more", rows.length - TOP_N) : t(locale, "lb_see_less")}
              </button>
            </div>
          )}

          {meBelowFold && (
            <div className="mt-5">
              <p className="caption">{t(locale, "lb_your_rank")}</p>
              <ul className="mt-2 border-t border-rule">
                <Row row={meBelowFold} locale={locale} />
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
