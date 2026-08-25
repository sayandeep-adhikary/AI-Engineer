interface ProgressBarProps {
  ratio: number; // 0..1
  label?: string;
  className?: string;
}

export function ProgressBar({ ratio, label, className = "" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      className={`sg-progress ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? "Progress"}
    >
      <div className="sg-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
