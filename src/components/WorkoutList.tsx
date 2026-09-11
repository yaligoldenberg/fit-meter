"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKOUT_TYPES, WorkoutTypeKey } from "@/lib/workoutTypes";

interface WorkoutItem {
  id: string;
  type: string;
  duration: number;
  intensity: string;
  distanceKm: number | null;
  note: string | null;
  date: string;
}

const INTENSITY_BADGE: Record<string, string> = {
  LOW: "border-coal-600 text-bone/50",
  MEDIUM: "border-bone/30 text-bone/80",
  HIGH: "border-coral/50 text-coral",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function WorkoutList({ workouts }: { workouts: WorkoutItem[] }) {
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
        setError(data.error ?? "Couldn't delete that workout");
        setDeletingId(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again");
      setDeletingId(null);
    }
  }

  if (sorted.length === 0) {
    return <p className="py-6 text-center text-sm text-bone/40">Nothing logged yet this week — get after it.</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      <ul className="divide-y divide-coal-600">
        {sorted.map((w) => {
          const meta = WORKOUT_TYPES[w.type as WorkoutTypeKey] ?? WORKOUT_TYPES.OTHER;
          const busy = deletingId === w.id;
          return (
            <li key={w.id} className="flex items-center gap-4 py-3.5">
              <span className="text-lg text-volt">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-bone">{meta.label}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      INTENSITY_BADGE[w.intensity] ?? INTENSITY_BADGE.MEDIUM
                    }`}
                  >
                    {w.intensity}
                  </span>
                  {w.distanceKm ? (
                    <span className="font-mono text-xs text-bone/50">{w.distanceKm} km</span>
                  ) : null}
                </div>
                {w.note ? <p className="mt-0.5 truncate text-sm text-bone/50">{w.note}</p> : null}
              </div>
              <span className="shrink-0 font-mono text-xs text-bone/40">{formatDate(w.date)}</span>
              <span className="w-14 shrink-0 text-right font-display text-lg text-bone num-tabular">
                {w.duration}m
              </span>
              <button
                onClick={() => onDelete(w.id)}
                disabled={busy}
                aria-label="Delete workout"
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
