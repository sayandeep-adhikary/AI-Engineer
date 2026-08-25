import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { categoryById, topicsForCategory } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import {
  categoryProgress,
  nextBestAction,
  topicProgress,
  topicStage,
} from "@/lib/selectors";
import { formatHours, formatPercent } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { DifficultyChip, StageBadge, TimeChip, TrackChip } from "@/components/domain/Chips";
import styles from "./category.module.css";

export function CategoryDetailPage() {
  const { categoryId = "" } = useParams();
  const progress = useProgressStore();
  const category = categoryById.get(categoryId);
  const topics = useMemo(() => topicsForCategory(categoryId), [categoryId]);
  const nbaTopicId = useMemo(() => nextBestAction(progress).topic.id, [progress]);

  if (!category) {
    return (
      <div className="stack" style={{ gap: "var(--space-5)" }}>
        <Breadcrumb items={[{ label: "Roadmap", to: "/roadmap" }, { label: "Unknown" }]} />
        <EmptyState title="Category not found" description="This phase doesn't exist in the roadmap." />
      </div>
    );
  }

  const ratio = categoryProgress(progress, category.id);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Breadcrumb items={[{ label: "Roadmap", to: "/roadmap" }, { label: category.title }]} />
        <div className={styles.header}>
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span className="mono text-muted">
                Phase {String(category.order).padStart(2, "0")}
              </span>
              <TrackChip track={category.track} />
              <TimeChip label={formatHours(category.estimatedHours)} />
            </div>
            <h1>{category.title}</h1>
            <p className="text-secondary" style={{ maxWidth: "70ch" }}>
              {category.description}
            </p>
          </div>
          <div className={styles.headerProgress}>
            <span className="mono" style={{ fontSize: "1.5rem" }}>
              {formatPercent(ratio)}
            </span>
            <ProgressBar ratio={ratio} label={`${category.title} progress`} />
            <span className="caption">{topics.length} topics</span>
          </div>
        </div>
      </div>

      <section aria-label="Topics" className={styles.topics}>
        {topics.map((topic) => {
          const stage = topicStage(progress, topic.id);
          const tp = topicProgress(progress, topic.id);
          const isCurrent = topic.id === nbaTopicId;
          const isOptional = topic.track === "optional-depth";
          return (
            <Link
              key={topic.id}
              to={`/roadmap/${category.id}/${topic.id}`}
              className={[
                styles.topic,
                isOptional ? styles.optional : "",
                isCurrent ? styles.current : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isCurrent ? "true" : undefined}
            >
              <div className={styles.topicMain}>
                <div className="row" style={{ gap: "var(--space-2)" }}>
                  {isCurrent && <span className={styles.currentDot} aria-hidden="true">●</span>}
                  <span className={styles.topicTitle}>{topic.title}</span>
                </div>
                <span className="caption" style={{ maxWidth: "68ch" }}>
                  {topic.shortDescription}
                </span>
                <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap", marginTop: 4 }}>
                  <TrackChip track={topic.track} />
                  <DifficultyChip difficulty={topic.difficulty} />
                  <TimeChip label={formatHours(topic.estimatedHours)} />
                  <span className="caption mono">
                    {tp.completed}/{tp.total} units
                  </span>
                </div>
              </div>
              <div className={styles.topicSide}>
                <StageBadge stage={stage} />
                <ProgressBar ratio={tp.ratio} label={`${topic.title} progress`} />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
