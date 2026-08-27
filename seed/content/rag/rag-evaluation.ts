import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Evaluating RAG" (topic-rag-evaluation).
// 4 units: 01 learn (systematic eval, dataset, retrieval + generation metrics, LLM-as-judge,
// error taxonomy) · 02 practice (label a small eval set) · 03 build (eval harness = P3
// milestone p3-03) · 04 review (interpret scores & act).
// Retrieval metrics (Hit Rate, MRR, Recall@k, Precision@k) are computed DETERMINISTICALLY with
// exact outputs. Generation eval is optional (needs a judge/API). Ragas terminology verified
// (Faithfulness, Response Relevancy, Context Precision, Context Recall).

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You improved retrieval — but how do you *know* it helped, and that your next change won't silently break it? 'Try the chatbot and see' is not evaluation; it's anecdote. Shipping RAG without evaluation guarantees **silent regressions**. This topic makes quality **measurable and repeatable**: a dataset of questions with known-good evidence, retrieval metrics, generation metrics, and an error taxonomy that tells you *which stage* to fix.",
  },
  {
    type: "prose",
    md: "**Mental model: evaluation is a pipeline that mirrors the RAG pipeline.**\n\n`dataset → questions → expected evidence/answers → retrieval evaluation → generation evaluation → error analysis`\n\nBecause RAG fails stage-by-stage, you evaluate stage-by-stage: **retrieval metrics** tell you whether the right evidence was fetched (upstream); **generation metrics** tell you whether the model answered well *given* that evidence (downstream); **error analysis** classifies each failure so you fix the earliest broken stage. Evaluate retrieval separately from generation — otherwise a good retriever hidden behind a bad prompt (or vice-versa) looks like one undifferentiated 'bad'.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Evaluation dataset (golden set)", definition: "A curated list of {question, expected answer, expected source/chunk, difficulty, category}. The ground truth you measure against; small and high-quality beats large and sloppy." },
      { term: "Recall@k", definition: "Of the relevant chunks that exist, what fraction appear in the top-k retrieved? Answers 'did we fetch the evidence?'. Doesn't tell you ordering or answer quality." },
      { term: "Precision@k", definition: "Of the top-k retrieved, what fraction are relevant? Answers 'how noisy is the context?'. Doesn't tell you if you missed relevant chunks below k." },
      { term: "Hit Rate / Hit@k", definition: "Fraction of questions where at least one relevant chunk is in the top-k. Simple pass/fail per question; ignores rank and how many relevant were found." },
      { term: "MRR (Mean Reciprocal Rank)", definition: "Average of 1/rank of the FIRST relevant chunk. Rewards putting a relevant chunk high; ignores the rest of the relevant set." },
      { term: "Faithfulness / groundedness", definition: "Are the answer's claims actually supported by the retrieved context? (Ragas: Faithfulness.) The core anti-hallucination metric for RAG." },
    ],
  },
  {
    type: "prose",
    md: "**Build a small evaluation dataset first — everything else depends on it.** Each row pairs a question with its known-good evidence and answer, plus metadata for slicing results. Cover the question *types* that stress different parts of the system:\n\n- **Answerable** (evidence exists) · **Unanswerable** (evidence absent — the system should refuse) · **Ambiguous** (needs clarification) · **Paraphrased** (same intent, different words — tests semantic recall) · **Exact-ID** (product codes/identifiers — tests keyword/hybrid) · **Multi-hop** (answer requires combining two chunks).",
  },
  {
    type: "code",
    language: "json",
    caption: "A tiny evaluation dataset (JSONL — one example per line)",
    code: `{"id": "q1", "question": "How do I reset my password?", "expected_answer": "Reset it from account settings.", "expected_chunk": "faq-pw::0", "category": "answerable", "difficulty": "easy"}
{"id": "q2", "question": "What are the office hours?", "expected_answer": "Mon-Fri 9-5.", "expected_chunk": "faq-hours::0", "category": "answerable", "difficulty": "easy"}
{"id": "q3", "question": "What is the refund policy for enterprise plans?", "expected_answer": null, "expected_chunk": null, "category": "unanswerable", "difficulty": "hard"}
{"id": "q4", "question": "Fix for error AZ-104?", "expected_answer": "See the AZ-104 troubleshooting note.", "expected_chunk": "kb-az104::0", "category": "exact-id", "difficulty": "medium"}`,
  },
  {
    type: "code",
    language: "python",
    caption: "Retrieval metrics harness — deterministic, exact",
    code: `# What each query's retriever returned (chunk ids, best-first), vs the expected chunk.
gold = {"q1": "faq-pw::0", "q2": "faq-hours::0", "q3": None, "q4": "kb-az104::0"}
retrieved = {
    "q1": ["faq-pw::0", "faq-hours::0", "x"],   # relevant at rank 1
    "q2": ["x", "faq-hours::0", "y"],           # relevant at rank 2
    "q3": ["x", "y", "z"],                       # unanswerable: nothing relevant (correct)
    "q4": ["a", "b", "c"],                       # MISS: exact-id chunk not retrieved
}

def rank_of(exp, lst):
    return lst.index(exp) + 1 if exp in lst else 0

def evaluate(gold, retrieved, k=3):
    per_q, hits, rr, answerable = [], 0, 0.0, 0
    for qid, exp in gold.items():
        if exp is None:            # unanswerable rows are scored on refusal, not retrieval
            continue
        answerable += 1
        rank = rank_of(exp, retrieved[qid][:k])
        hit = rank != 0
        hits += hit
        rr += (1 / rank) if hit else 0.0
        per_q.append({"id": qid, f"hit@{k}": hit, "rank": rank})
    return {"hit_rate": round(hits / answerable, 3),
            "mrr": round(rr / answerable, 3)}, per_q

agg, per_q = evaluate(gold, retrieved)
print(agg)
for row in per_q:
    print(row)`,
    output: `{'hit_rate': 0.667, 'mrr': 0.5}
{'id': 'q1', 'hit@3': True, 'rank': 1}
{'id': 'q2', 'hit@3': True, 'rank': 2}
{'id': 'q4', 'hit@3': False, 'rank': 0}`,
  },
  {
    type: "prose",
    md: "Read the numbers: **Hit Rate 0.667** (2 of 3 answerable questions retrieved their evidence in the top-3), **MRR 0.5** (`(1/1 + 1/2 + 0)/3`). The per-question view immediately localises the failure: **q4 (exact-id) missed** — a signal to add hybrid/keyword retrieval. This is what metrics buy you over 'it feels okay': a *repeatable* score plus a *per-question* map of exactly which cases fail. **What each metric does NOT tell you:** Hit Rate ignores rank; MRR ignores all but the first relevant chunk; neither says anything about whether the final *answer* was correct — that's generation evaluation.",
  },
  {
    type: "prose",
    md: "**Generation evaluation** (needs the answer, and usually a judge): \n\n- **Correctness** — does the answer match the expected answer?\n- **Faithfulness / groundedness** — is every claim supported by the retrieved context (not invented)?\n- **Completeness** — did it include the key points the evidence supports?\n- **Citation correctness** — do citations point to chunks that actually support the claims?\n- **Refusal on insufficient evidence** — does it say 'I don't know' when the corpus can't answer (your q3)?\n\nThese map to Ragas-style metrics: **Faithfulness**, **Response Relevancy**, **Context Precision**, **Context Recall**.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "LLM-as-a-judge — useful, but not ground truth",
    md: "Using an LLM to score answers (correct? grounded? complete?) is **scalable and flexible** — the practical way to evaluate generation at volume. But it's **imperfect** and you must treat it as such:\n\n- **Judge bias** — LLM judges favour verbose, confident, or same-family outputs; position and style sway them.\n- **Rubric quality** — vague rubrics give noisy scores; the judge is only as good as its instructions.\n- **Correlated errors** — if the judge shares blind spots with the generator (same model family), it rubber-stamps the same mistakes.\n- **No true ground truth** — a judge estimates quality; it doesn't *know* the right answer.\n\nSo: use LLM-as-judge for scale, **anchor it with a labelled golden set**, keep **human spot-checks** on a sample, and report retrieval metrics (which have real ground truth) alongside. Never let an unaudited judge be your only signal.",
  },
  {
    type: "prose",
    md: "**Error taxonomy — classify every failure so you fix the right stage.** Debug from the **earliest** failing stage:\n\n1. **Retrieval miss** — relevant chunk never retrieved.\n2. **Retrieval noise** — irrelevant chunks crowd the top-k.\n3. **Context construction error** — relevant chunk retrieved but dropped/truncated/mis-ordered.\n4. **Provenance / citation error** — citation points to a non-supporting chunk.\n5. **Generation hallucination** — claim unsupported by present context.\n6. **Insufficient evidence** — corpus lacks the answer (system should refuse).\n7. **Conflicting evidence** — retrieved chunks contradict each other.\n8. **Evaluation dataset error** — the 'expected' label is wrong (yes, your golden set has bugs too).",
  },
  {
    type: "quiz",
    question: "Your RAG system scores Hit Rate 0.9 but users still get bad answers. What does Hit Rate NOT capture that could explain this?",
    choices: [
      "Nothing — 0.9 Hit Rate means the system is good",
      "Hit Rate only says a relevant chunk was in the top-k — it ignores ranking/precision (noise), context construction, and whether the model actually GENERATED a correct, grounded, well-cited answer from that evidence. Good retrieval presence ≠ good answers",
      "Hit Rate measures answer correctness directly",
      "The embeddings must be broken",
    ],
    answerIndex: 1,
    explanation: "Hit Rate is a retrieval-presence metric: relevant chunk in top-k, pass/fail. It says nothing about noise/ordering, context assembly, or generation quality (faithfulness, completeness, citations). High Hit Rate with bad answers points downstream — evaluate generation and context, not just retrieval presence.",
  },
  {
    type: "quiz",
    question: "You use GPT-4 to judge answers produced by GPT-4, with a one-line rubric, and everything scores highly. Why be skeptical?",
    choices: [
      "No reason — LLM judges are objective ground truth",
      "Correlated errors (judge and generator share blind spots), judge bias toward confident/verbose text, and a vague rubric all inflate scores; the judge estimates quality without true ground truth. Anchor with a labelled set, sharpen the rubric, and add human spot-checks",
      "GPT-4 can't judge text at all",
      "You should trust it more because it's the same model",
    ],
    answerIndex: 1,
    explanation: "A same-family judge with a weak rubric tends to approve outputs sharing its own errors and stylistic preferences, with no ground truth to correct it. LLM-as-judge is a useful scalable signal only when anchored by a labelled golden set, a precise rubric, and human spot-checks — not used blind.",
  },
  {
    type: "takeaways",
    items: [
      "Evaluate stage-by-stage: dataset → retrieval metrics → generation metrics → error analysis; separate retrieval from generation.",
      "Build a small golden set: {question, expected answer, expected chunk, category, difficulty}; cover answerable/unanswerable/ambiguous/paraphrased/exact-id/multi-hop.",
      "Retrieval metrics: Recall@k, Precision@k, Hit Rate, MRR — each answers one question and is silent on the others (and on answer quality).",
      "Generation metrics: correctness, faithfulness/groundedness, completeness, citation correctness, refusal — Ragas: Faithfulness, Response Relevancy, Context Precision/Recall.",
      "LLM-as-judge is scalable but biased and ground-truth-free — anchor with labels + human spot-checks; classify failures with the 8-category taxonomy and fix the earliest stage.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Create a small, honest evaluation dataset — the asset every later measurement depends on. Quality over quantity: 15–30 well-labelled questions beat hundreds of sloppy ones.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Label a small eval set (guided)",
    intro: "Curate ground truth you can trust.",
    steps: [
      { order: 1, action: "Write 12–20 questions over your corpus. For each, record: question, expected answer, the expected source chunk id(s), a category, and a difficulty. Include at least one each of: answerable, unanswerable, paraphrased, exact-id, and (if possible) multi-hop.", expected: "A JSONL/CSV golden set with real chunk ids as ground truth and a spread of categories." },
      { order: 2, action: "For the UNANSWERABLE rows, set expected answer/chunk to null — the correct system behaviour is refusal, and you'll score that separately from retrieval.", decision: "How will you decide the 'expected chunk' objectively (so two labellers agree), and what makes a question 'multi-hop' vs simply 'hard'?" },
      { order: 3, action: "Sanity-check the labels: run retrieval for a few rows and confirm the expected chunk is actually the right evidence (catch dataset errors — taxonomy category 8) before trusting any metric.", verify: "You have a small, category-balanced, sanity-checked golden set with real chunk ids and explicit unanswerable cases." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "12–20 questions with expected answer, expected chunk id, category, difficulty.",
      "Includes answerable, unanswerable (null), paraphrased, and exact-id categories.",
      "Expected chunks verified as the actual supporting evidence (no dataset-label bugs).",
      "Unanswerable rows are scored on refusal, not retrieval.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a repeatable evaluation harness** — Project **P3, milestone p3-03** ('Evaluation harness'). It ingests your golden set, runs your RAG retrieval (and optionally generation), and outputs retrieval hit/miss, aggregate metrics, per-question results, and an error category — the thing that catches regressions before your users do.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P3 milestone p3-03)",
    md: "p3-03 completion: *a repeatable eval catches regressions*. Input a JSON/JSONL golden set; output per-question hit/miss, aggregate retrieval metrics (Recall@k / Hit Rate / MRR), and an error category per failure. Retrieval evaluation must run **keyless** (real ground-truth metrics, no model). **Generation evaluation is optional** (needs a judge/API) — gate it behind a flag and env-var key, never hard-coded. 'Repeatable' means running it twice on the same data + pipeline yields the same numbers, so you can diff before/after a change."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a regression-catching eval harness",
    intro: "Acceptance defines done. Keyless retrieval eval; optional generation eval.",
    steps: [
      { order: 1, action: "Load the golden set (JSON/JSONL). For each answerable question, run your retriever and compute rank/hit; aggregate Hit Rate + MRR (and Recall@k / Precision@k where you have multiple relevant chunks). Emit per-question rows AND aggregates.", decision: "How do you handle unanswerable questions in the metrics (they have no expected chunk), and why must they be scored on refusal rather than retrieval?" },
      { order: 2, action: "Attach an error category to each failure using the 8-category taxonomy (at minimum distinguish retrieval-miss vs retrieval-noise vs — if generation is enabled — hallucination/citation error). Make the harness deterministic and re-runnable.", expected: "Running twice yields identical numbers; failures are labelled by stage so you know where to look." },
      { order: 3, action: "Optionally add generation eval behind a flag: correctness/faithfulness/citation checks via a judge (env-var key). Keep it separable so retrieval eval always runs without it. Produce a summary you can diff before vs after a pipeline change.", verify: "The harness reads a golden set, outputs per-question + aggregate retrieval metrics keyless, labels failures by taxonomy, is repeatable, and optionally adds generation eval — ready to catch regressions." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P3 milestone p3-03",
    items: [
      "Ingests a JSON/JSONL golden set; outputs per-question hit/miss + aggregate Hit Rate/MRR (Recall@k/Precision@k where applicable).",
      "Retrieval eval runs keyless with real ground truth; unanswerable rows scored on refusal.",
      "Each failure tagged with an error-taxonomy category; harness is deterministic/repeatable.",
      "Generation eval optional behind a flag + env-var key (never hard-coded); separable from retrieval eval.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — keyless retrieval-eval harness with error categories",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import json

def load_golden(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]

def rank_of(exp, lst):
    return lst.index(exp) + 1 if exp in lst else 0

def categorize(row, ranked_ids, k):
    if row.get("expected_chunk") is None:
        return "unanswerable (score on refusal)"
    if row["expected_chunk"] not in ranked_ids[:k]:
        return "1-retrieval-miss"
    if ranked_ids[0] != row["expected_chunk"]:
        return "2-retrieval-noise (relevant present but not top-1)"
    return "ok"

def run_eval(golden, retrieve_fn, k=5):
    per_q, hits, rr, answerable = [], 0, 0.0, 0
    for row in golden:
        ranked_ids = [r.chunk_id for r in retrieve_fn(row["question"], k)]
        cat = categorize(row, ranked_ids, k)
        if row.get("expected_chunk") is not None:
            answerable += 1
            rank = rank_of(row["expected_chunk"], ranked_ids[:k])
            hit = rank != 0
            hits += hit; rr += (1 / rank) if hit else 0.0
            per_q.append({"id": row["id"], "hit": hit, "rank": rank, "category": cat})
        else:
            per_q.append({"id": row["id"], "category": cat})
    summary = {"n_answerable": answerable,
               "hit_rate": round(hits / answerable, 3) if answerable else None,
               "mrr": round(rr / answerable, 3) if answerable else None}
    return summary, per_q

# summary, rows = run_eval(load_golden("eval.jsonl"), core.search, k=5)
# print(summary)  # e.g. {'n_answerable': 3, 'hit_rate': 0.667, 'mrr': 0.5}
# Optional generation eval (flag + os.environ key) scores faithfulness/citations separately.`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Scores are only useful if they drive **action**. This unit is interpreting results and deciding what to fix — turning numbers into the right change at the right stage.",
  },
  {
    type: "quiz",
    question: "Your eval shows Hit Rate 0.85 but Faithfulness 0.55. Which stage is the bottleneck, and what do you fix?",
    choices: [
      "Retrieval — improve embeddings",
      "Generation/grounding — retrieval is mostly finding the evidence (0.85), but the model isn't staying faithful to it (0.55): it's inventing or mis-grounding. Fix generation (prompt to answer only from context + cite, better model, or trim noisy context), not the retriever",
      "The eval dataset is wrong",
      "Both are fine; ship it",
    ],
    answerIndex: 1,
    explanation: "High Hit Rate with low Faithfulness means evidence is usually retrieved but the answer isn't grounded in it — a generation-stage problem. The fixes are prompt discipline (answer only from context, cite), possibly a stronger model, and reducing context noise so the model grounds correctly. Retrieval isn't the bottleneck here.",
  },
  {
    type: "quiz",
    question: "After a change, aggregate Hit Rate is unchanged but per-question results show exact-id questions dropped while paraphrased questions improved. What should you conclude?",
    choices: [
      "Nothing changed; the aggregate is flat",
      "The aggregate hid a real shift: you traded exact-identifier recall for paraphrase recall (likely a rewrite/embedding change). Per-question/per-category slicing reveals regressions the average masks — you may need hybrid to recover exact-id without losing the paraphrase gains",
      "The eval harness is broken",
      "Exact-id questions don't matter",
    ],
    answerIndex: 1,
    explanation: "A flat aggregate can mask offsetting per-category changes. Slicing by category exposes that exact-id retrieval regressed while paraphrase improved — a classic rewrite/semantic tradeoff. The action is to recover exact-id (e.g. hybrid/keyword) while keeping the paraphrase gains, which the aggregate alone would never reveal.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — evaluate and do error analysis.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build a golden set, compute metrics, analyse errors",
    intro: "Turn measurement into a prioritised fix list.",
    steps: [
      { order: 1, action: "Run your harness on your golden set. Report aggregate retrieval metrics AND per-question results. Identify the failing questions.", expected: "Aggregate + per-question metrics with the failing cases isolated." },
      { order: 2, action: "Classify each failure with the 8-category taxonomy (retrieval miss/noise, context error, citation error, hallucination, insufficient evidence, conflicting evidence, dataset error). Group by category to see the dominant failure mode.", decision: "Which category is most common, and therefore which single stage should you fix FIRST for the biggest gain?" },
      { order: 3, action: "Propose the minimal fix for the dominant category, predict its effect on the metrics, apply it, and re-run to confirm (and check you didn't regress another category).", verify: "You produced aggregate + per-question metrics, a taxonomy-classified error breakdown, a prioritised fix targeting the dominant failure, and a before/after re-run confirming the gain without new regressions." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Aggregate + per-question retrieval metrics computed on your golden set.",
      "Every failure classified with the 8-category taxonomy; dominant mode identified.",
      "Minimal fix targets the earliest/dominant failing stage, with a predicted effect.",
      "Before/after re-run confirms the gain and checks for new regressions.",
    ],
  },
];

export const content: TopicContent = {
  "unit-rag-evaluation-01": learn,
  "unit-rag-evaluation-02": practice,
  "unit-rag-evaluation-03": build,
  "unit-rag-evaluation-04": review,
};
