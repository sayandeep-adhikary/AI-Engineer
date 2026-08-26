import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProgressStore } from "@/state/progressStore";
import {
  categoryById,
  projects,
} from "@/data/curriculum";
import {
  continueLearning,
  corePathProgress,
  derivedProjectStatus,
  journeyPosition,
  nextBestAction,
  optionalDepthProgress,
  projectMilestoneProgress,
  streakDays,
  unitsCompletedThisWeek,
  categoryProgress,
} from "@/lib/selectors";
import { formatMinutes, formatPercent } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageRail } from "@/components/domain/StageRail";
import { ActivityTimeline } from "@/components/domain/ActivityTimeline";
import {
  DifficultyChip,
  ModeToken,
  StageBadge,
  TimeChip,
  TrackChip,
} from "@/components/domain/Chips";
import styles from "./dashboard.module.css";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const progress = useProgressStore();
  const startTopic = useProgressStore((s) => s.startTopic);
  const navigate = useNavigate();

  const nba = useMemo(() => nextBestAction(progress), [progress]);
  const journey = useMemo(() => journeyPosition(progress), [progress]);
  const upNext = useMemo(() => continueLearning(progress, 3), [progress]);
  const core = corePathProgress(progress);
  const optional = optionalDepthProgress(progress);
  const streak = streakDays(progress);
  const weekUnits = unitsCompletedThisWeek(progress);

  const topicPath = `/roadmap/${nba.category.id}/${nba.topic.id}`;

  const handleContinue = () => {
    startTopic(nba.topic.id);
    navigate(topicPath);
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <div className="stack" style={{ gap: 2 }}>
          <h1>{greeting()}, Engineer.</h1>
          <span className="caption mono">{today}</span>
        </div>
      </div>

      {/* NEXT BEST ACTION — hero */}
      <Panel className={styles.hero} bodyClassName={styles.heroBody}>
        <div className={styles.heroTop}>
          <span className="overline">Current Focus</span>
          <StageBadge stage={progress.topicStages[nba.topic.id] ?? "not-started"} />
        </div>

        <Link to={topicPath} className={styles.heroTitle}>
          <span className="text-muted mono" style={{ fontSize: "0.8125rem" }}>
            {nba.category.title} →{" "}
          </span>
          {nba.topic.title}
        </Link>
        <p className={styles.heroContext}>{nba.contextLine}</p>

        {nba.unit ? (
          <div className={styles.actionBlock}>
            <span className="overline">▸ Next Action</span>
            <p className={styles.actionText}>{nba.unit.title}</p>
            <div className={styles.metaRow}>
              <TimeChip label={formatMinutes(nba.unit.estimatedMinutes)} />
              <DifficultyChip difficulty={nba.unit.difficulty} />
              <ModeToken mode={nba.unit.mode} />
              <TrackChip track={nba.topic.track} />
            </div>
          </div>
        ) : (
          <p className={styles.heroContext}>
            {nba.reason === "all-complete"
              ? "Primary path complete — explore optional depth or projects."
              : "No units remaining in this topic."}
          </p>
        )}

        <div className={styles.heroActions}>
          <Button variant="primary" size="lg" onClick={handleContinue}>
            Continue →
          </Button>
          <Link to={topicPath}>
            <Button variant="secondary" size="lg">
              Open Topic
            </Button>
          </Link>
          <Link to="/roadmap">
            <Button variant="ghost" size="lg">
              Choose another
            </Button>
          </Link>
        </div>

        <div className={styles.railWrap}>
          <StageRail
            applicableStages={nba.topic.applicableStages}
            current={progress.topicStages[nba.topic.id] ?? "not-started"}
          />
        </div>
      </Panel>

      {/* Journey + Momentum */}
      <div className={styles.grid2}>
        <Panel overline="Journey Position" title={`Phase ${journey.index} of ${journey.total}`}>
          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <span className="text-secondary">{journey.currentCategory?.title}</span>
            <ProgressBar
              ratio={journey.currentCategory ? categoryProgress(progress, journey.currentCategory.id) : 0}
              label="Current phase progress"
            />
            <Link to="/roadmap" className="caption" style={{ color: "var(--accent)" }}>
              View roadmap →
            </Link>
          </div>
        </Panel>

        <Panel overline="Momentum" title="This week">
          <div className={styles.momentum}>
            <StatTile value={`${streak}d`} label="Current streak" />
            <StatTile value={weekUnits} label="Units completed" />
            <StatTile value={Object.keys(progress.completedUnits).length} label="Total units done" />
          </div>
        </Panel>
      </div>

      {/* Continue Learning + Recent Activity */}
      <div className={styles.grid2}>
        <Panel overline="Continue Learning" title="Up next">
          {upNext.length === 0 ? (
            <EmptyState title="Nothing queued" description="You're all caught up on the core path." />
          ) : (
            <ul className={styles.list}>
              {upNext.map((item) => (
                <li key={item.topic.id}>
                  <Link to={`/roadmap/${item.category.id}/${item.topic.id}`} className={styles.listRow}>
                    <span className={styles.listMain}>
                      <span className={styles.listTitle}>{item.topic.title}</span>
                      <span className="caption">{item.category.title}</span>
                    </span>
                    <StageBadge stage={item.stage} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel overline="Recent Activity" title="Changelog">
          <ActivityTimeline events={progress.events} limit={5} />
        </Panel>
      </div>

      {/* Active Project */}
      <Panel overline="Active Project" title="What I'm building">
        <ActiveProject />
      </Panel>

      {/* Core Path Progress — context, de-emphasized */}
      <Panel className={styles.corePanel} bodyClassName={styles.coreBody}>
        <div className={styles.coreItem}>
          <span className="overline">Core Path</span>
          <div className={styles.coreLine}>
            <ProgressBar ratio={core} label="Core path progress" />
            <span className="mono" style={{ fontSize: "0.8125rem" }}>
              {formatPercent(core)}
            </span>
          </div>
        </div>
        <div className={styles.coreDivider} aria-hidden="true" />
        <div className={styles.coreItem}>
          <span className="overline">Optional Depth · separate</span>
          <div className={styles.coreLine}>
            <ProgressBar ratio={optional} label="Optional-depth progress" />
            <span className="mono text-muted" style={{ fontSize: "0.8125rem" }}>
              {formatPercent(optional)}
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ActiveProject() {
  const progress = useProgressStore();
  const active = projects
    .map((p) => ({ project: p, status: derivedProjectStatus(progress, p.id) }))
    .find((p) => p.status === "in-progress");
  const project = active?.project;

  if (!project) {
    return (
      <EmptyState
        title="No active project"
        description="Projects are the parallel spine of Epoch. Start one to track your build."
        icon={<span style={{ fontSize: "1.25rem", color: "var(--text-faint)" }}>◼</span>}
      />
    );
  }

  const cat = categoryById.get(project.categoryId);
  const ms = projectMilestoneProgress(progress, project.id);
  return (
    <Link to={`/projects/${project.id}`} className="stack" style={{ gap: "var(--space-2)" }}>
      <span className={styles.listTitle}>
        <span className="mono text-muted">P{project.number} · </span>
        {project.title}
      </span>
      <span className="caption">{cat?.title}</span>
      {ms.total > 0 && (
        <div className="stack" style={{ gap: "var(--space-1)" }}>
          <ProgressBar ratio={ms.ratio} label={`${project.title} progress`} />
          <span className="mono caption">
            {ms.completed}/{ms.total} milestones · {formatPercent(ms.ratio)}
          </span>
        </div>
      )}
    </Link>
  );
}
