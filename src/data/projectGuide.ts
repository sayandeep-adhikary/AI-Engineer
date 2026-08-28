import { projectGuideModules, hasProjectGuide } from "@seed/content/projects/registry";
import { projectById } from "./curriculum";
import type { ProjectGuide, GuidePhase, GuideTech, GuideDecision, GuideTesting } from "@seed/types";

export { hasProjectGuide };
export type { ProjectGuide, GuidePhase, GuideTech, GuideDecision, GuideTesting };

// Result of asking for a project's guide. Mirrors ContentLoadResult so the UI can
// degrade honestly (never a blank page):
// - unknown → the project id does not exist
// - empty   → the project exists but has no registered guide (fallback)
// - ok      → guide loaded
// - error   → a registered module failed to import (surface, don't hide)
export type GuideLoadResult =
  | { status: "unknown" }
  | { status: "empty" }
  | { status: "ok"; guide: ProjectGuide }
  | { status: "error" };

export async function loadProjectGuide(projectId: string): Promise<GuideLoadResult> {
  if (!projectById.has(projectId)) return { status: "unknown" };
  const importer = projectGuideModules[projectId];
  if (!importer) return { status: "empty" };
  try {
    const mod = await importer();
    return { status: "ok", guide: mod.guide };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[guide] Failed to load project guide for ${projectId}`, err);
    return { status: "error" };
  }
}
