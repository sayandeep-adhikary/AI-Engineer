import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Context Engineering & Long-Context Systems" (topic-adv-context-engineering).
// 3 units: 01 learn (context as a finite resource, assembly, long-context vs RAG, prompt/context
// caching, memory architectures) · 02 build (context-optimized pipeline — feeds P7 m-02) · 03
// review (compare vs naive RAG — measurable improvement). commonMistakes: Stuffing context without
// a strategy. masteryCriteria: context-optimized pipeline that outperforms naive RAG. SYNTHESIS of
// RAG/agents/memory/eval. Deterministic keyless budget/cache/assembly/quality experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You have built RAG, agents, and memory. **Context engineering is the discipline that ties them together: deciding, deliberately, what goes into the model's finite context window and in what order.** It is broader than prompt writing — a prompt is words you author, but context is everything that reaches the window: retrieved chunks, tool results, conversation history, memory, system instructions. As the final synthesis of the retrieval and memory work, this topic reframes all of it as one question: given a fixed budget of tokens, what is the highest-value context you can assemble?",
  },
  {
    type: "prose",
    md: "**Mental model: context is a finite, contended resource you allocate — not a bucket you fill.** Every token you spend on a marginally-relevant chunk is a token unavailable for a better one, and beyond a point more context makes results worse (dilution, lost-in-the-middle, contradictory sources). So context engineering is a budgeting problem: score candidates by relevance, authority and recency; filter and deduplicate; fit the best into the budget; order them for the model; and keep the stable parts stable so caching can reuse them. Naive RAG dumps top-k; deliberate context design selects, compresses, and orders — and usually wins.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Context as a finite resource", definition: "The context window is a fixed token budget shared by instructions, retrieved content, tool results, history, and the model's own output (and reasoning tokens). Every token has an opportunity cost. Context engineering allocates that budget to the highest-value content rather than filling it indiscriminately." },
      { term: "Context assembly", definition: "The pipeline that turns raw candidates (retrieved chunks, tool outputs, memory) into the final prompt: score for relevance/authority/recency, filter low-value items, deduplicate overlapping sources, fit to budget, and order deliberately. It is the step between retrieval and generation that naive RAG skips." },
      { term: "Long-context vs RAG", definition: "Two ways to give a model information: put everything in a large context window (long-context) or retrieve just the relevant pieces (RAG). Long-context is simpler but costs more per call, can dilute the signal, and still has limits; RAG is cheaper and more precise but adds a retrieval system to build and evaluate. Often you combine them — retrieve, then use a long window for the selected context." },
      { term: "Prompt / context caching", definition: "Reusing the model's processing of a shared prompt PREFIX across requests: a matching prefix is served from cache far cheaper and faster than reprocessing. The rule that makes it work: keep the prefix stable (system instructions, shared reference first) and put dynamic content (the user's question, timestamps) LAST — so the reusable part matches. Rewriting earlier turns or summarizing mid-prompt resets the cache." },
      { term: "Context poisoning", definition: "When low-quality, contradictory, or malicious content in the context degrades the output — an irrelevant chunk that misleads, a stale fact that overrides a fresh one, or (from the security category) injected instructions in retrieved text. Filtering, deduplication, and provenance are defenses: not everything retrieved deserves to be in the context." },
      { term: "Memory architecture", definition: "How an app persists and recalls state across turns/sessions: short-term (recent history verbatim), rolling summaries (compressed older history), and retrieval-memory (store facts, retrieve relevant ones on demand — RAG over your own history). Each is a context-budget strategy: what to keep verbatim, what to compress, what to fetch only when needed." },
    ],
  },
  {
    type: "prose",
    md: "**Assembly starts with a budget: fit the highest-value candidates into the token limit, best first.** This is the core allocation the naive top-k skips:",
  },
  {
    type: "code",
    language: "python",
    caption: "Context budget allocation — highest-value first (deterministic, keyless)",
    code: `def fit_budget(chunks, budget):
    # chunks: (id, tokens, score). Take highest score first until the budget is spent.
    chosen, used = [], 0
    for cid, tok, score in sorted(chunks, key=lambda c: -c[2]):
        if used + tok <= budget:
            chosen.append(cid)
            used += tok
    return {"chosen": chosen, "used": used}

chunks = [("a", 400, 0.9), ("b", 500, 0.8), ("c", 300, 0.7), ("d", 200, 0.6)]
print(fit_budget(chunks, 900))
print(fit_budget(chunks, 1500))`,
    output: `{'chosen': ['a', 'b'], 'used': 900}
{'chosen': ['a', 'b', 'c', 'd'], 'used': 1400}`,
  },
  {
    type: "prose",
    md: "With a 900-token budget, only the two highest-scoring chunks fit; with 1500, all four fit (using 1400). The budget forces a priority decision that naive top-k makes blindly. The second lever is **caching**: the model can reuse a matching prompt prefix cheaply, but only the part that stays identical. Where you put dynamic content decides whether the cache hits:",
  },
  {
    type: "code",
    language: "python",
    caption: "Prompt-cache reuse depends on prefix stability (deterministic, keyless)",
    code: `def cache_reuse(prev_prefix, new_prefix):
    # Cache reuses only the shared LEADING prefix, up to the first difference.
    shared = 0
    for a, b in zip(prev_prefix, new_prefix):
        if a != b:
            break
        shared += 1
    return {"reusable_blocks": shared, "reprocess_from": shared}

stable = ["sys", "rubric", "examples"]
print(cache_reuse(stable + ["Q1"], stable + ["Q2"]))               # dynamic content LAST
print(cache_reuse(["ts:9:01", "sys", "Q1"], ["ts:9:02", "sys", "Q2"]))  # dynamic content FIRST`,
    output: `{'reusable_blocks': 3, 'reprocess_from': 3}
{'reusable_blocks': 0, 'reprocess_from': 0}`,
  },
  {
    type: "prose",
    md: "When the stable system/rubric/examples come first and only the question changes at the end, three blocks are reused — the cache hits. When a timestamp sits at the very front, the prefix differs immediately and nothing is reused — every request reprocesses the whole prompt at full price. That is the single most important caching rule: **stable content first, dynamic content last.** It is why putting a per-request timestamp or user id at the top of your system prompt quietly destroys cache reuse — a real, common, expensive mistake.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Stuffing context without a strategy",
    md: "The commonMistake this topic exists to correct: treating the context window as a bucket — 'retrieve top-20, dump it all in, let the model sort it out.' It fails in several ways at once:\n\n- **Dilution and lost-in-the-middle** — the relevant chunk is buried among irrelevant ones, and models attend less to the middle of a long context, so more retrieved text can *lower* answer quality.\n- **Cost and latency** — every extra token is paid for on every call; a bloated context is slower and more expensive for no quality gain.\n- **Context poisoning** — a stale, contradictory, or injected chunk (security category) misleads the model; not everything retrieved deserves to be in the context.\n- **Cache destruction** — dynamic or reordered content prevents prefix reuse.\n\nThe fix is a strategy: score, filter, deduplicate, budget, and order — and put stable content first for caching. Deliberate context design routinely beats naive RAG not by retrieving more, but by putting *less, better* context in the right order."
  },
  {
    type: "quiz",
    question: "Your RAG assistant retrieves the top 20 chunks and puts them all in the prompt. Answer quality is mediocre and cost is high. A colleague suggests retrieving top 40 'so the answer is definitely in there.' Why is that likely to make things worse, and what's the better move?",
    choices: [
      "It's a good idea — more context always helps the model",
      "More context usually hurts here: it dilutes the signal (the relevant chunk is buried), triggers lost-in-the-middle, raises cost/latency, and increases the chance of a contradictory or poisoned chunk. The better move is deliberate context engineering — score and filter for relevance/authority, deduplicate, fit the best few into a budget, and order them well — putting less, better context in, not more",
      "It will work if you also switch to a bigger model",
      "The only problem is the prompt wording — rewrite the instructions",
    ],
    answerIndex: 1,
    explanation: "Beyond a point, adding retrieved text lowers quality through dilution and lost-in-the-middle, while raising cost and the risk of contradictory or injected content. Retrieving even more amplifies all of these. The fix is to engineer the context — score, filter, deduplicate, budget, and order the best few chunks — so the model sees less but higher-signal context. A bigger model or reworded prompt doesn't address a context that is bloated and poorly ordered.",
  },
  {
    type: "takeaways",
    items: [
      "Context engineering is broader than prompting: deliberately choosing what enters the finite context window (retrieved chunks, tool results, history, memory) and in what order.",
      "Context is a contended budget with opportunity cost — beyond a point more context hurts (dilution, lost-in-the-middle, contradiction, cost); allocate it to the highest-value content.",
      "Assemble deliberately: score (relevance/authority/recency), filter, deduplicate, fit to budget, order — the step naive top-k RAG skips.",
      "Caching reuses a matching prompt PREFIX: keep stable content first and dynamic content (question, timestamps) last, or you destroy cache reuse.",
      "Memory architectures (short-term verbatim / rolling summary / retrieval-memory) are context-budget strategies; guard against context poisoning with filtering and provenance.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'pipeline uses context deliberately,' and this feeds **Project P7's milestone `p7-02`** (build the niche system). Here you build a **context-optimized assembly pipeline** — the step between retrieval and generation that scores, filters, deduplicates, budgets, and orders — turning naive top-k into engineered context.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *pipeline uses context deliberately.* Build an assembly stage over your RAG retriever: (1) filter out low-relevance candidates, (2) deduplicate overlapping sources (avoid three chunks that say the same thing), (3) fit the best into a token budget, (4) order deliberately (highest-authority/most-relevant where the model attends best), and (5) keep the stable prefix cacheable. **Roadmap fit:** this builds on your RAG pipeline (retrieval category) and feeds **P7 `p7-02`**; it is the artifact you compare against naive RAG in the review unit. You are not rebuilding retrieval — you are engineering what it produces into deliberate context."
  },
  {
    type: "prose",
    md: "**The assembly pipeline in one function: filter, deduplicate, then budget — the deliberate middle step:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Context assembly: filter → dedup by source → fit budget (deterministic, keyless)",
    code: `def assemble(candidates, budget, min_score):
    # candidates: (id, tokens, score, doc). Deliberate context, not a top-k dump.
    filtered = [c for c in candidates if c[2] >= min_score]          # drop low relevance
    seen, deduped = set(), []
    for cid, tok, score, doc in sorted(filtered, key=lambda c: -c[2]):
        if doc in seen:
            continue                                                 # dedup overlapping sources
        seen.add(doc)
        deduped.append((cid, tok, score))
    chosen, used = [], 0
    for cid, tok, score in deduped:
        if used + tok <= budget:                                     # fit the budget
            chosen.append(cid)
            used += tok
    return chosen

cands = [("a", 300, 0.9, "d1"), ("b", 300, 0.5, "d2"),
         ("c", 300, 0.85, "d1"), ("e", 300, 0.8, "d3")]
print(assemble(cands, budget=700, min_score=0.6))`,
    output: `['a', 'e']`,
  },
  {
    type: "prose",
    md: "Chunk `b` is filtered (score 0.5 below the 0.6 floor); `c` is deduplicated (it comes from `d1`, same source as the higher-scoring `a`); and the budget admits `a` and `e` from distinct sources. The result — `['a', 'e']` — is two high-relevance chunks from different documents, not four overlapping ones. That is deliberate context: fewer tokens, higher signal density, no redundant or low-value content. Order them next (most-relevant where the model attends best) and keep the system prefix stable for caching, and you have a pipeline that will beat naive top-k in the review unit.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a context-optimized pipeline",
    intro: "Engineer retrieval output into deliberate context. Acceptance defines done.",
    steps: [
      { order: 1, action: "Add an assembly stage after retrieval: score/filter candidates by relevance (drop below a floor), deduplicate overlapping sources, and fit the best into an explicit token budget.", decision: "What relevance floor and budget fit your task? Too strict a floor drops needed context; too loose reintroduces dilution — tune against your eval set." },
      { order: 2, action: "Order the selected context deliberately (highest-authority/most-relevant positioned where the model attends best) and keep the stable prefix (system instructions, shared reference) first so prompt caching can reuse it; put the dynamic query last.", expected: "The prompt contains few, high-signal, deduplicated chunks in a deliberate order, with a stable cacheable prefix." },
      { order: 3, action: "Preserve provenance (which source each chunk came from) for citations and to defend against context poisoning; isolate retrieved content as untrusted data (security category).", verify: "The pipeline uses context deliberately: filtered, deduplicated, budgeted, ordered, cache-friendly, with provenance — measurably tighter than a top-k dump (proven in the review unit). Delivers P7 p7-02's context-engineering half." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — context-optimized pipeline (P7 p7-02)",
    items: [
      "Assembly stage: relevance filter + source deduplication + explicit token budget.",
      "Deliberate ordering; stable prefix first (cacheable), dynamic query last.",
      "Provenance preserved for citations and poisoning defense; retrieved content treated as untrusted.",
      "Produces few, high-signal chunks — not a top-k dump — ready to compare against naive RAG.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — assemble + order + stable prefix for caching (deterministic, keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `STABLE_PREFIX = ["system_instructions", "shared_reference"]   # cacheable, comes first

def build_context(candidates, budget, min_score):
    selected = assemble(candidates, budget, min_score)           # filter+dedup+budget (above)
    # Order: most relevant near the start AND end (edges attended best), least in the middle.
    ordered = order_for_attention(selected)
    # Dynamic query goes LAST so the STABLE_PREFIX stays reusable across requests.
    return STABLE_PREFIX + ordered + ["user_query"]

def order_for_attention(chunk_ids):
    # Simplified: keep given order; a real impl places top items at the edges.
    return chunk_ids`,
  },
  {
    type: "takeaways",
    items: [
      "The assembly stage is the deliberate middle step: filter by relevance, deduplicate by source, fit a budget, order for attention — feeding P7 p7-02.",
      "Deduplication matters: three chunks saying the same thing waste budget and can amplify a wrong claim — keep one per source.",
      "Order deliberately (edges are attended best) and keep the stable prefix first so prompt caching reuses it; dynamic query last.",
      "Preserve provenance for citations and as a context-poisoning defense; treat retrieved content as untrusted (security category).",
      "The goal is fewer, higher-signal tokens — deliberate context that will measurably beat a top-k dump.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'you show a measurable improvement.' A claim that engineered context beats naive RAG is worth nothing without a number. So **compare them on the same task**: measure the signal density of the context and the answer quality, and show the optimized pipeline wins — the synthesis of context engineering and the evaluation discipline.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Measuring context quality, not just answer quality",
    md: "Compare on two levels:\n\n- **Context quality** — of the chunks you put in the prompt, what fraction is actually relevant? Naive top-k has low signal density (relevant chunks buried among noise); a filtered/deduplicated pipeline has high density. This is upstream of answer quality and easier to attribute.\n- **Answer quality** — run your eval suite (evaluation category) on both pipelines over the same golden set. The optimized pipeline should match or beat naive RAG at lower token cost.\n- **Cost** — measure tokens per request; deliberate context is usually cheaper because it puts in less.\n\nThe honest comparison controls everything but the assembly stage, uses the same questions, and reports context density, answer quality, AND cost. If the optimized pipeline isn't better on the metric that matters, your filter/budget is mistuned — fix it before claiming a win. This is the same 'gate on the eval suite' rule from the evaluation and scaling topics."
  },
  {
    type: "prose",
    md: "**Signal density makes the difference visible: what fraction of the context is actually relevant?**",
  },
  {
    type: "code",
    language: "python",
    caption: "Context signal density: naive top-k vs engineered (deterministic, keyless)",
    code: `def context_quality(chunks):
    # Fraction of selected context that is actually relevant (the second element flags relevance).
    if not chunks:
        return 0.0
    relevant = sum(1 for c in chunks if c[1])
    return round(relevant / len(chunks), 3)

naive = [("a", True), ("b", False), ("c", True), ("d", False), ("e", False)]   # top-5 dump
optimized = [("a", True), ("c", True), ("f", True)]                            # filtered + deduped
print("naive:", context_quality(naive), "optimized:", context_quality(optimized))`,
    output: `naive: 0.4 optimized: 1.0`,
  },
  {
    type: "prose",
    md: "The naive top-5 dump is only 40% relevant — three of five chunks are noise the model must see past. The engineered context is 100% relevant and shorter. Higher signal density, fewer tokens: the model gets a cleaner prompt at lower cost, which is why deliberate context routinely produces better answers than naive RAG. This is a proxy metric (real relevance labels come from your eval set), but it captures the mechanism exactly — the win comes from what you *left out*, not what you added. Pair it with an eval-suite answer-quality comparison and you have the measurable improvement the mastery criterion asks for.",
  },
  {
    type: "quiz",
    question: "You compare your context-optimized pipeline against naive top-20 RAG. The optimized pipeline uses 60% fewer tokens and scores equal answer quality on your eval set, but a teammate says 'equal quality means it's not actually better.' How should you frame the result?",
    choices: [
      "The teammate is right — equal quality means no improvement",
      "Equal answer quality at 60% fewer tokens IS a real, measurable improvement: same quality for materially lower cost and latency, plus a cleaner, cache-friendlier prompt. Context engineering wins on the cost/latency axis even when quality is flat — and often the tighter context also reduces context-poisoning and lost-in-the-middle risk. Report quality AND cost together, not quality alone",
      "You should add more chunks back until quality goes up",
      "Token count is irrelevant as long as quality is equal",
    ],
    answerIndex: 1,
    explanation: "Matching answer quality while cutting tokens by 60% is a genuine improvement on the cost and latency axes, and a tighter, higher-signal context is also more cache-friendly and less prone to poisoning and lost-in-the-middle effects. Improvement is not only higher quality scores — 'same quality, much cheaper' is exactly what production wants. The right framing reports quality and cost together; adding chunks back or ignoring token count both miss the point of the optimization.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — prove your pipeline beats naive RAG on the metrics that matter.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Compare context-optimized vs naive RAG",
    intro: "Same task, controlled comparison, honest numbers. Not completion-gated — this is the proof of the mastery criterion.",
    steps: [
      { order: 1, action: "On the same golden set, run naive top-k RAG and your context-optimized pipeline. Measure context signal density, answer quality (eval suite), and tokens per request for each.", expected: "A before/after table: signal density, answer quality, and cost for both pipelines on identical questions." },
      { order: 2, action: "Attribute the difference: did filtering raise density? did deduplication cut redundant tokens? did ordering help? Confirm the optimized pipeline matches or beats quality at lower cost — if not, tune the relevance floor and budget.", decision: "Is the win on quality, cost, or both? 'Same quality, fewer tokens' is a valid, valuable result — report both axes." },
      { order: 3, action: "Check robustness: does the optimized pipeline handle a poisoned/contradictory chunk better (filtering/provenance)? Confirm the stable prefix is cacheable. State the measurable improvement honestly with residual limits.", verify: "You have a controlled comparison showing the context-optimized pipeline beats naive RAG on quality and/or cost, with attribution, poisoning-robustness, and cache-friendliness — a measurable improvement, not a claim." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a proven improvement over naive RAG",
    items: [
      "Same golden set for both pipelines; signal density, answer quality (eval suite), and cost measured.",
      "Optimized pipeline matches or beats quality at lower token cost; difference attributed to filter/dedup/order.",
      "Robustness to a poisoned/contradictory chunk shown; stable prefix confirmed cacheable.",
      "Measurable improvement reported on both quality and cost axes, with residual limits stated.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Prove the win with numbers: compare context-optimized vs naive RAG on the same golden set for signal density, answer quality, and cost — a claim without a measurement is worthless.",
      "'Same quality, 60% fewer tokens' is a real improvement: context engineering wins on cost/latency even when quality is flat.",
      "Signal density (fraction of context that's relevant) captures the mechanism — the win comes from what you leave out, not what you add.",
      "Deliberate context is also more robust (filtering/provenance defends against poisoning) and cache-friendlier (stable prefix) than a top-k dump.",
      "This synthesizes RAG + evaluation: gate the comparison on your eval suite, and report quality and cost together, never quality alone.",
    ],
  },
];

export const content: TopicContent = {
  "unit-adv-context-engineering-01": learn,
  "unit-adv-context-engineering-02": build,
  "unit-adv-context-engineering-03": review,
};
