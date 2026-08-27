import { useId, useState } from "react";
import type { QuizBlock as QuizBlockData } from "@/data/curriculum";
import { Markdown, Inline } from "./Markdown";
import styles from "./lesson.module.css";

// Local self-check retrieval. Intentionally NOT connected to progress/Firestore:
// no score is stored and completion never depends on the answer.
export function QuizBlock({ block }: { block: QuizBlockData }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const name = useId();
  const isCorrect = checked && selected === block.answerIndex;

  return (
    <section className={styles.quiz} aria-label="Self-check question">
      <div className={styles.quizQ}>
        <span className="overline">Retrieval</span>
        <Markdown md={block.question} />
      </div>
      <fieldset className={styles.quizChoices}>
        <legend className="sr-only">Choose an answer</legend>
        {block.choices.map((choice, i) => {
          const state =
            checked && i === block.answerIndex
              ? styles.choiceCorrect
              : checked && i === selected
                ? styles.choiceWrong
                : "";
          return (
            <label key={i} className={`${styles.choice} ${state}`}>
              <input
                type="radio"
                name={name}
                checked={selected === i}
                onChange={() => {
                  setSelected(i);
                  setChecked(false);
                }}
              />
              <span><Inline text={choice} /></span>
              {checked && i === block.answerIndex && (
                <span className={styles.choiceMark} aria-hidden="true">
                  ✓
                </span>
              )}
              {checked && i === selected && i !== block.answerIndex && (
                <span className={styles.choiceMark} aria-hidden="true">
                  ✕
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <div className={styles.quizActions}>
        <button
          type="button"
          className="sg-btn sg-btn--secondary"
          disabled={selected === null}
          onClick={() => setChecked(true)}
        >
          Check answer
        </button>
        {checked && (
          <span
            className={isCorrect ? styles.verdictOk : styles.verdictNo}
            role="status"
          >
            {isCorrect ? "Correct" : "Not quite"}
          </span>
        )}
      </div>
      {checked && (
        <div className={styles.explanation}>
          <span className="overline">Why</span>
          <Markdown md={block.explanation} />
        </div>
      )}
    </section>
  );
}
