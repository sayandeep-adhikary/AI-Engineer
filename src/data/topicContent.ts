import { contentModules, hasTopicContent } from "@seed/content/registry";
import { topicById } from "./curriculum";
import type { TopicContent } from "./curriculum";

export { hasTopicContent };
export type { TopicContent };

// Result of asking for a topic's lesson content. `empty` and `error` are
// deliberately distinct so the UI can degrade honestly (never a blank page):
// - unknown  → the topic id does not exist in the curriculum
// - empty    → the topic exists but has no registered lesson content (fallback)
// - ok       → content loaded
// - error    → a registered module failed to load / import (surface, don't hide)
export type ContentLoadResult =
  | { status: "unknown" }
  | { status: "empty" }
  | { status: "ok"; content: TopicContent }
  | { status: "error" };

export async function loadTopicContent(topicId: string): Promise<ContentLoadResult> {
  if (!topicById.has(topicId)) return { status: "unknown" };
  const importer = contentModules[topicId];
  if (!importer) return { status: "empty" };

  try {
    const mod = await importer();
    const content = mod.content ?? {};

    if (import.meta.env.DEV) {
      // Dev-only semantic validation so authoring mistakes surface immediately,
      // even though content is no longer part of the eager curriculum bundle.
      const { validateContentBlocks } = await import("@seed/validate");
      for (const [unitId, blocks] of Object.entries(content)) {
        const issues = validateContentBlocks(unitId, blocks);
        if (issues.length > 0) {
          // eslint-disable-next-line no-console
          console.error(`[content] Invalid content for ${topicId} / ${unitId}:`, issues);
        }
      }
    }

    return { status: "ok", content };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[content] Failed to load lesson content for ${topicId}`, err);
    return { status: "error" };
  }
}
