import { useState } from "react";
import type { CheckpointBlock as CheckpointData } from "@/data/curriculum";
import { Inline } from "./Markdown";
import styles from "./lesson.module.css";

// Non-persistent self-verification. These checks help the learner confirm they
// did the work; they NEVER mark the unit complete — "Mark complete" stays
// authoritative and separate.
export function Checkpoint({ block }: { block: CheckpointData }) {
  const [done, setDone] = useState<boolean[]>(() => block.items.map(() => false));
  const total = block.items.length;
  const count = done.filter(Boolean).length;

  return (
    <section className={styles.checkpoint}>
      <header className={styles.checkpointHeader}>
        <span className="overline">Checkpoint</span>
        <span className={`mono ${styles.checkpointCount}`}>
          {count}/{total}
        </span>
      </header>
      <p className={styles.checkpointTitle}>{block.title}</p>
      <ul className={styles.checkItems}>
        {block.items.map((item, i) => (
          <li key={i}>
            <label className={styles.checkItem}>
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() =>
                  setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))
                }
              />
              <span className={done[i] ? styles.checkDone : ""}>
                <Inline text={item} />
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className={`caption ${styles.checkpointNote}`}>
        Self-check only — this does not mark the unit complete.
      </p>
    </section>
  );
}
