import type { DayCell } from "@/lib/analytics";
import styles from "./charts.module.css";

function intensityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

interface ContributionGridProps {
  cells: DayCell[];
  activeDays: number;
}

// 30-day activity heatmap. Colour is reinforced by per-cell titles + a summary.
export function ContributionGrid({ cells, activeDays }: ContributionGridProps) {
  return (
    <div
      className={styles.gridWrap}
      role="img"
      aria-label={`${activeDays} active days in the last ${cells.length} days`}
    >
      <div className={styles.grid}>
        {cells.map((c) => (
          <span
            key={c.date}
            className={`${styles.cell} ${styles[`lvl${intensityLevel(c.count)}`]}`}
            title={`${c.date}: ${c.count} event${c.count === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <div className={styles.legend}>
        <span className="caption">Less</span>
        <span className={`${styles.cell} ${styles.lvl0}`} aria-hidden="true" />
        <span className={`${styles.cell} ${styles.lvl1}`} aria-hidden="true" />
        <span className={`${styles.cell} ${styles.lvl2}`} aria-hidden="true" />
        <span className={`${styles.cell} ${styles.lvl3}`} aria-hidden="true" />
        <span className="caption">More</span>
      </div>
    </div>
  );
}

interface SparklineProps {
  points: number[];
  ariaLabel: string;
}

// Minimal SVG sparkline — no chart library.
export function Sparkline({ points, ariaLabel }: SparklineProps) {
  const w = 100;
  const h = 32;
  const max = Math.max(1, ...points);
  const n = points.length;
  const coords = points.map((v, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r={1.6} fill="var(--accent)" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  accent?: boolean;
}

/** A labelled horizontal bar — used for mode balance / skill distribution. */
export function BarRow({ label, value, max, suffix, accent = false }: BarRowProps) {
  const pct = max <= 0 ? 0 : (value / max) * 100;
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <span className={styles.barTrack} aria-hidden="true">
        <span
          className={`${styles.barFill} ${accent ? styles.barFillAccent : ""}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className={styles.barValue + " mono"}>
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}
