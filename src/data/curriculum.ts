// Read-only curriculum access layer. Re-exports the authoritative seed dataset
// and builds O(1) lookup maps. The UI must import curriculum ONLY from here and
// must never mutate it.
import {
  curriculum,
  categories,
  topics,
  units,
  projects,
  milestones,
  skills,
  resources,
} from "@seed/index";
import type {
  Category,
  Topic,
  LearningUnit,
  Project,
  ProjectMilestone,
  Skill,
  Resource,
} from "@seed/index";

export type {
  Category,
  Topic,
  LearningUnit,
  Project,
  ProjectMilestone,
  Skill,
  Resource,
  Stage,
  UnitStage,
  LearningMode,
  Track,
  Difficulty,
  DifficultyRange,
} from "@seed/index";

export { curriculum, categories, topics, units, projects, milestones, skills, resources };

const index = <T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> =>
  new Map(items.map((i) => [i.id, i]));

export const categoryById = index<Category>(categories);
export const topicById = index<Topic>(topics);
export const unitById = index<LearningUnit>(units);
export const projectById = index<Project>(projects);
export const milestoneById = index<ProjectMilestone>(milestones);
export const skillById = index<Skill>(skills);
export const resourceById = index<Resource>(resources);

/** Units belonging to a topic, in curriculum order. */
export function unitsForTopic(topicId: string): LearningUnit[] {
  return units
    .filter((u) => u.topicId === topicId)
    .sort((a, b) => a.order - b.order);
}

/** Milestones belonging to a project, in order. */
export function milestonesForProject(projectId: string): ProjectMilestone[] {
  return milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

/** Categories in curriculum order. */
export const orderedCategories: Category[] = [...categories].sort((a, b) => a.order - b.order);

/** Topics of a category, in order. */
export function topicsForCategory(categoryId: string): Topic[] {
  const cat = categoryById.get(categoryId);
  if (!cat) return [];
  return cat.topicIds
    .map((id) => topicById.get(id))
    .filter((t): t is Topic => Boolean(t))
    .sort((a, b) => a.order - b.order);
}

/** A category counts toward primary progress unless it is an optional-depth track. */
export function isPrimaryCategory(cat: Category): boolean {
  return cat.track !== "optional-depth";
}
