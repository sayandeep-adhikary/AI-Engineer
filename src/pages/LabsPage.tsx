import { useMemo, useState } from "react";
import type { LearningMode, Track } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import { allLabs, recommendedLab, unitState, type UnitState } from "@/lib/selectors";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LabRow } from "@/components/domain/LabRow";
import styles from "./labs.module.css";

type ModeFilter = "all" | Extract<LearningMode, "practice" | "build" | "review" | "project">;
type StatusFilter = "all" | UnitState;
type TrackFilter = "all" | Track;
type Sort = "recommended" | "curriculum" | "time" | "status";

const MODE_OPTIONS: { value: ModeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "practice", label: "Practice" },
  { value: "build", label: "Build" },
  { value: "review", label: "Review" },
  { value: "project", label: "Project" },
];
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not-started", label: "Not Started" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];
const TRACK_OPTIONS: { value: TrackFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "core", label: "CORE" },
  { value: "useful", label: "USEFUL" },
  { value: "optional-depth", label: "OPT · DEPTH" },
];
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "curriculum", label: "Curriculum" },
  { value: "time", label: "Time" },
  { value: "status", label: "Status" },
];

export function LabsPage() {
  const progress = useProgressStore();
  const [mode, setMode] = useState<ModeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [track, setTrack] = useState<TrackFilter>("all");
  const [sort, setSort] = useState<Sort>("recommended");

  const base = useMemo(() => allLabs().map((l, index) => ({ ...l, index })), []);
  const recommended = useMemo(() => recommendedLab(progress), [progress]);

  const statusRank = (id: string): number => {
    const s = unitState(progress, id);
    return s === "in-progress" ? 0 : s === "not-started" ? 1 : 2;
  };

  const rows = useMemo(() => {
    let r = base.filter(
      (l) =>
        (mode === "all" || l.unit.mode === mode) &&
        (track === "all" || l.topic.track === track) &&
        (status === "all" || unitState(progress, l.unit.id) === status)
    );
    if (sort === "recommended" || sort === "status") {
      r = [...r].sort((a, b) => statusRank(a.unit.id) - statusRank(b.unit.id) || a.index - b.index);
    } else if (sort === "time") {
      r = [...r].sort((a, b) => a.unit.estimatedMinutes - b.unit.estimatedMinutes || a.index - b.index);
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, progress, mode, status, track, sort]);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Breadcrumb items={[{ label: "Practice / Labs" }]} />
        <h1>Practice / Labs</h1>
        <p className="text-secondary" style={{ maxWidth: "62ch" }}>
          The hands-on surface. Every Practice, Build, Review and Project unit across the curriculum
          — open one to work on it inside its topic.
        </p>
      </div>

      {/* Filters + sort */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <span className="overline">Mode</span>
          <SegmentedControl<ModeFilter> options={MODE_OPTIONS} value={mode} onChange={setMode} ariaLabel="Filter by mode" size="sm" />
        </div>
        <div className={styles.filterGroup}>
          <span className="overline">Status</span>
          <SegmentedControl<StatusFilter> options={STATUS_OPTIONS} value={status} onChange={setStatus} ariaLabel="Filter by status" size="sm" />
        </div>
        <div className={styles.filterGroup}>
          <span className="overline">Track</span>
          <SegmentedControl<TrackFilter> options={TRACK_OPTIONS} value={track} onChange={setTrack} ariaLabel="Filter by track" size="sm" />
        </div>
        <div className={styles.filterGroup}>
          <span className="overline">Sort</span>
          <SegmentedControl<Sort> options={SORT_OPTIONS} value={sort} onChange={setSort} ariaLabel="Sort labs" size="sm" />
        </div>
      </div>

      {/* Recommended next */}
      {recommended && (
        <Panel overline="Recommended next" title="Your next lab" className={styles.recommended}>
          <ul className={styles.list}>
            <LabRow item={recommended} state={unitState(progress, recommended.unit.id)} />
          </ul>
        </Panel>
      )}

      {/* All labs */}
      <Panel
        overline="All labs"
        title={`${rows.length} lab${rows.length === 1 ? "" : "s"}`}
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No labs match these filters"
            description="Adjust the mode, status or track filters to see more."
          />
        ) : (
          <ul className={styles.list}>
            {rows.map((l) => (
              <LabRow key={l.unit.id} item={l} state={unitState(progress, l.unit.id)} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
