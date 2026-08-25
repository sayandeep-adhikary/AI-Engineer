import type { CSSProperties } from "react";
import type { Stage } from "@/data/curriculum";
import { STAGE_META, STAGE_ORDER } from "./meta";
import styles from "./stagerail.module.css";

interface StageRailProps {
  applicableStages: Stage[];
  current: Stage;
  variant?: "full" | "compact";
  className?: string;
}

// Signature component: the six-stage progression as a segmented instrument gauge.
// Stage is distinct from mode and is rendered only here.
export function StageRail({
  applicableStages,
  current,
  variant = "full",
  className = "",
}: StageRailProps) {
  // Preserve canonical order, keep only applicable stages.
  const stages = STAGE_ORDER.filter((s) => applicableStages.includes(s));
  const currentIdx = stages.indexOf(current);
  const total = stages.length;
  const currentMeta = STAGE_META[current];
  const valueText = `${currentMeta.label}, step ${Math.max(currentIdx, 0) + 1} of ${total}`;

  return (
    <div
      className={`${styles.rail} ${variant === "compact" ? styles.compact : ""} ${className}`}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.max(currentIdx, 0) + 1}
      aria-valuetext={valueText}
    >
      {stages.map((stage, i) => {
        const meta = STAGE_META[stage];
        const state =
          i < currentIdx || current === "completed"
            ? "done"
            : i === currentIdx
              ? "current"
              : "future";
        return (
          <div
            key={stage}
            className={`${styles.segment} ${styles[state]}`}
            style={{ "--stage-color": `var(${meta.colorVar})` } as CSSProperties}
          >
            <span className={styles.tick} aria-hidden="true">
              <span className={styles.glyph}>{meta.glyph}</span>
            </span>
            {variant === "full" && <span className={styles.label}>{meta.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
