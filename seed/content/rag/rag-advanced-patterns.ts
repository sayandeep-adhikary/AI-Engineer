import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Advanced RAG Patterns" (topic-rag-advanced-patterns).
// 4 units: 01 learn (pattern catalogue + tradeoffs) · 02 build (implement one pattern on P3 =
// milestone p3-05) · 03 review (improvement vs added cost) · 04 project (deliver Project P3).
// Patterns applied on the existing P2/P3 infrastructure; each stage inspectable. Parent-child
// expansion demo is deterministic. Agentic/graph RAG introduced as future concepts only (not an
// agent course). No fabricated model output.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Basic RAG works, you can improve retrieval, and you can measure it. Now the advanced patterns — but with a hard rule: **advanced patterns fix real, MEASURED gaps; they are not defaults.** Every pattern here adds latency, cost, or complexity. Add one only after evaluation shows a specific weakness it addresses. Reaching for multi-hop graph RAG before basic RAG is solid and evaluated is the defining mistake of this topic.",
  },
  {
    type: "prose",
    md: "**Mental model: each advanced pattern targets ONE specific failure, and pays for it in a specific currency.** You already have the building blocks (hybrid, reranking, filtering, chunking). Advanced patterns compose and extend them. Match pattern → gap → cost:",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Query rewriting", definition: "Rephrase/clarify the query before retrieval. Fixes: vague/underspecified queries (recall↑). Cost: an LLM call, and it may drop exact identifiers." },
      { term: "Multi-query retrieval", definition: "Generate several query variants, retrieve for each, fuse the results. Fixes: single-phrasing recall gaps. Cost: more retrievals + more noise + more tokens." },
      { term: "Parent-child (small-to-big) retrieval", definition: "Retrieve on small precise chunks, but return their larger PARENT sections for generation. Fixes: precision-vs-context tension. Cost: more context tokens, indexing complexity." },
      { term: "Multi-stage retrieval", definition: "Cheap broad recall first (vector/keyword), then expensive precise reranking on the shortlist. Fixes: precision without scanning everything. Cost: added rerank latency." },
      { term: "Context expansion / compression", definition: "Expansion adds neighbouring chunks for continuity; compression summarises/filters to fit budget. Fixes: missing context / overflow. Cost: expansion risks budget overflow; compression risks dropping evidence." },
      { term: "Retrieval fallback", definition: "If the first strategy returns weak/empty results, try another (broaden filters, alternate index, or refuse). Fixes: brittle single-path retrieval. Cost: extra latency/cost per fallback." },
    ],
  },
  {
    type: "prose",
    md: "**The tradeoffs, stated plainly** (memorise these — the review unit tests them):\n\n- **Query rewriting** can improve recall, but may accidentally remove exact identifiers (route IDs through hybrid).\n- **Multi-query** can improve recall, but increases noise and cost.\n- **Parent-child**: small chunks improve retrieval precision; larger parent sections improve generation context — you get both, at token cost.\n- **Reranking** improves relevance but adds latency.\n- **Aggressive filtering** can eliminate the answer (over-restriction → zero results).\n- **Fallback retrieval** improves robustness but increases cost/latency.\n- **Context expansion** can exceed context budgets; **compression** can drop the decisive sentence.\n\nThere is no free pattern. The engineering is choosing the *minimal* one that closes a measured gap.",
  },
  {
    type: "code",
    language: "python",
    caption: "Parent-child retrieval — precise retrieval, richer context (deterministic)",
    code: `# Index SMALL chunks for precise matching, but remember each child's PARENT section.
parent_of = {"d1::2": "d1#sec1", "d1::3": "d1#sec1", "d2::0": "d2#sec1"}

# Retrieval matched three small children (high precision):
retrieved_children = ["d1::2", "d1::3", "d2::0"]

# Expand to unique parents -> the model gets coherent sections, not fragments.
parents, seen = [], set()
for child in retrieved_children:
    p = parent_of[child]
    if p not in seen:
        seen.add(p); parents.append(p)

print(parents)   # two children collapsed into ONE parent section`,
    output: `['d1#sec1', 'd2#sec1']`,
  },
  {
    type: "prose",
    md: "Two of the three retrieved children belonged to the same parent section, so parent-child retrieval **deduplicated them into one coherent block** — the model reads a whole section (better generation context) while retrieval still matched on precise small chunks (better precision). That's the pattern's whole value: it resolves the precision-vs-context tension you met in the chunking topic. The cost is more context tokens per result and extra indexing to track parents.",
  },
  {
    type: "callout",
    variant: "note",
    title: "The advanced multi-stage pipeline you'll build",
    md: "A production-shaped retrieval pipeline composes several patterns, each an **inspectable stage**:\n\n`query → candidate retrieval (broad, hybrid) → metadata filtering (eligibility/security) → reranking (precision) → parent/context expansion (coherent context) → context budget (fit the window) → final context`\n\nEvery arrow is a stage you can print and test in isolation (mostly keyless). You don't need all of it — but this is the vocabulary of a real RAG retriever, and it reuses everything from Batches 4–6 behind the same `retrieve`/`build_context` seams."
  },
  {
    type: "callout",
    variant: "warning",
    title: "Agentic and graph RAG — future concepts, not this batch",
    md: "You'll hear about **agentic RAG** (an LLM decides *when/what/how many times* to retrieve, in a loop) and **graph RAG** (retrieval over a knowledge graph of entities/relations for multi-hop questions). Know they exist and what they're *for* — hard multi-hop reasoning and dynamic retrieval — but they belong to the agents and advanced-retrieval topics later. Introducing an agent loop or a graph store now, before basic RAG is solid and evaluated, is exactly the complexity-before-fundamentals trap. Reach for them only when evaluation proves simpler patterns can't close the gap."
  },
  {
    type: "quiz",
    question: "Your eval shows multi-hop questions (needing two chunks combined) fail, while single-fact questions pass. Which pattern most directly targets this, and what's the risk of over-engineering?",
    choices: [
      "Add query rewriting; no risks",
      "Multi-query or parent-child/multi-hop retrieval targets combining evidence across chunks — but only add it because eval showed a specific multi-hop gap; adding agentic/graph RAG preemptively is complexity before it's justified, raising cost/latency without proven benefit",
      "Switch to a bigger model; retrieval is irrelevant",
      "Increase top-k to 100 and stop",
    ],
    answerIndex: 1,
    explanation: "Multi-hop failures point to patterns that assemble evidence across chunks (multi-query, parent/child, or purpose-built multi-hop retrieval). The discipline is to add the minimal pattern that closes the measured gap — not to jump to agentic/graph RAG, which adds significant cost and complexity that eval hasn't yet justified.",
  },
  {
    type: "quiz",
    question: "A teammate proposes adding query rewriting + multi-query + reranking + graph RAG all at once to 'maximize quality.' What's the problem?",
    choices: [
      "Nothing — more patterns always means better RAG",
      "Each pattern adds latency/cost/complexity and can interact badly (e.g. rewriting drops IDs, multi-query adds noise); stacking them blindly makes the system slow, expensive, and un-debuggable. Add ONE pattern at a time, measure it against a gap, and keep it only if it earns its cost",
      "Graph RAG is the only one that matters",
      "They should add even more patterns",
    ],
    answerIndex: 1,
    explanation: "Patterns aren't free or independent — they compound cost/latency and can conflict. Adding them all at once makes it impossible to attribute changes and likely regresses latency/cost. The disciplined approach is incremental: one pattern, measured against a specific gap, kept only if the improvement justifies the added cost.",
  },
  {
    type: "takeaways",
    items: [
      "Advanced patterns fix MEASURED gaps; they're never defaults — each costs latency, tokens, or complexity.",
      "Match pattern→gap→cost: rewriting/multi-query (recall, +noise/cost), parent-child (precision+context, +tokens), multi-stage+rerank (precision, +latency), filtering (eligibility, can over-restrict), fallback (robustness, +cost), expansion/compression (fit budget, risk overflow/loss).",
      "Parent-child retrieves precise small chunks but returns coherent parent sections — resolving precision-vs-context.",
      "A production retriever composes inspectable stages: candidate → filter → rerank → expand → budget → final context.",
      "Agentic/graph RAG are future concepts — don't add them before basic RAG is solid and evaluated.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Implement one advanced pattern on Project P3** — milestone **p3-05** ('Apply an advanced pattern'). The rule from the milestone itself: *the pattern closes a real, measured gap.* So this build is eval-driven: identify a weakness with your harness, add the minimal pattern that targets it, and prove the improvement.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P3 milestone p3-05)",
    md: "p3-05 completion: *the pattern closes a real, measured gap*. Prerequisite: your basic RAG (p3-01), reranked hybrid (p3-02), and eval harness (p3-03) already work. Use the harness to find a specific failure category (e.g. multi-hop misses, fragmented context, exact-id gaps), add ONE pattern that targets it behind the existing `retrieve`/`build_context` seams, and re-run the harness to show the gain — while watching for regressions and the added cost. Keep every stage inspectable; keep generation optional/keyless-inspectable."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — one eval-justified advanced pattern",
    intro: "Acceptance defines done. Measure the gap, add the minimal pattern, re-measure.",
    steps: [
      { order: 1, action: "Run your eval harness and identify a SPECIFIC gap with a category (e.g. multi-hop failures, fragmented answers → parent-child; recall gaps → multi-query; over-restriction → fallback). State the gap with numbers.", decision: "Which single pattern most directly targets THIS gap, and what's the smallest version of it you can add?" },
      { order: 2, action: "Implement that one pattern as an inspectable stage in the pipeline (behind retrieve/build_context seams), so you can print its input and output. Do NOT stack multiple patterns.", expected: "A single new stage you can inspect; the rest of the pipeline unchanged." },
      { order: 3, action: "Re-run the harness. Report the metric before vs after, confirm the targeted gap improved, check you didn't regress other categories, and note the added latency/cost.", verify: "One pattern, justified by a measured gap, implemented as an inspectable stage, with a before/after showing it closed the gap without unacceptable regression or cost." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P3 milestone p3-05",
    items: [
      "A specific gap identified from eval, with a category and numbers.",
      "Exactly ONE pattern added (the minimal one targeting the gap), as an inspectable stage behind existing seams.",
      "Before/after eval shows the gap closed; other categories checked for regression.",
      "Added latency/cost acknowledged; generation stays optional/keyless-inspectable.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — a multi-stage retriever with inspectable stages",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from dataclasses import dataclass, field

@dataclass
class Trace:                      # makes every stage inspectable
    stages: dict = field(default_factory=dict)

class AdvancedRetriever:          # composes patterns behind the same retrieve() seam
    def __init__(self, core, reranker, parent_of, candidate_k=20):
        self.core, self.reranker = core, reranker
        self.parent_of, self.candidate_k = parent_of, candidate_k

    def retrieve(self, query, k=5, filter=None, trace=None):
        # 1) candidate retrieval (broad, hybrid upstream in core.search)
        cands = self.core.search(query, self.candidate_k)
        if trace is not None: trace.stages["candidates"] = [c.chunk_id for c in cands]

        # 2) metadata filtering (eligibility/security) — can over-restrict, so guard empties
        if filter:
            filtered = [c for c in cands if all(c.metadata.get(k2) == v
                        for k2, v in filter.items())]
            cands = filtered or cands           # fallback: don't return nothing by accident
            if trace is not None: trace.stages["filtered"] = [c.chunk_id for c in cands]

        # 3) reranking (precision, +latency)
        ranked = self.reranker(query, cands)
        if trace is not None: trace.stages["reranked"] = [c.chunk_id for c in ranked]

        # 4) parent/context expansion (coherent context; dedupe to unique parents)
        parents, seen = [], set()
        for c in ranked:
            p = self.parent_of.get(c.chunk_id, c.chunk_id)
            if p not in seen:
                seen.add(p); parents.append((p, c))
        if trace is not None: trace.stages["parents"] = [p for p, _ in parents]

        # 5) context budget (top-k after expansion)
        top = [c for _, c in parents[:k]]
        if trace is not None: trace.stages["final"] = [c.chunk_id for c in top]
        return top

# t = Trace(); results = AdvancedRetriever(core, reranker, parent_of).retrieve(q, trace=t)
# print(t.stages)   # inspect candidates -> filtered -> reranked -> parents -> final`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The mark of an engineer (not a pattern collector): deciding whether an addition was **worth it**. This unit weighs the improvement against the added cost — and is willing to *remove* a pattern that doesn't pay.",
  },
  {
    type: "quiz",
    question: "You added multi-query retrieval. Recall@5 rose from 0.72 to 0.78, but latency tripled and token cost doubled. How do you decide whether to keep it?",
    choices: [
      "Keep it — any recall gain is worth it",
      "Weigh the gain against the cost for YOUR requirements: a 6-point recall gain may not justify 3× latency + 2× cost for an interactive app, but might for an offline high-stakes one. Decide against your latency/cost budget and the value of those extra hits — and be willing to drop it",
      "Remove it — latency always wins",
      "Keep it because multi-query is advanced",
    ],
    answerIndex: 1,
    explanation: "There's no universal answer: a modest recall gain against tripled latency and doubled cost is a business/UX tradeoff. You decide against your latency budget, cost ceiling, and how much those extra retrieved hits actually improve answers. 'Advanced' is not a reason to keep a pattern that doesn't earn its cost.",
  },
  {
    type: "quiz",
    question: "An added pattern improves your target metric by 1% but makes the pipeline noticeably slower and harder to debug. What's the disciplined move?",
    choices: [
      "Keep it; every improvement counts",
      "Strongly consider REMOVING it: a 1% gain rarely justifies added latency and debugging complexity. Simplicity has value; keep patterns only when the measured benefit clearly outweighs the cost, and prefer the simplest pipeline that meets your quality bar",
      "Add three more patterns to compensate",
      "Keep it and stop measuring",
    ],
    answerIndex: 1,
    explanation: "Marginal gains bought with real complexity and latency usually aren't worth it — complexity is a recurring tax on debugging, cost, and reliability. The disciplined engineer removes patterns that don't clearly earn their keep and keeps the simplest pipeline meeting the quality bar.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design a multi-stage pipeline for mixed content.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design retrieval for prose + exact technical identifiers",
    intro: "Combine patterns deliberately for a realistic corpus.",
    steps: [
      { order: 1, action: "Design a multi-stage retriever for a corpus containing BOTH normal prose (paraphrase-heavy) and exact technical identifiers (product codes, error IDs). Specify each stage: candidate retrieval, filtering, reranking, expansion, budget.", expected: "A staged design that handles semantic paraphrase AND exact identifiers (hybrid for IDs, rerank for precision, parent-child for context)." },
      { order: 2, action: "Justify each stage against a specific failure it prevents, and name the cost it adds. Explicitly protect exact identifiers (why pure semantic/rewriting would hurt them).", decision: "Which stages are worth their cost for THIS corpus, and which would you drop if latency were tight?" },
      { order: 3, action: "State how you'd VALIDATE the design with your eval harness (per-category metrics for prose vs exact-id questions) and how you'd decide to keep or cut each stage.", verify: "A justified multi-stage design handling both content types, each stage tied to a prevented failure + its cost, with a per-category evaluation plan to keep/cut stages." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A staged retriever design covering candidate→filter→rerank→expand→budget.",
      "Handles paraphrase (semantic) AND exact identifiers (hybrid/keyword) explicitly.",
      "Each stage justified by a prevented failure and its cost named.",
      "A per-category evaluation plan to validate and keep/cut each stage.",
    ],
  },
];

const project: ContentBlock[] = [
  {
    type: "prose",
    md: "**Deliver Project P3** — the capstone that combines this whole category into the canonical AI-engineer deliverable: a **grounded, evaluated** RAG application over a real document set. You've built every piece across the RAG topics; this unit assembles and hands them off as one coherent, documented system.",
  },
  {
    type: "prose",
    md: "**What P3 pulls together** (each already built in a milestone):\n\n- **Basic RAG with citations** (p3-01) — retrieve → build_context → generate, grounded, cited.\n- **Reranked hybrid retrieval** (p3-02) — measurably better retrieval.\n- **Evaluation harness** (p3-03) — repeatable metrics that catch regressions.\n- **One advanced pattern** (p3-05) — closing a measured gap.\n- **API + basic UI** (p3-04) — *serving* the app; this connects to a later production topic, so treat the served interface as the deployment step that topic completes. Your RAG *core* here is grounded and evaluated; wiring it behind an API/UI is the production hand-off.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Swap-ability is the deliverable's real value",
    md: "P3 should be built so you can **swap the vector store, the embedder, the LLM provider, and the evaluator without rewriting the system** — the seams you've maintained since P2 (VectorStore) and through RAG (retrieve/build_context/generate, and the eval harness) make this possible. Keep retrieval, context construction, generation, and evaluation separable. That separability — not any single model or vendor — is what makes this a portfolio-grade system rather than a demo notebook."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Deliver the grounded, evaluated RAG application",
    intro: "Assemble, document, and make it swappable. Generation/serving may stay optional/keyless-inspectable.",
    steps: [
      { order: 1, action: "Assemble the full pipeline over a real document set: ingestion (P2) → hybrid+reranked retrieval → filtered, budgeted, cited context → grounded generation (optional/keyless-inspectable) → the one advanced pattern that closed a measured gap.", expected: "An end-to-end RAG core that answers from your docs with citations and refuses unsupported questions." },
      { order: 2, action: "Attach the evaluation harness as a first-class part of the project: a golden set + retrieval metrics (+ optional generation eval) that runs repeatably and catches regressions. Document the current scores.", decision: "Which components can be swapped (store/embedder/LLM/evaluator) without touching the others, and where are those seams in your code?" },
      { order: 3, action: "Document the system: architecture (the four separable stages), how to run it (keyless dry-run + optional keyed generation via env vars), the eval results, the security posture (retrieved text is untrusted; no hard-coded secrets), and the API/UI serving step as the production hand-off.", verify: "P3 is grounded (cited answers), evaluated (repeatable harness + documented scores), swappable (store/embedder/LLM/evaluator behind seams), secure (untrusted context, env-var secrets), and documented — with serving identified as the production step." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — Project P3 delivered",
    items: [
      "End-to-end RAG over a real doc set: grounded, cited answers; refuses unsupported questions.",
      "Evaluation harness is first-class: golden set + retrieval metrics, repeatable, scores documented.",
      "Store / embedder / LLM / evaluator are swappable behind stable seams (P2 + RAG interfaces preserved).",
      "Security: retrieved text treated as untrusted, no hard-coded secrets (env vars); serving (API/UI) identified as the production hand-off.",
    ],
  },
  {
    type: "prose",
    md: "**Mastery — explain the whole system.** Without notes, narrate P3 end to end: a document's journey (ingest→chunk→embed→store) and a query's journey (retrieve→filter→rerank→expand→budget→context→generate→answer+citations→evaluate), naming each stage's failure mode and how your eval catches it. If you can teach the pipeline, its failure points, its security boundary, and its swappable seams, you own RAG — the backbone of most real AI applications.",
  },
  {
    type: "takeaways",
    items: [
      "P3 = grounded + evaluated RAG over real docs: citations, hybrid+rerank retrieval, an eval harness, and one measured advanced pattern.",
      "Keep retrieval, context construction, generation, and evaluation separable — swap store/embedder/LLM/evaluator without a rewrite.",
      "The eval harness is first-class: repeatable metrics that catch regressions, with documented scores.",
      "Security posture: retrieved text is untrusted data; secrets via env vars; serving (API/UI) is the production hand-off to a later topic.",
      "Mastery = narrating the full document and query journeys, each stage's failure mode, and how evaluation catches it.",
    ],
  },
];

export const content: TopicContent = {
  "unit-rag-advanced-patterns-01": learn,
  "unit-rag-advanced-patterns-02": build,
  "unit-rag-advanced-patterns-03": review,
  "unit-rag-advanced-patterns-04": project,
};
