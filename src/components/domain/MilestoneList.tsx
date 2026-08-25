import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "@/data/curriculum";
import { milestonesForProject, topicById } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import type { UserProgress } from "@/state/types";
import { currentActionableMilestone } from "@/lib/selectors";
import { Button } from "@/components/ui/Button";
import styles from "./milestonelist.module.css";

interface MilestoneListProps {
  project: Project;
  progress: UserProgress;
}

export function MilestoneList({ project, progress }: MilestoneListProps) {
  const completeMilestone = useProgressStore((s) => s.completeMilestone);
  const uncompleteMilestone = useProgressStore((s) => s.uncompleteMilestone);

  const milestones = milestonesForProject(project.id);
  const current = currentActionableMilestone(progress, project.id);

  // Announce completion to assistive tech.
  const prevDone = useRef<Set<string>>(new Set(Object.keys(progress.completedMilestones)));
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    const inProject = new Set(milestones.map((m) => m.id));
    const keys = Object.keys(progress.completedMilestones);
    const added = keys.filter((id) => !prevDone.current.has(id) && inProject.has(id));
    prevDone.current = new Set(keys);
    if (added.length === 0) return;
    const all = milestones.every((m) => progress.completedMilestones[m.id]);
    const title = milestones.find((m) => m.id === added[0])?.title ?? "";
    setAnnounce(all ? "Project complete." : `Milestone completed: ${title}`);
  }, [progress.completedMilestones, milestones]);

  return (
    <div className={styles.wrap}>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <ol className={styles.list}>
        {milestones.map((m) => {
          const done = Boolean(progress.completedMilestones[m.id]);
          const isCurrent = current?.id === m.id;
          const glyph = done ? "✓" : isCurrent ? "●" : "○";
          const stateLabel = done ? "Completed" : isCurrent ? "Current" : "Upcoming";
          const color = done
            ? "var(--stage-completed)"
            : isCurrent
              ? "var(--accent)"
              : "var(--text-muted)";
          const topics = m.relatedTopicIds
            .map((id) => topicById.get(id))
            .filter((t): t is NonNullable<typeof t> => Boolean(t));

          return (
            <li
              key={m.id}
              className={[styles.item, isCurrent ? styles.current : "", done ? styles.done : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.head}>
                <span className={styles.glyph} style={{ color }} aria-hidden="true">
                  {glyph}
                </span>
                <span className={styles.order + " mono"}>m{m.order}</span>
                <span className={styles.title}>{m.title}</span>
                {isCurrent && <span className={styles.nextTag}>NEXT</span>}
                <span className="sr-only">— {stateLabel}</span>
              </div>

              {m.description && <p className={styles.desc}>{m.description}</p>}
              {m.completionCriteria && (
                <p className={styles.criteria}>
                  <span className="overline">Done when</span> {m.completionCriteria}
                </p>
              )}
              {topics.length > 0 && (
                <div className={styles.topics}>
                  <span className="caption">Related:</span>{" "}
                  {topics.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && ", "}
                      <Link to={`/roadmap/${t.categoryId}/${t.id}`} className={styles.topicLink}>
                        {t.title}
                      </Link>
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.action}>
                {done ? (
                  <Button variant="ghost" onClick={() => uncompleteMilestone(m.id)} title="Mark incomplete">
                    ✓ Completed
                  </Button>
                ) : (
                  <Button
                    variant={isCurrent ? "primary" : "secondary"}
                    onClick={() => completeMilestone(m.id)}
                  >
                    Mark complete ✓
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
