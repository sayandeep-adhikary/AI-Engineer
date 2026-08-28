import type { ProjectGuide, GuidePhase, GuideTech, GuideDecision } from "@/data/projectGuide";
import { Panel } from "@/components/ui/Panel";
import { Markdown, Inline } from "@/components/learn/Markdown";
import styles from "./projectguide.module.css";

function Accordion({
  title,
  overline,
  defaultOpen = false,
  children,
}: {
  title: string;
  overline?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={styles.acc} open={defaultOpen}>
      <summary className={styles.accSummary}>
        <span className={styles.accHead}>
          {overline && <span className="overline">{overline}</span>}
          <span className={styles.accTitle}>{title}</span>
        </span>
        <span className={styles.accChevron} aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className={styles.accBody}>{children}</div>
    </details>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className={styles.tags}>
      {items.map((it, i) => (
        <span key={i} className="sg-chip">
          {it}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items, marker = "▪" }: { items: string[]; marker?: string }) {
  return (
    <ul className={styles.bullets}>
      {items.map((it, i) => (
        <li key={i} style={{ ["--marker" as string]: `"${marker}"` }}>
          <Inline text={it} />
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className={styles.numbered}>
      {items.map((it, i) => (
        <li key={i}>
          <Inline text={it} />
        </li>
      ))}
    </ol>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className={styles.checklist}>
      {items.map((it, i) => (
        <li key={i}>
          <span className={styles.checkbox} aria-hidden="true">
            ▢
          </span>
          <Inline text={it} />
        </li>
      ))}
    </ul>
  );
}

function TechStack({ rows }: { rows: GuideTech[] }) {
  return (
    <div className={styles.stack}>
      {rows.map((r, i) => (
        <div key={i} className={styles.stackRow}>
          <span className={styles.stackLayer}>{r.layer}</span>
          <div className={styles.stackDetail}>
            <span className={styles.stackChoice}>
              <Inline text={r.choice} />
            </span>
            <span className={styles.stackWhy}>
              <Inline text={r.why} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Phases({ phases }: { phases: GuidePhase[] }) {
  return (
    <ol className={styles.phases}>
      {phases.map((p, i) => (
        <li key={i} className={styles.phase}>
          <div className={styles.phaseHead}>
            <span className={styles.phaseNum + " mono"}>{String(i + 1).padStart(2, "0")}</span>
            <span className={styles.phaseName}>{p.name}</span>
          </div>
          {p.intro && <p className={styles.phaseIntro}>{p.intro}</p>}
          <BulletList items={p.tasks} marker="›" />
        </li>
      ))}
    </ol>
  );
}

function Decisions({ rows }: { rows: GuideDecision[] }) {
  return (
    <div className={styles.decisions}>
      {rows.map((d, i) => (
        <div key={i} className={styles.decision}>
          <div className={styles.decisionTitle}>
            <Inline text={d.decision} />
          </div>
          <div className={styles.decisionRow}>
            <span className="overline">Options</span>
            <span>
              <Inline text={d.options} />
            </span>
          </div>
          <div className={styles.decisionRow}>
            <span className="overline">Trade-off</span>
            <span className="text-secondary">
              <Inline text={d.tradeoff} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectGuideView({ guide }: { guide: ProjectGuide }) {
  const { testing } = guide;
  return (
    <div className={styles.guide}>
      <Panel overline="Project brief" title="Overview">
        <Markdown md={guide.overview} />
      </Panel>

      <Panel overline="Real-world scenario" title="Where this shows up at work">
        <Markdown md={guide.scenario} />
      </Panel>

      <Panel overline="What you'll build" title="The system">
        <Markdown md={guide.whatYouBuild} />
        <div className={styles.arch}>
          <span className="overline">Architecture</span>
          <pre className={styles.diagram}>
            <code>{guide.architecture}</code>
          </pre>
        </div>
        <div className={styles.subhead}>
          <span className="overline">Major components</span>
        </div>
        <BulletList items={guide.components} />
      </Panel>

      <div className={styles.twoUp}>
        <Panel overline="Learning objectives" title="What this teaches">
          <TagList items={guide.learningObjectives} />
        </Panel>
        <Panel overline="Prerequisites" title="Before you start">
          <div className={styles.subhead}>
            <span className="overline">Required</span>
          </div>
          <BulletList items={guide.prerequisites.required} marker="●" />
          <div className={styles.subhead}>
            <span className="overline">Helpful (can learn on the way)</span>
          </div>
          <BulletList items={guide.prerequisites.helpful} marker="○" />
        </Panel>
      </div>

      <Panel overline="Technology stack" title="Recommended stack & why">
        <TechStack rows={guide.techStack} />
      </Panel>

      <div className={styles.accordions}>
        <Accordion overline="Functional requirements" title="What you must implement" defaultOpen>
          <NumberedList items={guide.functionalRequirements} />
        </Accordion>

        <Accordion overline="Non-functional requirements" title="Quality & operational constraints">
          <BulletList items={guide.nonFunctionalRequirements} />
        </Accordion>

        <Accordion overline="Implementation roadmap" title="Build sequence, phase by phase" defaultOpen>
          <Phases phases={guide.phases} />
        </Accordion>

        <Accordion overline="Task checklist" title="Work through this end to end">
          <Checklist items={guide.checklist} />
        </Accordion>

        <Accordion overline="Project structure" title="A reasonable starting layout">
          <pre className={styles.diagram}>
            <code>{guide.projectStructure}</code>
          </pre>
        </Accordion>

        <Accordion overline="Engineering decisions" title="Choices you must make (and their trade-offs)">
          <Decisions rows={guide.decisions} />
        </Accordion>

        <Accordion overline="Common mistakes & gotchas" title="What trips people up">
          <BulletList items={guide.gotchas} marker="⚠" />
        </Accordion>

        <Accordion overline="Testing strategy" title="How to prove it works">
          <div className={styles.subhead}>
            <span className="overline">Functional testing</span>
          </div>
          <BulletList items={testing.functional} />
          <div className={styles.subhead}>
            <span className="overline">Edge cases</span>
          </div>
          <BulletList items={testing.edgeCases} />
          <div className={styles.subhead}>
            <span className="overline">Failure testing</span>
          </div>
          <BulletList items={testing.failureModes} />
          {testing.aiEvaluation && testing.aiEvaluation.length > 0 && (
            <>
              <div className={styles.subhead}>
                <span className="overline">AI evaluation</span>
              </div>
              <BulletList items={testing.aiEvaluation} />
            </>
          )}
        </Accordion>

        <Accordion overline="Definition of done" title="When it's actually complete" defaultOpen>
          <Checklist items={guide.definitionOfDone} />
        </Accordion>

        <Accordion overline="Expected outcome" title="What you'll have at the end">
          <Markdown md={guide.expectedOutcome} />
          <div className={styles.subhead}>
            <span className="overline">Tangible artifacts</span>
          </div>
          <BulletList items={guide.outcomeArtifacts} marker="✓" />
        </Accordion>

        <Accordion overline="Stretch goals" title="Optional advanced extensions">
          <BulletList items={guide.stretchGoals} marker="＋" />
        </Accordion>

        <Accordion overline="AI Engineer skills" title="What this proves you can do">
          <TagList items={guide.skillsDemonstrated} />
          <div className={styles.portfolio}>
            <Markdown md={guide.portfolio} />
          </div>
        </Accordion>
      </div>
    </div>
  );
}
