import { useMemo, useState } from "react";
import { projects } from "@/data/curriculum";
import type { ProjectStatus } from "@/state/types";
import { useProgressStore } from "@/state/progressStore";
import { derivedProjectStatus, projectMilestoneProgress } from "@/lib/selectors";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { PROJECT_STATUS_META } from "@/components/domain/meta";
import styles from "./projects.module.css";

type View = "board" | "gallery";

const VIEW_OPTIONS: { value: View; label: string; glyph: string }[] = [
  { value: "board", label: "Board", glyph: "▦" },
  { value: "gallery", label: "Gallery", glyph: "▤" },
];

const COLUMNS: ProjectStatus[] = ["planned", "in-progress", "completed"];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function ProjectsPage() {
  const progress = useProgressStore();
  const setProjectStatus = useProgressStore((s) => s.setProjectStatus);
  const [view, setView] = useState<View>("board");
  const [mobileStatus, setMobileStatus] = useState<ProjectStatus>("in-progress");
  const isNarrow = useMediaQuery("(max-width: 900px)");

  const ordered = useMemo(() => [...projects].sort((a, b) => a.number - b.number), []);
  const withState = useMemo(
    () =>
      ordered.map((project) => ({
        project,
        status: derivedProjectStatus(progress, project.id),
        milestones: projectMilestoneProgress(progress, project.id),
      })),
    [ordered, progress]
  );

  const grouped = (status: ProjectStatus) => withState.filter((p) => p.status === status);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className={styles.header}>
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          <Breadcrumb items={[{ label: "Projects" }]} />
          <h1>Projects</h1>
          <p className="text-secondary" style={{ maxWidth: "62ch" }}>
            The parallel spine — a progressive ladder of engineering projects. Milestones are the
            explicit progress engine; prerequisites are advisory, never blocking.
          </p>
        </div>
        <SegmentedControl<View>
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          ariaLabel="Projects view"
        />
      </div>

      {view === "gallery" ? (
        <div className={styles.gallery}>
          {withState.map(({ project, status, milestones }) => (
            <ProjectCard
              key={project.id}
              project={project}
              status={status}
              milestones={milestones}
              variant="gallery"
              onStart={() => setProjectStatus(project.id, "in-progress")}
            />
          ))}
        </div>
      ) : isNarrow ? (
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <SegmentedControl<ProjectStatus>
            options={STATUS_OPTIONS.map((o) => ({
              ...o,
              label: `${o.label} (${grouped(o.value).length})`,
            }))}
            value={mobileStatus}
            onChange={setMobileStatus}
            ariaLabel="Filter projects by status"
            size="sm"
          />
          <ul className={styles.mobileList}>
            {grouped(mobileStatus).map(({ project, status, milestones }) => (
              <li key={project.id}>
                <ProjectCard
                  project={project}
                  status={status}
                  milestones={milestones}
                  onStart={() => setProjectStatus(project.id, "in-progress")}
                />
              </li>
            ))}
            {grouped(mobileStatus).length === 0 && (
              <li className="caption" style={{ padding: "var(--space-4)" }}>
                No {PROJECT_STATUS_META[mobileStatus].label.toLowerCase()} projects.
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className={styles.board} role="list" aria-label="Project board">
          {COLUMNS.map((status) => {
            const items = grouped(status);
            const meta = PROJECT_STATUS_META[status];
            return (
              <section key={status} className={styles.column} role="listitem" aria-label={meta.label}>
                <header className={styles.columnHead}>
                  <span className={styles.columnGlyph} style={{ color: `var(${meta.colorVar})` }} aria-hidden="true">
                    {meta.glyph}
                  </span>
                  <span className="overline">{meta.label}</span>
                  <span className={styles.columnCount + " mono"}>{items.length}</span>
                </header>
                <div className={styles.columnBody}>
                  {items.length === 0 ? (
                    <p className={styles.empty}>None yet</p>
                  ) : (
                    items.map(({ project, milestones }) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        status={status}
                        milestones={milestones}
                        onStart={() => setProjectStatus(project.id, "in-progress")}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
