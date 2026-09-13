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
  LOW: "border-rule text-slate-light",
  MEDIUM: "border-rule text-slate",
  HIGH: "border-flag-red/40 text-flag-red",
};

const BADGE = "rounded-full border px-2 py-0.5 text-[11px] font-medium";

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
    return <p className="py-6 text-center text-sm text-slate-light">{t(locale, "nothing_logged")}</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-3 border-s-[3px] border-flag-red bg-chalk px-3 py-2 text-sm text-flag-red">
          {error}
        </p>
      )}
      <ul className="divide-y divide-rule border-t border-rule">
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
              <span className="text-lg text-slate-light">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{typeLabel(typeKey, locale)}</span>
                  <span className={`${BADGE} ${INTENSITY_BADGE[w.intensity] ?? INTENSITY_BADGE.MEDIUM}`}>
                    {intensityLabel(intensityKey, locale)}
                  </span>
                  {w.distanceKm ? (
                    <span className="text-[13px] text-slate num-tabular">
                      {w.distanceKm} {t(locale, "unit_km")}
                    </span>
                  ) : null}
                  {w.isRecord && (
                    <span className={`${BADGE} border-signal text-signal`}>{t(locale, "record_new")}</span>
                  )}
                  <span title={explainRating(w, rating, locale)} className={`${BADGE} ${tier.className}`}>
                    {tierLabel} · {rating.rating}
                  </span>
                </div>
                {w.note ? <p className="mt-1 truncate text-sm text-slate">{w.note}</p> : null}
              </div>
              <span className="shrink-0 text-[13px] text-slate-light">{formatDate(w.date, locale)}</span>
              <span className="w-16 shrink-0 text-end font-display text-2xl leading-none text-ink num-tabular">
                {w.duration}
                <span className="ms-1 font-body text-[13px] font-normal text-slate">
                  {t(locale, "unit_min")}
                </span>
              </span>
              <button
                onClick={() => onDelete(w.id)}
                disabled={busy}
                aria-label={t(locale, "delete_workout")}
                className="shrink-0 rounded-full px-2 py-1 text-slate-light transition-colors hover:text-flag-red disabled:opacity-30"
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
