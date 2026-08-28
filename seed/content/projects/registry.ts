import type { ProjectGuide } from "../../types";

// Lazy-loading boundary for rich project guides — the same pattern as lesson
// content (registry.ts): each project id maps to a dynamic import so a guide is
// split into its own chunk and loads only when a learner opens that project.
//
// Adding a guide = create one module exporting `guide: ProjectGuide` and add one
// line here. Guides are NOT part of the eager curriculum bundle.

export interface ProjectGuideModule {
  guide: ProjectGuide;
}

export const projectGuideModules: Record<string, () => Promise<ProjectGuideModule>> = {
  "project-p1-structured-output": () => import("./structured-output-utility"),
  "project-p2-semantic-search": () => import("./semantic-search-engine"),
  "project-p3-rag-app": () => import("./rag-application"),
  "project-p4-agent": () => import("./tool-using-agent"),
  "project-p5-multimodal": () => import("./multimodal-application"),
  "project-p6-production-service": () => import("./production-ai-service"),
  "project-p7-specialization": () => import("./specialization-capstone"),
};

/** Whether a project has a registered guide (sync, no import). */
export function hasProjectGuide(projectId: string): boolean {
  return Object.prototype.hasOwnProperty.call(projectGuideModules, projectId);
}
