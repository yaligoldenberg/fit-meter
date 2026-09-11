import { WeekTitle, tierColor, tierBorder } from "@/lib/weeklyTitles";

export default function WeekTitleBadge({ weekTitle, compact = false }: { weekTitle: WeekTitle; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{weekTitle.emoji}</span>
        <span className={`font-display text-sm tracking-wide ${tierColor(weekTitle.tier)}`}>
          {weekTitle.title.toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${tierBorder(weekTitle.tier)} bg-coal-700/60 px-5 py-4`}>
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">{weekTitle.emoji}</span>
        <span className={`font-display text-xl tracking-wide ${tierColor(weekTitle.tier)}`}>
          {weekTitle.title.toUpperCase()}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-bone/60">{weekTitle.reason}</p>
    </div>
  );
}
