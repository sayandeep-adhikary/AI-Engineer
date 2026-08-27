// Dependency-free validator: reads the seed .ts files as TEXT and checks
// referential integrity + hour sums without any TypeScript runtime or packages.
// Run: node seed/validate-textual.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
// Scan DATA files only — exclude schema/code files that contain rule-name strings.
const DATA_FILES = [
  "categories.ts", "topics-a.ts", "topics-b.ts",
  "units-a.ts", "units-b.ts", "units-c.ts",
  "projects.ts", "milestones.ts", "skills.ts", "resources.ts",
];
const files = readdirSync(dir).filter((f) => DATA_FILES.includes(f));
const texts = Object.fromEntries(files.map((f) => [f, readFileSync(join(dir, f), "utf8")]));
const all = Object.values(texts).join("\n");

const issues = [];
const add = (rule, msg) => issues.push(`[${rule}] ${msg}`);

// Defined ids = those that appear as `id: "..."`
const defined = new Set();
for (const m of all.matchAll(/\bid:\s*"([^"]+)"/g)) defined.add(m[1]);

// Every referenced id (any string literal with a known entity prefix) must be defined.
const PREFIXES = ["category-", "topic-", "unit-", "project-", "milestone-", "skill-", "resource-"];
const referenced = new Set();
for (const m of all.matchAll(/"([^"]+)"/g)) {
  const v = m[1];
  if (PREFIXES.some((p) => v.startsWith(p))) referenced.add(v);
}
for (const r of referenced) {
  if (!defined.has(r)) add("unresolved-reference", `Referenced id not defined anywhere: ${r}`);
}

// Duplicate id detection across the whole dataset.
const seen = new Set();
for (const m of all.matchAll(/\bid:\s*"([^"]+)"/g)) {
  if (seen.has(m[1])) add("duplicate-id", `Duplicate id: ${m[1]}`);
  seen.add(m[1]);
}

// Hour-sum consistency: category.estimatedHours === sum(topic.estimatedHours).
const topicHours = {};
for (const f of ["topics-a.ts", "topics-b.ts"]) {
  const t = texts[f] ?? "";
  // Split into topic objects by "id: \"topic-...\"" boundaries.
  const re = /id:\s*"(topic-[^"]+)"[\s\S]*?estimatedHours:\s*(\d+)/g;
  let m;
  while ((m = re.exec(t))) topicHours[m[1]] = Number(m[2]);
}
const catText = texts["categories.ts"] ?? "";
const catBlocks = catText.split(/\n\s*\{\s*\n/).slice(1);
for (const block of catBlocks) {
  const idM = block.match(/id:\s*"(category-[^"]+)"/);
  const hoursM = block.match(/estimatedHours:\s*(\d+)/);
  const topicIdsM = block.match(/topicIds:\s*\[([\s\S]*?)\]/);
  if (!idM || !hoursM || !topicIdsM) continue;
  const ids = [...topicIdsM[1].matchAll(/"(topic-[^"]+)"/g)].map((x) => x[1]);
  const sum = ids.reduce((a, id) => a + (topicHours[id] ?? 0), 0);
  if (sum !== Number(hoursM[1])) {
    add("hours-consistency", `${idM[1]}: topic-hours sum ${sum} != category ${hoursM[1]}`);
  }
}

// ── Rich content blocks (seed/content/**, lazy-loaded) ──────────────────────
// Content is no longer imported into the main curriculum bundle, so it is
// discovered and validated INDEPENDENTLY by walking the content directory.
// Conservative, false-positive-free checks: known block types, no empty required
// fields, and content keys that resolve to real unit ids. Deep semantic checks
// (quiz answer range, step ordering) live in the typed validator seed/validate.ts
// and additionally run in DEV when a topic's content loads.
const KNOWN_BLOCK_TYPES = new Set([
  "prose", "keyTerm", "code", "callout", "steps", "quiz", "checkpoint", "takeaways",
]);
const contentRoot = join(dir, "content");
const walk = (d) => {
  const out = [];
  let entries;
  try {
    entries = readdirSync(d, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
};
const registryPath = join(contentRoot, "registry.ts");
const contentFiles = walk(contentRoot).filter((p) => p !== registryPath);
const rel = (p) => "content/" + p.slice(contentRoot.length + 1).replace(/\\/g, "/");

for (const p of contentFiles) {
  const text = readFileSync(p, "utf8");
  const label = rel(p);
  // Block openings look like `{ type: "prose"` — reliably distinct from code strings.
  for (const m of text.matchAll(/\{\s*type:\s*"([^"]+)"/g)) {
    if (!KNOWN_BLOCK_TYPES.has(m[1])) add("content-unknown-block", `${label}: unknown block type "${m[1]}"`);
  }
  // Required text fields must not be empty.
  for (const m of text.matchAll(/\b(md|code|question|title|term|definition|action|explanation):\s*""/g)) {
    add("content-empty-field", `${label}: empty required field "${m[1]}"`);
  }
  // Content record keys must reference defined unit ids.
  for (const m of text.matchAll(/"(unit-[^"]+)":\s*[A-Za-z_[]/g)) {
    if (!defined.has(m[1])) add("content-unit-ref", `${label}: content for undefined unit ${m[1]}`);
  }
}

// Registry integrity: each registered topic must exist and point at a real module.
if (existsSync(registryPath)) {
  const regText = readFileSync(registryPath, "utf8");
  for (const m of regText.matchAll(/"(topic-[^"]+)":\s*\(\)\s*=>\s*import\("([^"]+)"\)/g)) {
    const [, topicId, importPath] = m;
    if (!defined.has(topicId)) add("content-registry-topic", `registry.ts: registered topic not defined: ${topicId}`);
    const resolved = join(contentRoot, importPath.replace(/^\.\//, "")) + ".ts";
    if (!existsSync(resolved)) add("content-registry-file", `registry.ts: module not found for ${topicId}: ${importPath}`);
  }
}

// Counts (informational)
const count = (prefix) => [...defined].filter((d) => d.startsWith(prefix)).length;const stats = {
  categories: count("category-"),
  topics: count("topic-"),
  units: count("unit-"),
  projects: count("project-"),
  milestones: count("milestone-"),
  skills: count("skill-"),
  resources: count("resource-"),
};

// Mode / stage / track distributions (from data files).
const unitText = [texts["units-a.ts"], texts["units-b.ts"], texts["units-c.ts"]].join("\n");
const tally = (text, re) => {
  const out = {};
  for (const m of text.matchAll(re)) out[m[1]] = (out[m[1]] ?? 0) + 1;
  return out;
};
const modeCounts = tally(unitText, /\bmode:\s*"([^"]+)"/g);
const unitStageCounts = tally(unitText, /\bstage:\s*"([^"]+)"/g);
const topicText = [texts["topics-a.ts"], texts["topics-b.ts"]].join("\n");
const topicTrackCounts = tally(topicText, /\btrack:\s*"([^"]+)"/g);

console.log("── Counts ──", JSON.stringify(stats, null, 0));
console.log("── Unit modes ──", JSON.stringify(modeCounts, null, 0));
console.log("── Unit stages ──", JSON.stringify(unitStageCounts, null, 0));
console.log("── Topic tracks ──", JSON.stringify(topicTrackCounts, null, 0));
if (issues.length === 0) {
  console.log("Curriculum textual validation: PASS (0 issues)");
} else {
  console.log(`Curriculum textual validation: ${issues.length} issue(s)`);
  for (const i of issues) console.log("  " + i);
}
