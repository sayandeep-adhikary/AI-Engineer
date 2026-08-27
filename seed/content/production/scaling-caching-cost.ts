import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Scaling, Caching & Cost Optimization" (topic-prod-scaling-cost).
// USEFUL track. 3 units: 01 learn (caching, batching, model routing, fallback, autoscaling) ·
// 02 build (add caching + model routing — feeds P6 m-05) · 03 review (measure cost/latency deltas
// — p95). commonMistakes: Premature optimization, Caching the wrong things. masteryCriteria:
// measurable cost/latency reduction with intact quality. Deterministic keyless cost/routing/p95 experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "An AI app can be correct and still fail — because it costs too much or responds too slowly to be usable. **Cost and latency are product constraints, not afterthoughts.** This topic is the toolkit for both: caching (don't pay twice for the same answer), batching (amortize overhead), model routing (use the cheapest model that's good enough), fallbacks (degrade instead of failing), and autoscaling (match capacity to load). The skill is applying them to a *measured* bottleneck, not sprinkling them everywhere.",
  },
  {
    type: "prose",
    md: "**Mental model: every optimization trades something, so you optimize a measured bottleneck, not a guess.** Caching trades freshness and memory for speed and cost; batching trades latency for throughput; routing trades quality headroom for cost; a smaller model trades capability for price. None is free, and applied blindly each can hurt — a cache that serves stale or wrong answers, a batch that adds latency to interactive requests, a router that sends hard tasks to a weak model. So you measure first (where does the cost/latency actually go?), optimize the biggest lever, and re-measure to confirm the win didn't cost quality.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Response / semantic caching", definition: "Storing results so a repeat request is served without a model call. Exact-match caching keys on the identical request; semantic caching serves a cached answer for a sufficiently-similar query (using embeddings). Huge cost/latency win for repeated or near-repeated queries — but only safe for stable, non-personalized, non-time-sensitive answers." },
      { term: "Batching", definition: "Processing multiple requests together to amortize per-call overhead (and, on GPUs, to use hardware efficiently). Great for offline/bulk throughput; harmful for interactive latency, because a request waits for the batch to fill. Batch background work, not user-facing calls that need a fast response." },
      { term: "Model routing", definition: "Sending each request to the cheapest model that can handle it: a small/cheap model for simple tasks (classification, short answers), a large model for hard reasoning. A classifier or heuristic decides the route. Cuts cost substantially when much of your traffic is easy — the key is routing hard tasks correctly, not everything to the cheap model." },
      { term: "Fallback", definition: "A backup path when the primary fails or is over budget: a secondary model/provider on an outage, a cheaper model when a budget is hit, or a cached/degraded answer. Fallbacks are graceful degradation — the app returns something useful instead of an error, within a defined policy." },
      { term: "Autoscaling", definition: "Adjusting instance count to load between a min and max (from the deployment topic). It scales throughput, not per-request cost or quality. Remember the coupling: scaling up sends more concurrent calls to the model provider, so your provider quota (rate limit) must absorb the peak or scaling just trades queueing for 429s." },
      { term: "Premature optimization", definition: "Optimizing before measuring — adding a cache, a router, or batching to a path that isn't the bottleneck, adding complexity and bugs for no real gain. The cure is to profile: find where cost and latency actually go (often one model call, or the p95 tail), and optimize that." },
    ],
  },
  {
    type: "prose",
    md: "**Caching's payoff is direct: only cache misses hit the model, so cost falls with the hit rate:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Cost reduction from caching (deterministic, keyless)",
    code: `def effective_cost(requests, cost_per_call, hit_rate):
    # Cache serves hits without a model call; only misses cost money.
    misses = requests * (1 - hit_rate)
    return round(misses * cost_per_call, 4)

print(effective_cost(requests=1000, cost_per_call=0.002, hit_rate=0.0))   # no cache
print(effective_cost(requests=1000, cost_per_call=0.002, hit_rate=0.6))   # 60% hit rate`,
    output: `2.0
0.8`,
  },
  {
    type: "prose",
    md: "With no cache, 1000 requests cost the full \\$2.00; at a 60% hit rate, only 400 misses hit the model, cutting cost to \\$0.80 — a 60% saving, plus the cached responses are near-instant. But that only holds if the cached answers are *correct to serve*: cache stable things (an FAQ answer, a document lookup, an embedding) and never cache personalized, time-sensitive, or per-user results — serving a stale or wrong cached answer is the 'caching the wrong things' mistake, and it is worse than the cost you saved. Measure your hit rate on real traffic; a low hit rate means caching isn't your bottleneck.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Premature optimization and caching the wrong things",
    md: "The two commonMistakes this topic exists to prevent:\n\n- **Premature optimization** — adding caching, batching, or routing before measuring where cost and latency actually go. You add complexity and new failure modes (a cache to invalidate, a router to misroute) for a path that wasn't the bottleneck. Cure: measure first (cost per request, p95 latency, where the time goes), optimize the biggest lever, re-measure. Most AI cost is in one place — the model call — so that's usually where the win is.\n- **Caching the wrong things** — caching answers that shouldn't be reused: personalized results (user A gets user B's answer), time-sensitive data (a stale price or status), or anything that must reflect the latest state. The cache 'works' (fast, cheap) while silently serving wrong answers — a correctness bug dressed as an optimization. Cure: cache only stable, non-personalized, non-time-sensitive results, with a sensible TTL, and key the cache correctly (include anything that changes the right answer).\n\nBoth are the same error: optimizing without understanding what you're trading away."
  },
  {
    type: "quiz",
    question: "To cut costs, a teammate adds a response cache keyed only on the user's question text, serving cached answers across all users for 24 hours. Costs drop, but some users start getting answers that reference other users' data or stale account status. What went wrong?",
    choices: [
      "The cache TTL is too short — make it longer",
      "They cached the wrong things: the answers are personalized and time-sensitive, but the cache key ignores the user and the account state, so it serves one user's answer to another and stale status to everyone. Only stable, non-personalized, non-time-sensitive results should be cached, and the key must include everything that changes the correct answer. It's a correctness bug, not a real optimization",
      "Caching never works for AI apps — remove it entirely",
      "The model is wrong — switch models",
    ],
    answerIndex: 1,
    explanation: "Caching personalized, time-sensitive answers under a key that omits the user and account state makes the cache serve one user's response to another and return stale status — a correctness failure masquerading as a cost win. Caching is safe only for stable, non-personalized, non-time-sensitive results, with keys that include everything affecting the answer. A longer TTL worsens it, and the model isn't the problem; the caching policy is.",
  },
  {
    type: "takeaways",
    items: [
      "Cost and latency are product constraints: an app too expensive or too slow isn't viable, however correct.",
      "Every optimization trades something (freshness, latency, quality, complexity) — optimize a measured bottleneck, then re-measure to confirm the win didn't cost quality.",
      "Caching cost scales with the miss rate (60% hit rate → 60% cheaper here), but only cache stable, non-personalized, non-time-sensitive answers with correct keys and a sensible TTL.",
      "Route to the cheapest model that's good enough (small for easy, large for hard); batch background work, not interactive requests; use fallbacks for graceful degradation.",
      "Avoid premature optimization (measure first) and caching the wrong things (a correctness bug, not a saving); autoscaling scales throughput, not per-request cost — and is coupled to provider quota.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "Now cut real cost and latency. The completion criterion is 'cost/latency drop without quality loss,' and this feeds **Project P6's milestone `p6-05`** (add monitoring, caching and cost limits). Here you add two of the highest-leverage optimizations — **caching** and **model routing** — to your service, measured against a baseline so you can prove the win didn't cost quality.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *cost/latency drop without quality loss.* Add response/semantic caching (for stable queries, correctly keyed, with a TTL) and model routing (cheap model for easy tasks, large for hard, with a fallback) to your API. Measure cost and latency before and after, and confirm quality is intact (reuse your eval suite from the evaluation category). **Roadmap fit:** this is the caching/cost half of **P6 `p6-05`** ('add monitoring, caching and cost limits'); the monitoring half comes from `topic-eval-observability` + `topic-prod-cicd-ops`. The rule that governs the whole unit: an optimization that lowers cost but also lowers quality is not a win — gate every change on the eval suite."
  },
  {
    type: "prose",
    md: "**Model routing sends each task to the cheapest capable model, with a budget-aware fallback:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Model routing with a budget fallback (deterministic, keyless)",
    code: `def route(task, budget_ok):
    # Cheap model for easy tasks; large model for hard tasks; fall back if over budget.
    if task == "classify":
        return "small-model"
    if task == "complex_reasoning":
        return "large-model" if budget_ok else "small-model (budget fallback)"
    return "default-model"

print(route("classify", budget_ok=True))
print(route("complex_reasoning", budget_ok=True))
print(route("complex_reasoning", budget_ok=False))`,
    output: `small-model
large-model
small-model (budget fallback)`,
  },
  {
    type: "prose",
    md: "Easy tasks (classification) always go to the cheap model; hard reasoning goes to the large model when the budget allows, and falls back to the small model (a degraded but non-failing answer) when it doesn't. If most of your traffic is easy — as it often is — routing cuts cost dramatically because you stop paying frontier prices for trivial requests. The risk is the mirror of the cache risk: routing a *hard* task to the weak model silently lowers quality. That's why the completion bar is 'without quality loss' and why you gate the change on your eval suite — the router must be measured, not assumed, correct.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — add caching + model routing",
    intro: "Cut cost/latency, prove quality holds. Acceptance defines done.",
    steps: [
      { order: 1, action: "Measure a baseline: cost per request and latency (p50/p95) on representative traffic, plus current quality on your eval suite. Identify the biggest lever (usually the model call).", expected: "A baseline of cost, latency, and quality to measure improvements against — no optimizing before measuring." },
      { order: 2, action: "Add response/semantic caching for STABLE queries (correct key including anything that changes the answer; sensible TTL; never personalized/time-sensitive). Add model routing (cheap for easy, large for hard, budget fallback).", decision: "What is genuinely safe to cache, and where is the quality boundary for the cheap model? Route hard tasks to the capable model — routing them cheap is a silent quality loss." },
      { order: 3, action: "Re-measure cost, latency, and quality (eval suite). Confirm cost/latency dropped AND quality is intact. Add a cost limit/alert so a spike can't run an unbounded bill.", verify: "Caching + routing measurably cut cost and latency, the eval suite confirms quality is unchanged, and a cost limit is in place — delivering the caching/cost half of P6 p6-05." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — caching + routing (P6 p6-05 caching/cost half)",
    items: [
      "Baseline measured (cost/request, p50/p95 latency, eval quality) before optimizing.",
      "Caching added for stable queries only, correctly keyed, with a TTL; nothing personalized/time-sensitive cached.",
      "Model routing added (cheap for easy, large for hard, budget fallback); hard tasks routed to the capable model.",
      "Re-measured: cost/latency dropped AND eval quality intact; a cost limit/alert is in place.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — cache-then-route with quality guard (shape; keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `CACHE = {}

def answer(request):
    key = cache_key(request)                 # include user/state ONLY if part of correctness
    if is_cacheable(request) and key in CACHE:
        return CACHE[key]                    # cache hit: no model call
    model = route(request.task, budget_ok())  # cheapest capable model
    result = call_model(model, request)
    if is_cacheable(request):                # cache only stable, non-personalized answers
        CACHE[key] = result                  # (+ TTL / eviction in a real cache)
    return result

# Gate any of this on the eval suite: a cost win that lowers quality is NOT a win.
def is_cacheable(request):
    return request.task in {"faq", "doc_lookup"} and not request.personalized`,
  },
  {
    type: "takeaways",
    items: [
      "Add the two highest-leverage optimizations — caching and model routing — measured against a baseline, delivering the caching/cost half of P6 p6-05.",
      "Route to the cheapest capable model (cheap for easy, large for hard, budget fallback); routing hard tasks cheap is a silent quality loss.",
      "Cache only stable, non-personalized, non-time-sensitive answers, correctly keyed with a TTL — the same correctness care as the learn unit.",
      "Gate every optimization on the eval suite: a change that lowers cost AND quality is not a win ('without quality loss' is the bar).",
      "Add a cost limit/alert so a spike can't run an unbounded bill (LLM10), completing the cost-control half of the milestone.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "An optimization you haven't measured is a story. The completion criterion is 'you quantify the improvement' — so **measure the cost and latency deltas** rigorously, including the tail. The headline is often the mean, but users feel the p95/p99 — and a real win improves both without hurting quality.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Measuring an optimization honestly",
    md: "A credible before/after:\n\n- **Same workload** — measure both on the same representative traffic, not a cherry-picked easy set.\n- **The tail, not just the mean** — report p50, p95, p99. Caching and routing often shine at the tail (a cache hit is instant; the mean can hide a slow tail).\n- **Quality held** — run the eval suite before and after; a cost/latency win that drops quality is a regression, not an improvement.\n- **Cost per request** — not just total; a change that lowers total cost by shedding traffic isn't the same as one that lowers per-request cost.\n\nThe recurring production question: latency acceptable on average but terrible at p95/p99? Averages lie; percentiles tell the truth. Quantify the delta on all of cost, p50, p95, and quality — that's what makes 'we optimized it' a claim you can defend."
  },
  {
    type: "prose",
    md: "**The mean can look fine while the tail is broken — so measure percentiles, not just the average:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Measure the tail: p95 before vs after (deterministic, keyless)",
    code: `import math

def p95(latencies):
    s = sorted(latencies)
    idx = math.ceil(0.95 * len(s)) - 1
    return s[idx]

before = [200, 210, 205, 800, 220, 215, 900, 205, 210, 208]  # slow tail (cache misses)
after  = [180, 185, 182, 190, 188, 184, 186, 183, 187, 185]  # caching cut the tail

print("p95 before:", p95(before), "p95 after:", p95(after))
print("mean before:", round(sum(before)/len(before), 1), "mean after:", round(sum(after)/len(after), 1))`,
    output: `p95 before: 900 p95 after: 190
mean before: 337.3 mean after: 185.0`,
  },
  {
    type: "prose",
    md: "Both the mean (337→185ms) and — more importantly — the p95 (900→190ms) improved dramatically: caching removed the slow tail where repeated queries used to hit the model. Reporting only the mean would have understated the win (and in other cases can *hide* a regression where the mean holds but the tail degrades). The p95 is the number users actually feel, so a defensible optimization quantifies cost, p50, and p95 — and confirms via the eval suite that quality held. That is 'you quantify the improvement': a real delta on the metrics that matter, with quality intact.",
  },
  {
    type: "quiz",
    question: "After adding a cache, your mean latency drops from 340ms to 185ms — a clear win, you report. A colleague asks about p99. Why does that question matter?",
    choices: [
      "It doesn't — the mean improved, so the optimization is proven",
      "Because the mean can hide the tail: users experience p95/p99, and an optimization can improve the average while leaving (or worsening) a slow tail — e.g. cache misses still hit the model slowly. Reporting p50/p95/p99 (not just the mean) shows whether the worst-case experience actually improved, and the eval suite confirms quality held. Percentiles are the honest measure",
      "p99 is only relevant for batch jobs, not APIs",
      "The mean and p99 are always the same for latency",
    ],
    answerIndex: 1,
    explanation: "Latency distributions are skewed, so a better mean can coexist with an unchanged or worse tail that users actually feel — cache misses, cold paths, and retries live in p95/p99. Reporting percentiles reveals whether the worst-case experience improved, and pairing it with the eval suite confirms the cost/latency win didn't cost quality. Dismissing p99 or assuming it equals the mean hides exactly where real users get hurt.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — quantify the optimization across cost, latency (with the tail), and quality.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Quantify your cost/latency improvement",
    intro: "Prove the win on the metrics that matter. Not completion-gated — this is the measurement discipline the milestone rests on.",
    steps: [
      { order: 1, action: "On the same representative workload, measure before and after: cost per request, latency p50/p95/p99, and quality via the eval suite. Use identical traffic for a fair comparison.", expected: "A before/after table of cost, p50, p95, p99, and eval quality on the same workload." },
      { order: 2, action: "Attribute the delta: how much came from caching (tail/repeated queries) vs routing (per-request cost on easy tasks)? Confirm quality is unchanged — if it dropped, the router or cache is serving worse answers and the 'win' is a regression.", decision: "Did BOTH cost and p95 improve with quality intact? If quality fell, roll back the offending optimization and re-scope what's safe to cache/route." },
      { order: 3, action: "State the result honestly: the cost and p95 improvement with quality held, plus residual limits (low cache hit rate on unique queries, routing accuracy). Confirm the cost limit/alert is active.", verify: "You've quantified a real cost AND p95 improvement with eval-confirmed quality intact, attributed the gains to caching vs routing, and documented residual limits — a defensible optimization, delivering P6 p6-05's cost half." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a quantified optimization",
    items: [
      "Before/after measured on the same workload: cost per request, p50/p95/p99 latency, and eval quality.",
      "Both cost and p95 improved with quality intact (eval-confirmed); a quality drop is treated as a regression, not a win.",
      "Gains attributed to caching (tail/repeats) vs routing (per-request cost); residual limits documented.",
      "Cost limit/alert active so a spike can't run an unbounded bill.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Quantify optimizations on the same workload across cost per request, p50/p95/p99, and eval quality — 'we optimized it' needs a defensible delta.",
      "Measure the tail: caching often improves p95/p99 most (a cache hit is instant), and the mean can hide a slow or worsening tail.",
      "A cost/latency win that lowers quality is a regression — always confirm with the eval suite and roll back the offending change.",
      "Attribute gains (caching vs routing) and document residual limits (cache hit rate on unique queries, routing accuracy) — honesty over headline.",
      "Keep the cost limit/alert active — quantified savings plus bounded worst-case cost is the cost half of P6 p6-05.",
    ],
  },
];

export const content: TopicContent = {
  "unit-prod-scaling-cost-01": learn,
  "unit-prod-scaling-cost-02": build,
  "unit-prod-scaling-cost-03": review,
};
