"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKOUT_TYPE_ORDER, WORKOUT_TYPES, INTENSITIES, WorkoutTypeKey, IntensityKey } from "@/lib/workoutTypes";

function todayLocalISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export default function WorkoutForm() {
  const router = useRouter();
  const [type, setType] = useState<WorkoutTypeKey>("RUNNING");
  const [duration, setDuration] = useState("30");
  const [intensity, setIntensity] = useState<IntensityKey>("MEDIUM");
  const [distanceKm, setDistanceKm] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
          intensity,
          distanceKm: distanceKm ? Number(distanceKm) : null,
          note: note || undefined,
          date: new Date(date).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't log that workout");
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
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-bone/50">Type</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {WORKOUT_TYPE_ORDER.map((key) => {
            const active = type === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setType(key)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-volt bg-volt text-coal-950"
                    : "border-coal-600 bg-coal-900 text-bone/70 hover:border-bone/40"
                }`}
              >
                <span>{WORKOUT_TYPES[key].icon}</span>
                {WORKOUT_TYPES[key].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/50">Duration (min)</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/50">Distance (km)</span>
          <input
            type="number"
            min={0}
            step="0.1"
            placeholder="optional"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/50">Date</span>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/50">Note</span>
          <input
            type="text"
            maxLength={280}
            placeholder="optional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-bone/50">Effort</p>
        <div className="flex gap-2">
          {(Object.keys(INTENSITIES) as IntensityKey[]).map((key) => {
            const active = intensity === key;
            return (
              <button
                type="button"
                key={key}
                title={INTENSITIES[key].hint}
                onClick={() => setIntensity(key)}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? key === "HIGH"
                      ? "border-coral bg-coral text-coal-950"
                      : "border-volt bg-volt text-coal-950"
                    : "border-coal-600 bg-coal-900 text-bone/70 hover:border-bone/40"
                }`}
              >
                {INTENSITIES[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-volt px-6 py-3 font-bold text-coal-950 transition hover:bg-volt-400 disabled:opacity-50"
        >
          {loading ? "Logging…" : "Log workout"}
        </button>
        <span
          className={`font-mono text-sm text-volt transition-opacity duration-300 ${
            success ? "opacity-100" : "opacity-0"
          }`}
        >
          Logged ✓
        </span>
      </div>
    </form>
  );
}
