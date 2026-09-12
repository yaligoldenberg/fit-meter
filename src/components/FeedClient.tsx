"use client";

import { useCallback, useEffect, useState } from "react";
import { WORKOUT_TYPES, WorkoutTypeKey, typeLabel } from "@/lib/workoutTypes";
import { DifficultyTier, TIER_META } from "@/lib/difficulty";
import CommentThread from "./CommentThread";
import { Locale, StringKey, t, tn } from "@/lib/i18n";

/** The five reactions the study allows — kept tight so kudos stays a glance, not a decision. */
const EMOJIS = ["🔥", "💪", "👏", "😮", "🤝"] as const;

interface FeedUser {
  id: string;
  displayName: string;
  username?: string;
  gender?: string | null;
}

interface FeedRating {
  effort?: number;
  tier?: string;
  rating?: number;
}

interface FeedItem {
  id: string;
  type: string;
  duration: number;
  intensity?: string;
  distanceKm?: number | null;
  note?: string | null;
  date: string;
  user: FeedUser;
  rating?: FeedRating | null;
  reactionCount?: number;
  commentCount?: number;
  emojis?: string[];
  myReaction?: string | null;
}

interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

function relativeDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return t(locale, "feed_today");
  if (diffDays === 1) return t(locale, "feed_yesterday");
  const localeTag = locale === "he" ? "he-IL" : "en-US";
  return date.toLocaleDateString(localeTag, { month: "short", day: "numeric" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function FeedClient({ locale, meId }: { locale: Locale; meId: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const url = cursor ? `/api/feed?cursor=${encodeURIComponent(cursor)}` : "/api/feed";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load feed");
      const json: FeedResponse = await res.json();
      const rows = Array.isArray(json.items) ? json.items : [];
      setItems((prev) => (cursor ? [...prev, ...rows] : rows));
      setNextCursor(json.nextCursor ?? null);
    } catch {
      if (!cursor) setError(t(locale, "network_error"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Optimistic kudos toggle. The API allows one reaction per person per workout, so
   * clicking a different emoji than your current one swaps it without changing the
   * total count; clicking your current emoji removes it. `emojis` (the distinct set
   * already given) only grows optimistically — we can't know whether someone else
   * still holds an emoji we're removing, so we leave it be until the next full load
   * rather than guess and possibly hide a reaction that's still there.
   */
  async function toggleReaction(item: FeedItem, emoji: string) {
    const isActive = item.myReaction === emoji;
    const rollback = {
      reactionCount: item.reactionCount ?? 0,
      myReaction: item.myReaction ?? null,
      emojis: item.emojis ?? [],
    };

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== item.id) return it;
        const delta = isActive ? -1 : it.myReaction ? 0 : 1;
        return {
          ...it,
          reactionCount: Math.max(0, (it.reactionCount ?? 0) + delta),
          myReaction: isActive ? null : emoji,
          emojis: isActive ? it.emojis ?? [] : Array.from(new Set([...(it.emojis ?? []), emoji])),
        };
      })
    );

    try {
      const res = isActive
        ? await fetch(`/api/reactions?workoutId=${encodeURIComponent(item.id)}`, { method: "DELETE" })
        : await fetch("/api/reactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workoutId: item.id, emoji }),
          });
      if (!res.ok) throw new Error("Reaction failed");
      const json = await res.json();
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                reactionCount: typeof json.reactionCount === "number" ? json.reactionCount : it.reactionCount,
                myReaction: json.myReaction ?? null,
              }
            : it
        )
      );
    } catch {
      setItems((prev) => (prev.some((it) => it.id === item.id) ? prev.map((it) => (it.id === item.id ? { ...it, ...rollback } : it)) : prev));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl text-bone md:text-4xl">{t(locale, "feed_heading")}</h1>

      {loading && <p className="font-mono text-sm text-bone/40">{t(locale, "loading_ellipsis")}</p>}

      {!loading && error && (
        <div className="rounded-2xl border border-coal-600 bg-coal-800 p-6 text-center">
          <p className="text-sm text-coral">{error}</p>
          <button
            onClick={() => load()}
            className="mt-3 rounded-full border border-coal-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-bone/40 hover:text-bone"
          >
            {t(locale, "retry")}
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-coal-600 bg-coal-800 p-8 text-center">
          <p className="text-sm text-bone/50">{t(locale, "feed_empty")}</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-coal-600 rounded-2xl border border-coal-600 bg-coal-800 px-4">
            {items.map((item) => {
              const isMe = !!item.user?.id && item.user.id === meId;
              const typeKey = ((item.type && item.type in WORKOUT_TYPES ? item.type : "OTHER") as WorkoutTypeKey);
              const meta = WORKOUT_TYPES[typeKey];
              const tierKey =
                item.rating?.tier && item.rating.tier in TIER_META ? (item.rating.tier as DifficultyTier) : null;
              const tierMeta = tierKey ? TIER_META[tierKey] : null;
              const name = item.user?.displayName ?? "?";
              const displayName = isMe ? t(locale, "feed_you") : name;
              const emojiSet = Array.isArray(item.emojis) ? item.emojis : [];

              return (
                <li key={item.id} className="flex gap-3 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coal-600 font-mono text-xs font-semibold text-bone/80">
                    {isMe ? t(locale, "feed_you").slice(0, 2).toUpperCase() : initials(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="truncate font-semibold text-bone">{displayName}</p>
                      <span className="shrink-0 font-mono text-[11px] text-bone/40">
                        {relativeDate(item.date, locale)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-base text-volt">{meta.icon}</span>
                      <span className="text-sm text-bone">{typeLabel(typeKey, locale)}</span>
                      <span className="num-tabular font-mono text-xs text-bone/50">
                        {item.duration}
                        {t(locale, "unit_min")}
                      </span>
                      {typeof item.distanceKm === "number" && item.distanceKm > 0 && (
                        <span className="num-tabular font-mono text-xs text-bone/50">
                          {item.distanceKm} {t(locale, "unit_km")}
                        </span>
                      )}
                      {tierKey && tierMeta && (
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tierMeta.className}`}
                        >
                          {t(locale, `difficulty_${tierKey}` as StringKey)}
                          {typeof item.rating?.rating === "number" ? ` · ${item.rating.rating}` : ""}
                        </span>
                      )}
                    </div>

                    {item.note && <p className="mt-1 truncate text-sm text-bone/50">{item.note}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {EMOJIS.map((emoji) => {
                        const active = item.myReaction === emoji;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            title={t(locale, "kudos_give")}
                            aria-pressed={active}
                            onClick={() => toggleReaction(item, emoji)}
                            className={`rounded-full border px-2 py-1 text-sm transition ${
                              active
                                ? "border-volt/60 bg-volt/10"
                                : "border-coal-600 opacity-60 hover:border-bone/30 hover:opacity-100"
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                      {(item.reactionCount ?? 0) > 0 && (
                        <span className="ms-1 num-tabular font-mono text-xs text-bone/40">
                          {emojiSet.length > 0 ? `${emojiSet.join(" ")} ` : ""}
                          {tn(locale, "kudos_count", item.reactionCount ?? 0)}
                        </span>
                      )}
                    </div>

                    <CommentThread workoutId={item.id} locale={locale} initialCount={item.commentCount ?? 0} />
                  </div>
                </li>
              );
            })}
          </ul>

          {nextCursor && (
            <button
              onClick={() => load(nextCursor)}
              disabled={loadingMore}
              className="self-center rounded-full border border-coal-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-bone/60 transition hover:border-bone/40 hover:text-bone disabled:opacity-50"
            >
              {loadingMore ? t(locale, "loading_ellipsis") : t(locale, "more")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
