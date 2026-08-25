import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { LearningMode } from "@/data/curriculum";
import { categoryById, topicById, unitsForTopic } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import { currentActionableUnit, topicStage, unitState } from "@/lib/selectors";
import { formatHours } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StageRail } from "@/components/domain/StageRail";
import { DifficultyChip, ModeToken, TimeChip, TrackChip } from "@/components/domain/Chips";
import { MODE_META, STAGE_META } from "@/components/domain/meta";
import { TopicUnitFlow } from "@/components/domain/TopicUnitFlow";
import { ContextRail } from "@/components/domain/ContextRail";
import { SessionLogger } from "@/components/domain/SessionLogger";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./topic.module.css";

const MODE_ORDER: LearningMode[] = ["learn", "practice", "build", "review", "project"];

export function TopicWorkspacePage() {
  const { categoryId = "", topicId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const focusUnitId = searchParams.get("unit") ?? undefined;
  const progress = useProgressStore();
  const startUnit = useProgressStore((s) => s.startUnit);
  const completeUnit = useProgressStore((s) => s.completeUnit);

  const category = categoryById.get(categoryId);
  const topic = topicById.get(topicId);

  const units = useMemo(() => unitsForTopic(topicId), [topicId]);
  const usedModes = useMemo(
    () => MODE_ORDER.filter((m) => units.some((u) => u.mode === m)),
    [units]
  );

  if (!category || !topic || topic.categoryId !== categoryId) {
    return <NotFoundPage />;
  }

  const stage = topicStage(progress, topic.id);
  const currentUnit = currentActionableUnit(progress, topic.id);
  const currentUnitState = currentUnit ? unitState(progress, currentUnit.id) : null;

  const ctaLabel = !currentUnit
    ? null
    : currentUnitState === "in-progress"
      ? `Complete ${MODE_META[currentUnit.mode].label} ✓`
      : `Start ${MODE_META[currentUnit.mode].label} →`;

  const onCta = () => {
    if (!currentUnit) return;
    if (currentUnitState === "in-progress") completeUnit(currentUnit.id);
    else startUnit(currentUnit.id);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Breadcrumb
            items={[
              { label: "Roadmap", to: "/roadmap" },
              { label: category.title, to: `/roadmap/${category.id}` },
              { label: topic.title },
            ]}
          />
          <Button
            variant="ghost"
            onClick={() => {
              const el = document.getElementById(`note-${topic.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              el?.focus();
            }}
          >
            Notes <span aria-hidden="true">✎</span>
          </Button>
        </div>
        <h1>{topic.title}</h1>
        <p className={styles.summary}>{topic.shortDescription}</p>
        <div className={styles.metaRow}>
          <TrackChip track={topic.track} />
          <DifficultyChip difficulty={topic.difficulty} />
          <TimeChip label={formatHours(topic.estimatedHours)} />
          {usedModes.length > 0 && (
            <span className={styles.modeGroup}>
              <span className="caption">Modes:</span>
              {usedModes.map((m) => (
                <ModeToken key={m} mode={m} />
              ))}
            </span>
          )}
        </div>

        <div className={styles.railZone}>
          <StageRail applicableStages={topic.applicableStages} current={stage} />
          <div className={styles.modeLine}>
            <span className="overline">Current mode</span>
            {currentUnit ? (
              <ModeToken mode={currentUnit.mode} />
            ) : (
              <span className="caption mono">— (topic complete)</span>
            )}
            <span className={styles.spacer} />
            <SessionLogger topicId={topic.id} defaultMode={currentUnit?.mode} />
          </div>
        </div>
      </header>

      {/* Body: two-column workspace */}
      <div className={styles.body}>
        <main className={styles.main} aria-labelledby="flow-heading">
          <h2 id="flow-heading" className="sr-only">
            Learning flow
          </h2>
          <TopicUnitFlow topic={topic} progress={progress} focusUnitId={focusUnitId} />

          {topic.commonMistakes.length > 0 && (
            <Panel overline="Common mistakes" title="Watch out for">
              <ul className={styles.bullets}>
                {topic.commonMistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </Panel>
          )}

          {topic.masteryCriteria && (
            <Panel overline="Mastery" title="What mastery looks like">
              <p className="text-secondary">{topic.masteryCriteria}</p>
            </Panel>
          )}
        </main>

        <ContextRail topic={topic} />
      </div>

      {/* Sticky single next action */}
      <div className={styles.sticky}>
        {ctaLabel ? (
          <>
            <div className={styles.stickyContext}>
              <span className="overline">Continue current</span>
              <span className={styles.stickyStage} style={{ color: `var(${STAGE_META[stage].colorVar})` }}>
                {STAGE_META[stage].glyph} {STAGE_META[stage].label}
              </span>
            </div>
            <Button variant="primary" size="lg" onClick={onCta}>
              {ctaLabel}
            </Button>
          </>
        ) : (
          <div className={styles.stickyDone}>
            <span aria-hidden="true">✓</span> Topic complete — great work.
          </div>
        )}
      </div>
    </div>
  );
}
