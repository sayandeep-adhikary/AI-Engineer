import type { Track, Difficulty } from "@/data/curriculum";
import { DIFFICULTY_LABEL, MODE_META, STAGE_META, TRACK_META } from "./meta";
import type { LearningMode, Stage } from "@/data/curriculum";
import styles from "./chips.module.css";

export function TrackChip({ track }: { track: Track }) {
  const m = TRACK_META[track];
  return (
    <span className={`sg-chip ${styles.track} ${styles[`track_${track.replace("-", "_")}`]}`}>
      <span aria-hidden="true">{m.glyph}</span>
      {m.label}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage];
  return (
    <span className="sg-chip" style={{ color: `var(${m.colorVar})`, borderColor: "var(--border-subtle)" }}>
      <span aria-hidden="true">{m.glyph}</span>
      {m.label}
    </span>
  );
}

export function ModeToken({ mode, showLabel = true }: { mode: LearningMode; showLabel?: boolean }) {
  const m = MODE_META[mode];
  return (
    <span className={`sg-chip ${styles.mode}`} title={`Mode: ${m.label}`}>
      <span aria-hidden="true">{m.glyph}</span>
      {showLabel && m.label}
      {!showLabel && <span className="sr-only">{m.label}</span>}
    </span>
  );
}

export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return <span className="sg-chip">◆ {DIFFICULTY_LABEL[difficulty]}</span>;
}

export function TimeChip({ label }: { label: string }) {
  return (
    <span className="sg-chip">
      <span aria-hidden="true">⧗</span>
      {label}
    </span>
  );
}
