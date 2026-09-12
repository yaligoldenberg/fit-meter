import { PersonalRecords } from "@/lib/records";
import { Locale, t } from "@/lib/i18n";
import { typeLabel, WorkoutTypeKey, WORKOUT_TYPES } from "@/lib/workoutTypes";

/**
 * Personal bests. The counterweight to the leaderboard: progress measured against
 * your own history, which is the only comparison available to someone who is last.
 */
export default function RecordsCard({
  records,
  locale,
}: {
  records: PersonalRecords;
  locale: Locale;
}) {
  const { hardestSession, longestSession, furthestByType } = records;
  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  if (!hardestSession && !longestSession && furthestByType.length === 0) {
    return (
      <div className="rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
        <h2 className="font-display text-2xl text-bone">{t(locale, "records_heading").toUpperCase()}</h2>
        <p className="mt-3 text-sm text-bone/50">{t(locale, "records_none")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-coal-600 bg-coal-800 p-6 md:p-8">
      <h2 className="font-display text-2xl text-bone">{t(locale, "records_heading").toUpperCase()}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {hardestSession && (
          <Record
            label={t(locale, "record_hardest")}
            value={`${hardestSession.effort}`}
            meta={`${typeLabel(hardestSession.type as WorkoutTypeKey, locale)} · ${dateFmt.format(hardestSession.date)}`}
            icon={WORKOUT_TYPES[hardestSession.type as WorkoutTypeKey]?.icon ?? "•"}
          />
        )}
        {longestSession && (
          <Record
            label={t(locale, "record_longest")}
            value={`${longestSession.duration} ${t(locale, "unit_min")}`}
            meta={`${typeLabel(longestSession.type as WorkoutTypeKey, locale)} · ${dateFmt.format(longestSession.date)}`}
            icon={WORKOUT_TYPES[longestSession.type as WorkoutTypeKey]?.icon ?? "•"}
          />
        )}
        {furthestByType.slice(0, 4).map((record) => (
          <Record
            key={record.type}
            label={`${t(locale, "record_furthest")} · ${typeLabel(record.type, locale)}`}
            value={`${record.distanceKm} ${t(locale, "unit_km")}`}
            meta={dateFmt.format(record.date)}
            icon={WORKOUT_TYPES[record.type]?.icon ?? "•"}
          />
        ))}
      </div>
    </div>
  );
}

function Record({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string;
  meta: string;
  icon: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-coal-600 bg-coal-900 px-4 py-3">
      <span className="text-lg text-volt">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{label}</p>
        <p className="font-display text-lg text-bone num-tabular">{value}</p>
        <p className="truncate text-xs text-bone/40">{meta}</p>
      </div>
    </div>
  );
}
