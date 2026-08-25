import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LearningMode } from "@/data/curriculum";
import { isPrimaryCategory, orderedCategories } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import {
  categoryProgress,
  corePathProgress,
  journeyPosition,
  optionalDepthProgress,
  streakDays,
} from "@/lib/selectors";
import {
  activeDaysInWindow,
  activityByDay,
  eventsInRange,
  modeBalance,
  skillDistribution,
  timeInvested,
  unitsCompletedInRange,
  velocitySeries,
  type Range,
} from "@/lib/analytics";
import { formatMinutes, formatPercent } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ActivityTimeline } from "@/components/domain/ActivityTimeline";
import { BarRow, ContributionGrid, Sparkline } from "@/components/domain/charts";
import { MODE_META } from "@/components/domain/meta";
import styles from "./analytics.module.css";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];
const RANGE_LABEL: Record<Range, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: "all time",
};
const MODE_ORDER: LearningMode[] = ["learn", "practice", "build", "review", "project"];

export function AnalyticsPage() {
  const progress = useProgressStore();
  const [range, setRange] = useState<Range>("30d");

  const core = corePathProgress(progress);
  const optional = optionalDepthProgress(progress);
  const streak = streakDays(progress);
  const grid = useMemo(() => activityByDay(progress, 30), [progress]);
  const activeDays = useMemo(() => activeDaysInWindow(progress, 30), [progress]);
  const time = useMemo(() => timeInvested(progress, range), [progress, range]);
  const velocity = useMemo(() => velocitySeries(progress, range), [progress, range]);
  const modes = useMemo(() => modeBalance(progress, range), [progress, range]);
  const skillCov = useMemo(() => skillDistribution(progress).slice(0, 12), [progress]);
  const rangeEvents = useMemo(() => eventsInRange(progress, range), [progress, range]);
  const rangeUnits = unitsCompletedInRange(progress, range);
  const currentCatId = journeyPosition(progress).currentCategory?.id;

  const modeMax = Math.max(1, ...MODE_ORDER.map((m) => modes.counts[m]));

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className={styles.header}>
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          <Breadcrumb items={[{ label: "Analytics" }]} />
          <h1>Analytics</h1>
          <p className="text-secondary" style={{ maxWidth: "60ch" }}>
            Your learning instrument panel. Progress metrics reflect current state; activity, time,
            velocity and mode balance follow the selected range.
          </p>
        </div>
        <SegmentedControl<Range>
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          ariaLabel="Analytics time range"
        />
      </div>

      {/* Top summary */}
      <div className={styles.grid3}>
        <Panel overline="Core Completion" title={formatPercent(core)}>
          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <ProgressBar ratio={core} label="Core path completion" />
            <span className="caption">How far on the core path?</span>
            <div className={styles.optionalRow}>
              <span className="overline">Optional depth · separate</span>
              <div className={styles.optionalBar}>
                <ProgressBar ratio={optional} label="Optional-depth completion" />
                <span className="mono caption">{formatPercent(optional)}</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel overline="Consistency" title={`${streak}d streak`}>
          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <ContributionGrid cells={grid} activeDays={activeDays} />
            <span className="caption">
              {activeDays === 0
                ? "No activity in the last 30 days."
                : `Active ${activeDays} of the last 30 days · Am I consistent?`}
            </span>
          </div>
        </Panel>

        <Panel overline="Time Invested" title={time.tracked ? formatMinutes(time.minutes) : "Not tracked"}>
          {time.tracked ? (
            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <span className="caption mono">
                {time.sessionCount} session{time.sessionCount === 1 ? "" : "s"} · {RANGE_LABEL[range]}
              </span>
              <span className="caption">Explicitly logged time only — never inferred.</span>
            </div>
          ) : (
            <EmptyState
              title="No logged sessions"
              description="Use “Log session” in a topic to explicitly track time. Time is never inferred."
              icon={<span style={{ fontSize: "1.25rem", color: "var(--text-faint)" }}>⧗</span>}
            />
          )}
        </Panel>
      </div>

      {/* Category progress + Skill distribution */}
      <div className={styles.grid2}>
        <Panel overline="Category Progress" title="Which phases need attention?">
          <ul className={styles.catList}>
            {orderedCategories.map((cat) => {
              const ratio = categoryProgress(progress, cat.id);
              const isCurrent = cat.id === currentCatId;
              return (
                <li key={cat.id} className={`${styles.catRow} ${isCurrent ? styles.catCurrent : ""}`}>
                  <span className={styles.catName}>
                    {isCurrent && <span className={styles.catDot} aria-hidden="true">●</span>}
                    {cat.title}
                    {!isPrimaryCategory(cat) && <span className={styles.catOpt}> · opt</span>}
                  </span>
                  <span className={styles.catBar}>
                    <ProgressBar ratio={ratio} label={`${cat.title} progress`} />
                  </span>
                  <span className={styles.catPct + " mono"}>{formatPercent(ratio)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel overline="Skill Distribution" title="Where am I strong / thin?">
          <div className={styles.bars}>
            {skillCov.map((s) => (
              <BarRow
                key={s.id}
                label={s.name}
                value={s.completed}
                max={s.total}
                suffix={`/${s.total}`}
              />
            ))}
          </div>
          <span className="caption" style={{ display: "block", marginTop: "var(--space-3)" }}>
            Coverage = completed topics per skill (cumulative).
          </span>
        </Panel>
      </div>

      {/* Velocity + Mode balance */}
      <div className={styles.grid2}>
        <Panel overline="Velocity" title="Am I speeding up or stalling?">
          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <Sparkline
              points={velocity.points}
              ariaLabel={`Units completed per ${velocity.unit} over ${RANGE_LABEL[range]}: ${velocity.total} total`}
            />
            <span className="caption mono">
              {velocity.total} unit{velocity.total === 1 ? "" : "s"} · per {velocity.unit} · {RANGE_LABEL[range]}
            </span>
            {velocity.total === 0 && (
              <span className="caption">No completed units in this range yet.</span>
            )}
          </div>
        </Panel>

        <Panel overline="Learning Mode Balance" title="Building, not just reading?">
          {modes.total === 0 ? (
            <EmptyState
              title="Not enough activity"
              description="Complete a few units to see your Learn / Practice / Build / Review / Project balance."
            />
          ) : (
            <div className={styles.bars}>
              {MODE_ORDER.map((m) => (
                <BarRow
                  key={m}
                  label={MODE_META[m].label}
                  value={modes.counts[m]}
                  max={modeMax}
                  accent
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel
        overline="Recent Activity"
        title="Changelog"
        actions={
          <Link to="/analytics/activity" className={styles.viewAll}>
            View full activity →
          </Link>
        }
      >
        <ActivityTimeline
          events={rangeEvents}
          limit={8}
          emptyTitle="No activity in this range"
          emptyDescription={`Nothing recorded in the ${RANGE_LABEL[range]}. Try a wider range.`}
        />
        {rangeEvents.length > 0 && (
          <span className="caption" style={{ display: "block", marginTop: "var(--space-3)" }}>
            {rangeEvents.length} event{rangeEvents.length === 1 ? "" : "s"} · {rangeUnits} unit
            {rangeUnits === 1 ? "" : "s"} completed · {RANGE_LABEL[range]}
          </span>
        )}
      </Panel>
    </div>
  );
}
