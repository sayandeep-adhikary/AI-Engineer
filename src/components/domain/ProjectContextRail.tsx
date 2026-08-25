import { useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "@/data/curriculum";
import { skillById, topicById } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import { Button } from "@/components/ui/Button";
import styles from "./contextrail.module.css";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className={styles.section} open>
      <summary className={styles.summary}>
        <span className="overline">{title}</span>
        <span className={styles.marker} aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

export function ProjectContextRail({ project }: { project: Project }) {
  const notes = useProgressStore((s) => s.notes);
  const addNote = useProgressStore((s) => s.addNote);
  const deleteNote = useProgressStore((s) => s.deleteNote);
  const [draft, setDraft] = useState("");

  const projectNotes = notes.filter((n) => n.parentType === "project" && n.parentId === project.id);
  const skills = project.skillsCovered.map((id) => skillById.get(id)).filter(Boolean);
  const related = project.relatedTopicIds
    .map((id) => topicById.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const prereqs = project.prerequisiteTopicIds
    .map((id) => topicById.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const submitNote = () => {
    const body = draft.trim();
    if (!body) return;
    addNote("project", project.id, body);
    setDraft("");
  };

  return (
    <aside className={styles.rail} aria-label="Project context">
      {project.technologies.length > 0 && (
        <Section title="Technologies">
          <div className={styles.chips}>
            {project.technologies.map((t) => (
              <span key={t} className="sg-chip">
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills covered">
          <div className={styles.chips}>
            {skills.map((s) => (
              <span key={s!.id} className="sg-chip">
                {s!.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section title="Related roadmap topics">
          <ul className={styles.list}>
            {related.map((t) => (
              <li key={t.id}>
                <Link to={`/roadmap/${t.categoryId}/${t.id}`} className={styles.link}>
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {prereqs.length > 0 && (
        <Section title="Recommended topics">
          <p className="caption" style={{ marginBottom: "var(--space-2)" }}>
            Advisory — you can start this project anytime.
          </p>
          <ul className={styles.list}>
            {prereqs.map((t) => (
              <li key={t.id}>
                <Link to={`/roadmap/${t.categoryId}/${t.id}`} className={styles.link}>
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Notes & lessons learned">
        {projectNotes.length > 0 && (
          <ul className={styles.notes}>
            {projectNotes.map((n) => (
              <li key={n.id} className={styles.note}>
                <span className={styles.noteBody}>{n.body}</span>
                <button
                  type="button"
                  className={styles.noteDelete}
                  onClick={() => deleteNote(n.id)}
                  aria-label="Delete note"
                  title="Delete note"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.noteForm}>
          <label htmlFor={`pnote-${project.id}`} className="sr-only">
            Add a note or lesson learned for {project.title}
          </label>
          <textarea
            id={`pnote-${project.id}`}
            className={styles.textarea}
            placeholder="Add a note or lesson learned…"
            value={draft}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button variant="secondary" onClick={submitNote} disabled={!draft.trim()}>
            Add note
          </Button>
        </div>
      </Section>
    </aside>
  );
}
