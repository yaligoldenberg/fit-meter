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

/**
 * Ranks the people around you for a week. Without `groupId` that is your friends;
 * with one it is that group's members, friends or not.
 */
export default function LeaderboardClient({
  locale,
  groupId,
}: {
  locale: Locale;
  /** Scope the board to one group instead of your friend list. */
  groupId?: string;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
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
    [locale, groupId]
  );

  useEffect(() => {
    load(weekOffset);
  }, [weekOffset, load]);

  return (
    <div className="rise-in rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl uppercase text-bone">
          {t(locale, groupId ? "groups_leaderboard" : "leaderboard_title")}
        </h1>
        {weekOffset === 0 && !loading && !error && (
          <span className="rounded-full bg-volt/20 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-volt">
            {t(locale, "lb_last_7")}
          </span>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between border-b border-coal-600 pb-4">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-bone/40 hover:text-bone"
        >
          {t(locale, "lb_earlier")}
        </button>
        <span className="font-mono text-xs uppercase tracking-widest text-bone/50">
          {data ? formatWeekRange(data.weekStart, data.weekEnd, locale) : " "}
        </span>
        <button
          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
          disabled={weekOffset === 0}
          className="rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-bone/40 hover:text-bone disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-coal-600 disabled:hover:text-bone/60"
        >
          {t(locale, "lb_later")}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-coal-700" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-coral">{error}</p>
          <button
            onClick={() => load(weekOffset)}
            className="rounded-full bg-volt px-5 py-2 text-sm font-bold text-coal-950 transition hover:bg-volt-400"
          >
            {t(locale, "retry")}
          </button>
        </div>
      )}

      {!loading && !error && data && data.leaderboard.length <= 1 && (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <p className="font-display text-2xl uppercase text-bone">{t(locale, "lb_alone")}</p>
          <p className="max-w-xs text-sm text-bone/50">
            {t(locale, groupId ? "groups_alone_hint" : "lb_alone_hint")}
          </p>
          {!groupId && (
            <Link
              href="/friends"
              className="mt-3 rounded-full bg-volt px-5 py-2 text-sm font-bold text-coal-950 transition hover:bg-volt-400"
            >
              {t(locale, "add_friends")}
            </Link>
          )}
        </div>
      )}

      {!loading && !error && data && data.leaderboard.length > 1 && (
        <ul className="flex flex-col gap-2">
          {data.leaderboard.map((row) => {
            const top3 = row.rank <= 3;
            const title = evaluateWeekTitle(row, {
              locale,
              gender: row.gender === "F" || row.gender === "M" ? row.gender : null,
            });
            return (
              <li
                key={row.id}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition ${
                  row.isMe
                    ? "border-volt/40 bg-coal-700"
                    : top3
                    ? "border-coal-500 bg-coal-700/60"
                    : "border-transparent bg-coal-800"
                }`}
              >
                <span
                  className={`w-8 shrink-0 text-center font-display text-3xl ${
                    row.rank === 1 ? "text-volt" : "text-bone/30"
                  }`}
                >
                  {row.rank}
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coal-600 font-mono text-sm font-semibold text-bone/80">
                  {initials(row.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-bone">
                    {row.displayName}
                    {row.isMe && <span className="ms-1.5 font-normal text-bone/40">{t(locale, "you_marker")}</span>}
                  </p>
                  <p className={`truncate text-[11px] font-semibold ${tierColor(title.tier)}`}>
                    {title.emoji} {title.title}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-bone/40">
                    {tn(locale, "lb_days", row.activeDays)} · {tn(locale, "lb_workouts", row.workoutCount)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-display text-3xl ${gradeColor(row.grade)}`}>{row.grade}</span>
                    <span className="num-tabular w-10 text-end font-mono text-sm text-bone/60">{row.score}</span>
                  </div>
                  <span className="num-tabular font-mono text-[10px] uppercase tracking-wide text-bone/40">
                    {row.effort} {t(locale, "lb_effort")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
