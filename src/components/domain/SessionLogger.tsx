import { useState } from "react";
import type { LearningMode } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import { MODE_META } from "./meta";
import { Button } from "@/components/ui/Button";
import styles from "./sessionlogger.module.css";

const MODES: LearningMode[] = ["learn", "practice", "build", "review", "project"];

interface SessionLoggerProps {
  topicId: string;
  defaultMode?: LearningMode;
}

// Explicit time logging only — time is never inferred from activity.
export function SessionLogger({ topicId, defaultMode }: SessionLoggerProps) {
  const logSession = useProgressStore((s) => s.logSession);
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [mode, setMode] = useState<LearningMode | "">(defaultMode ?? "");
  const [saved, setSaved] = useState(false);

  const submit = () => {
    if (minutes <= 0) return;
    logSession({ topicId, minutes, mode: mode || undefined });
    setOpen(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className={styles.wrap}>
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`session-form-${topicId}`}
      >
        <span aria-hidden="true">⧗</span> Log session
      </Button>
      {saved && (
        <span className={styles.saved} role="status">
          ✓ Session logged
        </span>
      )}

      {open && (
        <div id={`session-form-${topicId}`} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor={`min-${topicId}`}>Minutes</label>
            <input
              id={`min-${topicId}`}
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`mode-${topicId}`}>Mode (optional)</label>
            <select
              id={`mode-${topicId}`}
              value={mode}
              onChange={(e) => setMode(e.target.value as LearningMode | "")}
              className={styles.input}
            >
              <option value="">—</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {MODE_META[m].label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onClick={submit}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
