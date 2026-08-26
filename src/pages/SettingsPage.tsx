import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  categories,
  curriculum,
  milestones,
  projects,
  resources,
  skills,
  topics,
  units,
} from "@/data/curriculum";
import { useProgressStore } from "@/state/progressStore";
import { PROGRESS_VERSION, type UserProgress } from "@/state/types";
import {
  buildExport,
  downloadText,
  exportFilename,
  parseAndValidate,
  readFileText,
  serializeExport,
} from "@/lib/progressIO";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import styles from "./settings.module.css";

type Theme = "dark" | "light";
type Status = { type: "success" | "error"; msg: string } | null;

const STATS: { label: string; value: number }[] = [
  { label: "Categories", value: categories.length },
  { label: "Topics", value: topics.length },
  { label: "Learning units", value: units.length },
  { label: "Projects", value: projects.length },
  { label: "Milestones", value: milestones.length },
  { label: "Skills", value: skills.length },
  { label: "Resources", value: resources.length },
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useProgressStore();
  const setTheme = useProgressStore((s) => s.setTheme);
  const replaceProgress = useProgressStore((s) => s.replaceProgress);
  const resetProgress = useProgressStore((s) => s.resetProgress);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<Status>(null);
  const [exportStatus, setExportStatus] = useState<Status>(null);
  const [confirming, setConfirming] = useState(false);
  const [resetStatus, setResetStatus] = useState<Status>(null);

  useEffect(() => {
    if (searchParams.get("confirmReset") === "1") {
      setConfirming(true);
      setResetStatus(null);
    }
  }, [searchParams]);

  const snapshot = (): UserProgress => ({
    version: store.version,
    topicStages: store.topicStages,
    completedUnits: store.completedUnits,
    startedUnits: store.startedUnits,
    projectStatus: store.projectStatus,
    completedMilestones: store.completedMilestones,
    notes: store.notes,
    sessions: store.sessions,
    timeLog: store.timeLog,
    events: store.events,
    settings: store.settings,
  });

  const handleExport = () => {
    try {
      const text = serializeExport(buildExport(snapshot()));
      downloadText(exportFilename(), text);
      setExportStatus({ type: "success", msg: "Progress exported. Check your downloads." });
    } catch {
      setExportStatus({ type: "error", msg: "Export failed. Please try again." });
    }
  };

  const handleImportFile = async (file: File) => {
    setImportStatus(null);
    try {
      const text = await readFileText(file);
      const result = parseAndValidate(text);
      if (!result.ok) {
        setImportStatus({ type: "error", msg: `Import rejected: ${result.error}` });
        return;
      }
      replaceProgress(result.progress); // only replaces after validation succeeds
      setImportStatus({ type: "success", msg: "Progress imported and saved." });
    } catch {
      setImportStatus({ type: "error", msg: "Import failed: could not read the file." });
    }
  };

  const handleReset = () => {
    resetProgress();
    setConfirming(false);
    setSearchParams({}, { replace: true });
    setResetStatus({ type: "success", msg: "Progress reset. Your theme was kept." });
  };

  const noteCount = store.notes.length;
  const eventCount = store.events.length;
  const completedUnitCount = Object.keys(store.completedUnits).length;

  return (
    <div className={styles.page}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Breadcrumb items={[{ label: "Settings" }]} />
        <h1>Settings</h1>
        <p className="text-secondary" style={{ maxWidth: "60ch" }}>
          A small control center for your learning environment and data. The curriculum is
          read-only; everything here only affects your own progress.
        </p>
      </div>

      {/* A. Appearance */}
      <Panel overline="Appearance" title="Theme">
        <div className={styles.row}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="text-secondary">Interface theme</span>
            <span className="caption">Dark is the primary Epoch experience.</span>
          </div>
          <SegmentedControl<Theme>
            options={[
              { value: "dark", label: "Dark", glyph: "◐" },
              { value: "light", label: "Light", glyph: "○" },
            ]}
            value={store.settings.theme}
            onChange={setTheme}
            ariaLabel="Interface theme"
          />
        </div>
      </Panel>

      {/* B. Data & Progress */}
      <Panel overline="Data & Progress" title="Your learning data">
        <div className={styles.dataGrid}>
          <div className={styles.dataItem}>
            <div className="stack" style={{ gap: 2 }}>
              <span className={styles.itemTitle}>Export progress</span>
              <span className="caption">
                Downloads a JSON file of your progress only — topic stages, completed units &amp;
                milestones, project status, notes, sessions and the activity log. No curriculum data.
              </span>
            </div>
            <div className={styles.actionCol}>
              <Button variant="secondary" onClick={handleExport}>
                Export progress
              </Button>
              {exportStatus && (
                <p className={statusClass(exportStatus, styles)} role="status">
                  {exportStatus.msg}
                </p>
              )}
            </div>
          </div>

          <div className={styles.divider} aria-hidden="true" />

          <div className={styles.dataItem}>
            <div className="stack" style={{ gap: 2 }}>
              <span className={styles.itemTitle}>Import progress</span>
              <span className="caption">
                Load a previously exported file. It is validated before anything changes — invalid
                files are rejected and your current progress is left untouched.
              </span>
            </div>
            <div className={styles.actionCol}>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportFile(f);
                  e.target.value = ""; // allow re-importing the same file
                }}
              />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                Choose file to import
              </Button>
              {importStatus && (
                <p
                  className={statusClass(importStatus, styles)}
                  role={importStatus.type === "error" ? "alert" : "status"}
                >
                  <span aria-hidden="true">{importStatus.type === "error" ? "✕ " : "✓ "}</span>
                  {importStatus.msg}
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Destructive — visually separated */}
      <Panel overline="Danger zone" title="Reset progress" className={styles.danger}>
        <div className={styles.row}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="text-secondary">Erase all your learning progress</span>
            <span className="caption">
              Removes topic stages, completed units &amp; milestones, project status, notes,
              sessions and the activity log. Your theme preference is kept. The curriculum is
              untouched. This cannot be undone.
            </span>
          </div>
          {!confirming ? (
            <Button variant="secondary" onClick={() => { setConfirming(true); setResetStatus(null); }}>
              Reset progress…
            </Button>
          ) : (
            <div className={styles.confirm} role="group" aria-label="Confirm reset">
              <span className={styles.confirmText}>This will erase everything. Are you sure?</span>
              <div className="row" style={{ gap: "var(--space-2)" }}>
                <button type="button" className={styles.dangerBtn} onClick={handleReset}>
                  Yes, reset everything
                </button>
                <Button variant="ghost" onClick={() => { setConfirming(false); setSearchParams({}, { replace: true }); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        {resetStatus && (
          <p className={statusClass(resetStatus, styles)} role="status" style={{ marginTop: "var(--space-3)" }}>
            <span aria-hidden="true">✓ </span>
            {resetStatus.msg}
          </p>
        )}
        <div className={styles.currentState}>
          <span className="caption mono">
            Currently stored: {completedUnitCount} completed units · {noteCount} notes · {eventCount}{" "}
            events
          </span>
        </div>
      </Panel>

      {/* C. About / System */}
      <Panel overline="About" title="System">
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue + " mono"}>{s.value}</span>
              <span className="caption">{s.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.meta}>
          <span className="caption mono">Curriculum v{curriculum.meta.version}</span>
          <span className="caption mono">Locked {curriculum.meta.lockedAt}</span>
          <span className="caption mono">Progress schema v{PROGRESS_VERSION}</span>
        </div>
      </Panel>
    </div>
  );
}

function statusClass(status: NonNullable<Status>, styles: Record<string, string>): string {
  return `${styles.status} ${status.type === "error" ? styles.statusError : styles.statusOk}`;
}
