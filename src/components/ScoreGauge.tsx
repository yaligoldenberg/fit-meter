import { gradeColor } from "@/lib/scoring";

export default function ScoreGauge({ score, grade, size = 220 }: { score: number; grade: string; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashValue = circumference * (1 - score / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1c211e" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#d7ff3f"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          className="dial-sweep"
          style={
            {
              "--dash-full": circumference,
              "--dash-value": dashValue,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-display text-6xl leading-none ${gradeColor(grade)}`}>{grade}</span>
        <span className="mt-1 font-mono text-sm text-bone/50 num-tabular">{score}/100</span>
      </div>
    </div>
  );
}
