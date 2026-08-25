import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Category, Topic, Track } from "@/data/curriculum";
import { orderedCategories, topicById, topicsForCategory } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import {
  categoryProgress,
  isTopicCompleted,
  journeyPosition,
  nextBestAction,
  topicProgress,
  topicStage,
} from "@/lib/selectors";
import { formatHours, formatPercent } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DifficultyChip, StageBadge, TimeChip, TrackChip } from "@/components/domain/Chips";
import { DIFFICULTY_LABEL } from "@/components/domain/meta";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { UserProgress } from "@/state/types";
import styles from "./roadmap.module.css";

type View = "map" | "list";
type Filter = "all" | Track;
type Progress = UserProgress;

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "core", label: "CORE" },
  { value: "useful", label: "USEFUL" },
  { value: "optional-depth", label: "OPT · DEPTH" },
];

const VIEW_OPTIONS: { value: View; label: string; glyph: string }[] = [
  { value: "map", label: "Map", glyph: "⌗" },
  { value: "list", label: "List", glyph: "≣" },
];

function statusOf(ratio: number): { label: string; cls: string } {
  if (ratio >= 1) return { label: "Completed", cls: styles.done };
  if (ratio > 0) return { label: "In Progress", cls: styles.inprogress };
  return { label: "Not Started", cls: styles.notstarted };
}

function matchesFilter(topic: Topic, filter: Filter): boolean {
  return filter === "all" || topic.track === filter;
}

/** Advisory dependency text — never a blocker. */
function buildsOnText(topic: Topic): string | null {
  if (topic.recommendedAfter.length === 0) return null;
  const names = topic.recommendedAfter
    .map((id) => topicById.get(id)?.title)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return null;
  const shown = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` +${names.length - 2}` : "";
  return `Builds on · ${shown}${extra}`;
}

export function RoadmapPage() {
  const progress = useProgressStore();
  const [view, setView] = useState<View>("map");
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 720px)");

  const nba = useMemo(() => nextBestAction(progress), [progress]);
  const journey = useMemo(() => journeyPosition(progress), [progress]);
  const currentCategoryId = journey.currentCategory?.id ?? orderedCategories[0]?.id ?? "";
  const nbaTopicId = nba.topic.id;

  // Effective expansion: explicit choice wins; '' = collapsed; null = default to current.
  const effectiveExpanded =
    expandedId === null ? currentCategoryId : expandedId === "" ? null : expandedId;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => {
      const cur = prev === null ? currentCategoryId : prev === "" ? null : prev;
      return cur === id ? "" : id;
    });
  };

  const mapProps: MapProps = {
    progress,
    filter,
    currentCategoryId,
    nbaTopicId,
    effectiveExpanded,
    onToggle: toggleExpand,
  };

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Breadcrumb items={[{ label: "Roadmap" }]} />
        <h1>Roadmap</h1>
        <p className="text-secondary" style={{ maxWidth: "62ch" }}>
          The AI Engineer journey as a progression spine. Dashed phases are optional depth — a
          deliberate branch, not unfinished work. Prerequisites are advisory; nothing is ever locked.
        </p>
      </div>

      <div className={styles.toolbar}>
        <SegmentedControl<Filter>
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter by track"
          size="sm"
        />
        <SegmentedControl<View>
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          ariaLabel="Roadmap view"
        />
      </div>

      <p className={styles.youAreHere}>
        <span aria-hidden="true">●</span> You are here:{" "}
        <span className="mono">
          Phase {journey.index} · {journey.currentCategory?.title}
        </span>{" "}
        → {nba.topic.title}
      </p>

      {view === "list" ? (
        <ListView progress={progress} filter={filter} nbaTopicId={nbaTopicId} />
      ) : isMobile ? (
        <MobileMap {...mapProps} />
      ) : (
        <DesktopMap {...mapProps} />
      )}
    </div>
  );
}

interface MapProps {
  progress: Progress;
  filter: Filter;
  currentCategoryId: string;
  nbaTopicId: string;
  effectiveExpanded: string | null;
  onToggle: (id: string) => void;
}

function PhaseCardButton({
  cat,
  progress,
  filter,
  isCurrent,
  isExpanded,
  onToggle,
}: {
  cat: Category;
  progress: Progress;
  filter: Filter;
  isCurrent: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const ratio = categoryProgress(progress, cat.id);
  const status = statusOf(ratio);
  const isOptional = cat.track === "optional-depth";
  const matchCount = topicsForCategory(cat.id).filter((t) => matchesFilter(t, filter)).length;

  return (
    <button
      type="button"
      onClick={() => onToggle(cat.id)}
      className={[
        styles.phase,
        isOptional ? styles.optional : "",
        isCurrent ? styles.current : "",
        isExpanded ? styles.expandedCard : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-expanded={isExpanded}
      aria-controls={`phase-panel-${cat.id}`}
      aria-current={isCurrent ? "step" : undefined}
    >
      <span className={styles.phaseTop}>
        <span className={styles.phaseNum + " mono"}>{String(cat.order).padStart(2, "0")}</span>
        <TrackChip track={cat.track} />
      </span>
      <span className={styles.phaseTitle}>{cat.title}</span>
      <span className={styles.phaseMeta}>
        <TimeChip label={formatHours(cat.estimatedHours)} />
        <span className={`${styles.status} ${status.cls}`}>{status.label}</span>
      </span>
      <ProgressBar ratio={ratio} label={`${cat.title} progress`} />
      <span className={styles.phaseFoot}>
        <span className="mono caption">{formatPercent(ratio)}</span>
        {filter !== "all" ? (
          <span className="mono caption">{matchCount} match</span>
        ) : isCurrent ? (
          <span className={styles.hereTag}>● You are here</span>
        ) : null}
      </span>
    </button>
  );
}

function DesktopMap({ progress, filter, currentCategoryId, nbaTopicId, effectiveExpanded, onToggle }: MapProps) {
  const expandedCat = effectiveExpanded
    ? orderedCategories.find((c) => c.id === effectiveExpanded)
    : null;
  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className={styles.spine} role="list" aria-label="Learning phases">
        {orderedCategories.map((cat) => (
          <div role="listitem" key={cat.id}>
            <PhaseCardButton
              cat={cat}
              progress={progress}
              filter={filter}
              isCurrent={cat.id === currentCategoryId}
              isExpanded={cat.id === effectiveExpanded}
              onToggle={onToggle}
            />
          </div>
        ))}
      </div>
      {expandedCat && (
        <ExpandedPhase cat={expandedCat} progress={progress} filter={filter} nbaTopicId={nbaTopicId} />
      )}
    </div>
  );
}

function MobileMap({ progress, filter, currentCategoryId, nbaTopicId, effectiveExpanded, onToggle }: MapProps) {
  return (
    <div className={styles.accordion} role="list" aria-label="Learning phases">
      {orderedCategories.map((cat) => {
        const isExpanded = cat.id === effectiveExpanded;
        return (
          <div role="listitem" key={cat.id} className={styles.accordionItem}>
            <PhaseCardButton
              cat={cat}
              progress={progress}
              filter={filter}
              isCurrent={cat.id === currentCategoryId}
              isExpanded={isExpanded}
              onToggle={onToggle}
            />
            {isExpanded && (
              <ExpandedPhase cat={cat} progress={progress} filter={filter} nbaTopicId={nbaTopicId} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpandedPhase({
  cat,
  progress,
  filter,
  nbaTopicId,
}: {
  cat: Category;
  progress: Progress;
  filter: Filter;
  nbaTopicId: string;
}) {
  const ratio = categoryProgress(progress, cat.id);
  const topics = topicsForCategory(cat.id).filter((t) => matchesFilter(t, filter));

  return (
    <section
      id={`phase-panel-${cat.id}`}
      className={`sg-panel ${styles.expandedPanel} ${
        cat.track === "optional-depth" ? styles.optionalPanel : ""
      }`}
      aria-label={`${cat.title} topics`}
    >
      <div className={styles.expandedHeader}>
        <div className="stack" style={{ gap: "var(--space-1)" }}>
          <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span className="mono text-muted">Phase {String(cat.order).padStart(2, "0")}</span>
            <TrackChip track={cat.track} />
            <span className="sg-chip">
              ◆ {DIFFICULTY_LABEL[cat.difficulty.from]}
              {cat.difficulty.from !== cat.difficulty.to
                ? ` → ${DIFFICULTY_LABEL[cat.difficulty.to]}`
                : ""}
            </span>
            <TimeChip label={formatHours(cat.estimatedHours)} />
          </div>
          <h3 style={{ marginTop: "var(--space-1)" }}>{cat.title}</h3>
        </div>
        <div className={styles.expandedProgress}>
          <span className="mono" style={{ fontSize: "1.125rem" }}>
            {formatPercent(ratio)}
          </span>
          <ProgressBar ratio={ratio} label={`${cat.title} progress`} />
          <Link to={`/roadmap/${cat.id}`} className={styles.openPhase}>
            Open phase →
          </Link>
        </div>
      </div>

      {topics.length === 0 ? (
        <p className="caption" style={{ paddingTop: "var(--space-3)" }}>
          No matching topics under this filter.
        </p>
      ) : (
        <ul className={styles.topicRows}>
          {topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              categoryId={cat.id}
              progress={progress}
              isCurrent={topic.id === nbaTopicId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TopicRow({
  topic,
  categoryId,
  progress,
  isCurrent,
}: {
  topic: Topic;
  categoryId: string;
  progress: Progress;
  isCurrent: boolean;
}) {
  const stage = topicStage(progress, topic.id);
  const tp = topicProgress(progress, topic.id);
  const completed = isTopicCompleted(progress, topic.id);
  const isOptional = topic.track === "optional-depth";
  const buildsOn = buildsOnText(topic);

  return (
    <li>
      <Link
        to={`/roadmap/${categoryId}/${topic.id}`}
        className={[
          styles.topicRow,
          isOptional ? styles.optionalRow : "",
          isCurrent ? styles.currentRow : "",
          completed ? styles.completedRow : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={isCurrent ? "true" : undefined}
      >
        <span className={styles.topicMain}>
          <span className={styles.topicHead}>
            {isCurrent && (
              <span className={styles.currentDot} aria-hidden="true">
                ●
              </span>
            )}
            {completed && (
              <span className={styles.checkDot} aria-hidden="true">
                ✓
              </span>
            )}
            <span className={styles.topicTitle}>{topic.title}</span>
          </span>
          <span className={styles.topicChips}>
            <TrackChip track={topic.track} />
            <DifficultyChip difficulty={topic.difficulty} />
            <TimeChip label={formatHours(topic.estimatedHours)} />
            <span className="caption mono">
              {tp.completed}/{tp.total} units
            </span>
          </span>
          {(isCurrent || buildsOn) && (
            <span className={styles.advisory}>
              {isCurrent ? (
                <span className={styles.suggested}>Suggested next</span>
              ) : (
                <span className="caption">{buildsOn}</span>
              )}
            </span>
          )}
        </span>
        <span className={styles.topicSide}>
          <StageBadge stage={stage} />
          <ProgressBar ratio={tp.ratio} label={`${topic.title} progress`} />
        </span>
      </Link>
    </li>
  );
}

function ListView({
  progress,
  filter,
  nbaTopicId,
}: {
  progress: Progress;
  filter: Filter;
  nbaTopicId: string;
}) {
  const rows = useMemo(
    () =>
      orderedCategories.flatMap((cat) =>
        topicsForCategory(cat.id)
          .filter((t) => matchesFilter(t, filter))
          .map((topic) => ({ topic, cat }))
      ),
    [filter]
  );

  if (rows.length === 0) {
    return (
      <p className="caption" style={{ padding: "var(--space-4)" }}>
        No topics match this filter.
      </p>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">Category</th>
            <th scope="col">Track</th>
            <th scope="col">Stage</th>
            <th scope="col">Difficulty</th>
            <th scope="col">Est.</th>
            <th scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ topic, cat }) => {
            const stage = topicStage(progress, topic.id);
            const tp = topicProgress(progress, topic.id);
            const isCurrent = topic.id === nbaTopicId;
            return (
              <tr key={topic.id} className={isCurrent ? styles.currentTableRow : ""}>
                <td>
                  <Link to={`/roadmap/${cat.id}/${topic.id}`} className={styles.tableLink}>
                    {isCurrent && (
                      <span className={styles.currentDot} aria-hidden="true">
                        ●
                      </span>
                    )}
                    {topic.title}
                  </Link>
                </td>
                <td className="caption">{cat.title}</td>
                <td>
                  <TrackChip track={topic.track} />
                </td>
                <td>
                  <StageBadge stage={stage} />
                </td>
                <td className="caption">{DIFFICULTY_LABEL[topic.difficulty]}</td>
                <td className="mono caption">{formatHours(topic.estimatedHours)}</td>
                <td>
                  <div className={styles.tableProgress}>
                    <ProgressBar ratio={tp.ratio} label={`${topic.title} progress`} />
                    <span className="mono caption">
                      {tp.completed}/{tp.total}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
