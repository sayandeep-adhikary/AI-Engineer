import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Resource } from "@/data/curriculum";
import { categoryById, projectById, projects, resources, topicById, topics } from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import type { UserNote } from "@/state/types";
import { relativeTime } from "@/lib/format";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import styles from "./notes.module.css";

type Tab = "notes" | "resources";
type NoteParentFilter = "all" | "topic" | "project";

interface NoteParent {
  label: string;
  to: string | null;
  kind: "Topic" | "Project" | "Unknown";
  category?: string;
}

function noteParent(note: UserNote): NoteParent {
  if (note.parentType === "topic") {
    const t = topicById.get(note.parentId);
    if (t) {
      const cat = categoryById.get(t.categoryId);
      return { label: t.title, to: `/roadmap/${t.categoryId}/${t.id}`, kind: "Topic", category: cat?.title };
    }
  } else if (note.parentType === "project") {
    const p = projectById.get(note.parentId);
    if (p) return { label: p.title, to: `/projects/${p.id}`, kind: "Project" };
  }
  return { label: note.parentId, to: null, kind: "Unknown" };
}

interface ResourceParent {
  label: string;
  to: string | null;
  category?: string;
}

function resourceParent(r: Resource): ResourceParent {
  if (r.topicId) {
    const t = topicById.get(r.topicId);
    if (t) {
      const cat = categoryById.get(t.categoryId);
      return { label: t.title, to: `/roadmap/${t.categoryId}/${t.id}`, category: cat?.title };
    }
  }
  if (r.projectId) {
    const p = projectById.get(r.projectId);
    if (p) return { label: p.title, to: `/projects/${p.id}` };
  }
  return { label: "—", to: null };
}

export function NotesPage() {
  const notes = useProgressStore((s) => s.notes);
  const addNote = useProgressStore((s) => s.addNote);
  const updateNote = useProgressStore((s) => s.updateNote);
  const deleteNote = useProgressStore((s) => s.deleteNote);

  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("type") === "resources" ? "resources" : "notes";
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set("type", t);
    setParams(next, { replace: true });
    setSelectedId(null);
    setCreating(false);
    setEditing(false);
  };

  const [query, setQuery] = useState("");
  const [noteFilter, setNoteFilter] = useState<NoteParentFilter>("all");
  const [resTypeFilter, setResTypeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const isMobile = useMediaQuery("(max-width: 900px)");

  const q = query.trim().toLowerCase();

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (noteFilter !== "all" && n.parentType !== noteFilter) return false;
      if (!q) return true;
      return n.body.toLowerCase().includes(q) || noteParent(n).label.toLowerCase().includes(q);
    });
  }, [notes, noteFilter, q]);

  const presentTypes = useMemo(() => [...new Set(resources.map((r) => r.type))].sort(), []);
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (resTypeFilter !== "all" && r.type !== resTypeFilter) return false;
      if (!q) return true;
      const parent = resourceParent(r).label.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        parent.includes(q)
      );
    });
  }, [resTypeFilter, q]);

  const selectedNote = tab === "notes" ? notes.find((n) => n.id === selectedId) ?? null : null;
  const selectedResource =
    tab === "resources" ? resources.find((r) => r.id === selectedId) ?? null : null;

  useEffect(() => {
    setEditing(false);
  }, [selectedId]);

  const resetFilters = () => {
    setQuery("");
    setNoteFilter("all");
    setResTypeFilter("all");
  };

  const hasPreview = creating || Boolean(selectedNote) || Boolean(selectedResource);
  const showListPane = !isMobile || !hasPreview;
  const showPreviewPane = !isMobile || hasPreview;

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className={styles.header}>
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          <Breadcrumb items={[{ label: "Notes & Resources" }]} />
          <h1>Notes &amp; Resources</h1>
        </div>
        <div className={styles.headerControls}>
          <SegmentedControl<Tab>
            options={[
              { value: "notes", label: `Notes (${notes.length})` },
              { value: "resources", label: `Resources (${resources.length})` },
            ]}
            value={tab}
            onChange={setTab}
            ariaLabel="Content type"
          />
          <div className={styles.search}>
            <span aria-hidden="true" className={styles.searchIcon}>
              ⌕
            </span>
            <label htmlFor="kb-search" className="sr-only">
              Search {tab}
            </label>
            <input
              id="kb-search"
              type="search"
              className={styles.searchInput}
              placeholder={`Search ${tab}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* Left: filters */}
        {showListPane && (
          <aside className={styles.filters} aria-label="Filters">
            <span className="overline">Filters</span>
            {tab === "notes" ? (
              <div className={styles.filterGroup} role="group" aria-label="Filter notes by parent">
                {(["all", "topic", "project"] as NoteParentFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`${styles.filterBtn} ${noteFilter === f ? styles.filterActive : ""}`}
                    aria-pressed={noteFilter === f}
                    onClick={() => setNoteFilter(f)}
                  >
                    {f === "all" ? "All" : f === "topic" ? "Topic notes" : "Project notes"}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.filterGroup} role="group" aria-label="Filter resources by type">
                <button
                  type="button"
                  className={`${styles.filterBtn} ${resTypeFilter === "all" ? styles.filterActive : ""}`}
                  aria-pressed={resTypeFilter === "all"}
                  onClick={() => setResTypeFilter("all")}
                >
                  All types
                </button>
                {presentTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.filterBtn} ${resTypeFilter === t ? styles.filterActive : ""}`}
                    aria-pressed={resTypeFilter === t}
                    onClick={() => setResTypeFilter(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" onClick={resetFilters}>
              Reset filters
            </Button>
          </aside>
        )}

        {/* Center: list */}
        {showListPane && (
          <section className={styles.listPane} aria-label={tab === "notes" ? "Notes" : "Resources"}>
            {tab === "notes" && (
              <div className={styles.listHead}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreating(true);
                    setSelectedId(null);
                  }}
                >
                  ＋ New note
                </Button>
              </div>
            )}

            {tab === "notes" ? (
              filteredNotes.length === 0 ? (
                <EmptyState
                  title={notes.length === 0 ? "No notes yet" : "No notes match"}
                  description={
                    notes.length === 0
                      ? "Add notes from a Topic or Project, or create one here."
                      : "Try a different search or reset the filters."
                  }
                />
              ) : (
                <ul className={styles.list}>
                  {filteredNotes.map((n) => {
                    const parent = noteParent(n);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`${styles.item} ${selectedId === n.id ? styles.itemActive : ""}`}
                          aria-pressed={selectedId === n.id}
                          onClick={() => {
                            setSelectedId(n.id);
                            setCreating(false);
                          }}
                        >
                          <span className={styles.itemTitle}>
                            {n.body.split("\n")[0].slice(0, 60) || "Untitled note"}
                          </span>
                          <span className={styles.itemMeta}>
                            <span className="sg-chip">{parent.kind}</span>
                            <span className="caption">{parent.label}</span>
                            <span className="caption mono">{relativeTime(n.updatedAt)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : filteredResources.length === 0 ? (
              <EmptyState
                title="No resources match"
                description="Try a different search or reset the filters."
              />
            ) : (
              <ul className={styles.list}>
                {filteredResources.map((r) => {
                  const parent = resourceParent(r);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`${styles.item} ${selectedId === r.id ? styles.itemActive : ""}`}
                        aria-pressed={selectedId === r.id}
                        onClick={() => {
                          setSelectedId(r.id);
                          setCreating(false);
                        }}
                      >
                        <span className={styles.itemTitle}>{r.title}</span>
                        <span className={styles.itemMeta}>
                          <span className="sg-chip">{r.type}</span>
                          <span className="caption">{parent.label}</span>
                          {!r.url && <span className="caption mono">reference</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Right: preview */}
        {showPreviewPane && (
          <section className={styles.previewPane} aria-label="Preview">
            {isMobile && hasPreview && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  setSelectedId(null);
                  setCreating(false);
                }}
              >
                ← Back to list
              </button>
            )}

            {creating ? (
              <NewNoteForm
                onCancel={() => setCreating(false)}
                onCreate={(parentType, parentId, body) => {
                  addNote(parentType, parentId, body);
                  setCreating(false);
                }}
              />
            ) : selectedNote ? (
              <NotePreview
                note={selectedNote}
                editing={editing}
                onEdit={() => setEditing(true)}
                onCancelEdit={() => setEditing(false)}
                onSave={(body) => {
                  updateNote(selectedNote.id, body);
                  setEditing(false);
                }}
                onDelete={() => {
                  deleteNote(selectedNote.id);
                  setSelectedId(null);
                }}
              />
            ) : selectedResource ? (
              <ResourcePreview resource={selectedResource} />
            ) : (
              <div className={styles.previewEmpty}>
                <EmptyState
                  title="Nothing selected"
                  description={`Select a ${tab === "notes" ? "note" : "resource"} to preview it here.`}
                  icon={<span style={{ fontSize: "1.25rem", color: "var(--text-faint)" }}>◇</span>}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function NotePreview({
  note,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  note: UserNote;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (body: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(note.body);
  const parent = noteParent(note);

  useEffect(() => {
    setDraft(note.body);
  }, [note.id, note.body]);

  return (
    <Panel
      overline="Note"
      title={parent.kind}
      actions={
        !editing && (
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <Button variant="ghost" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" onClick={onDelete} title="Delete note">
              Delete
            </Button>
          </div>
        )
      }
    >
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <div className={styles.previewMeta}>
          {parent.to ? (
            <Link to={parent.to} className={styles.parentLink}>
              ⚑ {parent.label} →
            </Link>
          ) : (
            <span className="caption">{parent.label}</span>
          )}
          <span className="caption mono">Updated {relativeTime(note.updatedAt)}</span>
        </div>

        {editing ? (
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            <label htmlFor="note-edit" className="sr-only">
              Edit note
            </label>
            <textarea
              id="note-edit"
              className={styles.textarea}
              value={draft}
              rows={8}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <Button variant="primary" onClick={() => onSave(draft.trim())} disabled={!draft.trim()}>
                Save
              </Button>
              <Button variant="ghost" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.noteBody}>{note.body}</div>
        )}
      </div>
    </Panel>
  );
}

function ResourcePreview({ resource }: { resource: Resource }) {
  const parent = resourceParent(resource);
  return (
    <Panel overline="Resource" title={resource.type}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <h3 className={styles.resourceTitle}>{resource.title}</h3>
        <div className={styles.previewMeta}>
          {parent.to ? (
            <Link to={parent.to} className={styles.parentLink}>
              ⚑ {parent.label} →
            </Link>
          ) : (
            <span className="caption">{parent.label}</span>
          )}
          {parent.category && <span className="caption">{parent.category}</span>}
          <span className="caption mono">{resource.source}</span>
        </div>
        {resource.url ? (
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            <Button variant="primary">Open resource ↗</Button>
          </a>
        ) : (
          <EmptyState
            title="No link available yet"
            description="This curriculum resource is a reference; a concrete URL hasn't been added."
            icon={<span style={{ fontSize: "1.25rem", color: "var(--text-faint)" }}>↗</span>}
          />
        )}
      </div>
    </Panel>
  );
}

function NewNoteForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (parentType: "topic" | "project", parentId: string, body: string) => void;
}) {
  const [parentType, setParentType] = useState<"topic" | "project">("topic");
  const [parentId, setParentId] = useState(topics[0]?.id ?? "");
  const [body, setBody] = useState("");

  const options = parentType === "topic" ? topics : projects;

  return (
    <Panel overline="New note" title="Create a note">
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <div className={styles.field}>
          <span className="caption">Attach to</span>
          <SegmentedControl<"topic" | "project">
            options={[
              { value: "topic", label: "Topic" },
              { value: "project", label: "Project" },
            ]}
            value={parentType}
            onChange={(v) => {
              setParentType(v);
              setParentId((v === "topic" ? topics : projects)[0]?.id ?? "");
            }}
            ariaLabel="Note parent type"
            size="sm"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-note-parent" className="caption">
            {parentType === "topic" ? "Topic" : "Project"}
          </label>
          <select
            id="new-note-parent"
            className={styles.select}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="new-note-body" className="caption">
            Note
          </label>
          <textarea
            id="new-note-body"
            className={styles.textarea}
            rows={6}
            placeholder="Write a note…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <Button
            variant="primary"
            onClick={() => onCreate(parentType, parentId, body.trim())}
            disabled={!body.trim() || !parentId}
          >
            Create note
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Panel>
  );
}
