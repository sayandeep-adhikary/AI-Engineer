import { useEffect, useMemo, useRef, useState } from "react";
import type { LearningUnit, Stage, Topic } from "@/data/curriculum";
import { unitsForTopic } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import type { UserProgress } from "@/state/types";
import { currentActionableUnit, topicStage, unitState } from "@/lib/selectors";
import { formatMinutes } from "@/lib/format";
import { MODE_META, STAGE_META, STAGE_ORDER } from "./meta";
import { DifficultyChip, ModeToken, TimeChip } from "./Chips";
import { Button } from "@/components/ui/Button";
import styles from "./topicflow.module.css";

const MIDDLE_STAGES: Stage[] = STAGE_ORDER.filter(
  (s) => s !== "not-started" && s !== "completed"
);

interface TopicUnitFlowProps {
  topic: Topic;
  progress: UserProgress;
  focusUnitId?: string;
}

export function TopicUnitFlow({ topic, progress, focusUnitId }: TopicUnitFlowProps) {
  const startUnit = useProgressStore((s) => s.startUnit);
  const completeUnit = useProgressStore((s) => s.completeUnit);
  const uncompleteUnit = useProgressStore((s) => s.uncompleteUnit);

  const units = useMemo(() => unitsForTopic(topic.id), [topic.id]);
  const current = topicStage(progress, topic.id);
  const currentUnit = currentActionableUnit(progress, topic.id);

  const unitsByStage = useMemo(() => {
    const map = new Map<Stage, LearningUnit[]>();
    for (const u of units) {
      const arr = map.get(u.stage) ?? [];
      arr.push(u);
      map.set(u.stage, arr);
    }
    return map;
  }, [units]);

  const activeStages = MIDDLE_STAGES.filter((s) => (unitsByStage.get(s)?.length ?? 0) > 0);

  // When the topic hasn't started, focus the stage of the next actionable unit.
  const focusStage: Stage =
    current === "not-started"
      ? currentUnit?.stage ?? activeStages[0] ?? "learning"
      : current;
  const focusIdx = STAGE_ORDER.indexOf(focusStage);

  const [openStages, setOpenStages] = useState<Set<Stage>>(() => new Set([focusStage]));
  const [openUnits, setOpenUnits] = useState<Set<string>>(
    () => new Set(currentUnit ? [currentUnit.id] : [])
  );

  // Auto-expand the focus stage / current unit as progress advances.
  useEffect(() => {
    setOpenStages((prev) => (prev.has(focusStage) ? prev : new Set(prev).add(focusStage)));
  }, [focusStage]);
  useEffect(() => {
    if (currentUnit) {
      setOpenUnits((prev) => (prev.has(currentUnit.id) ? prev : new Set(prev).add(currentUnit.id)));
    }
  }, [currentUnit]);

  const unitStageById = useMemo(
    () => new Map(units.map((u) => [u.id, u.stage] as const)),
    [units]
  );

  // Focus a specific unit (e.g. arriving from Labs): expand + scroll + focus.
  useEffect(() => {
    if (!focusUnitId) return;
    const stg = unitStageById.get(focusUnitId);
    if (!stg) return;
    setOpenStages((prev) => new Set(prev).add(stg));
    setOpenUnits((prev) => new Set(prev).add(focusUnitId));
    const t = window.setTimeout(() => {
      const el = document.getElementById(`unit-row-${focusUnitId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLButtonElement>("[data-unit-toggle]")?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [focusUnitId, unitStageById]);

  // Restrained completion acknowledgment + screen-reader announcement.
  const prevCompleted = useRef<Set<string>>(new Set(Object.keys(progress.completedUnits)));
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    const inTopic = new Set(units.map((u) => u.id));
    const keys = Object.keys(progress.completedUnits);
    const added = keys.filter((id) => !prevCompleted.current.has(id) && inTopic.has(id));
    prevCompleted.current = new Set(keys);
    if (added.length === 0) return;
    setFlashIds(new Set(added));
    const done = topicStage(progress, topic.id) === "completed";
    const title = units.find((u) => u.id === added[0])?.title ?? "";
    setAnnounce(done ? "Topic complete." : `Unit completed: ${title}`);
    const t = window.setTimeout(() => setFlashIds(new Set()), 900);
    return () => window.clearTimeout(t);
  }, [progress, topic.id, units]);

  const toggleStage = (s: Stage) =>
    setOpenStages((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  const toggleUnit = (id: string) =>
    setOpenUnits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalUnits = units.length;
  const completedUnits = units.filter((u) => progress.completedUnits[u.id]).length;
  const topicCompleted = current === "completed";

  return (
    <div className={styles.flow}>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {activeStages.map((stage) => {
        const stageUnits = unitsByStage.get(stage) ?? [];
        const meta = STAGE_META[stage];
        const allDone = stageUnits.every((u) => progress.completedUnits[u.id]);
        const stageIdx = STAGE_ORDER.indexOf(stage);
        const state: "done" | "current" | "future" = topicCompleted || allDone
          ? "done"
          : stage === focusStage
            ? "current"
            : stageIdx < focusIdx
              ? "done"
              : "future";
        const open = openStages.has(stage);
        const panelId = `stage-${stage}`;

        return (
          <section key={stage} className={`${styles.stage} ${styles[state]}`}>
            <button
              type="button"
              className={styles.stageHeader}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggleStage(stage)}
            >
              <span className={styles.stageChevron} aria-hidden="true">
                {open ? "▾" : "▸"}
              </span>
              <span
                className={styles.stageTick}
                style={{ color: `var(${meta.colorVar})` }}
                aria-hidden="true"
              >
                {state === "done" ? "✓" : meta.glyph}
              </span>
              <span className={styles.stageName}>{meta.label}</span>
              <span className={styles.stageCount + " mono"}>
                {stageUnits.filter((u) => progress.completedUnits[u.id]).length}/{stageUnits.length}
              </span>
              {state === "current" && <span className={styles.stagePill}>Current</span>}
            </button>

            {open && (
              <ul id={panelId} className={styles.units}>
                {stageUnits.map((unit) => (
                  <UnitRow
                    key={unit.id}
                    unit={unit}
                    state={unitState(progress, unit.id)}
                    isCurrent={currentUnit?.id === unit.id}
                    isOpen={openUnits.has(unit.id)}
                    justCompleted={flashIds.has(unit.id)}
                    onToggle={() => toggleUnit(unit.id)}
                    onStart={() => startUnit(unit.id)}
                    onComplete={() => completeUnit(unit.id)}
                    onUncomplete={() => uncompleteUnit(unit.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* Completed terminal state */}
      <section className={`${styles.stage} ${topicCompleted ? styles.done : styles.future}`}>
        <div className={styles.stageHeader} style={{ cursor: "default" }}>
          <span className={styles.stageChevron} aria-hidden="true" />
          <span
            className={styles.stageTick}
            style={{ color: "var(--stage-completed)" }}
            aria-hidden="true"
          >
            {topicCompleted ? "✓" : "○"}
          </span>
          <span className={styles.stageName}>Completed</span>
        </div>
        <div className={styles.completedBody}>
          {topicCompleted ? (
            <p className={styles.completedNote}>
              <span aria-hidden="true">✓</span> You've completed this topic.
            </p>
          ) : (
            <p className="caption">
              Completion criteria: complete all {totalUnits} units.{" "}
              <span className="mono">
                {completedUnits}/{totalUnits} done
              </span>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

interface UnitRowProps {
  unit: LearningUnit;
  state: "completed" | "in-progress" | "not-started";
  isCurrent: boolean;
  isOpen: boolean;
  justCompleted: boolean;
  onToggle: () => void;
  onStart: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
}

function UnitRow({
  unit,
  state,
  isCurrent,
  isOpen,
  justCompleted,
  onToggle,
  onStart,
  onComplete,
  onUncomplete,
}: UnitRowProps) {
  const modeLabel = MODE_META[unit.mode].label;
  const statusGlyph = state === "completed" ? "✓" : state === "in-progress" ? "●" : "○";
  const statusLabel =
    state === "completed" ? "Completed" : state === "in-progress" ? "In progress" : "Not started";
  const detailId = `unit-detail-${unit.id}`;

  return (
    <li
      id={`unit-row-${unit.id}`}
      className={[
        styles.unit,
        isCurrent ? styles.currentUnit : "",
        state === "completed" ? styles.completedUnit : "",
        justCompleted ? styles.justCompleted : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={isCurrent ? "true" : undefined}
    >
      <div className={styles.unitTop}>
        <button
          type="button"
          data-unit-toggle
          className={styles.unitToggle}
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          <span
            className={styles.unitStatus}
            style={{
              color:
                state === "completed"
                  ? "var(--stage-completed)"
                  : state === "not-started"
                    ? "var(--text-muted)"
                    : "var(--accent)",
            }}
            aria-hidden="true"
          >
            {statusGlyph}
          </span>
          <span className={styles.unitTitle}>{unit.title}</span>
          {isCurrent && <span className={styles.nextTag}>NEXT</span>}
          <span className="sr-only">— {statusLabel}</span>
        </button>

        <div className={styles.unitAction}>
          {state === "completed" ? (
            <Button variant="ghost" onClick={onUncomplete} title="Mark incomplete">
              ✓ Completed
            </Button>
          ) : state === "in-progress" ? (
            <Button variant="primary" onClick={onComplete}>
              Mark complete ✓
            </Button>
          ) : (
            <Button variant={isCurrent ? "primary" : "secondary"} onClick={onStart}>
              Start →
            </Button>
          )}
        </div>
      </div>

      <div className={styles.unitMeta}>
        <ModeToken mode={unit.mode} />
        <TimeChip label={formatMinutes(unit.estimatedMinutes)} />
        <DifficultyChip difficulty={unit.difficulty} />
      </div>

      {isOpen && (
        <div id={detailId} className={styles.unitDetail}>
          <p className={styles.unitDesc}>{unit.description}</p>
          <div className={styles.unitBlock}>
            <span className="overline">Instructions · {modeLabel}</span>
            <p>{unit.instructions}</p>
          </div>
          <div className={styles.unitBlock}>
            <span className="overline">Completion criteria</span>
            <p>{unit.completionCriteria}</p>
          </div>
        </div>
      )}
    </li>
  );
}
