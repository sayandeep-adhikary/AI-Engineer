import { Link } from "react-router-dom";
import type { Project } from "@/data/curriculum";
import { categoryById, topicById } from "@/data/curriculum";
import type { ProjectStatus } from "@/state/types";
import type { MilestoneProgress } from "@/lib/selectors";
import { formatHours, formatPercent } from "@/lib/format";
import { DIFFICULTY_LABEL, PROJECT_STATUS_META } from "./meta";
import { TrackChip, TimeChip } from "./Chips";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import styles from "./projectcard.module.css";

function difficultyText(p: Project): string {
  const { from, to } = p.difficulty;
  return from === to ? DIFFICULTY_LABEL[from] : `${DIFFICULTY_LABEL[from]} → ${DIFFICULTY_LABEL[to]}`;
}

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  const m = PROJECT_STATUS_META[status];
  return (
    <span className="sg-chip" style={{ color: `var(${m.colorVar})` }}>
      <span aria-hidden="true">{m.glyph}</span>
      {m.label}
    </span>
  );
}

interface ProjectCardProps {
  project: Project;
  status: ProjectStatus;
  milestones: MilestoneProgress;
  variant?: "board" | "gallery";
  onStart?: () => void;
}

export function ProjectCard({
  project,
  status,
  milestones,
  variant = "board",
  onStart,
}: ProjectCardProps) {
  const isOptional = project.track === "optional-depth";
  const category = categoryById.get(project.categoryId);
  const evolvesTopic = project.evolvesFrom ? topicById.get(project.evolvesFrom.topicId) : undefined;
  const detailPath = `/projects/${project.id}`;

  return (
    <article
      className={[
        styles.card,
        styles[`status_${status.replace("-", "_")}`],
        isOptional ? styles.optional : "",
        variant === "gallery" ? styles.gallery : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.top}>
        <span className={styles.pnum + " mono"}>P{project.number}</span>
        <ProjectStatusPill status={status} />
        <span className={styles.trackSlot}>
          <TrackChip track={project.track} />
        </span>
      </div>

      <h3 className={styles.title}>
        <Link to={detailPath}>{project.title}</Link>
      </h3>
      <p className={styles.desc}>{project.description}</p>

      <div className={styles.meta}>
        <span className="sg-chip">◆ {difficultyText(project)}</span>
        <TimeChip label={formatHours(project.estimatedHours)} />
      </div>

      {status !== "planned" && milestones.total > 0 && (
        <div className={styles.progress}>
          <ProgressBar ratio={milestones.ratio} label={`${project.title} progress`} />
          <span className="mono caption">
            {milestones.completed}/{milestones.total} milestones · {formatPercent(milestones.ratio)}
          </span>
        </div>
      )}

      {variant === "gallery" && project.technologies.length > 0 && (
        <div className={styles.tech}>
          <span className="caption">Tech:</span> {project.technologies.join(" · ")}
        </div>
      )}

      <div className={styles.links}>
        {evolvesTopic ? (
          <Link to={`/roadmap/${evolvesTopic.categoryId}/${evolvesTopic.id}`} className={styles.link}>
            ⚑ Evolves from {evolvesTopic.title}
          </Link>
        ) : category ? (
          <Link to={`/roadmap/${category.id}`} className={styles.link}>
            ⚑ From Roadmap · {category.title}
          </Link>
        ) : null}
      </div>

      <div className={styles.actions}>
        <Link to={detailPath} className={styles.openLink}>
          Open project →
        </Link>
        {status === "planned" && onStart && (
          <Button variant="secondary" onClick={onStart}>
            Start project
          </Button>
        )}
      </div>
    </article>
  );
}
