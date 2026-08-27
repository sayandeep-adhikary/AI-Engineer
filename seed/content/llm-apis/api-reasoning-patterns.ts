import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Reasoning & Prompt Patterns" (topic-api-reasoning-patterns).
// 3 units: 01 learn · 02 practice (redesign a multi-step task) · 03 review
// (accuracy vs cost + mastery). Emphasis: reliable WORKFLOWS over "think harder";
// don't expose private chain-of-thought; combine models with deterministic systems.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "When a single naive prompt gives unreliable answers on a multi-step task, the amateur move is 'tell it to try harder'; the engineer's move is to **design a workflow that produces a more reliable result**. This topic is a toolkit of reasoning patterns *and* the judgement to know that some problems aren't reasoning problems at all — they're jobs for deterministic code, retrieval, or a tool.",
  },
  {
    type: "prose",
    md: "**Mental model: 'make the model think harder' ≠ 'make the result more reliable'.** Reasoning patterns can genuinely improve accuracy on tasks the model *can* do but does sloppily in one shot — by giving it room to work step by step, or a second pass to check itself. But they cannot make it know a fact it lacks, compute exactly, or be consistent. So the real skill is **decomposing a task** into the parts a model does well (language, drafting, judgement over provided text) and the parts a deterministic system must own (math, lookups, validation), then wiring them together.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Decomposition", definition: "Break a hard task into smaller, checkable sub-tasks (extract → transform → decide), rather than asking for the whole answer at once." },
      { term: "Planning", definition: "Have the model outline the steps/approach before executing, so the structure is explicit and inspectable." },
      { term: "Verification", definition: "A separate pass (by code, a rule, or a second model call) that CHECKS the output against criteria instead of trusting it." },
      { term: "Self-critique / revision", definition: "Ask the model to critique its own draft against explicit criteria, then revise — useful when 'what good looks like' is expressible." },
      { term: "Generation vs validation", definition: "Keep the step that PRODUCES an answer separate from the step that JUDGES it. Mixing them lets a confident generator grade itself." },
    ],
  },
  {
    type: "prose",
    md: "**The core patterns, and when each earns its cost:**\n\n- **Decomposition** — split a multi-part task so each part is simple and checkable. Best when a one-shot answer conflates several sub-problems.\n- **Planning** — ask for the approach first, then execute. Helps on open-ended tasks; makes the reasoning inspectable.\n- **Step-by-step working** — let the model reason through intermediate steps before the answer; improves multi-step accuracy (but see the cost/chain-of-thought notes).\n- **Self-critique + revision** — generate, then check against criteria, then fix. Best when quality criteria are explicit.\n- **Few-shot reasoning** — show worked examples of the *reasoning style* you want, not just input→output.\n- **Ask for assumptions** — have the model surface what it assumed, so a human/system can catch a wrong premise.\n\nEach adds tokens, latency, and complexity — so use the **minimal** pattern that fixes the observed failure, not all of them.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Don't expose or depend on private chain-of-thought — request useful artifacts instead",
    md: "It's tempting to prompt 'show all your reasoning' and surface it to users or logs. Avoid making raw, private chain-of-thought your product surface: it's verbose, can be unreliable, may leak sensitive intermediate content, and some providers (reasoning models) don't return raw internal reasoning at all — you get a **summary** by design. Instead, request **structured, useful outputs**: a *concise reasoning summary*, the *assumptions made*, the *checks performed*, *intermediate structured artifacts* (e.g. the extracted fields it based the answer on), and a *final answer with validation info* (confidence, sources, or a self-check result). Those are actionable; a wall of raw 'thinking' is not.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Some problems are not reasoning problems — no prompt pattern fixes them",
    md: "A pattern helps only when the model is *capable but sloppy*. When the task is structurally outside the model, patterns waste tokens and still fail. Map the real fix:\n\n- **Arithmetic / exact computation** → a calculator or code, not 'think step by step'.\n- **Current / live data** → retrieval or an API call.\n- **Facts in your database** → a database query.\n- **Deterministic transformation** (e.g. reformatting, unit conversion by rule) → code.\n- **Policy / compliance guarantees** → explicit validation in code, not a promise in the prompt.\n\nGood AI engineering is usually **models + deterministic systems**: let the model do language and judgement, and hand exactness, facts, and guarantees to code.",
  },
  {
    type: "prose",
    md: "**Separate generation from validation.** A generator that also grades itself tends to approve its own work. The reliable pattern is: the model *produces* a candidate; then a *separate* check — deterministic code where possible, a rule, or a distinct validation call with fresh criteria — decides whether it's acceptable, and triggers a retry/repair or a human handoff if not. This 'propose then verify' shape is the backbone of the structured-output, tool-calling, and evaluation work ahead.",
  },
  {
    type: "quiz",
    question: "A pricing assistant must answer questions like 'what's the total for 37 units at $19.95 with 8.25% tax?' Single prompts sometimes get the arithmetic wrong. What's the right redesign?",
    choices: [
      "Add 'think step by step and double-check your math' and accept it",
      "Have the model EXTRACT the quantities (37, 19.95, 8.25%) as structured fields, then compute the total in CODE (or a calculator tool) — don't ask the model to be the calculator",
      "Use a bigger model at high temperature",
      "Ask the model to show all its reasoning to the user",
    ],
    answerIndex: 1,
    explanation: "Arithmetic is a deterministic problem the model does unreliably by predicting digits. The robust design uses the model for what it's good at (pulling the numbers out of natural language) and hands the exact computation to code/a tool. Step-by-step prompting reduces but never guarantees correctness on exact math.",
  },
  {
    type: "quiz",
    question: "For a task where the model CAN do the work but often skips a step, a reviewer suggests 'ask it to critique and revise its own answer'. When is that appropriate, and what's the caveat?",
    choices: [
      "Never — self-critique is useless",
      "Appropriate when the quality criteria are explicit enough to critique against; caveat: a generator grading itself is weak, so prefer a SEPARATE validation (code/rule/distinct call) for anything that must be correct",
      "Always — self-critique guarantees correctness",
      "Only if you expose the full chain-of-thought to users",
    ],
    answerIndex: 1,
    explanation: "Self-critique + revision helps when 'good' is expressible as criteria the model can check against, and it's cheap to try. But self-grading is not a strong guarantee — for correctness-critical output, separate the validation from the generation (ideally deterministic code). And you don't need to expose raw reasoning to do this.",
  },
  {
    type: "takeaways",
    items: [
      "'Think harder' improves capable-but-sloppy tasks; it can't add knowledge, exactness, or determinism.",
      "Patterns: decomposition, planning, step-by-step, self-critique+revision, few-shot reasoning, surface-assumptions — use the minimal one that fixes the failure.",
      "Don't surface/depend on raw private chain-of-thought; request concise summaries, assumptions, checks, structured artifacts, and validation info.",
      "Separate generation from validation; let a distinct (ideally deterministic) step judge the output.",
      "Many failures aren't reasoning problems — route arithmetic→code, live data→retrieval, DB facts→query, guarantees→validation. Models + deterministic systems.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Take a task where naive generation is unreliable and *redesign the workflow*. The goal isn't a cleverer prompt — it's a pipeline where the model does the language parts and deterministic code owns the exact parts.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Redesign an unreliable multi-step task (guided)",
    intro: "Task: given a free-text expense claim ('Dinner with client, 3 people, £142.50, plus 20% tip'), produce a validated record with the correct total including tip.",
    steps: [
      { order: 1, action: "Identify which sub-tasks belong to the MODEL vs to CODE. (Model: parse the messy text into fields. Code: compute tip and total; validate ranges.)", decision: "Should the model compute the tipped total, or just extract base amount + tip percentage and let code do the arithmetic? Justify from the reliability angle." },
      { order: 2, action: "Design the pipeline: model extracts {base, tip_pct, people, description} → code computes total = base * (1 + tip_pct) and validates (people > 0, base > 0) → assemble the record.", expected: "The exact number is produced by code, so it's always right; the model only handles the natural-language parsing it's good at." },
      { order: 3, action: "Add a verification/guard: what happens if extraction is missing a field or gives an implausible value?", verify: "The workflow never trusts the model for arithmetic; bad extractions are caught by code and handled (re-ask, default, or flag) rather than silently producing a wrong total." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Model and deterministic responsibilities are explicitly separated.",
      "All exact computation happens in code, not in the model's head.",
      "There's a validation step that catches missing/implausible extractions.",
      "You can explain why this is more reliable than a single 'compute the total' prompt.",
    ],
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Decompose + verify a judgement task (less guidance)",
    intro: "Task: decide whether a support message is a 'billing' issue, and if so extract the disputed amount — reliably.",
    steps: [
      { order: 1, action: "Design a decomposed workflow (classify → conditionally extract → validate the extracted amount is a plausible currency value) and specify what each step outputs.", decision: "Where does a SEPARATE validation belong, and what does it check that the model shouldn't be trusted to self-certify?" },
      { order: 2, action: "Decide the failure behaviour: ambiguous classification, or an extracted 'amount' that isn't a valid number.", verify: "Generation and validation are separate steps; the workflow degrades safely (flags/handles) instead of emitting an unchecked answer." },
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Patterns cost tokens and latency, so the mastery skill is choosing the *minimal* effective one — and knowing when to leave the model entirely.",
  },
  {
    type: "quiz",
    question: "A team applies chain-of-thought 'think step by step' to EVERY call, including simple classification, and costs/latency have doubled with no quality gain on the simple tasks. What's the lesson?",
    choices: [
      "Chain-of-thought is always bad",
      "Reasoning patterns have a cost and only help where the task actually needs multi-step reasoning; apply the minimal pattern per task, not a blanket one",
      "They should also raise the temperature",
      "Simple tasks need even more reasoning",
    ],
    answerIndex: 1,
    explanation: "Step-by-step reasoning adds tokens and latency and helps genuinely multi-step problems — but it's wasted on simple classification/extraction, where it buys nothing. Match the pattern (and its cost) to the task; don't apply reasoning scaffolding blanket-style.",
  },
  {
    type: "quiz",
    question: "An engineer wants a reliable 'is this contract clause compliant with our policy?' feature. Which design is soundest?",
    choices: [
      "One prompt: 'Is this compliant? Think hard.'",
      "Model extracts/represents the relevant clause facts as structured data; explicit policy checks run in code/rules; the model may explain, but the compliance VERDICT comes from deterministic validation, with human review for edge cases",
      "Ask the model to critique itself three times",
      "Expose the model's full chain-of-thought as the compliance record",
    ],
    answerIndex: 1,
    explanation: "Compliance is a guarantee, not a vibe — so the verdict must come from explicit, deterministic checks, not a self-graded model opinion. Use the model to parse/represent the clause (its strength) and encode the policy as validation logic, escalating uncertain cases to humans. Raw chain-of-thought isn't an audit trail.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — redesign an unreliable LLM workflow.** No step-by-step; move exactness and guarantees out of the model.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Make an unreliable analytics assistant reliable",
    intro: "Scenario: an assistant answers questions like 'How many orders over £500 shipped late last quarter, and what's the total refund exposure?' from a company database. Today it's one big prompt that includes some data and 'reasons' to an answer — and the numbers are often wrong.",
    steps: [
      { order: 1, action: "Redesign so deterministic computation and fact-lookup happen OUTSIDE the model. Specify which parts the model owns (understanding the question, choosing what to query, phrasing the answer) and which parts code/queries own (the actual counts, sums, date filters).", decision: "Why is asking the model to 'count over the data in the prompt' fundamentally unreliable, and what does moving the count to a query/code change about correctness?" },
      { order: 2, action: "Insert validation between generation and answer: how do you check the model translated the question into the right query/parameters before trusting the result, and where does a human confirm high-stakes figures (e.g. 'refund exposure')?", expected: "The numbers come from the database/code; the model's role is bounded to language + intent, with a verification step on its interpretation." },
      { order: 3, action: "State the residual risks that remain even after the redesign (e.g. the model mis-mapping the question to the wrong filter) and how you'd detect them.", verify: "Exact figures are produced by deterministic systems; the model's interpretation is validated; high-stakes outputs get human confirmation; residual risks are named with a detection plan." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "All exact counts/sums/facts are produced by queries/code, never by the model reasoning over inlined data.",
      "The model's role is bounded to intent/understanding/phrasing, with a validation step on its interpretation.",
      "High-stakes outputs route to human confirmation.",
      "Residual risks (e.g. wrong query mapping) are identified with a way to detect them.",
    ],
  },
];

export const content: TopicContent = {
  "unit-api-reasoning-patterns-01": learn,
  "unit-api-reasoning-patterns-02": practice,
  "unit-api-reasoning-patterns-03": review,
};
