import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Practical Data Tooling (pandas/numpy, light)" (topic-py-data-libs).
// 3 units: 01 learn · 02 practice (clean a dataset + troubleshoot) · 03 build (corpus prep).
// pandas/numpy. Chained-assignment behaviour is version-dependent (noted). Outputs
// shown are exact scalars/shapes (not full-frame reprs) so they're reproducible.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Before you embed documents, evaluate a model, or fine-tune, you have to **load and clean data** — and it's almost never clean. pandas gives you a fast, expressive way to load tabular/JSON data, inspect it, filter it, and fix it; numpy is the array math underneath embeddings and similarity. This is a *light* tour: just enough to prep data for AI work, not a data-science course.",
  },
  {
    type: "prose",
    md: "**Mental model: a DataFrame is a dict of columns, each column a typed array (Series).** Rows share an index. Most cleaning is: *select* the rows/columns you want, *transform* a column, and *drop* what's broken — producing a **new** frame rather than mutating in place. numpy sits below: a Series is backed by a numpy array, and embeddings are just numpy vectors you do dot products on. Think 'columns of typed arrays', and pandas stops feeling magical.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "DataFrame", definition: "A 2-D table: named columns, a row index. `pd.read_csv` / `pd.read_json` produce one." },
      { term: "Series", definition: "One column — a labelled 1-D array with a dtype (int64, float64, object/str)." },
      { term: ".loc / .iloc", definition: "`.loc[rows, cols]` selects by label/boolean mask; `.iloc[i]` selects by integer position." },
      { term: "Boolean mask", definition: "`df[\"age\"] > 30` is a Series of True/False used to filter: `df[df[\"age\"] > 30]`." },
      { term: "Vector (numpy)", definition: "A 1-D `np.array` of floats — the shape an embedding takes; similarity is a dot product over these." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Load, inspect, select, filter",
    code: `import pandas as pd

df = pd.DataFrame({
    "name": ["Ada", "Bo", "Cy", "Di"],
    "age":  [30, 41, 25, 41],
})

print(df.shape)                 # (rows, cols)
print(df["age"].mean())         # a Series -> scalar
adults = df[df["age"] > 30]     # boolean mask -> filtered COPY
print(len(adults), list(adults["name"]))`,
    output: `(4, 2)
34.25
2 ['Ada', 'Bo']`,
  },
  {
    type: "prose",
    md: "`df[\"age\"]` is a Series; aggregations like `.mean()`, `.sum()`, `.value_counts()` collapse it to a number or summary. `df[df[\"age\"] > 30]` reads right-to-left: build a True/False mask, then keep the rows where it's True. That filtered result is a **new** frame — which is exactly where the most infamous pandas trap lives (next).",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Chained assignment silently doesn't stick — use `.loc`",
    md: "This looks right and fails:\n\n```\ndf[df[\"age\"] > 30][\"tier\"] = \"senior\"   # SettingWithCopyWarning\n```\n\n`df[df[\"age\"] > 30]` returns a **copy**, so you assign into a throwaway and `df` is unchanged — pandas warns with `SettingWithCopyWarning`. Assumption: 'I filtered then set, so it updated.' Reality: chained indexing (`[...][...] =`) targets a temporary. **Version note:** in pandas 2.x you get the warning and unreliable behaviour; pandas 3.0's Copy-on-Write makes chained assignment reliably **not** touch the original. Either way the fix is one call: do the mask and the column in a single `.loc`:\n\n```\ndf.loc[df[\"age\"] > 30, \"tier\"] = \"senior\"   # correct, in-place\n```",
  },
  {
    type: "code",
    language: "python",
    caption: "Common cleaning moves",
    code: `import pandas as pd

df = pd.DataFrame({"text": ["  hi ", "", "hi", None, "world"]})

df["text"] = df["text"].str.strip()        # trim whitespace (None -> NaN, skipped)
df = df.dropna(subset=["text"])            # drop rows with missing text
df = df[df["text"].str.len() > 0]          # drop empties
df = df.drop_duplicates(subset=["text"])   # dedup

print(len(df), list(df["text"]))`,
    output: `2 ['hi', 'world']`,
  },
  {
    type: "prose",
    md: "Trace it: strip trims `\"  hi \"`→`\"hi\"`; the `None` becomes `NaN` and is dropped by `dropna`; the empty string is removed by the length filter; the duplicate `\"hi\"` is deduped — leaving `['hi', 'world']`. Each step returns a new frame, and reassigning (`df = ...`) is the clean way to chain them without the copy trap.",
  },
  {
    type: "code",
    language: "python",
    caption: "numpy: an embedding is a vector; similarity is a dot product",
    code: `import numpy as np

a = np.array([1.0, 2.0, 2.0])
b = np.array([2.0, 0.0, 1.0])

cosine = a @ b / (np.linalg.norm(a) * np.linalg.norm(b))
print(round(float(cosine), 4))`,
    output: `0.5963`,
  },
  {
    type: "prose",
    md: "`a @ b` is the dot product (4.0 here); `np.linalg.norm` is vector length. Cosine similarity — the workhorse of semantic search — is `dot / (‖a‖·‖b‖)`, ranging −1…1. You'll rarely write this by hand later (vector DBs do it), but seeing that an embedding is 'just a numpy float vector' demystifies everything downstream.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "pandas is not mandatory — reach for it when it earns its weight",
    md: "For a list of a few dicts, plain Python (a comprehension, `.get()`) is simpler, faster to read, and one less dependency. pandas earns its keep on **larger tabular data**: columnar operations, group-bys, joins, CSV/Parquet I/O, and vectorised transforms over thousands of rows. Don't `import pandas` to filter five records — you learned that in the data-structures topic. Match the tool to the size and shape of the job.",
  },
  {
    type: "quiz",
    question: "You run `df[df[\"score\"] > 0][\"grade\"] = \"pass\"`, get a SettingWithCopyWarning, and later find `df` has no `grade` values. Why, and what's the fix?",
    choices: [
      "The column name is reserved; rename it",
      "Chained indexing assigned into a temporary copy, not df; use `df.loc[df[\"score\"] > 0, \"grade\"] = \"pass\"`",
      "You must call df.commit()",
      "score must be a string",
    ],
    answerIndex: 1,
    explanation: "`df[df[\"score\"] > 0]` returns a copy, so the assignment lands on a throwaway and `df` is untouched — that's what the warning is telling you. Combining the mask and the column in a single `.loc` assigns into the original frame reliably.",
  },
  {
    type: "quiz",
    question: "You need to filter ~8 dictionaries by one field for a quick script. What's the most appropriate tool?",
    choices: [
      "pandas — always use DataFrames for data",
      "Plain Python (a list comprehension with .get) — pandas is overkill for tiny in-memory data",
      "numpy arrays",
      "A database",
    ],
    answerIndex: 1,
    explanation: "For a handful of dicts, a comprehension is clearer, faster, and dependency-free. pandas pays off on larger tabular workloads (columnar ops, group-by, joins, file I/O), not on eight records. Choosing the lighter tool is a real engineering skill.",
  },
  {
    type: "takeaways",
    items: [
      "A DataFrame is named columns (Series) over a shared index; cleaning = select, transform, drop — producing new frames.",
      "Filter with boolean masks; NEVER chain-assign (`df[mask][col] = ...`) — use `df.loc[mask, col] = ...`.",
      "Core cleaning: str.strip(), dropna(), length filter, drop_duplicates(); reassign at each step.",
      "An embedding is a numpy float vector; cosine similarity = dot / (norm·norm).",
      "Use pandas when data is genuinely tabular/large; plain Python for a few dicts.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Clean a small messy dataset end to end. Create a CSV (or use the inline frame) and get it to a consistent, usable state — the exact prelude to embedding or evaluation.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Clean a messy table (guided)",
    intro: "Trim, drop, dedup, and standardise a few columns.",
    steps: [
      { order: 1, action: "Load a small dataset with columns `id, title, category` where some titles have leading/trailing spaces, some are blank/None, some rows duplicate, and category casing is inconsistent ('News' vs 'news').", expected: "`df.shape` shows the raw row/column counts; `df.info()` reveals dtypes and null counts." },
      { order: 2, action: "Trim titles, drop rows with missing/blank titles, drop duplicate titles, and lowercase category. Reassign at each step (don't chain-assign).", decision: "For lowercasing category, is `df[\"category\"] = df[\"category\"].str.lower()` a chained assignment or a safe whole-column assignment? Explain why it's fine." },
      { order: 3, action: "Print the final row count and the set of distinct categories.", expected: "Fewer rows than you started with; categories are all lowercase with no case-duplicates.", verify: "Re-running the cleaning on the already-clean frame is a no-op (idempotent)." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import pandas as pd

df = pd.DataFrame({
    "id": [1, 2, 3, 4, 5],
    "title": ["  Intro ", "Intro", "", None, "Deep Dive"],
    "category": ["News", "news", "Guide", "Guide", "guide"],
})

df["title"] = df["title"].str.strip()
df = df.dropna(subset=["title"])
df = df[df["title"].str.len() > 0]
df = df.drop_duplicates(subset=["title"])
df["category"] = df["category"].str.lower()   # whole-column assign: safe

print(len(df), sorted(df["category"].unique()))`,
    output: `2 ['guide', 'news']`,
  },
  {
    type: "callout",
    variant: "warning",
    title: "Troubleshooting — 'my update ran without error but nothing changed'",
    md: "**Symptom:** you wrote `df[df[\"category\"] == \"guide\"][\"reviewed\"] = True`, saw a `SettingWithCopyWarning`, and afterwards `df[\"reviewed\"]` is all NaN/absent. **Evidence:** no exception — just the warning and an unchanged frame. **Hypotheses:** wrong column, wrong mask, or assignment hit a copy. **Diagnosis:** the mask `df[df[...] == ...]` produces a copy; the `[\"reviewed\"] =` then writes to that copy, which is discarded. **Root cause:** chained indexed assignment. **Fix:** `df.loc[df[\"category\"] == \"guide\", \"reviewed\"] = True`. **Verification:** the warning is gone and `df.loc[df[\"category\"] == \"guide\", \"reviewed\"]` shows True. Treat any `SettingWithCopyWarning` as a real bug, not noise.",
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Final frame has trimmed titles, no blanks/nulls, no duplicate titles, lowercase categories.",
      "You used `df.loc[mask, col] = ...` (or whole-column assignment), never chained `df[mask][col] = ...`.",
      "Re-running the cleaning changes nothing (idempotent).",
      "You can explain why a SettingWithCopyWarning meant your edit didn't stick.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a load → clean → export pipeline** that turns a raw document file into a corpus ready for embedding — the deliverable this unit asks for. This is the on-ramp to the embeddings topics later in the roadmap.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Objective · Starting state",
    md: "**Objective:** `prep_corpus(in_path, out_path)` reads a CSV/JSON of documents, cleans the text, and writes a JSONL file (one JSON object per line) with just the fields an embedder needs. **Starting state:** a messy input file with a `text` column (some blank/None/duplicated) and an `id`. **Why JSONL:** it streams line-by-line — ideal for feeding an embedding job without loading everything into memory.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — prep_corpus(in_path, out_path)",
    intro: "Acceptance defines done; implement it yourself.",
    steps: [
      { order: 1, action: "Load the file, then produce clean documents: strip whitespace, drop missing/blank text, drop exact-duplicate text, and keep only `id` and `text`.", decision: "Should dedup be on `text` alone, or `id`+`text`? What does each choice mean if the same text appears under two ids — is that a duplicate to remove or two legitimate records?" },
      { order: 2, action: "Write the result as JSONL (`orient=\"records\", lines=True`), and return the number of documents written.", expected: "The output file has one JSON object per line, each with `id` and cleaned `text`; the count matches the surviving rows." },
      { order: 3, action: "Make it idempotent and safe: running it twice on the same input yields the same output; an input with zero valid rows writes an empty file and returns 0 rather than crashing.", verify: "Open the JSONL and confirm each line parses as JSON with the expected keys; the returned count equals the line count." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Output is valid JSONL: one parseable JSON object per line with `id` and cleaned `text`.",
      "Whitespace trimmed; missing/blank/duplicate text removed.",
      "Returned count equals the number of output lines.",
      "Zero valid rows → empty file + return 0 (no crash); running twice is idempotent.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import pandas as pd

def prep_corpus(in_path: str, out_path: str) -> int:
    df = pd.read_csv(in_path)                      # or pd.read_json(...)
    df["text"] = df["text"].astype("string").str.strip()
    df = df.dropna(subset=["text"])
    df = df[df["text"].str.len() > 0]
    df = df.drop_duplicates(subset=["text"])
    out = df[["id", "text"]]
    out.to_json(out_path, orient="records", lines=True)
    return len(out)`,
  },
  {
    type: "takeaways",
    items: [
      "A corpus-prep pipeline is load → clean (strip/dropna/dedup) → export, keeping only the fields the embedder needs.",
      "JSONL (records + lines) streams document-by-document — the friendly format for embedding jobs.",
      "Decide dedup keys deliberately (text vs id+text) based on what 'duplicate' means for your data.",
      "Make data steps idempotent and empty-safe; you now produce an embed-ready corpus from a messy file.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-data-libs-01": learn,
  "unit-py-data-libs-02": practice,
  "unit-py-data-libs-03": build,
};
