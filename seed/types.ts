// Epoch — AI Engineer Learning Dashboard
// Curriculum definition schema (CURRICULUM data only — no user progress state).
//
// Design rules encoded here:
// - Stage and Mode are SEPARATE concepts. A unit has a `mode` (activity) and a
//   `stage` (which of the six canonical stages the unit belongs to). The topic's
//   own current stage is USER progress state and lives elsewhere.
// - Prerequisites are ADVISORY ONLY. There is no `lockedUntil`. Advisory ordering
//   is expressed via `recommendedAfter` (topics) and `prerequisiteCategoryIds`
//   (categories, advisory) plus `recommendedAfterTopicIds` inside units.
// - IDs are stable, machine-readable, and independent of display order.

/** The three curriculum tracks. Preserved exactly from the locked curriculum. */
export type Track = "core" | "useful" | "optional-depth";

/** The five learning-unit activity modes. */
export type LearningMode = "learn" | "practice" | "build" | "review" | "project";

/**
 * Canonical six-stage progression. `not-started` and `completed` are topic-level
 * states; learning units only ever belong to learning/practicing/building/reviewing.
 * All six values remain representable so the UI can compress `not-started` visually
 * without losing the underlying state.
 */
export type Stage =
  | "not-started"
  | "learning"
  | "practicing"
  | "building"
  | "reviewing"
  | "completed";

/** Unit stages exclude the two topic-only terminal/initial states. */
export type UnitStage = Exclude<Stage, "not-started" | "completed">;

export type Difficulty = "beginner" | "intermediate" | "advanced";

/** A difficulty span for categories/projects that cross levels. */
export interface DifficultyRange {
  from: Difficulty;
  to: Difficulty;
}

export type ResourceType =
  | "documentation"
  | "guide"
  | "reference"
  | "video"
  | "repository"
  | "article"
  | "tool";

/**
 * Placeholder-safe resource. When a concrete URL is not known, `url` is null and
 * `status` is "placeholder" so the app can render a "reference needed" state
 * rather than a fabricated link.
 */
export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string | null;
  status: "known" | "placeholder";
  source: string; // e.g. "Official docs", "Curriculum reference"
  topicId?: string;
  projectId?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  relatedTopicIds: string[];
}

export interface Category {
  id: string;
  order: number; // 1-based, preserves locked ordering
  title: string;
  slug: string;
  description: string;
  purpose: string;
  track: Track;
  estimatedHours: number;
  difficulty: DifficultyRange;
  topicIds: string[];
  projectIds: string[];
  /** Advisory only. Never blocks navigation. */
  prerequisiteCategoryIds: string[];
  learningGoals: string[];
  whyItMatters: string;
}

export interface Topic {
  id: string;
  categoryId: string;
  order: number; // order within category
  title: string;
  slug: string;
  shortDescription: string;
  whyItMatters: string;
  learningObjectives: string[];
  concepts: string[];
  commonMistakes: string[];
  masteryCriteria: string; // "what mastery looks like"
  difficulty: Difficulty;
  estimatedHours: number;
  track: Track;
  /** Applicable subset of the six stages for THIS topic (skippable per curriculum). */
  applicableStages: Stage[];
  /** Advisory ordering only — recommended, never required. No hard lock. */
  recommendedAfter: string[]; // topic ids
  skillIds: string[];
  unitIds: string[]; // ordered
  relatedProjectIds: string[];
  /** Optional artifact this topic produces that a project later evolves. */
  producesArtifact?: string;
}

export interface LearningUnit {
  id: string;
  topicId: string;
  order: number; // order within topic (drives Next Best Action sequencing)
  title: string;
  description: string;
  mode: LearningMode;
  stage: UnitStage; // the stage this unit belongs to (separate from mode)
  estimatedMinutes: number;
  difficulty: Difficulty;
  instructions: string;
  completionCriteria: string;
  skillIds: string[];
  resourceIds: string[];
  /** Advisory intra-topic ordering hint; never a hard lock. */
  recommendedAfterUnitIds: string[];
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  order: number;
  title: string;
  description: string;
  completionCriteria: string;
  relatedTopicIds: string[];
}

export interface Project {
  id: string;
  number: number; // P1..P7 ordering, preserved
  title: string;
  slug: string;
  description: string;
  objective: string;
  difficulty: DifficultyRange;
  estimatedHours: number;
  track: Track;
  technologies: string[];
  skillsCovered: string[]; // skill ids
  prerequisiteTopicIds: string[]; // advisory
  relatedTopicIds: string[];
  milestoneIds: string[]; // ordered
  expectedDeliverables: string[];
  portfolioValue: string;
  /** Explicit link: project evolves an artifact produced by a topic (no rebuild). */
  evolvesFrom?: { topicId: string; artifact: string };
  categoryId: string; // owning/anchor category
}

/** The complete curriculum dataset shape (definition only, no user state). */
export interface CurriculumDataset {
  categories: Category[];
  topics: Topic[];
  units: LearningUnit[];
  projects: Project[];
  milestones: ProjectMilestone[];
  skills: Skill[];
  resources: Resource[];
  meta: {
    version: number;
    lockedAt: string; // ISO date
    sourceOfTruth: "locked-curriculum";
  };
}
