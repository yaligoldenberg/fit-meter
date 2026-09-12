"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORKOUT_TYPES,
  WorkoutTypeKey,
  IntensityKey,
  typeLabel,
  intensityLabel,
} from "@/lib/workoutTypes";
import { rateWorkout, explainRating, TIER_META } from "@/lib/difficulty";
import { Locale, StringKey, t } from "@/lib/i18n";

interface WorkoutItem {
  id: string;
  type: string;
  duration: number;
  intensity: string;
  distanceKm: number | null;
  note: string | null;
  date: string;
  isRecord?: boolean;
}

const INTENSITY_BADGE: Record<string, string> = {
  LOW: "border-coal-600 text-bone/50",
  MEDIUM: "border-bone/30 text-bone/80",
  HIGH: "border-coral/50 text-coral",
};

function formatDate(iso: string, locale: Locale): string {
  const localeTag = locale === "he" ? "he-IL" : "en-US";
  return new Date(iso).toLocaleDateString(localeTag, { weekday: "short", month: "short", day: "numeric" });
}

export default function WorkoutList({ workouts, locale }: { workouts: WorkoutItem[]; locale: Locale }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  async function onDelete(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t(locale, "delete_workout_error"));
        setDeletingId(null);
        return;
      }
      router.refresh();
    } catch {
      setError(t(locale, "network_error"));
      setDeletingId(null);
    }
  }

  if (sorted.length === 0) {
    return <p className="py-6 text-center text-sm text-bone/40">{t(locale, "nothing_logged")}</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      <ul className="divide-y divide-coal-600">
        {sorted.map((w) => {
          const typeKey = (w.type in WORKOUT_TYPES ? w.type : "OTHER") as WorkoutTypeKey;
          const intensityKey = (["LOW", "MEDIUM", "HIGH"].includes(w.intensity)
            ? w.intensity
            : "MEDIUM") as IntensityKey;
          const meta = WORKOUT_TYPES[typeKey];
          const rating = rateWorkout(w);
          const tier = TIER_META[rating.tier];
          const tierLabel = t(locale, `difficulty_${rating.tier}` as StringKey);
          const busy = deletingId === w.id;
          return (
            <li key={w.id} className="flex items-center gap-4 py-3.5">
              <span className="text-lg text-volt">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-bone">{typeLabel(typeKey, locale)}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      INTENSITY_BADGE[w.intensity] ?? INTENSITY_BADGE.MEDIUM
                    }`}
                  >
                    {intensityLabel(intensityKey, locale)}
                  </span>
                  {w.distanceKm ? (
                    <span className="font-mono text-xs text-bone/50">{w.distanceKm} {t(locale, "unit_km")}</span>
                  ) : null}
                  {w.isRecord && (
                    <span className="rounded-full border border-volt bg-volt/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-volt">
                      {t(locale, "record_new")}
                    </span>
                  )}
                  <span
                    title={explainRating(w, rating, locale)}
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tier.className}`}
                  >
                    {tierLabel} · {rating.rating}
                  </span>
                </div>
                {w.note ? <p className="mt-0.5 truncate text-sm text-bone/50">{w.note}</p> : null}
              </div>
              <span className="shrink-0 font-mono text-xs text-bone/40">{formatDate(w.date, locale)}</span>
              <span className="w-14 shrink-0 text-end font-display text-lg text-bone num-tabular">
                {w.duration}m
              </span>
              <button
                onClick={() => onDelete(w.id)}
                disabled={busy}
                aria-label={t(locale, "delete_workout")}
                className="shrink-0 rounded-full px-2 py-1 text-bone/30 transition hover:bg-coral/10 hover:text-coral disabled:opacity-30"
              >
                {busy ? "…" : "×"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
