"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORKOUT_TYPE_ORDER,
  WORKOUT_TYPES,
  WorkoutTypeKey,
  typeLabel,
  usesDistance,
} from "@/lib/workoutTypes";
import { rateWorkout, explainRating, TIER_META } from "@/lib/difficulty";
import { Locale, StringKey, t } from "@/lib/i18n";

function todayLocalISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

// WORKOUT_TYPE_ORDER is already sorted most-common-first; show this many by
// default and let "More" reveal the rest.
const COMMON_TYPE_COUNT = 8;

export default function WorkoutForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [type, setType] = useState<WorkoutTypeKey>("RUNNING");
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [duration, setDuration] = useState("30");
  const [distanceKm, setDistanceKm] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // The same function the server will run on save, so the number shown while filling the
  // form is the number that gets stored — the rating is derived, not negotiated.
  const previewWorkout = {
    type,
    duration: Number(duration) || 0,
    distanceKm: usesDistance(type) && distanceKm ? Number(distanceKm) : null,
  };
  const preview = rateWorkout(previewWorkout);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          duration: Number(duration),
          distanceKm: usesDistance(type) && distanceKm ? Number(distanceKm) : null,
          note: note || undefined,
          date: new Date(date).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t(locale, "log_workout_error"));
        setLoading(false);
        return;
      }
      setDuration("30");
      setDistanceKm("");
      setNote("");
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 1500);
    } catch {
      setError(t(locale, "network_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <p className="caption mb-2.5">{t(locale, "field_type")}</p>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_TYPE_ORDER.filter(
            (key, i) => showAllTypes || i < COMMON_TYPE_COUNT || key === type
          ).map((key) => {
            const active = type === key;
            return (
              <button
                type="button"
                key={key}
                aria-pressed={active}
                onClick={() => setType(key)}
                className={`chip flex items-center gap-2 ${active ? "chip-on" : ""}`}
              >
                <span>{WORKOUT_TYPES[key].icon}</span>
                {typeLabel(key, locale)}
              </button>
            );
          })}
          {WORKOUT_TYPE_ORDER.length > COMMON_TYPE_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllTypes((v) => !v)}
              className="chip border-dashed"
            >
              {showAllTypes ? t(locale, "less") : t(locale, "more")}
            </button>
          )}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className="caption">{t(locale, "field_duration")}</span>
          <input
            required
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="input"
          />
        </label>
        {usesDistance(type) && (
          <label className="flex flex-col gap-1.5">
            <span className="caption">{t(locale, "field_distance")}</span>
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder={t(locale, "field_optional")}
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className="input"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="caption">{t(locale, "field_date")}</span>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="caption">{t(locale, "field_note")}</span>
          <input
            type="text"
            maxLength={280}
            placeholder={t(locale, "field_optional")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
          />
        </label>
      </div>

      <div className="border-t border-rule pt-4">
        <p className="caption mb-2.5">{t(locale, "effort_computed")}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              TIER_META[preview.tier].className
            }`}
          >
            {t(locale, `difficulty_${preview.tier}` as StringKey)} · {preview.rating}
          </span>
          <span className="text-[13px] text-slate">{explainRating(previewWorkout, preview, locale)}</span>
        </div>
        <p className="mt-2 text-[13px] text-slate-light">{t(locale, "effort_computed_note")}</p>
      </div>

      {error && (
        <p className="border-s-[3px] border-flag-red bg-chalk px-3 py-2 text-sm text-flag-red">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={loading} className="btn-primary py-3 text-base">
          {loading ? t(locale, "saving") : t(locale, "save_workout")}
        </button>
        <span
          aria-live="polite"
          className={`text-sm font-semibold text-signal transition-opacity duration-300 ${
            success ? "opacity-100" : "opacity-0"
          }`}
        >
          {t(locale, "logged_confirm")}
        </span>
      </div>
    </form>
  );
}
