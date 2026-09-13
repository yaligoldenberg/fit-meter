import { WeekTitle, tierColor, tierBorder } from "@/lib/weeklyTitles";

export default function WeekTitleBadge({
  weekTitle,
  compact = false,
}: {
  weekTitle: WeekTitle;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{weekTitle.emoji}</span>
        <span className={`font-display text-lg leading-none ${tierColor(weekTitle.tier)}`}>
          {weekTitle.title}
        </span>
      </div>
    );
  }

  return (
    <div className={`border-s-[3px] ${tierBorder(weekTitle.tier)} bg-chalk py-3 ps-4 pe-4`}>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{weekTitle.emoji}</span>
        <span className={`font-display text-4xl leading-none ${tierColor(weekTitle.tier)}`}>
          {weekTitle.title}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate">{weekTitle.reason}</p>
    </div>
  );
}
