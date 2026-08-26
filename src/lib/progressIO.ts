import { PROGRESS_VERSION, type UserProgress } from "@/state/types";

// User-progress JSON export/import. Curriculum/seed data is NEVER exported or
// imported — only the mutable UserProgress domain model.

export const EXPORT_FORMAT = "epoch.progress" as const;
export const EXPORT_FORMAT_VERSION = 1 as const;

export interface ProgressExport {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  exportedAt: string;
  progress: UserProgress;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function buildExport(progress: UserProgress): ProgressExport {
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
  };
}

export function serializeExport(envelope: ProgressExport): string {
  return JSON.stringify(envelope, null, 2);
}

export function exportFilename(date = new Date()): string {
  return `ai-engineer-progress-${date.toISOString().slice(0, 10)}.json`;
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

export type ValidationResult =
  | { ok: true; progress: UserProgress }
  | { ok: false; error: string };

const RECORD_FIELDS = [
  "topicStages",
  "completedUnits",
  "startedUnits",
  "projectStatus",
  "completedMilestones",
] as const;
const ARRAY_FIELDS = ["notes", "sessions", "timeLog", "events"] as const;

/** Validate arbitrary parsed JSON and produce a clean UserProgress (or an error). */
export function validateImportedProgress(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return { ok: false, error: "File is not a JSON object." };

  // Accept either the export envelope or a bare progress object.
  const src: Record<string, unknown> =
    raw.format === EXPORT_FORMAT && isRecord(raw.progress)
      ? raw.progress
      : isRecord(raw.progress)
        ? raw.progress
        : raw;

  const looksLikeProgress =
    "version" in src ||
    RECORD_FIELDS.some((f) => f in src) ||
    ARRAY_FIELDS.some((f) => f in src) ||
    "settings" in src;
  if (!looksLikeProgress) {
    return { ok: false, error: "This file does not look like an Epoch progress export." };
  }

  for (const f of RECORD_FIELDS) {
    if (f in src && !isRecord(src[f])) return { ok: false, error: `Field "${f}" must be an object.` };
  }
  for (const f of ARRAY_FIELDS) {
    if (f in src && !Array.isArray(src[f])) return { ok: false, error: `Field "${f}" must be an array.` };
  }
  if ("settings" in src && !isRecord(src.settings)) {
    return { ok: false, error: `Field "settings" must be an object.` };
  }

  const settings = isRecord(src.settings) ? src.settings : {};
  const theme = settings.theme === "light" ? "light" : "dark";
  const currentGoalTopicId =
    typeof settings.currentGoalTopicId === "string" ? settings.currentGoalTopicId : undefined;

  const progress: UserProgress = {
    version: typeof src.version === "number" ? src.version : PROGRESS_VERSION,
    topicStages: (src.topicStages as UserProgress["topicStages"]) ?? {},
    completedUnits: (src.completedUnits as UserProgress["completedUnits"]) ?? {},
    startedUnits: (src.startedUnits as UserProgress["startedUnits"]) ?? {},
    projectStatus: (src.projectStatus as UserProgress["projectStatus"]) ?? {},
    completedMilestones: (src.completedMilestones as UserProgress["completedMilestones"]) ?? {},
    notes: (src.notes as UserProgress["notes"]) ?? [],
    sessions: (src.sessions as UserProgress["sessions"]) ?? [],
    timeLog: (src.timeLog as UserProgress["timeLog"]) ?? [],
    events: (src.events as UserProgress["events"]) ?? [],
    settings: { theme, currentGoalTopicId },
  };

  return { ok: true, progress };
}

/** Parse raw text safely and validate. */
export function parseAndValidate(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  return validateImportedProgress(parsed);
}
