import { Link } from "react-router-dom";
import type { LabItem } from "@/lib/selectors";
import type { UnitState } from "@/lib/selectors";
import { formatMinutes } from "@/lib/format";
import { DifficultyChip, ModeToken, TimeChip, TrackChip } from "./Chips";
import styles from "./labrow.module.css";

const STATUS: Record<UnitState, { glyph: string; label: string; colorVar: string }> = {
  completed: { glyph: "✓", label: "Completed", colorVar: "--stage-completed" },
  "in-progress": { glyph: "●", label: "In progress", colorVar: "--accent" },
  "not-started": { glyph: "○", label: "Not started", colorVar: "--text-muted" },
};

interface LabRowProps {
  item: LabItem;
  state: UnitState;
}

// Links back into the Topic Workspace with the unit focused — no duplicate content.
export function LabRow({ item, state }: LabRowProps) {
  const { unit, topic, category } = item;
  const status = STATUS[state];
  const to = `/roadmap/${category.id}/${topic.id}?unit=${unit.id}`;

  return (
    <li>
      <Link to={to} className={styles.row} aria-label={`Open lab: ${unit.title} (${status.label})`}>
        <span className={styles.main}>
          <span className={styles.head}>
            <span
              className={styles.status}
              style={{ color: `var(${status.colorVar})` }}
              aria-hidden="true"
            >
              {status.glyph}
            </span>
            <span className={styles.title}>{unit.title}</span>
            <span className="sr-only">— {status.label}</span>
          </span>
          <span className={styles.source}>
            <span className="caption">{topic.title}</span>
            <span className="caption text-muted"> · {category.title}</span>
          </span>
          <span className={styles.chips}>
            <ModeToken mode={unit.mode} />
            <TimeChip label={formatMinutes(unit.estimatedMinutes)} />
            <DifficultyChip difficulty={unit.difficulty} />
            <TrackChip track={topic.track} />
          </span>
        </span>
        <span className={styles.action} aria-hidden="true">
          Open lab →
        </span>
      </Link>
    </li>
  );
}
