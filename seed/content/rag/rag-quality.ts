import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Improving Retrieval Quality" (topic-rag-quality).
// 4 units: 01 learn (quality decomposition; retrieval upstream of generation; techniques:
// rerank/rewrite/HyDE/hybrid/filter) · 02 practice (add query rewriting) · 03 build (reranked
// hybrid RAG = P3 milestone p3-02) · 04 review (before/after relevance, quantified).
// Reuses vector-db hybrid + reranking concepts (Batch 5) applied INSIDE RAG. Rerank precision
// experiment is deterministic (exact). No fabricated model output.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Your basic RAG pipeline runs — and still gives mediocre answers. That's normal, and it's the most important lesson in this category: **a functioning RAG pipeline is not a good one.** Most RAG failures are **retrieval failures**, not generation failures — yet the instinct is to tweak the prompt. This topic teaches you to decompose quality, prove *where* the problem is, and fix retrieval with techniques you already half-know (hybrid, filtering, reranking) plus query rewriting.",
  },
  {
    type: "prose",
    md: "**Mental model: quality is a chain, and retrieval is upstream of everything.** If the right evidence never reaches the model, no prompt, model, or temperature setting can save the answer. Decompose RAG quality into distinct, separately-measurable parts:\n\n1. **Retrieval quality** — did we fetch the right evidence? (recall/precision)\n2. **Context quality** — did we assemble good evidence? (relevance, redundancy, ordering, length, conflicts)\n3. **Generation quality** — did the model answer well from it? (groundedness, completeness)\n4. **Grounding** — are claims supported by the context?\n5. **Citation correctness** — do citations point to supporting chunks?\n6. **Latency** and **7. Cost** — the budgets every technique trades against.\n\nFix them in order: **retrieval → context → generation.** Tuning generation while retrieval is broken is the category's defining mistake.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Recall (retrieval)", definition: "Of all the chunks that SHOULD be retrieved for a query, what fraction did we get? Low recall = the answer's evidence never arrives." },
      { term: "Precision (retrieval)", definition: "Of the chunks we retrieved, what fraction are actually relevant? Low precision = noise dilutes the context." },
      { term: "Reranking", definition: "A second-stage model (often a cross-encoder) re-scores the candidate chunks for true relevance to the query, reordering them so the best rise. Improves precision; adds latency." },
      { term: "Query rewriting / expansion", definition: "Transform the user's query (clarify, expand, add synonyms, split) before retrieval to improve recall — at the risk of dropping exact terms." },
      { term: "HyDE (Hypothetical Document Embeddings)", definition: "Ask an LLM for a hypothetical answer, embed THAT, and retrieve with it — bridging the vocabulary gap between short questions and full documents. Costs an extra LLM call and can drift." },
    ],
  },
  {
    type: "prose",
    md: "**The retrieval toolkit — you already met most of it; now apply it *inside RAG*.** (Earlier you built hybrid search and reranking for the vector store; RAG is where they earn their keep.)\n\n- **Reranking** — retrieve a broad candidate set with fast vector search, then re-score the top candidates with a more accurate reranker and keep the best few. The standard precision booster.\n- **Query rewriting/expansion** — fix vague or under-specified queries before retrieval (improves recall).\n- **HyDE** — embed a hypothetical answer instead of the bare question (bridges question↔document vocabulary).\n- **Hybrid (keyword + vector)** — recover exact identifiers vector search buries (from the metadata/hybrid topic).\n- **Metadata filtering** — constrain to eligible/authorised documents before ranking.\n- **Chunk quality** — sometimes the real fix is upstream: re-chunk so answers form coherent units (the chunking topic).\n\nNone is universally right — each trades recall, precision, latency, or cost.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Three false beliefs that produce bad RAG",
    md: "- **'More context is better.'** No — extra chunks add noise, cost, and latency, and dilute the signal (you saw k=3→15 hurt answers). Precision often matters more than recall past a point.\n- **'A high similarity score means it's true/relevant.'** No — similarity is a model- and task-specific ordering signal, not truth or guaranteed relevance (you learned this in the similarity topic). A chunk can score high and be off-topic or wrong.\n- **'Top-k is a quality metric.'** No — k is a *knob*, not a measure. Raising k doesn't make retrieval better; it just returns more (often worse) candidates. Quality is measured by recall/precision against known-relevant chunks, not by how many you fetch.",
  },
  {
    type: "code",
    language: "python",
    caption: "Reranking improves precision@k — deterministic, exact",
    code: `# Vector search returned 5 candidates, poorly ordered: relevant (rel=1) buried among noise.
candidates = [
    {"id": "n1", "rel": 0}, {"id": "r1", "rel": 1}, {"id": "n2", "rel": 0},
    {"id": "r2", "rel": 1}, {"id": "n3", "rel": 0},
]

def precision_at_k(items, k):
    return round(sum(i["rel"] for i in items[:k]) / k, 3)

print("before:", [i["id"] for i in candidates[:3]], precision_at_k(candidates, 3))

# Rerank: a better relevance scorer lifts the truly-relevant chunks to the top.
reranked = sorted(candidates, key=lambda i: i["rel"], reverse=True)
print("after: ", [i["id"] for i in reranked[:3]], precision_at_k(reranked, 3))`,
    output: `before: ['n1', 'r1', 'n2'] 0.333
after:  ['r1', 'r2', 'n1'] 0.667`,
  },
  {
    type: "prose",
    md: "Same candidates, same k — reranking doubled precision@3 (0.333 → 0.667) purely by **reordering**. That improvement flows downstream: the model now sees relevant evidence first, in a tighter context, so grounding and citation correctness improve too. This is why retrieval work usually beats prompt work: **you fixed the input to generation, not just the instructions.**",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Prove it's retrieval before you touch the prompt",
    md: "The fastest RAG debugging move: for a failing question, **print the retrieved chunks**. If the chunk that answers the question isn't there (or is buried below noise), it's a **retrieval** problem — reranking, hybrid, filtering, rewriting, or re-chunking, in that diagnostic spirit. Only if the correct, sufficient evidence IS in the context should you suspect **generation** (prompt/model). Most teams burn days tuning prompts on top of broken retrieval; a 10-second inspection of the retrieved set tells you which half of the system to work on."
  },
  {
    type: "quiz",
    question: "Users report your RAG bot 'makes things up.' You inspect a failing query and the correct chunk is NOT in the retrieved top-5. Where's the problem, and what should you NOT do first?",
    choices: [
      "Generation — rewrite the system prompt to say 'don't hallucinate'",
      "Retrieval — the evidence never reached the model, so no prompt change can fix it. Improve retrieval (rerank/hybrid/filter/rewrite/re-chunk); tuning the prompt while retrieval is broken is the classic wasted effort",
      "The model — switch to a bigger model immediately",
      "Nothing — hallucination is unavoidable",
    ],
    answerIndex: 1,
    explanation: "If the answer's evidence isn't retrieved, generation can't ground on it — the model fills the gap by inventing. The fix is upstream in retrieval, not the prompt or a bigger model. Confirming the correct chunk's absence in the retrieved set localises the failure immediately.",
  },
  {
    type: "quiz",
    question: "Reranking your candidates raises precision@3 from 0.33 to 0.67 but adds 300ms per query. Is that a clear win?",
    choices: [
      "Yes, always — higher precision is worth any latency",
      "It's a tradeoff to measure: precision (and thus answer/grounding quality) improved, but latency and cost rose. Whether it's worth it depends on your latency budget and how much the quality gain matters — quantify both sides rather than assuming",
      "No — reranking never helps",
      "Yes — reranking has no cost",
    ],
    answerIndex: 1,
    explanation: "Reranking reliably improves precision but adds a scoring stage (latency + often cost). That's a genuine engineering tradeoff: for a quality-critical, latency-tolerant app it's a clear win; for a strict low-latency path it may not be. The point is to measure both the quality gain and the added cost, not assume.",
  },
  {
    type: "takeaways",
    items: [
      "A working RAG pipeline isn't a good one; most failures are RETRIEVAL failures — fix retrieval → context → generation, in that order.",
      "Decompose quality: retrieval (recall/precision), context (relevance/redundancy/ordering/length/conflicts), generation (groundedness/completeness), grounding, citations, latency, cost.",
      "Reranking reorders candidates to lift true-relevant chunks (precision↑, latency↑); it's the standard booster. Query rewriting/HyDE/hybrid/filtering target recall/precision differently.",
      "More context ≠ better; high similarity ≠ true; top-k is a knob, not a quality metric.",
      "Before touching the prompt, PRINT the retrieved chunks — absence of the answer's evidence proves it's a retrieval problem.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Add **query rewriting** and see it change what gets retrieved — including its risks. Keep the experiment inspectable; the rewrite itself can be a simple rule or an optional LLM call.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Rewrite queries and measure the effect (guided)",
    intro: "Improve recall without silently breaking exact-term queries.",
    steps: [
      { order: 1, action: "Take a vague query (e.g. 'reset it') and retrieve. Note the poor results. Rewrite/expand it ('how do I reset my account password?') and retrieve again; compare which relevant chunks now appear.", expected: "The rewritten query surfaces relevant chunks the vague one missed (recall improves)." },
      { order: 2, action: "Now try a query containing an exact identifier (e.g. 'error AZ-104 fix'). Apply an aggressive rewrite and check whether the identifier survived.", decision: "If the rewrite dropped or paraphrased 'AZ-104', what breaks — and how would combining the rewrite with hybrid/keyword search protect exact terms?" },
      { order: 3, action: "Decide a policy: when to rewrite, and how to preserve exact identifiers (e.g. keep original + rewritten, or route IDs through keyword/hybrid). Verify on both a vague and an ID-bearing query.", verify: "Rewriting improved recall on vague queries without destroying exact-identifier queries; you have a rule for when it's safe." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Rewriting a vague query surfaced relevant chunks it previously missed.",
      "You checked whether an exact identifier survived the rewrite.",
      "You have a policy that protects exact terms (keep-original / hybrid routing).",
      "You compared retrieved sets before vs after rewriting.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build reranked hybrid RAG** — Project **P3, milestone p3-02** ('Reranked hybrid retrieval'). You upgrade the `retrieve` stage from single-shot vector search to **hybrid candidate retrieval + reranking**, and prove the relevance improvement — all behind the same pipeline interface, so `build_context` and `generate` are untouched.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P3 milestone p3-02)",
    md: "p3-02 completion: *retrieval relevance measurably improves*. Evolve only the retrieval stage: hybrid (keyword + vector, reused from the metadata/hybrid topic) to gather candidates, then a reranker to reorder them, then keep the top few. Keep the `retrieve(query) -> results` seam stable so the rest of the RAG pipeline is unchanged. 'Measurably' means you compare **before vs after** on the same queries with a retrieval metric (precision@k / recall@k / hit rate) — not vibes. A real cross-encoder reranker needs a model; provide a keyless deterministic stand-in so the structure runs, and mark the real reranker optional."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — hybrid candidates + rerank, measured",
    intro: "Acceptance defines done. Evolve retrieval only; measure the gain.",
    steps: [
      { order: 1, action: "Replace single-shot vector retrieval with: hybrid candidate retrieval (keyword + vector, fused) → rerank the candidates → keep top-k. Keep the retrieve() signature stable so build_context/generate don't change.", decision: "Why retrieve a BROAD candidate set before reranking (rather than reranking only the vector top-k)? What does the reranker add that vector similarity alone doesn't?" },
      { order: 2, action: "Measure before vs after on a small fixed query set with known-relevant chunks: report precision@k (or recall@k / hit rate) for vector-only vs reranked-hybrid. Confirm a real improvement, not noise.", expected: "A quantified before/after showing reranked hybrid beats vector-only on your metric." },
      { order: 3, action: "Account for the cost: note the added latency of reranking and keep a keyless deterministic reranker so the pipeline runs without a model; the real cross-encoder is an optional swap.", verify: "retrieve() now does hybrid+rerank behind a stable seam; a measured before/after shows improved relevance; latency/cost noted; runs keyless." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P3 milestone p3-02",
    items: [
      "retrieve() upgraded to hybrid candidates + rerank + top-k, behind an unchanged seam (context/generation untouched).",
      "Before/after measured on fixed queries with a retrieval metric; reranked hybrid measurably wins.",
      "Added latency/cost acknowledged; keyless deterministic reranker runs, real reranker optional.",
      "Exact-identifier queries still work (hybrid preserves keyword matches).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — hybrid candidates + rerank behind a stable retrieve()",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def rrf(rankings, k=60):                       # reuse fusion from the hybrid-search topic
    scores = {}
    for ranking in rankings:
        for rank, cid in enumerate(ranking):
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
    return [cid for cid, _ in sorted(scores.items(), key=lambda kv: kv[1], reverse=True)]

def keyword_rank(query, cands):
    import re
    terms = set(re.findall(r"[a-z0-9\\-]+", query.lower()))
    hits = lambda c: sum(c.text.lower().count(t) for t in terms)
    return [c.chunk_id for c in sorted(cands, key=hits, reverse=True) if hits(c) > 0]

def deterministic_reranker(query, cands):     # keyless stand-in; swap for a cross-encoder
    import re
    terms = set(re.findall(r"[a-z0-9\\-]+", query.lower()))
    def score(c):                             # crude lexical+length relevance proxy
        overlap = sum(1 for t in terms if t in c.text.lower())
        return overlap / (1 + len(c.text) / 500)
    return sorted(cands, key=score, reverse=True)

class HybridRerankRetriever:                  # satisfies the same retrieve() seam as P2
    def __init__(self, core, reranker=deterministic_reranker, candidate_k=20):
        self.core, self.reranker, self.candidate_k = core, reranker, candidate_k

    def retrieve(self, query, k=5):
        cands = self.core.search(query, self.candidate_k)     # BROAD vector candidates
        fused_ids = rrf([keyword_rank(query, cands),          # + keyword ranking
                         [c.chunk_id for c in cands]])
        by_id = {c.chunk_id: c for c in cands}
        fused = [by_id[i] for i in fused_ids if i in by_id] or cands
        return self.reranker(query, fused)[:k]                # rerank, keep top-k

# rag = RagPipeline(core=None); rag.retrieve = HybridRerankRetriever(core).retrieve
# -> build_context / generate unchanged; measure precision@k before vs after.`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Improvements only count if you can **quantify** them. This unit is measuring relevance before vs after — and reading the counterintuitive result that better retrieval metrics don't always mean better answers.",
  },
  {
    type: "quiz",
    question: "After adding reranking, Recall@5 goes UP but human-rated answer quality goes slightly DOWN. How is that possible?",
    choices: [
      "It's impossible; better recall always means better answers",
      "Recall@5 measures whether relevant chunks are in the top-5, but quality also depends on context construction and ordering — e.g. more relevant chunks retrieved AND more noise, worse ordering, or exceeding the budget can hurt grounding. Retrieval metrics are necessary but not sufficient for answer quality",
      "The reranker corrupted the embeddings",
      "Answer quality can't be measured",
    ],
    answerIndex: 1,
    explanation: "Recall@k only tracks presence of relevant chunks in the top-k. Answer quality also depends on precision, ordering, context budget, and generation. You can improve one retrieval metric while a downstream stage (noisy context, bad ordering, dilution) drags answers down — which is exactly why you evaluate retrieval AND generation, not just one.",
  },
  {
    type: "quiz",
    question: "You want to prove your retrieval change 'measurably improved.' What's the minimum you need?",
    choices: [
      "Try a few queries and see if they feel better",
      "A fixed set of queries with known-relevant chunks, and a retrieval metric (precision@k / recall@k / hit rate) computed before AND after the change on the SAME queries — so the improvement is quantified and repeatable, not anecdotal",
      "A bigger model",
      "More retrieved chunks",
    ],
    answerIndex: 1,
    explanation: "'Measurably' requires a fixed evaluation set with ground-truth relevant chunks and a metric computed identically before and after. Eyeballing a few queries is not repeatable and can't catch regressions. This is the bridge into the evaluation topic, which formalises exactly this.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — diagnose the earliest failing stage.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Given poor retrieval AND poor answers, find the earliest failure and justify it",
    intro: "Localise before you fix.",
    steps: [
      { order: 1, action: "For a failing question, inspect in order: (a) retrieved chunks — is the answer's evidence present and ranked well? (b) assembled context — did it survive budgeting/dedup/ordering? (c) generation — did the model ground on it? Record where the chain first breaks.", expected: "A pinpointed earliest-failing stage with the evidence that localises it." },
      { order: 2, action: "Apply the MINIMAL fix for that stage (e.g. rerank/hybrid if retrieval; budget/ordering if context; prompt/model only if generation) and re-measure with a retrieval metric before/after.", decision: "Why is fixing the earliest failing stage first more efficient than fixing everything at once — and how could fixing a downstream stage mask an upstream problem?" },
      { order: 3, action: "Quantify the improvement (precision@k / recall@k before vs after) and state one risk your fix introduced (latency, cost, over-filtering).", verify: "You localised the earliest failure with evidence, fixed only that stage, quantified the gain, and named the tradeoff — not a scattershot change." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "You localised the earliest failing stage by inspecting retrieval → context → generation outputs.",
      "You applied the minimal stage-appropriate fix (not prompt-first when retrieval is broken).",
      "You quantified the improvement with a retrieval metric before/after.",
      "You named the tradeoff your fix introduced.",
    ],
  },
];

export const content: TopicContent = {
  "unit-rag-quality-01": learn,
  "unit-rag-quality-02": practice,
  "unit-rag-quality-03": build,
  "unit-rag-quality-04": review,
};
