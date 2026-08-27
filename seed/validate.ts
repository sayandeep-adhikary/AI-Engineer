import type {
  CurriculumDataset,
  LearningMode,
  Stage,
  Track,
  UnitStage,
  ContentBlock,
} from "./types";
import {
  CONTENT_BLOCK_TYPES,
  CODE_LANGUAGES,
  CALLOUT_VARIANTS,
  STEP_GUIDANCE,
} from "./types";
import { curriculum } from "./index";

// Standalone consistency audit for the curriculum seed data. Pure functions,
// no side effects beyond an optional console report. Run with e.g. ts-node.

const VALID_MODES: LearningMode[] = ["learn", "practice", "build", "review", "project"];
const VALID_UNIT_STAGES: UnitStage[] = ["learning", "practicing", "building", "reviewing"];
const VALID_STAGES: Stage[] = ["not-started", "learning", "practicing", "building", "reviewing", "completed"];
const VALID_TRACKS: Track[] = ["core", "useful", "optional-depth"];

export interface ValidationIssue {
  rule: string;
  message: string;
}

/**
 * Structural + semantic validation for a unit's optional content blocks.
 * Enforces: known block types, non-empty required fields, quiz answers that
 * reference a real choice, valid code language, contiguous step ordering, and
 * non-empty checkpoint/takeaway items.
 */
export function validateContentBlocks(
  unitId: string,
  blocks: ContentBlock[]
): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (message: string) => out.push({ rule: "content-block", message });
  const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

  blocks.forEach((block, i) => {
    const at = `Unit ${unitId} block[${i}] (${(block as { type?: string }).type ?? "?"})`;
    if (!(CONTENT_BLOCK_TYPES as readonly string[]).includes((block as { type: string }).type)) {
      add(`${at}: unknown block type`);
      return;
    }
    switch (block.type) {
      case "prose":
        if (!nonEmpty(block.md)) add(`${at}: empty md`);
        break;
      case "keyTerm":
        if (block.terms.length === 0) add(`${at}: no terms`);
        block.terms.forEach((t, j) => {
          if (!nonEmpty(t.term)) add(`${at}.terms[${j}]: empty term`);
          if (!nonEmpty(t.definition)) add(`${at}.terms[${j}]: empty definition`);
        });
        break;
      case "code":
        if (!CODE_LANGUAGES.includes(block.language)) add(`${at}: invalid language ${block.language}`);
        if (!nonEmpty(block.code)) add(`${at}: empty code`);
        break;
      case "callout":
        if (!CALLOUT_VARIANTS.includes(block.variant)) add(`${at}: invalid variant ${block.variant}`);
        if (!nonEmpty(block.title)) add(`${at}: empty title`);
        if (!nonEmpty(block.md)) add(`${at}: empty md`);
        break;
      case "steps":
        if (!STEP_GUIDANCE.includes(block.guidance)) add(`${at}: invalid guidance ${block.guidance}`);
        if (!nonEmpty(block.title)) add(`${at}: empty title`);
        if (block.steps.length === 0) add(`${at}: no steps`);
        block.steps.forEach((s, j) => {
          if (s.order !== j + 1) add(`${at}.steps[${j}]: order ${s.order} not contiguous (expected ${j + 1})`);
          if (!nonEmpty(s.action)) add(`${at}.steps[${j}]: empty action`);
        });
        break;
      case "quiz":
        if (!nonEmpty(block.question)) add(`${at}: empty question`);
        if (block.choices.length < 2) add(`${at}: needs >= 2 choices`);
        block.choices.forEach((c, j) => !nonEmpty(c) && add(`${at}.choices[${j}]: empty choice`));
        if (
          !Number.isInteger(block.answerIndex) ||
          block.answerIndex < 0 ||
          block.answerIndex >= block.choices.length
        )
          add(`${at}: answerIndex ${block.answerIndex} out of range 0..${block.choices.length - 1}`);
        if (!nonEmpty(block.explanation)) add(`${at}: empty explanation`);
        break;
      case "checkpoint":
        if (!nonEmpty(block.title)) add(`${at}: empty title`);
        if (block.items.length === 0) add(`${at}: no items`);
        block.items.forEach((it, j) => !nonEmpty(it) && add(`${at}.items[${j}]: empty item`));
        break;
      case "takeaways":
        if (block.items.length === 0) add(`${at}: no items`);
        block.items.forEach((it, j) => !nonEmpty(it) && add(`${at}.items[${j}]: empty item`));
        break;
    }
  });
  return out;
}

export function validateCurriculum(data: CurriculumDataset = curriculum): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (rule: string, message: string) => issues.push({ rule, message });

  const categoryIds = new Set(data.categories.map((c) => c.id));
  const topicIds = new Set(data.topics.map((t) => t.id));
  const unitIds = new Set(data.units.map((u) => u.id));
  const projectIds = new Set(data.projects.map((p) => p.id));
  const milestoneIds = new Set(data.milestones.map((m) => m.id));
  const skillIds = new Set(data.skills.map((s) => s.id));
  const resourceIds = new Set(data.resources.map((r) => r.id));

  // 1. Unique IDs across each collection
  const dupCheck = (name: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) add("no-duplicate-ids", `Duplicate ${name} id: ${id}`);
      seen.add(id);
    }
  };
  dupCheck("category", data.categories.map((c) => c.id));
  dupCheck("topic", data.topics.map((t) => t.id));
  dupCheck("unit", data.units.map((u) => u.id));
  dupCheck("project", data.projects.map((p) => p.id));
  dupCheck("milestone", data.milestones.map((m) => m.id));
  dupCheck("skill", data.skills.map((s) => s.id));
  dupCheck("resource", data.resources.map((r) => r.id));

  // 2. Categories reference existing topics/projects; ordering correct
  const orders = data.categories.map((c) => c.order).sort((a, b) => a - b);
  orders.forEach((o, i) => {
    if (o !== i + 1) add("category-ordering", `Category order not contiguous at ${o}`);
  });
  for (const c of data.categories) {
    c.topicIds.forEach((id) => !topicIds.has(id) && add("category-topic-ref", `Category ${c.id} references missing topic ${id}`));
    c.projectIds.forEach((id) => !projectIds.has(id) && add("category-project-ref", `Category ${c.id} references missing project ${id}`));
    c.prerequisiteCategoryIds.forEach((id) => !categoryIds.has(id) && add("category-prereq-ref", `Category ${c.id} references missing prereq category ${id}`));
    if (!VALID_TRACKS.includes(c.track)) add("valid-track", `Category ${c.id} invalid track ${c.track}`);
  }

  // 3. Topics reference an existing category; no orphans; skills/units/prereqs resolve
  for (const t of data.topics) {
    if (!categoryIds.has(t.categoryId)) add("topic-category-ref", `Topic ${t.id} references missing category ${t.categoryId}`);
    if (!VALID_TRACKS.includes(t.track)) add("valid-track", `Topic ${t.id} invalid track ${t.track}`);
    t.applicableStages.forEach((s) => !VALID_STAGES.includes(s) && add("valid-stage", `Topic ${t.id} invalid stage ${s}`));
    t.skillIds.forEach((id) => !skillIds.has(id) && add("topic-skill-ref", `Topic ${t.id} references missing skill ${id}`));
    t.unitIds.forEach((id) => !unitIds.has(id) && add("topic-unit-ref", `Topic ${t.id} references missing unit ${id}`));
    t.recommendedAfter.forEach((id) => !topicIds.has(id) && add("topic-recommendedafter-ref", `Topic ${t.id} recommendedAfter missing topic ${id}`));
    t.relatedProjectIds.forEach((id) => !projectIds.has(id) && add("topic-project-ref", `Topic ${t.id} references missing project ${id}`));
    // No hard-lock field allowed
    if ("lockedUntil" in (t as unknown as Record<string, unknown>)) add("no-hard-lock", `Topic ${t.id} contains forbidden lockedUntil`);
  }

  // Orphan topics: every topic must be listed by its category
  const listedTopicIds = new Set(data.categories.flatMap((c) => c.topicIds));
  for (const t of data.topics) {
    if (!listedTopicIds.has(t.id)) add("no-orphan-topics", `Topic ${t.id} not listed in any category`);
  }

  // 4. Units reference an existing topic; valid mode/stage; skills/resources resolve
  const listedUnitIds = new Set(data.topics.flatMap((t) => t.unitIds));
  for (const u of data.units) {
    if (!topicIds.has(u.topicId)) add("unit-topic-ref", `Unit ${u.id} references missing topic ${u.topicId}`);
    if (!VALID_MODES.includes(u.mode)) add("valid-mode", `Unit ${u.id} invalid mode ${u.mode}`);
    if (!VALID_UNIT_STAGES.includes(u.stage)) add("valid-stage", `Unit ${u.id} invalid stage ${u.stage}`);
    u.skillIds.forEach((id) => !skillIds.has(id) && add("unit-skill-ref", `Unit ${u.id} references missing skill ${id}`));
    u.resourceIds.forEach((id) => !resourceIds.has(id) && add("unit-resource-ref", `Unit ${u.id} references missing resource ${id}`));
    u.recommendedAfterUnitIds.forEach((id) => !unitIds.has(id) && add("unit-recommendedafter-ref", `Unit ${u.id} recommendedAfter missing unit ${id}`));
    if (!listedUnitIds.has(u.id)) add("no-orphan-units", `Unit ${u.id} not listed by its topic`);
    if (u.content) {
      for (const issue of validateContentBlocks(u.id, u.content)) issues.push(issue);
    }
  }

  // 5. Projects reference existing topics/milestones/skills; ordering correct
  const pOrders = data.projects.map((p) => p.number).sort((a, b) => a - b);
  pOrders.forEach((o, i) => {
    if (o !== i + 1) add("project-ordering", `Project number not contiguous at ${o}`);
  });
  const listedProjectIds = new Set(data.categories.flatMap((c) => c.projectIds));
  for (const p of data.projects) {
    if (!categoryIds.has(p.categoryId)) add("project-category-ref", `Project ${p.id} references missing category ${p.categoryId}`);
    if (!VALID_TRACKS.includes(p.track)) add("valid-track", `Project ${p.id} invalid track ${p.track}`);
    p.prerequisiteTopicIds.forEach((id) => !topicIds.has(id) && add("project-prereq-topic-ref", `Project ${p.id} references missing prereq topic ${id}`));
    p.relatedTopicIds.forEach((id) => !topicIds.has(id) && add("project-topic-ref", `Project ${p.id} references missing related topic ${id}`));
    p.milestoneIds.forEach((id) => !milestoneIds.has(id) && add("project-milestone-ref", `Project ${p.id} references missing milestone ${id}`));
    p.skillsCovered.forEach((id) => !skillIds.has(id) && add("project-skill-ref", `Project ${p.id} references missing skill ${id}`));
    if (p.evolvesFrom && !topicIds.has(p.evolvesFrom.topicId)) add("project-evolvesfrom-ref", `Project ${p.id} evolvesFrom missing topic ${p.evolvesFrom.topicId}`);
    if (!listedProjectIds.has(p.id)) add("no-orphan-projects", `Project ${p.id} not listed by any category`);
  }

  // 6. Milestones reference an existing project
  for (const m of data.milestones) {
    if (!projectIds.has(m.projectId)) add("milestone-project-ref", `Milestone ${m.id} references missing project ${m.projectId}`);
    m.relatedTopicIds.forEach((id) => !topicIds.has(id) && add("milestone-topic-ref", `Milestone ${m.id} references missing topic ${id}`));
  }

  // 7. Skills/resources back-references resolve
  for (const s of data.skills) {
    s.relatedTopicIds.forEach((id) => !topicIds.has(id) && add("skill-topic-ref", `Skill ${s.id} references missing topic ${id}`));
  }
  for (const r of data.resources) {
    if (r.topicId && !topicIds.has(r.topicId)) add("resource-topic-ref", `Resource ${r.id} references missing topic ${r.topicId}`);
    if (r.projectId && !projectIds.has(r.projectId)) add("resource-project-ref", `Resource ${r.id} references missing project ${r.projectId}`);
    if (r.status === "placeholder" && r.url !== null) add("resource-placeholder-url", `Resource ${r.id} is placeholder but has a url`);
  }

  // 8. No circular prerequisites among categories (advisory graph must be a DAG)
  const detectCycle = (
    getNeighbors: (id: string) => string[],
    nodes: string[],
    ruleName: string
  ) => {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>(nodes.map((n) => [n, WHITE]));
    const visit = (n: string): boolean => {
      color.set(n, GRAY);
      for (const nb of getNeighbors(n)) {
        if (!color.has(nb)) continue;
        if (color.get(nb) === GRAY) return true;
        if (color.get(nb) === WHITE && visit(nb)) return true;
      }
      color.set(n, BLACK);
      return false;
    };
    for (const n of nodes) {
      if (color.get(n) === WHITE && visit(n)) {
        add(ruleName, `Circular prerequisite detected involving ${n}`);
        break;
      }
    }
  };
  const catById = new Map(data.categories.map((c) => [c.id, c]));
  detectCycle((id) => catById.get(id)?.prerequisiteCategoryIds ?? [], [...categoryIds], "no-circular-category-prereqs");
  const topById = new Map(data.topics.map((t) => [t.id, t]));
  detectCycle((id) => topById.get(id)?.recommendedAfter ?? [], [...topicIds], "no-circular-topic-recommendedafter");

  // 9. Estimated hours consistency: topic hours sum to category estimatedHours
  for (const c of data.categories) {
    const sum = c.topicIds.reduce((acc, id) => acc + (topById.get(id)?.estimatedHours ?? 0), 0);
    if (sum !== c.estimatedHours) {
      add("estimated-hours-consistency", `Category ${c.id}: topic hours sum ${sum} != category estimatedHours ${c.estimatedHours}`);
    }
  }

  return issues;
}

export function reportValidation(data: CurriculumDataset = curriculum): void {
  const issues = validateCurriculum(data);
  if (issues.length === 0) {
    // eslint-disable-next-line no-console
    console.log("Curriculum validation: PASS (0 issues)");
  } else {
    // eslint-disable-next-line no-console
    console.error(`Curriculum validation: ${issues.length} issue(s)`);
    for (const i of issues) console.error(`  [${i.rule}] ${i.message}`);
  }
}
