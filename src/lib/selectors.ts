import type { Category, LearningUnit, ProjectMilestone, Stage, Topic } from "@/data/curriculum";
import {
  categoryById,
  isPrimaryCategory,
  milestonesForProject,
  orderedCategories,
  topicById,
  topicsForCategory,
  unitsForTopic,
} from "@/data/curriculum";
import type { ProjectStatus, UserProgress } from "@/state/types";

const ACTIVE_STAGES: Stage[] = ["learning", "practicing", "building", "reviewing"];

export function topicStage(progress: UserProgress, topicId: string): Stage {
  return progress.topicStages[topicId] ?? "not-started";
}

export interface TopicProgress {
  completed: number;
  total: number;
  ratio: number;
  completedStage: boolean;
}

export function topicProgress(progress: UserProgress, topicId: string): TopicProgress {
  const units = unitsForTopic(topicId);
  const total = units.length;
  const completed = units.filter((u) => progress.completedUnits[u.id]).length;
  const completedStage = topicStage(progress, topicId) === "completed";
  const ratio = completedStage ? 1 : total === 0 ? 0 : completed / total;
  return { completed, total, ratio, completedStage };
}

export function isTopicCompleted(progress: UserProgress, topicId: string): boolean {
  const p = topicProgress(progress, topicId);
  return p.completedStage || (p.total > 0 && p.completed === p.total);
}

export function isTopicActive(progress: UserProgress, topicId: string): boolean {
  const stage = topicStage(progress, topicId);
  return ACTIVE_STAGES.includes(stage) && !isTopicCompleted(progress, topicId);
}

/** Hour-weighted progress ratio for a category (0..1). */
export function categoryProgress(progress: UserProgress, categoryId: string): number {
  const topics = topicsForCategory(categoryId);
  const totalHours = topics.reduce((a, t) => a + t.estimatedHours, 0);
  if (totalHours === 0) return 0;
  const done = topics.reduce(
    (a, t) => a + topicProgress(progress, t.id).ratio * t.estimatedHours,
    0
  );
  return done / totalHours;
}

/** Primary CORE-path progress: hour-weighted across non-optional-depth categories. */
export function corePathProgress(progress: UserProgress): number {
  const cats = orderedCategories.filter(isPrimaryCategory);
  const totalHours = cats.reduce((a, c) => a + c.estimatedHours, 0);
  if (totalHours === 0) return 0;
  const done = cats.reduce((a, c) => a + categoryProgress(progress, c.id) * c.estimatedHours, 0);
  return done / totalHours;
}

/** Optional-depth progress, reported separately — never mixed into the primary %. */
export function optionalDepthProgress(progress: UserProgress): number {
  const cats = orderedCategories.filter((c) => !isPrimaryCategory(c));
  const totalHours = cats.reduce((a, c) => a + c.estimatedHours, 0);
  if (totalHours === 0) return 0;
  const done = cats.reduce((a, c) => a + categoryProgress(progress, c.id) * c.estimatedHours, 0);
  return done / totalHours;
}

/** All primary-path topics (category CORE + topic not optional-depth), curriculum order. */
export function primaryPathTopics(): Topic[] {
  const catOrder = new Map(orderedCategories.map((c, i) => [c.id, i]));
  return orderedCategories
    .filter(isPrimaryCategory)
    .flatMap((c) => topicsForCategory(c.id))
    .filter((t) => t.track !== "optional-depth")
    .sort((a, b) => {
      const ca = catOrder.get(a.categoryId) ?? 0;
      const cb = catOrder.get(b.categoryId) ?? 0;
      return ca !== cb ? ca - cb : a.order - b.order;
    });
}

export interface NextBestAction {
  topic: Topic;
  category: Category;
  unit: LearningUnit | null;
  contextLine: string;
  reason: "resume" | "recommended" | "explore-next" | "all-complete";
}

const STAGE_CONTEXT: Record<Stage, string> = {
  "not-started": "Start here to begin this topic.",
  learning: "Build the fundamentals before moving on.",
  practicing: "You've learned the fundamentals — time to practice.",
  building: "You've practiced — now build it for real.",
  reviewing: "Almost there — review and validate your work.",
  completed: "Completed.",
};

/**
 * Next Best Action — derived dynamically from user state + curriculum.
 * 1) earliest active CORE topic, else 2) earliest ready not-started CORE topic
 * (recommendedAfter is advisory only, never blocking), then the earliest
 * incomplete unit within it.
 */
export function nextBestAction(progress: UserProgress): NextBestAction {
  const topics = primaryPathTopics();

  const active = topics.filter((t) => isTopicActive(progress, t.id));
  let candidate: Topic | undefined = active[0];
  let reason: NextBestAction["reason"] = "resume";

  if (!candidate) {
    const notStarted = topics.filter(
      (t) => topicStage(progress, t.id) === "not-started" && !isTopicCompleted(progress, t.id)
    );
    const ready = notStarted.filter((t) =>
      t.recommendedAfter.every((id) => isTopicCompleted(progress, id))
    );
    candidate = ready[0] ?? notStarted[0];
    reason = ready[0] ? "recommended" : "explore-next";
  }

  if (!candidate) {
    // Everything on the primary path is complete — celebrate, don't block.
    const last = topics[topics.length - 1];
    const category = categoryById.get(last?.categoryId ?? "") as Category;
    return {
      topic: last as Topic,
      category,
      unit: null,
      contextLine: "You've completed the core AI Engineer path. Explore optional depth or projects.",
      reason: "all-complete",
    };
  }

  const category = categoryById.get(candidate.categoryId) as Category;
  const nextUnit = unitsForTopic(candidate.id).find((u) => !progress.completedUnits[u.id]) ?? null;
  const stage = topicStage(progress, candidate.id);

  return {
    topic: candidate,
    category,
    unit: nextUnit,
    contextLine: STAGE_CONTEXT[stage],
    reason,
  };
}

export interface JourneyPosition {
  currentCategory: Category | null;
  index: number; // 1-based
  total: number;
}

export function journeyPosition(progress: UserProgress): JourneyPosition {
  const cats = orderedCategories.filter(isPrimaryCategory);
  const nba = nextBestAction(progress);
  const idx = cats.findIndex((c) => c.id === nba.category?.id);
  return {
    currentCategory: idx >= 0 ? cats[idx] : cats[0] ?? null,
    index: (idx >= 0 ? idx : 0) + 1,
    total: cats.length,
  };
}

/** Consecutive-day streak from the append-only event log (local time). */
export function streakDays(progress: UserProgress): number {
  if (progress.events.length === 0) return 0;
  const days = new Set(
    progress.events.map((e) => new Date(e.timestamp).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to count from today or yesterday.
  const today = cursor.toISOString().slice(0, 10);
  const yesterday = new Date(cursor.getTime() - 86400000).toISOString().slice(0, 10);
  if (!days.has(today) && !days.has(yesterday)) return 0;
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

export function unitsCompletedThisWeek(progress: UserProgress): number {
  const weekAgo = Date.now() - 7 * 86400000;
  return Object.values(progress.completedUnits).filter((iso) => new Date(iso).getTime() >= weekAgo)
    .length;
}

export interface ContinueItem {
  topic: Topic;
  category: Category;
  stage: Stage;
}

/** Up-next list for the dashboard (excludes the NBA topic). */
export function continueLearning(progress: UserProgress, limit = 3): ContinueItem[] {
  const topics = primaryPathTopics();
  const nba = nextBestAction(progress);
  return topics
    .filter((t) => t.id !== nba.topic?.id && !isTopicCompleted(progress, t.id))
    .slice(0, limit)
    .map((t) => ({
      topic: t,
      category: categoryById.get(t.categoryId) as Category,
      stage: topicStage(progress, t.id),
    }));
}

export function recentlyCompletedTopics(progress: UserProgress, limit = 5): Topic[] {
  return progress.events
    .filter((e) => e.type === "stage-advanced" && e.payload?.stage === "completed")
    .map((e) => topicById.get(e.refId))
    .filter((t): t is Topic => Boolean(t))
    .slice(0, limit);
}

export type UnitState = "completed" | "in-progress" | "not-started";

export function unitState(progress: UserProgress, unitId: string): UnitState {
  if (progress.completedUnits[unitId]) return "completed";
  if (progress.startedUnits[unitId]) return "in-progress";
  return "not-started";
}

/** The earliest incomplete unit of a topic (the single next action). */
export function currentActionableUnit(
  progress: UserProgress,
  topicId: string
): LearningUnit | null {
  return unitsForTopic(topicId).find((u) => !progress.completedUnits[u.id]) ?? null;
}

/** Total explicitly-logged minutes for a topic (never inferred). */
export function loggedMinutesForTopic(progress: UserProgress, topicId: string): number {
  return progress.sessions
    .filter((s) => s.topicId === topicId && s.endedAt)
    .reduce((acc, s) => {
      const start = new Date(s.startedAt).getTime();
      const end = new Date(s.endedAt as string).getTime();
      return acc + Math.max(0, Math.round((end - start) / 60000));
    }, 0);
}

// ── Labs (the "do" surface) ────────────────────────────────────────────────
const LAB_MODES = new Set<LearningUnit["mode"]>(["practice", "build", "review", "project"]);

export interface LabItem {
  unit: LearningUnit;
  topic: Topic;
  category: Category;
}

/** All hands-on units (practice/build/review/project) in curriculum order. */
export function allLabs(): LabItem[] {
  return orderedCategories.flatMap((category) =>
    topicsForCategory(category.id).flatMap((topic) =>
      unitsForTopic(topic.id)
        .filter((u) => LAB_MODES.has(u.mode))
        .map((unit) => ({ unit, topic, category }))
    )
  );
}

/**
 * The single recommended lab — the same "what next?" logic used elsewhere:
 * earliest incomplete hands-on unit on the primary path, preferring in-progress.
 */
export function recommendedLab(progress: UserProgress): LabItem | null {
  const primary = allLabs().filter(
    (l) => isPrimaryCategory(l.category) && l.topic.track !== "optional-depth"
  );
  const incomplete = primary.filter((l) => !progress.completedUnits[l.unit.id]);
  const inProgress = incomplete.find((l) => progress.startedUnits[l.unit.id]);
  return inProgress ?? incomplete[0] ?? null;
}

// ── Projects (parallel spine; milestones are the explicit progress engine) ──
export interface MilestoneProgress {
  completed: number;
  total: number;
  ratio: number;
}

export function projectMilestoneProgress(
  progress: UserProgress,
  projectId: string
): MilestoneProgress {
  const ms = milestonesForProject(projectId);
  const total = ms.length;
  const completed = ms.filter((m) => progress.completedMilestones[m.id]).length;
  return { completed, total, ratio: total === 0 ? 0 : completed / total };
}

/** Status derived from milestone completion (explicit start allows in-progress at 0). */
export function derivedProjectStatus(progress: UserProgress, projectId: string): ProjectStatus {
  const { completed, total } = projectMilestoneProgress(progress, projectId);
  if (total > 0 && completed === total) return "completed";
  if (completed > 0) return "in-progress";
  const explicit = progress.projectStatus[projectId];
  if (explicit === "in-progress" || explicit === "completed") return explicit;
  return "planned";
}

/** The earliest incomplete milestone of a project (the next actionable step). */
export function currentActionableMilestone(
  progress: UserProgress,
  projectId: string
): ProjectMilestone | null {
  return milestonesForProject(projectId).find((m) => !progress.completedMilestones[m.id]) ?? null;
}
