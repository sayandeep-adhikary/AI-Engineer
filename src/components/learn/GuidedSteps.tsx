import { useState } from "react";
import type { StepsBlock, GuidedStep } from "@/data/curriculum";
import { Inline } from "./Markdown";
import styles from "./lesson.module.css";

function Step({ step }: { step: GuidedStep }) {
  // A step with a decision hides its expected/verify until the learner commits.
  const [revealed, setRevealed] = useState(!step.decision);
  return (
    <li className={styles.step}>
      <span className={styles.stepNum} aria-hidden="true">
        {step.order}
      </span>
      <div className={styles.stepBody}>
        <p className={styles.stepAction}>
          <span className={styles.stepTag}>Do</span> <Inline text={step.action} />
        </p>
        {step.decision && (
          <div className={styles.stepDecision}>
            <p>
              <span className={styles.stepTag}>Decide</span> <Inline text={step.decision} />
            </p>
            {!revealed && (
              <button type="button" className={styles.revealBtn} onClick={() => setRevealed(true)}>
                I&apos;ve decided — reveal
              </button>
            )}
          </div>
        )}
        {revealed && step.expected && (
          <p className={styles.stepExpected}>
            <span className={styles.stepTag}>Expect</span> <Inline text={step.expected} />
          </p>
        )}
        {revealed && step.verify && (
          <p className={styles.stepVerify}>
            <span className={styles.stepTag}>Verify</span> <Inline text={step.verify} />
          </p>
        )}
      </div>
    </li>
  );
}

export function GuidedSteps({ block }: { block: StepsBlock }) {
  return (
    <section className={styles.steps}>
      <header className={styles.stepsHeader}>
        <span className="overline">
          {block.guidance === "guided" ? "Guided practice" : "Independent practice"}
        </span>
        <h4 className={styles.stepsTitle}>{block.title}</h4>
      </header>
      {block.intro && (
        <p className={styles.stepsIntro}>
          <Inline text={block.intro} />
        </p>
      )}
      <ol className={styles.stepList}>
        {block.steps.map((s) => (
          <Step key={s.order} step={s} />
        ))}
      </ol>
    </section>
  );
}
