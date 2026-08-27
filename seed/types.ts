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

// ── Rich learning content (additive, optional) ──────────────────────────────
// A unit MAY carry an ordered list of typed content blocks that render an actual
// lesson/exercise/review experience. Units without `content` keep their existing
// behaviour unchanged. Blocks are a small discriminated union — deliberately not
// a generic CMS. Prose fields hold a safe Markdown SUBSET (bold, italic, inline
// code, links, bullet/ordered lists) rendered without raw HTML.

/** Languages a CodeBlock may declare. Constrains rendering + validation. */
export type CodeLanguage = "python" | "bash" | "text" | "json" | "yaml";

/** Callout intent — drives icon/colour, never colour-only. */
export type CalloutVariant = "gotcha" | "warning" | "tip" | "note";

/** Whether a step sequence walks the learner or asks them to work independently. */
export type StepGuidance = "guided" | "independent";

export interface ProseBlock {
  type: "prose";
  md: string; // safe Markdown subset
}

export interface KeyTermBlock {
  type: "keyTerm";
  terms: { term: string; definition: string }[];
}

export interface CodeBlock {
  type: "code";
  language: CodeLanguage;
  code: string;
  caption?: string;
  /** Expected output / observed behaviour, shown separately from the source. */
  output?: string;
  /** When true, the code is hidden behind a reveal button (e.g. reference solutions). */
  collapsible?: boolean;
  /** Override the reveal button label (defaults to "Show code"). */
  collapseLabel?: string;
}

export interface CalloutBlock {
  type: "callout";
  variant: CalloutVariant;
  title: string;
  md: string; // safe Markdown subset
}

export interface GuidedStep {
  order: number; // 1-based, contiguous within the block
  action: string; // what the learner must DO
  expected?: string; // expected result / observation
  verify?: string; // how to confirm it worked
  /** A decision the learner should resolve before revealing what follows. */
  decision?: string;
}

export interface StepsBlock {
  type: "steps";
  guidance: StepGuidance;
  title: string;
  intro?: string;
  steps: GuidedStep[];
}

export interface QuizBlock {
  type: "quiz";
  question: string;
  choices: string[]; // >= 2
  answerIndex: number; // index into `choices`
  explanation: string;
}

export interface CheckpointBlock {
  type: "checkpoint";
  title: string;
  items: string[]; // non-empty verification statements
}

export interface TakeawaysBlock {
  type: "takeaways";
  items: string[]; // non-empty
}

export type ContentBlock =
  | ProseBlock
  | KeyTermBlock
  | CodeBlock
  | CalloutBlock
  | StepsBlock
  | QuizBlock
  | CheckpointBlock
  | TakeawaysBlock;

/** A topic's lesson content: ordered blocks keyed by unit id. Loaded lazily. */
export type TopicContent = Record<string, ContentBlock[]>;

/** The set of valid block type discriminants (used by validators). */
export const CONTENT_BLOCK_TYPES = [
  "prose",
  "keyTerm",
  "code",
  "callout",
  "steps",
  "quiz",
  "checkpoint",
  "takeaways",
] as const;

export const CODE_LANGUAGES = ["python", "bash", "text", "json", "yaml"] as const;
export const CALLOUT_VARIANTS = ["gotcha", "warning", "tip", "note"] as const;
export const STEP_GUIDANCE = ["guided", "independent"] as const;

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
  /** Optional rich lesson/exercise/review content. Backward compatible. */
  content?: ContentBlock[];
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
