import { useState } from "react";
import { Link } from "react-router-dom";
import type { Topic } from "@/data/curriculum";
import { projectById, resources, skillById, topicById } from "@/data/curriculum";
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

export function ContextRail({ topic }: { topic: Topic }) {
  const notes = useProgressStore((s) => s.notes);
  const addNote = useProgressStore((s) => s.addNote);
  const deleteNote = useProgressStore((s) => s.deleteNote);
  const [draft, setDraft] = useState("");

  const topicNotes = notes.filter((n) => n.parentType === "topic" && n.parentId === topic.id);
  const topicResources = resources.filter((r) => r.topicId === topic.id);
  const prereqs = topic.recommendedAfter
    .map((id) => topicById.get(id))
    .filter((t): t is Topic => Boolean(t));
  const projects = topic.relatedProjectIds
    .map((id) => projectById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const skills = topic.skillIds.map((id) => skillById.get(id)).filter(Boolean);

  const submitNote = () => {
    const body = draft.trim();
    if (!body) return;
    addNote("topic", topic.id, body);
    setDraft("");
  };

  return (
    <aside className={styles.rail} aria-label="Topic context">
      {topic.whyItMatters && (
        <Section title="Why it matters">
          <p className={styles.prose}>{topic.whyItMatters}</p>
        </Section>
      )}

      {topic.learningObjectives.length > 0 && (
        <Section title="Objectives">
          <ul className={styles.list}>
            {topic.learningObjectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </Section>
      )}

      {(topic.concepts.length > 0 || skills.length > 0) && (
        <Section title="Concepts">
          {topic.concepts.length > 0 && (
            <div className={styles.chips}>
              {topic.concepts.map((c) => (
                <span key={c} className="sg-chip">
                  {c}
                </span>
              ))}
            </div>
          )}
          {skills.length > 0 && (
            <div className={styles.skills}>
              <span className="caption">Skills:</span>{" "}
              {skills.map((s) => s!.name).join(" · ")}
            </div>
          )}
        </Section>
      )}

      {prereqs.length > 0 && (
        <Section title="Prerequisites">
          <p className="caption" style={{ marginBottom: "var(--space-2)" }}>
            Recommended, not required — you can start this topic anytime.
          </p>
          <ul className={styles.list}>
            {prereqs.map((p) => (
              <li key={p.id}>
                <Link to={`/roadmap/${p.categoryId}/${p.id}`} className={styles.link}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Related project">
          <ul className={styles.list}>
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className={styles.link}>
                  <span className="mono text-muted">P{p.number} · </span>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {topicResources.length > 0 && (
        <Section title="Resources">
          <ul className={styles.list}>
            {topicResources.map((r) => (
              <li key={r.id}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    ↗ {r.title}
                  </a>
                ) : (
                  <span className={styles.resourceRef} title="Reference — link not yet available">
                    ◇ {r.title}
                    <span className="caption"> · reference</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Notes">
        {topicNotes.length > 0 && (
          <ul className={styles.notes}>
            {topicNotes.map((n) => (
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
          <label htmlFor={`note-${topic.id}`} className="sr-only">
            Add a note for {topic.title}
          </label>
          <textarea
            id={`note-${topic.id}`}
            className={styles.textarea}
            placeholder="Add a note…"
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
