import { gradeColor } from "@/lib/scoring";

/** The one drawn object on the sheet: a dial reading 0–100, with the grade at its centre. */
export default function ScoreGauge({
  score,
  grade,
  size = 200,
}: {
  score: number;
  grade: string;
  size?: number;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashValue = circumference * (1 - score / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="text-chalk-200"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="dial-sweep text-signal"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          // The resting value lives on the circle itself; the sweep only animates towards
          // it, so with reduced motion (animation off) the dial still reads the score.
          strokeDashoffset={dashValue}
          style={
            {
              "--dash-full": circumference,
              "--dash-value": dashValue,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-display text-7xl leading-none ${gradeColor(grade)}`}>{grade}</span>
        <span className="mt-1 text-sm text-slate num-tabular">{score}/100</span>
      </div>
    </div>
  );
}
