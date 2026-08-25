import type { LearningMode, Stage, Track, Difficulty } from "@/data/curriculum";

// Visual metadata for stages, modes and tracks. Status is NEVER color-only:
// every entry pairs a color with a distinct glyph and a text label.

export interface StageMeta {
  label: string;
  colorVar: string;
  glyph: string; // distinct shape per stage for colorblind-safe reading
}

export const STAGE_META: Record<Stage, StageMeta> = {
  "not-started": { label: "Not Started", colorVar: "--stage-not-started", glyph: "○" },
  learning: { label: "Learning", colorVar: "--stage-learning", glyph: "◐" },
  practicing: { label: "Practicing", colorVar: "--stage-practicing", glyph: "◎" },
  building: { label: "Building", colorVar: "--stage-building", glyph: "▣" },
  reviewing: { label: "Reviewing", colorVar: "--stage-reviewing", glyph: "◈" },
  completed: { label: "Completed", colorVar: "--stage-completed", glyph: "✓" },
};

export const STAGE_ORDER: Stage[] = [
  "not-started",
  "learning",
  "practicing",
  "building",
  "reviewing",
  "completed",
];

export interface ModeMeta {
  label: string;
  glyph: string;
}

export const MODE_META: Record<LearningMode, ModeMeta> = {
  learn: { label: "Learn", glyph: "◇" },
  practice: { label: "Practice", glyph: "◎" },
  build: { label: "Build", glyph: "▣" },
  review: { label: "Review", glyph: "◈" },
  project: { label: "Project", glyph: "◼" },
};

export interface TrackMeta {
  label: string;
  glyph: string;
  borderStyle: "solid" | "hairline" | "dashed";
}

// Decodable without color: solid / hairline / dashed border + glyph + label.
export const TRACK_META: Record<Track, TrackMeta> = {
  core: { label: "CORE", glyph: "▪", borderStyle: "solid" },
  useful: { label: "USEFUL", glyph: "◧", borderStyle: "hairline" },
  "optional-depth": { label: "OPT · DEPTH", glyph: "◇", borderStyle: "dashed" },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export interface ProjectStatusMeta {
  label: string;
  glyph: string;
  colorVar: string;
}

// Project status — icon + label + border treatment (never color alone).
export const PROJECT_STATUS_META: Record<"planned" | "in-progress" | "completed", ProjectStatusMeta> = {
  planned: { label: "Planned", glyph: "▢", colorVar: "--text-muted" },
  "in-progress": { label: "In Progress", glyph: "◐", colorVar: "--stage-building" },
  completed: { label: "Completed", glyph: "✓", colorVar: "--stage-completed" },
};
