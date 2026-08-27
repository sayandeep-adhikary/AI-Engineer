import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Datasets for Fine-Tuning" (topic-ft-data).
// 3 units: 01 learn (instruction data, quality/dedup, train/val split) · 02 practice
// (format instruction samples) · 03 build (assemble a validated, split dataset).
// commonMistakes: Tiny/dirty datasets, Data leakage. masteryCriteria: validated dataset ready.
// Verified chat JSONL format (OpenAI/Azure), min-examples guidance. Deterministic keyless
// validator, split calculator, leakage detector. Model outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "If the last topic decided *whether* to fine-tune, this one decides whether it will *work* — because fine-tune quality is bounded by dataset quality, not by hyperparameters. The uncomfortable truth: **good data + an average setup beats bad data + a perfect setup, every time.** Most failed fine-tunes are failed *datasets*: too small, dirty, leaky, or inconsistent. So this is a data-engineering topic wearing a machine-learning hat — the work is curation and validation, not knob-turning.",
  },
  {
    type: "prose",
    md: "**Mental model: a fine-tuning dataset is a specification of the behavior you want, written as examples — the model becomes the average of what you show it.** Every example is a vote for a behavior. Contradictory examples cancel out; duplicated examples over-weight a pattern; a malformed example teaches malformed output; a leaked test example inflates your score without improving the model. The model can't be better than the demonstrations, so the dataset IS the product, and validating it is the core skill.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Instruction / chat example", definition: "One training example in the model's expected format — for chat models, a JSONL line: {\"messages\": [{\"role\":\"system\",...},{\"role\":\"user\",...},{\"role\":\"assistant\",...}]}. The assistant turn is the target behavior." },
      { term: "Train / validation / test split", definition: "Train = what the model learns from; validation = tune/monitor during training (watch for overfitting); test = a held-out set touched ONLY at the end to measure real performance. They must not overlap." },
      { term: "Data leakage", definition: "Test (or validation) examples appearing in the training set. It makes eval scores look great while proving nothing — the model was tested on what it memorized. Invalidates the evaluation." },
      { term: "Deduplication", definition: "Removing exact and near-duplicate examples. Duplicates over-weight a pattern and can leak across splits; dedup BEFORE splitting so copies don't land on both sides." },
      { term: "Label consistency", definition: "The same input should map to the same style/answer across examples. Contradictory targets teach the model to be inconsistent — the exact opposite of most fine-tuning goals." },
      { term: "Provenance / licensing / PII", definition: "Where each example came from, whether its license permits training use, and whether it contains sensitive/personal data. All three are shipping gates, not afterthoughts." },
    ],
  },
  {
    type: "prose",
    md: "**The format (chat JSONL).** Hosted fine-tuning (OpenAI / Azure OpenAI) and open-model SFT both expect examples in the model's chat schema — one JSON object per line, each with a `messages` array. The assistant message is what the model learns to produce:",
  },
  {
    type: "code",
    language: "json",
    caption: "Chat-format training examples (one JSON object per line = JSONL)",
    code: `{"messages": [{"role": "system", "content": "You are a terse support agent."}, {"role": "user", "content": "How do I reset my password?"}, {"role": "assistant", "content": "Settings > Security > Reset password. A link is emailed to you."}]}
{"messages": [{"role": "system", "content": "You are a terse support agent."}, {"role": "user", "content": "Where are my invoices?"}, {"role": "assistant", "content": "Billing > Invoices. Filter by date to export a PDF."}]}`,
  },
  {
    type: "prose",
    md: "Consistency across examples is everything: keep the **same system message** you'll use at inference, the same tone, the same structure. Providers require the JSONL to be valid and (Azure) UTF-8 with a BOM, files under ~512 MB, and a **minimum of ~10 examples** — but 10 changes nothing; you want dozens to hundreds of *high-quality, consistent* examples. Doubling clean data tends to help roughly linearly; adding dirty data actively hurts.",
  },
  {
    type: "code",
    language: "python",
    caption: "Validate one example's structure (deterministic, keyless)",
    code: `def validate_example(ex):
    problems = []
    if "messages" not in ex:
        return ["missing 'messages'"]
    roles = [m.get("role") for m in ex["messages"]]
    if "user" not in roles:
        problems.append("no user message")
    if "assistant" not in roles:
        problems.append("no assistant message")
    for m in ex["messages"]:
        if not m.get("content"):
            problems.append("empty content")
    return problems or ["ok"]

print(validate_example({"messages": [{"role": "user", "content": "Hi"},
                                      {"role": "assistant", "content": "Hello"}]}))
print(validate_example({"messages": [{"role": "user", "content": "Hi"}]}))
print(validate_example({"prompt": "Hi", "completion": "Hello"}))`,
    output: `['ok']
['no assistant message']
["missing 'messages'"]`,
  },
  {
    type: "prose",
    md: "A validator like this — run over *every* line before training — catches the malformed examples that silently corrupt a fine-tune: an example with no assistant turn (nothing to learn), empty content, or the wrong schema entirely (`prompt`/`completion` instead of `messages`). Validation is cheap; a training run on dirty data is not.",
  },
  {
    type: "prose",
    md: "**Splitting — and the leakage trap.** You split into train / validation / test so you can measure real generalization. The calculation is simple; the discipline is not:",
  },
  {
    type: "code",
    language: "python",
    caption: "Split sizes + a leakage check (deterministic, keyless)",
    code: `def split_sizes(n, train=0.8, val=0.1):
    n_train = int(n * train)
    n_val = int(n * val)
    n_test = n - n_train - n_val          # remainder -> test (no lost examples)
    return {"train": n_train, "val": n_val, "test": n_test}

def leakage(train_ids, test_ids):
    overlap = sorted(set(train_ids) & set(test_ids))
    return {"leaked": overlap, "valid_eval": len(overlap) == 0}

print(split_sizes(1000))
print(split_sizes(250))
print(leakage(["a", "b", "c"], ["d", "e"]))
print(leakage(["a", "b", "c"], ["c", "d"]))`,
    output: `{'train': 800, 'val': 100, 'test': 100}
{'train': 200, 'val': 25, 'test': 25}
{'leaked': [], 'valid_eval': True}
{'leaked': ['c'], 'valid_eval': False}`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Data leakage — the eval that lies",
    md: "If even one test example also sits in training, your evaluation is measuring memorization, not learning — the score looks great and means nothing. Leakage sneaks in through:\n\n- **Duplicates / near-duplicates** that land on both sides of the split → **dedup BEFORE splitting**.\n- **Splitting after augmentation** so an original is in train and its paraphrase is in test.\n- **Grouped data** (multiple examples from one document/user) split across train and test → split by GROUP, not by row.\n- **Reusing a public benchmark** the base model already trained on → contaminated baseline.\n\nThe consequence is severe: a leaked eval greenlights a model that hasn't actually improved. Deduplicate, split by group, and keep the test set sealed until the very end — then trust the number."
  },
  {
    type: "callout",
    variant: "warning",
    title: "Tiny / dirty datasets, and the provenance gates",
    md: "Two more ways datasets sink a fine-tune:\n\n- **Too small** → the model overfits (memorizes the handful of examples, generalizes poorly). A dozen examples can't teach a robust behavior; aim for enough consistent coverage of the cases you care about.\n- **Dirty** → contradictory labels teach inconsistency; noisy/malformed examples teach noise; class imbalance skews toward the majority behavior.\n\nAnd three **shipping gates** independent of quality:\n\n- **Provenance** — record where each example came from and version the dataset, so a run is reproducible and auditable.\n- **Licensing** — data used to train must permit that use; scraped or third-party data may not.\n- **PII / sensitive data** — training data gets baked into weights; strip or consent-gate personal/sensitive content, or you've created a privacy leak in the model itself.\n\nA fine-tune is only as trustworthy as the data's cleanliness, provenance, license, and privacy posture."
  },
  {
    type: "quiz",
    question: "Validation data accidentally appears in the training set. What does this invalidate, and why?",
    choices: [
      "Nothing — more data is always better",
      "It invalidates the evaluation: the model is being measured on examples it trained on, so validation/test scores reflect memorization, not generalization. Any decision based on those scores (promote, stop, compare to base) is unreliable — re-split with dedup and a sealed test set, then re-evaluate",
      "Only the training, not the evaluation",
      "It makes the model smaller",
    ],
    answerIndex: 1,
    explanation: "Leakage means the eval set overlaps with training, so the reported scores measure recall of memorized examples rather than true generalization — every downstream decision built on them is compromised. The remedy is to deduplicate, re-split (by group where relevant), seal the test set, and re-measure. More data doesn't help if it's the same data on both sides.",
  },
  {
    type: "quiz",
    question: "Two training examples have the same user input but different, contradictory assistant answers. What's the effect on the fine-tune?",
    choices: [
      "The model learns both answers perfectly",
      "Contradictory targets teach inconsistency — the model gets conflicting votes for the same input and its behavior becomes less reliable, undermining the usual goal of a consistent fine-tune. Resolve the contradiction (pick the correct/on-style answer) before training; label consistency is a quality gate",
      "It doubles the dataset size beneficially",
      "Nothing — models ignore duplicates automatically",
    ],
    answerIndex: 1,
    explanation: "The dataset is a specification by example, so contradictory targets for the same input are conflicting instructions that push the model toward inconsistency — the opposite of what most fine-tunes want. You must reconcile them (choose the correct, on-style answer) during curation. Models don't magically learn both or ignore the conflict; label consistency is part of dataset validation.",
  },
  {
    type: "takeaways",
    items: [
      "Fine-tune quality is bounded by DATASET quality — the model becomes the average of your examples, so curation and validation matter more than hyperparameters.",
      "Chat JSONL format (one {\"messages\":[...]} object per line); keep the SAME system message and tone/structure you'll use at inference; valid JSONL, ~10 min but dozens–hundreds of clean examples in practice.",
      "Validate every example (schema, non-empty user+assistant turns) before training; a cheap validator prevents a wasted run on malformed data.",
      "Split train/val/test with NO overlap; dedup BEFORE splitting and split by group — leakage makes eval scores lie and greenlights a model that didn't improve.",
      "Watch tiny (overfit), dirty (contradictory/noisy/imbalanced) data, and the shipping gates: provenance/versioning, licensing for training use, and PII (baked into weights).",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Turn raw material into clean, consistently-formatted training examples and run them through validation. This is keyless — the whole exercise is data engineering: schema, consistency, and catching problems before they reach a trainer.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Format instruction examples to a consistent schema (guided)",
    intro: "Consistency is the product. Validate as you go.",
    steps: [
      { order: 1, action: "Take ~10 raw input→output pairs for one task and format each as a chat JSONL line with the SAME system message. Keep tone, structure, and field conventions identical across all examples.", expected: "10 valid JSONL lines, one messages array each, consistent system message and style." },
      { order: 2, action: "Run each line through a structural validator (user + assistant present, non-empty content, valid JSON). Fix every flagged example.", decision: "Are any two examples contradictory (same input, different style/answer)? Which is the correct one to keep?" },
      { order: 3, action: "Deliberately introduce a malformed example (missing assistant turn) and a contradictory pair, then confirm your validation/review catches them.", verify: "Your examples share one schema and system message, pass structural validation, and you detected the malformed and contradictory cases." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "~10 examples in consistent chat JSONL with a shared system message.",
      "Every example passes structural validation (user+assistant, non-empty, valid JSON).",
      "Contradictory/near-duplicate examples identified and resolved.",
      "You confirmed validation catches a malformed example.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Assemble a small instruction dataset that is clean and split for training** — the completion criterion and the topic's mastery bar. This is the artifact every later unit depends on: hosted fine-tuning and LoRA both consume it. A validated dataset with honest splits is worth more than a bigger, dirtier one.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *the dataset is clean and split for training.* Produce a chat-format JSONL dataset that is deduplicated, validated, consistent, and split into train/validation/test with NO leakage, plus recorded provenance/version. **Roadmap fit:** this reuses your data-handling skills (Python Foundations) and feeds both `topic-ft-hosted` (upload this file to a managed job) and `topic-ft-lora` (train an adapter on it). The dataset is keyless to build and validate; only the later training steps need a key/GPU. A clean split now is what makes the later evaluation trustworthy."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — validated, split instruction dataset",
    intro: "Clean first, then split. Acceptance defines done.",
    steps: [
      { order: 1, action: "Collect and format a small dataset (dozens+ examples) for one task in consistent chat JSONL. Deduplicate (exact + near) BEFORE splitting. Run structural + consistency validation; remove/fix malformed and contradictory examples.", decision: "What's the minimum consistent coverage of the cases you care about, and did you dedup before splitting?" },
      { order: 2, action: "Split into train/validation/test with no overlap (split by group if examples share a source). Verify zero leakage with an overlap check. Seal the test set.", expected: "Three non-overlapping splits; a leakage check returns empty overlap." },
      { order: 3, action: "Record provenance and version: where examples came from, license permitting training use, PII removed/consented, and a dataset version id. Save the final JSONL splits.", verify: "The dataset is validated, deduplicated, consistently formatted, split with zero leakage, and carries provenance/license/PII/version metadata — ready to train." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a training-ready dataset",
    items: [
      "Consistent chat JSONL; deduplicated (exact + near) before splitting; structurally + consistency validated.",
      "Train/val/test split with NO overlap (by group where needed); leakage check passes; test set sealed.",
      "Provenance recorded, license permits training use, PII removed/consented, dataset versioned.",
      "Final splits saved and ready for hosted or LoRA training.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — clean → dedup → validate → split → leak-check (deterministic core)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import json, hashlib

def example_key(ex):                      # dedup key = normalized content
    text = json.dumps(ex["messages"], sort_keys=True).lower().strip()
    return hashlib.sha256(text.encode()).hexdigest()

def clean(examples):
    seen, out = set(), []
    for ex in examples:
        if validate_example(ex) != ["ok"]:      # from the learn unit
            continue                            # drop malformed
        k = example_key(ex)
        if k in seen:
            continue                            # drop exact duplicate
        seen.add(k); out.append(ex)
    return out

def split(examples, train=0.8, val=0.1):
    n = len(examples)
    n_tr, n_va = int(n * train), int(n * val)
    return examples[:n_tr], examples[n_tr:n_tr+n_va], examples[n_tr+n_va:]

def assert_no_leakage(train, val, test):
    keys = [set(example_key(e) for e in s) for s in (train, val, test)]
    assert not (keys[0] & keys[1]) and not (keys[0] & keys[2]) and not (keys[1] & keys[2]), \\
        "leakage: an example appears in more than one split"

examples = clean(load_raw_examples())           # dedup + validate first
train, val, test = split(examples)              # then split
assert_no_leakage(train, val, test)             # prove no overlap
# write train.jsonl / val.jsonl / test.jsonl + a dataset_version + provenance note`,
  },
];

export const content: TopicContent = {
  "unit-ft-data-01": learn,
  "unit-ft-data-02": practice,
  "unit-ft-data-03": build,
};
