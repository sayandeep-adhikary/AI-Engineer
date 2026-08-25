import type { CurriculumDataset, Topic, LearningUnit } from "./types";
import { categories } from "./categories";
import { topicsPartA } from "./topics-a";
import { topicsPartB } from "./topics-b";
import { unitsPartA } from "./units-a";
import { unitsPartB } from "./units-b";
import { unitsPartC } from "./units-c";
import { projects } from "./projects";
import { milestones } from "./milestones";
import { skills } from "./skills";
import { resources } from "./resources";

export * from "./types";

export const topics: Topic[] = [...topicsPartA, ...topicsPartB];
export const units: LearningUnit[] = [...unitsPartA, ...unitsPartB, ...unitsPartC];

export { categories, projects, milestones, skills, resources };

// The complete, locked curriculum dataset (definition only — no user progress).
export const curriculum: CurriculumDataset = {
  categories,
  topics,
  units,
  projects,
  milestones,
  skills,
  resources,
  meta: {
    version: 1,
    lockedAt: "2026-08-25",
    sourceOfTruth: "locked-curriculum",
  },
};

export default curriculum;
