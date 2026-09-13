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
      <div className="sheet p-6 md:p-9">
        <h2 className="font-display text-3xl leading-none text-ink">
          {t(locale, "records_heading")}
        </h2>
        <p className="mt-3 text-sm text-slate">{t(locale, "records_none")}</p>
      </div>
    );
  }

  return (
    <div className="sheet p-6 md:p-9">
      <h2 className="font-display text-3xl leading-none text-ink">
        {t(locale, "records_heading")}
      </h2>
      <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
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
    <div className="flex items-start gap-3 border-t border-rule pt-4">
      <span className="text-lg text-slate-light">{icon}</span>
      <div className="min-w-0">
        <p className="caption">{label}</p>
        <p className="mt-2 font-display text-2xl leading-none text-ink num-tabular">{value}</p>
        <p className="mt-1.5 truncate text-[13px] text-slate-light">{meta}</p>
      </div>
    </div>
  );
}
