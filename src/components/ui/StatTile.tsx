import type { ReactNode } from "react";

interface StatTileProps {
  value: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
}

export function StatTile({ value, label, hint }: StatTileProps) {
  return (
    <div className="sg-stat">
      <span className="sg-stat__value mono">{value}</span>
      <span className="sg-stat__label">{label}</span>
      {hint && <span className="caption">{hint}</span>}
    </div>
  );
}
