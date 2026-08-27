import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Why (and When Not To) Use Frameworks" (topic-orch-why).
// 2 units: 01 learn (orchestration concept, framework value vs cost, SDK-vs-framework)
// · 02 review (decide framework-vs-framework-free for scenarios + mastery).
// Durable concepts first; framework specifics live in the later topics. Connects to the
// framework-free RAG the learner already built (Batch 6 / Project P3).

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You've already built LLM apps **without** a framework: prompting, streaming with retries, structured outputs, tool loops, embeddings, semantic search, a full RAG pipeline with citations and evaluation. That hand-rolled experience is exactly what makes this category valuable — because now you can judge what an orchestration framework actually *adds*, and what it *costs*. The goal here is not to learn framework syntax for its own sake; it's to make a defensible **build-vs-framework** decision, then use the framework well when you choose it.",
  },
  {
    type: "prose",
    md: "**Mental model: a single model call is one thing; an *application* around it is orchestration.** A real LLM app rarely stops at `client.chat.completions.create(...)`. It composes steps: format a prompt → call a model → parse the output → maybe call a tool or a retriever → loop, branch, retry, stream, and log. **Orchestration** is the coordination of those steps — the wiring *between* model calls. An **orchestration framework** (LangChain, LlamaIndex, LangGraph) is a library of reusable primitives for that wiring so you don't rebuild it every time.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Orchestration", definition: "Coordinating the steps around model calls: prompt → model → parser → tool/retriever chains, plus state, branching, parallelism, retries, streaming, and observability." },
      { term: "Model call vs application", definition: "A model call is a single request/response. The application is everything around it — composition, control flow, data plumbing, error handling — which is what a framework helps with." },
      { term: "Abstraction leakage", definition: "When a framework hides provider details until they matter — a provider-specific parameter, error, or behavior surfaces through the abstraction and you must understand both layers to debug it." },
      { term: "Provider abstraction", definition: "A uniform interface over many model providers so you can swap them with minimal code change — a key framework benefit and a key source of hidden behavior." },
      { term: "Lock-in / dependency risk", definition: "Adopting a framework couples your code to its abstractions and release cadence; fast-moving APIs can break imports and rename concepts between versions." },
    ],
  },
  {
    type: "prose",
    md: "**Why orchestration frameworks exist — the value.** They package the plumbing you've been writing by hand:\n\n- **Composition** — chain prompt → model → parser → tool/retriever as reusable units instead of bespoke glue.\n- **Provider abstraction** — one interface across OpenAI/Anthropic/Google/Azure/local; swap models with minimal change.\n- **Built-in mechanics** — streaming, batching, automatic retries/backoff, tool-call loops, structured output — implemented once, reused.\n- **State & control flow** — memory, branching, parallelism, loops handled by tested primitives.\n- **Observability** — tracing hooks (e.g. LangSmith) to inspect each step of a multi-step pipeline.\n\nFor a multi-step app, this is real leverage: less boilerplate, faster iteration, fewer subtle bugs in the plumbing.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "The cost side — abstraction is never free",
    md: "Frameworks trade control and transparency for speed. The real costs:\n\n- **Abstraction leakage** — the framework hides the provider until a provider-specific parameter, error, or quirk leaks through; now you must understand *both* your code and the framework's internals to debug it.\n- **Debugging complexity** — a stack trace through five layers of framework indirection is harder to read than your own 30 lines. 'Where did my system prompt actually go?' becomes a real question.\n- **Dependency / version risk** — these libraries move *fast*. Concepts get renamed, imports break between major versions, and tutorials go stale. (This is not hypothetical: LangChain's current API centers on `create_agent`, replacing older chain/agent classes and even relocating its documentation — code written against last year's guides may not run today.)\n- **Lock-in** — your app's shape becomes the framework's shape; migrating away is real work.\n\nNone of these means 'don't use frameworks.' They mean **adopt deliberately**, understanding what you're buying and paying.",
  },
  {
    type: "prose",
    md: "**When the direct provider SDK is the better choice.** A framework is *not* automatically required for every LLM app. Prefer the raw SDK (or your own thin helpers) when:\n\n- The app is **simple** — one or two model calls, no multi-step orchestration, no tools/state.\n- You need **tight provider-specific control** — a new parameter, a beta endpoint, exact error handling the abstraction doesn't expose yet.\n- You want **minimal dependencies** and a small, auditable surface (fewer things to break on upgrade).\n- **Latency/footprint** matters and you don't want framework overhead.\n\nYou already proved this works: your framework-free RAG app is a legitimate, debuggable, production-shaped system. The question is never 'framework or not' in the abstract — it's 'does *this* application's complexity justify the abstraction?'",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Framework-first, before understanding the raw calls",
    md: "The defining mistake of this category (and the reason the curriculum taught raw SDK calls *first*): reaching for a framework before you understand what it's abstracting. If you can't describe what `create_agent` or an LCEL chain does in terms of the underlying model calls, tool loop, and message list, you can't debug it when it misbehaves — and it *will* misbehave. Frameworks are force multipliers on understanding you already have; they are not a substitute for it. Learn the primitive, then let the framework remove the boilerplate."
  },
  {
    type: "quiz",
    question: "An application makes exactly ONE model call to summarize text, has no tools, no retrieval, and no multi-step state. Is adopting a full orchestration framework justified?",
    choices: [
      "Yes — frameworks are always the professional choice",
      "Usually not — with no composition, tools, or state, a framework adds dependencies, abstraction, and debugging surface without solving a problem you have. The provider SDK (or a thin wrapper) is simpler and more transparent here",
      "Yes — you can't call a model without a framework",
      "Only if the text is very long",
    ],
    answerIndex: 1,
    explanation: "Orchestration frameworks earn their keep on multi-step apps (chains, tools, retrieval, state, branching). A single stateless call has nothing to orchestrate, so the framework is pure overhead — more deps, more indirection, more version risk — with no offsetting benefit. Match the tool to the application's actual complexity.",
  },
  {
    type: "quiz",
    question: "A framework call succeeds, but a provider-specific parameter you set appears to be ignored. Where should you focus your debugging?",
    choices: [
      "The model provider is broken; open a support ticket",
      "The abstraction boundary — check whether the framework passes that parameter through, maps it to a different name, or silently drops it for its uniform interface. This is abstraction leakage; you must inspect how the framework calls the provider under the hood",
      "Rewrite the whole app without the parameter",
      "Nothing — parameters are optional",
    ],
    answerIndex: 1,
    explanation: "A uniform provider abstraction can fail to forward or may rename provider-specific parameters. When a param 'disappears,' the bug lives at the framework↔provider boundary: inspect what the framework actually sends (tracing, or the provider call it constructs). This is the classic cost of abstraction — you must understand both layers.",
  },
  {
    type: "takeaways",
    items: [
      "Orchestration = coordinating the steps around model calls (prompt/model/parser/tool/retriever chains, state, retries, branching, parallelism, observability).",
      "Frameworks provide reusable primitives for that plumbing: composition, provider abstraction, streaming/retries/tool-loops, state, tracing.",
      "Costs: abstraction leakage, harder debugging, fast-moving dependency/version risk, lock-in.",
      "A framework is NOT automatically required — prefer the raw SDK for simple apps, tight provider control, or minimal dependencies.",
      "Don't go framework-first: understand the raw calls a framework abstracts, or you can't debug it.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The whole point of this topic is judgement. Decide framework-vs-framework-free for concrete scenarios, and justify each — there's rarely one right answer, but there are well-reasoned and poorly-reasoned ones.",
  },
  {
    type: "quiz",
    question: "A team is building a multi-step assistant: retrieval, several tools, branching logic, conversation state, and they want tracing to debug it. Framework or hand-rolled?",
    choices: [
      "Hand-rolled — frameworks are always overkill",
      "A framework is well-justified here: composition, tool loops, state, branching, and observability are exactly what orchestration frameworks provide, and rebuilding all of it by hand is a lot of tested plumbing to reinvent. The tradeoff (deps, abstraction) is worth it at this complexity",
      "Neither — this app is impossible",
      "Framework, but only to make one model call",
    ],
    answerIndex: 1,
    explanation: "Multi-step orchestration with tools, state, branching, and a tracing requirement is precisely where frameworks pay off — you get tested primitives and observability instead of hand-written glue. The complexity justifies the abstraction cost, the mirror image of the single-call case where it doesn't.",
  },
  {
    type: "quiz",
    question: "Which reason for choosing a framework is the WEAKEST / most likely to lead to regret?",
    choices: [
      "The app has genuine multi-step orchestration, tools, and state",
      "The team needs provider-swapping and built-in tracing",
      "'Everyone uses it' / it's on a popular stack — adopting for popularity rather than a problem it solves, without understanding the raw calls it abstracts",
      "The framework removes real, repetitive plumbing the team keeps rewriting",
    ],
    answerIndex: 2,
    explanation: "Adopting a framework for popularity rather than a concrete need is cargo-culting: you inherit its dependencies, abstraction, and version churn without a problem it's solving, and you can't debug what you don't understand. The other reasons tie the choice to actual application needs, which is the correct basis.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — write your decision policy.** (You'll refine this into a full 4-way framework after learning LangChain, LlamaIndex, and LangGraph.)",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Decide framework-vs-framework-free for several workloads",
    intro: "Reason from application complexity, not fashion.",
    steps: [
      { order: 1, action: "For each: (a) a one-shot text classifier, (b) a multi-tool research assistant with state, (c) a document-Q&A over 100k files, (d) a compliance app needing exact provider-specific error handling — decide framework or raw SDK, and name the ONE factor that drove each decision.", expected: "(a) SDK (no orchestration); (b) framework (tools+state+branching); (c) leaning framework, data-centric (foreshadows LlamaIndex); (d) likely SDK or thin wrapper (tight provider control)." },
      { order: 2, action: "State the general signals that push you TOWARD a framework (multi-step composition, tools, state, provider-swapping, tracing needs) and the signals that push you AWAY (simplicity, tight provider control, minimal deps, latency/footprint, version-risk aversion).", decision: "For a borderline app, what small proof-of-concept would you build to decide, rather than committing up front?" },
      { order: 3, action: "Acknowledge the reversibility cost: how hard is it to add a framework later vs remove one? How does that asymmetry affect starting simple?", verify: "Each workload has a decision tied to a concrete factor; you can state pro/anti-framework signals; you recognise 'start simple, adopt when justified' as the low-regret default." },
    ],
  },
  {
    type: "checkpoint",
    title: "Self-check",
    items: [
      "You can justify framework-vs-SDK from application complexity, not popularity.",
      "You can name the signals that push toward and away from a framework.",
      "You can explain why 'framework-first without understanding raw calls' is risky.",
      "You default to starting simple and adopting a framework when a concrete need appears.",
    ],
  },
];

export const content: TopicContent = {
  "unit-orch-why-01": learn,
  "unit-orch-why-02": review,
};
