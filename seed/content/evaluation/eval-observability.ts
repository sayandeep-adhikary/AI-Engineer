import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Tracing & Observability" (topic-eval-observability).
// 3 units: 01 learn (tracing, spans, prompt versioning, monitoring, feedback) · 02 practice
// (add tracing to an app) · 03 build (latency/cost/quality dashboard).
// commonMistakes: No visibility into prod behavior, No cost tracking.
// masteryCriteria: trace a request end-to-end and spot a regression. Feeds P4 milestone p4-05
// (agent tracing) + P6 p6-05 (monitoring). Verified LangSmith @traceable/run_type/wrap_openai;
// Langfuse @observe (hedged). Deterministic keyless span-tree + failure-attribution + cost/p95.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Offline evals tell you how a fixed test set scores. **Observability** tells you what's actually happening to real requests in production — and without it, an LLM app is a black box you can't debug, cost-control, or improve. A user says 'the answer was wrong'; with a trace you can see the retrieved context, the exact prompt, the model's tokens, the tool calls, and the latency of each — and *localize* the fault. Without it, you're guessing (and usually guessing 'the prompt').",
  },
  {
    type: "prose",
    md: "**Mental model: a trace is the reconstructed tree of everything a single request did — nested spans with inputs, outputs, timing, tokens, and metadata — so you can see WHERE quality, latency, or cost went wrong.** Each step (retrieve, build prompt, call model, call tool) is a **span**; spans nest into a **trace** for one request. That structure is exactly the failure-layer taxonomy from the first topic, made observable: a trace lets you attribute a bad outcome to the retrieval span, the generation span, or a tool span — instead of guessing.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Trace", definition: "The full record of one request through the system — a tree of spans with a shared trace id. It answers 'what did this request actually do, step by step, and how long/how much did each step take?'" },
      { term: "Span (run)", definition: "One unit of work within a trace (a retrieval, an LLM call, a tool call), with its inputs, outputs, start/end time, and metadata. Spans nest via a parent reference to form the trace tree." },
      { term: "run_type / span kind", definition: "A label marking what a span is (llm / retriever / tool / chain). Marking LLM spans lets the tooling render token counts and latency correctly and roll up cost." },
      { term: "Prompt / version logging", definition: "Recording which prompt template and app/model version produced each trace, so you can attribute a quality change to a specific prompt or deploy and compare versions." },
      { term: "Monitoring", definition: "Aggregated production signals over many traces: latency (p50/p95/p99), token usage and cost, error/refusal rates, and quality proxies. Dashboards that surface regressions before users escalate." },
      { term: "Feedback capture", definition: "Logging user or automated signals (thumbs, edits, escalations, online judge scores) against traces, creating the online-evaluation loop and a source of new golden/eval cases." },
    ],
  },
  {
    type: "prose",
    md: "**Instrumenting a trace (LangSmith / Langfuse).** You annotate functions so each becomes a span; nested calls auto-nest into the trace. Tools like **LangSmith** (`@traceable`) and **Langfuse** (`@observe`) do this with a decorator, plus a wrapper that traces model calls automatically. APIs and model ids churn — verify current docs:",
  },
  {
    type: "code",
    language: "python",
    caption: "Tracing with LangSmith (decorator + auto-traced model calls; ids illustrative)",
    code: `from langsmith import traceable, wrappers
from openai import OpenAI

client = wrappers.wrap_openai(OpenAI())   # every model call becomes an LLM span automatically

@traceable(run_type="retriever")           # mark the span kind so tooling rolls it up correctly
def retrieve(query): ...                    # returns context chunks

@traceable(run_type="chain")               # the parent span; child spans auto-nest under it
def answer(query):
    context = retrieve(query)              # -> a child 'retriever' span
    resp = client.chat.completions.create( # -> a child 'llm' span (tokens + latency captured)
        model="gpt-4o-mini", messages=[{"role": "user", "content": f"{context}\\n{query}"}])
    return resp.choices[0].message.content
# Env: LANGSMITH_TRACING=true, LANGSMITH_API_KEY. Langfuse is equivalent via @observe().`,
  },
  {
    type: "prose",
    md: "The payoff is the *tree*: one `answer` trace with a `retriever` child and an `llm` child, each with timing and tokens. From that tree you read the total latency, the cost, and — crucially — which span is the bottleneck or the fault. That's what turns 'the answer was slow/wrong' into 'the retrieval span took 3s' or 'the generation span ignored the context.'",
  },
  {
    type: "code",
    language: "python",
    caption: "Reconstruct a trace tree and find the latency bottleneck (deterministic, keyless)",
    code: `spans = [
    {"name": "handle_request", "parent": None,             "ms": 1200},
    {"name": "retrieve",       "parent": "handle_request", "ms": 300},
    {"name": "llm_generate",   "parent": "handle_request", "ms": 850},
    {"name": "embed_query",    "parent": "retrieve",       "ms": 120},
]

def slowest_child(spans, root="handle_request"):
    children = [s for s in spans if s["parent"] == root]
    s = max(children, key=lambda c: c["ms"])
    return s["name"], s["ms"]

print(slowest_child(spans))   # which top-level step dominates the request?`,
    output: `('llm_generate', 850)`,
  },
  {
    type: "prose",
    md: "The trace attributes the latency: of the 1200 ms request, the `llm_generate` span dominates at 850 ms — so the optimization is generation (shorter output, smaller/faster model, streaming), **not** retrieval. Without the trace you might have 'optimized' retrieval and moved nothing. Observability replaces guessing with attribution.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "No visibility into prod behavior, and no cost tracking",
    md: "The two failure modes this topic exists to prevent:\n\n- **No visibility** — you can't see real inputs, retrieved context, prompts, or tool calls, so every production bug is debugged by guessing (and the guess is usually 'tweak the prompt'). You also can't tell if quality is silently degrading until users churn. Instrument traces so you can *localize* faults and watch quality over time.\n- **No cost tracking** — token usage is invisible, so a prompt that quietly doubled its context, a retry storm, or a switch to an expensive model shows up only on the monthly bill. Capture per-request tokens and cost from LLM spans and aggregate them.\n\nAnd a subtler trap on the other side: **tracing everything without actionable instrumentation** — logging raw spans nobody looks at, with no metadata to filter by (version, user tier, route), no dashboards, and no alerts. Observability is only useful if it surfaces *decisions*: which version regressed, which route is slow, where cost spiked."
  },
  {
    type: "quiz",
    question: "A user reports a wrong answer from your RAG app. You have full tracing. What does the trace let you determine that logs of just the final answer cannot?",
    choices: [
      "Nothing more than the final answer already shows",
      "The trace shows each span — what context was retrieved, the exact assembled prompt, the model's output, any tool calls, and per-span timing/tokens — so you can attribute the fault to a LAYER (e.g. the gold doc was never retrieved vs the model ignored good context) instead of guessing 'improve the prompt'",
      "Only the total latency, nothing about correctness",
      "Whether the user is lying about the error",
    ],
    answerIndex: 1,
    explanation: "A trace reconstructs the whole request tree, so you can inspect the retrieved context, the exact prompt, the generation, and tool calls with per-span timing and tokens — which lets you localize the failure to a specific layer. That distinguishes a retrieval miss (gold doc absent) from a generation fault (context present but ignored), a distinction the final answer alone can't reveal. It's the difference between attributing the fault and guessing.",
  },
  {
    type: "takeaways",
    items: [
      "A trace is the tree of spans for one request (inputs/outputs/timing/tokens/metadata) — it makes the failure-layer taxonomy observable so you can ATTRIBUTE faults instead of guessing.",
      "Instrument with a decorator: LangSmith @traceable(run_type=...) / Langfuse @observe(), plus wrap_openai to auto-trace model calls; mark span kinds (llm/retriever/tool). APIs/model ids churn — verify docs.",
      "From a trace you read total latency, cost, and the bottleneck/fault span (e.g. generation 850ms of 1200ms) — optimize the right layer, not the guessed one.",
      "Two prod failures: no visibility (debug by guessing, silent quality decay) and no cost tracking (invisible token/cost regressions) — capture and aggregate both.",
      "Log prompt/app versions + metadata and capture feedback (thumbs/edits/escalations) — that's the online-eval loop; but tracing without actionable dashboards/alerts is noise.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Add tracing to an existing app and use the trace to attribute a failure to a layer — the whole point of observability. Keyless: the deterministic exercise is layer attribution from span outcomes; wiring a real tracer (LangSmith/Langfuse) needs a key but the reasoning transfers.",
  },
  {
    type: "code",
    language: "python",
    caption: "Attribute a failure to the earliest failing layer from the trace (deterministic, keyless)",
    code: `# A trace exposes each layer's outcome. Walk them in pipeline order; the first failure is the fault.
checks = [
    ("input_wellformed",        True),
    ("retrieved_relevant_docs", False),   # <- the gold doc was NOT retrieved
    ("context_within_budget",   True),
    ("generation_faithful",     True),
]

def attribute(checks):
    for layer, ok in checks:
        if not ok:
            return layer
    return "no_failure_found"

print(attribute(checks))`,
    output: `retrieved_relevant_docs`,
  },
  {
    type: "prose",
    md: "The trace shows the retrieval span never returned the gold document, so the failure is attributed to **retrieval** — not generation, and certainly not 'the prompt.' Fixing the prompt here would waste effort on a working layer. This is the anti-'just improve the prompt' discipline the whole category insists on: the trace tells you *which* layer, so you fix the right one.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Instrument an app and trace a request end-to-end (guided)",
    intro: "Make every step a span, then read the tree.",
    steps: [
      { order: 1, action: "Add tracing to an existing app (your RAG assistant or agent): decorate the pipeline stages as spans (retriever/llm/tool) and wrap the model client so calls are captured. Run a request and confirm the trace shows nested spans with inputs/outputs/timing/tokens.", expected: "One trace per request with child spans for each stage, each carrying its inputs, outputs, latency, and tokens." },
      { order: 2, action: "Reproduce a known bad answer and use the trace to attribute it: inspect the retrieval span (right context?), the prompt span (assembled correctly?), and the generation span (faithful to context?). Walk them in order.", decision: "Which is the earliest span that failed — and would a prompt change even touch it?" },
      { order: 3, action: "Add metadata (prompt/app version, route) so traces are filterable, and capture a feedback signal (thumbs/edit) against the trace.", verify: "Requests are traced end-to-end with nested spans; you attributed a real failure to a specific layer from the trace; traces carry version metadata and a feedback hook." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "App instrumented: each stage is a span; model calls captured with tokens/latency.",
      "A real failure attributed to a specific layer from the trace (not guessed).",
      "Traces carry version/route metadata for filtering.",
      "A feedback signal is captured against traces (online-eval hook).",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a latency / cost / quality dashboard** from your traces — the completion criterion is 'the dashboard surfaces regressions.' Raw traces are evidence; a dashboard is what turns thousands of them into the few numbers that tell you something regressed *before* users escalate. This is the monitoring half of the observability skill (and Project P6's monitoring milestone).",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *the dashboard surfaces regressions.* Aggregate your traces into monitored signals — latency (p50/p95/p99), token usage and cost, error/refusal rates, and a quality proxy (online judge score or feedback) — sliced by version/route so a regression is visible and attributable. **Roadmap fit:** this is the monitoring milestone of the production service (Project P6, p6-05) and the observability instrumentation of the agent (Project P4, p4-05, already built) — delivered in full when you reach the production category, but the dashboard logic is built here. The aggregation is deterministic and keyless; live data needs a tracer. Watch the TAIL (p95/p99), not just the average."
  },
  {
    type: "code",
    language: "python",
    caption: "Aggregate traces into cost and tail-latency signals (deterministic, keyless)",
    code: `requests = [
    {"in": 1000, "out": 200, "ms": 800},
    {"in": 1200, "out": 150, "ms": 1500},
    {"in": 900,  "out": 300, "ms": 600},
    {"in": 1100, "out": 250, "ms": 2200},
]

def cost(reqs, in_per_1k=0.003, out_per_1k=0.006):
    return round(sum(r["in"]/1000*in_per_1k + r["out"]/1000*out_per_1k for r in reqs), 4)

def p95(reqs):
    import math
    lat = sorted(r["ms"] for r in reqs)
    return lat[math.ceil(0.95 * len(lat)) - 1]

print(cost(requests))   # total spend across these requests
print(p95(requests))    # 95th-percentile latency (the tail users feel)`,
    output: `0.018
2200`,
  },
  {
    type: "prose",
    md: "Total cost is `$0.018` and **p95 latency is 2200 ms** — far above the ~800 ms *average*, because one slow request dominates the tail. That's the point of monitoring the tail: an average of ~1275 ms hides that 5% of users wait 2.2s. A dashboard that only shows the mean will miss a latency regression that lives entirely in p95/p99; track percentiles, cost, and error rate together, sliced by version, so regressions surface and attribute.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a regression-surfacing dashboard",
    intro: "Aggregate traces into the signals that matter. Acceptance defines done.",
    steps: [
      { order: 1, action: "Aggregate your traces into: latency percentiles (p50/p95/p99), token usage → cost, error/refusal rate, and a quality proxy (online judge score or feedback rate). Compute over a window.", decision: "Which tail percentile matters for your UX, and what quality proxy can you compute continuously without human labels on every request?" },
      { order: 2, action: "Slice by version/route/model so a regression is attributable (which deploy, which endpoint). Set thresholds/alerts so a p95 spike, cost jump, or quality drop is surfaced — not buried.", expected: "A view where a latency, cost, or quality regression is visible and attributable to a slice." },
      { order: 3, action: "Validate it catches a regression: simulate (or replay) a slow/expensive/lower-quality change and confirm the dashboard surfaces it in the tail/cost/quality signal.", verify: "The dashboard shows latency percentiles + cost + error rate + a quality proxy, sliced by version, with alerts, and demonstrably surfaces an injected regression." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — monitoring that surfaces regressions",
    items: [
      "Latency percentiles (p50/p95/p99), token→cost, error/refusal rate, and a quality proxy aggregated over a window.",
      "Signals sliced by version/route/model so regressions are attributable.",
      "Thresholds/alerts surface tail-latency, cost, and quality regressions (not just the mean).",
      "Demonstrated to catch an injected slow/expensive/lower-quality regression.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — trace aggregation with percentiles + per-version slice (keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import math
from collections import defaultdict

def percentile(values, p):
    v = sorted(values)
    return v[math.ceil(p * len(v)) - 1] if v else 0

def dashboard(traces, in_per_1k=0.003, out_per_1k=0.006):
    by_version = defaultdict(list)
    for t in traces:
        by_version[t["version"]].append(t)
    report = {}
    for ver, ts in by_version.items():
        lats = [t["ms"] for t in ts]
        spend = sum(t["in"]/1000*in_per_1k + t["out"]/1000*out_per_1k for t in ts)
        errors = sum(1 for t in ts if t.get("error"))
        quality = [t["judge"] for t in ts if "judge" in t]          # online quality proxy
        report[ver] = {
            "n": len(ts),
            "p50_ms": percentile(lats, 0.50), "p95_ms": percentile(lats, 0.95),
            "cost": round(spend, 4), "error_rate": round(errors / len(ts), 3),
            "avg_quality": round(sum(quality)/len(quality), 3) if quality else None,
        }
    return report   # compare versions side by side; alert when p95/cost/error/quality crosses a threshold`,
  },
];

export const content: TopicContent = {
  "unit-eval-observability-01": learn,
  "unit-eval-observability-02": practice,
  "unit-eval-observability-03": build,
};
