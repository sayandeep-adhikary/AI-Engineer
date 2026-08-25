import { useParams } from "react-router-dom";
import { categoryById, projectById } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import {
  currentActionableMilestone,
  derivedProjectStatus,
  projectMilestoneProgress,
} from "@/lib/selectors";
import { formatHours, formatPercent } from "@/lib/format";
import { DIFFICULTY_LABEL } from "@/components/domain/meta";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimeChip, TrackChip } from "@/components/domain/Chips";
import { ProjectStatusPill } from "@/components/domain/ProjectCard";
import { MilestoneList } from "@/components/domain/MilestoneList";
import { ProjectContextRail } from "@/components/domain/ProjectContextRail";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./projectdetail.module.css";

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const progress = useProgressStore();
  const completeMilestone = useProgressStore((s) => s.completeMilestone);
  const project = projectById.get(projectId);

  if (!project) return <NotFoundPage />;

  const status = derivedProjectStatus(progress, project.id);
  const ms = projectMilestoneProgress(progress, project.id);
  const current = currentActionableMilestone(progress, project.id);
  const category = categoryById.get(project.categoryId);
  const difficulty =
    project.difficulty.from === project.difficulty.to
      ? DIFFICULTY_LABEL[project.difficulty.from]
      : `${DIFFICULTY_LABEL[project.difficulty.from]} → ${DIFFICULTY_LABEL[project.difficulty.to]}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Breadcrumb
          items={[{ label: "Projects", to: "/projects" }, { label: project.title }]}
        />
        <div className={styles.titleRow}>
          <h1>
            <span className="mono text-muted" style={{ fontSize: "1.1rem" }}>
              P{project.number} ·{" "}
            </span>
            {project.title}
          </h1>
          <ProjectStatusPill status={status} />
        </div>
        <p className={styles.desc}>{project.description}</p>
        <div className={styles.metaRow}>
          <TrackChip track={project.track} />
          <span className="sg-chip">◆ {difficulty}</span>
          <TimeChip label={formatHours(project.estimatedHours)} />
          {category && (
            <span className="caption">
              Anchor: <span className="text-secondary">{category.title}</span>
            </span>
          )}
        </div>

        {ms.total > 0 && (
          <div className={styles.progress}>
            <ProgressBar ratio={ms.ratio} label={`${project.title} progress`} />
            <span className="mono caption">
              {ms.completed}/{ms.total} milestones · {formatPercent(ms.ratio)}
            </span>
          </div>
        )}

        <div className={styles.linksRow}>
          <span className="caption text-muted">↗ Repository · not linked yet</span>
          <span className="caption text-muted">↗ Deployment · not linked yet</span>
        </div>
      </header>

      <div className={styles.body}>
        <main className={styles.main}>
          <Panel overline="Objective" title="Goal">
            <p className="text-secondary">{project.objective}</p>
          </Panel>

          <Panel overline="Milestones" title={`${ms.completed}/${ms.total} complete`}>
            <MilestoneList project={project} progress={progress} />
          </Panel>

          {project.expectedDeliverables.length > 0 && (
            <Panel overline="Expected deliverables" title="What you'll produce">
              <ul className={styles.deliverables}>
                {project.expectedDeliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel overline="Screenshots" title="Evidence">
            <EmptyState
              title="No screenshots yet"
              description="Capture evidence of your build when you ship this project."
              icon={<span style={{ fontSize: "1.25rem", color: "var(--text-faint)" }}>▤</span>}
            />
          </Panel>

          {project.portfolioValue && (
            <Panel overline="Portfolio value" title="What makes it portfolio-worthy">
              <p className="text-secondary">{project.portfolioValue}</p>
            </Panel>
          )}
        </main>

        <ProjectContextRail project={project} />
      </div>

      <div className={styles.sticky}>
        {status === "completed" ? (
          <div className={styles.done}>
            <span aria-hidden="true">✓</span> Project complete — add it to your portfolio.
          </div>
        ) : current ? (
          <>
            <div className={styles.stickyContext}>
              <span className="overline">Next milestone</span>
              <span className={styles.stickyName + " mono"}>m{current.order} · {current.title}</span>
            </div>
            <Button variant="primary" size="lg" onClick={() => completeMilestone(current.id)}>
              Complete milestone ✓
            </Button>
          </>
        ) : (
          <div className={styles.done}>No milestones defined for this project.</div>
        )}
      </div>
    </div>
  );
}
