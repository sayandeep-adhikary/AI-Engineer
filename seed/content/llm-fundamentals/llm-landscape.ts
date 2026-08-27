import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Model Landscape & Selection" (topic-llm-landscape).
// 3 units: 01 learn · 02 practice (build a comparison for YOUR use case) · 03
// review (scenario selection + mastery). Teaches a DECISION FRAMEWORK, not a
// leaderboard. Model names appear only as representative examples with caveats.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "The question that matters is **not** 'which model is #1 this month?' — that changes constantly and is rarely the right question for *your* task. The durable skill is: given a requirement and its constraints, **reason to an appropriate model and justify the tradeoffs**. This unit gives you the selection framework that outlives any leaderboard.",
  },
  {
    type: "prose",
    md: "**Mental model: model selection is a constraint-satisfaction problem, not a quality contest.** You rarely need 'the best' model — you need the *cheapest/fastest* model that clears your quality bar for *this* task under *your* constraints (latency, budget, privacy, volume). 'Best overall' and 'right for this job' are different questions; senior engineers optimise the second. Start from the requirement, derive the constraints, then let those eliminate options.",
  },
  {
    type: "prose",
    md: "**The two big structural choices**, before any specific model:\n\n- **Proprietary/hosted API** (e.g. OpenAI, Anthropic, Google) — top capability, zero infra, pay per token, but your data leaves your boundary (subject to the vendor's terms) and you're tied to their availability and pricing.\n- **Open-weights, self-hosted** (e.g. Llama, Mistral, Qwen families) — you run it, so data stays in your environment and cost is your hardware, but you own the ops, scaling, and (usually) lower ceiling than the frontier. *Model names change fast — anchor on the tradeoff, not the brand.*",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Capability / task fit", definition: "Can it clear YOUR task's quality bar? Measured on your data, not a generic benchmark. Bigger ≠ needed if a smaller model passes." },
      { term: "Latency", definition: "Time to response (and time-to-first-token for streaming). Critical for interactive/real-time; less so for batch." },
      { term: "Cost per token", definition: "Input and output priced separately; multiply by your volume. A 5× unit-price gap is enormous at scale, trivial at ten calls/day." },
      { term: "Context window", definition: "Max tokens it can consider. Long-document or long-conversation tasks need large windows; short tasks don't pay for them." },
      { term: "Modality", definition: "Text-only vs vision/audio/multimodal. A document-image or speech task requires a model that accepts that input." },
      { term: "Structured output / tool support", definition: "Native JSON/schema and function-calling support. Essential if the model must feed downstream code reliably." },
      { term: "Reasoning capability", definition: "Some models 'think' before answering (better on hard multi-step tasks) at higher latency/cost. Overkill for simple classification." },
      { term: "Throughput / rate limits", definition: "Sustained tokens/requests per minute you can get. High-volume pipelines can be limited here regardless of raw speed." },
      { term: "Privacy / data handling", definition: "Where data goes, retention, region/residency, compliance. Often the HARD constraint that eliminates whole categories." },
      { term: "Deployment / availability", definition: "Regions, uptime, enterprise options (e.g. Azure OpenAI), and whether you can self-host. Governs reliability and residency." },
      { term: "Ecosystem", definition: "SDKs, framework support, docs, community. Reduces integration cost and risk; a strong ecosystem is a real advantage." },
    ],
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Benchmarks and leaderboards measure a task that probably isn't yours",
    md: "A model topping a public leaderboard tells you little about *your* invoice-extraction or support-classification task. Pitfalls: **benchmark contamination** (test data leaked into training inflates scores), **metric mismatch** (the benchmark rewards something you don't care about), and **staleness** (rankings shift weekly). Treat leaderboards as a *rough shortlist*, then run **your own small eval on your own data** — that number is the only one that decides. (You'll build real evals later; for now, know that 'it's #1' is not a selection criterion.)",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Defaulting to the biggest/most expensive model is a common, costly mistake",
    md: "The instinct 'use the most powerful model to be safe' quietly wrecks cost and latency at scale. Many real tasks — classification, extraction, routing, short rewrites — are solved perfectly by a small, cheap, fast model. A frontier model there is 5–20× the price and slower for *no quality gain your users notice*. The discipline: start with the **smallest model that clears the bar**, and only move up where your eval shows it's actually needed. 'Bigger' is a cost you must justify, not a default.",
  },
  {
    type: "prose",
    md: "**How to actually choose (the loop):** (1) write the requirement and its hard constraints (privacy? latency budget? volume/cost ceiling? modality? context size?); (2) let *hard* constraints eliminate options first — e.g. 'data can't leave our tenant' removes public APIs; 'must read scanned PDFs' removes text-only models; (3) shortlist 2–3 candidates that survive; (4) run a small eval on *your* data to check the quality bar; (5) pick the cheapest/fastest survivor that passes, and note what would make you revisit. Requirements first, models last.",
  },
  {
    type: "quiz",
    question: "You must classify 5 million support tickets/day into 8 categories, cheaply, with sub-second latency, and accuracy 'good enough' (not perfect). Which selection reasoning is soundest?",
    choices: [
      "Use the current top-of-leaderboard frontier model for best accuracy",
      "Prefer a small, fast, cheap model that clears the accuracy bar on your labelled sample; at 5M/day, unit cost and latency dominate, and classification rarely needs a frontier model",
      "Use a reasoning model so it thinks carefully about each ticket",
      "Self-host the largest open model available",
    ],
    answerIndex: 1,
    explanation: "High volume + latency-sensitive + 'good enough' accuracy points to the smallest model that passes your eval. A frontier or reasoning model multiplies cost and latency for accuracy you don't need on a simple 8-way classification — the worst place to over-provision. Validate 'good enough' on your own labelled data.",
  },
  {
    type: "quiz",
    question: "A healthcare app must process patient records that legally cannot leave the organisation's own infrastructure. How does this constraint drive selection?",
    choices: [
      "Pick whichever hosted API scores highest and sign a contract",
      "The data-residency constraint is a HARD filter: it eliminates send-your-data-out APIs, pushing you toward self-hosted open-weights models (or a compliant in-tenant deployment) — capability is chosen only among options that satisfy it",
      "Privacy doesn't affect model choice, only storage",
      "Use the smallest model to reduce exposure",
    ],
    answerIndex: 1,
    explanation: "Hard constraints eliminate options before capability is even considered. 'Data cannot leave our infra' rules out standard hosted APIs, so you choose among self-hosted (or contractually in-boundary) options and then optimise capability/cost within that set. Applying the constraint first prevents choosing a model you legally can't use.",
  },
  {
    type: "takeaways",
    items: [
      "Ask 'right for this task under these constraints,' not 'which model is #1' — selection is constraint satisfaction.",
      "Dimensions: capability/task-fit, latency, cost, context, modality, structured-output/tools, reasoning, throughput, privacy, deployment, ecosystem.",
      "Let HARD constraints (privacy/residency, modality, latency, cost ceiling) eliminate options first, then optimise within survivors.",
      "Leaderboards are a shortlist, not a decision — validate on YOUR data with a small eval.",
      "Default to the smallest model that clears the bar; 'bigger' is a cost to justify, not a default.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "A comparison table is only useful if it compares the dimensions *your* task cares about. Build one for a concrete use case — the skill is choosing the right axes and filling them from real docs, not copying a generic ranking.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Build a decision-focused comparison (guided)",
    intro: "Pick ONE concrete use case you care about (e.g. 'summarise 20-page PDFs for internal users').",
    steps: [
      { order: 1, action: "Write the requirement and list its HARD constraints (privacy, latency budget, monthly volume/cost ceiling, required context size, modality).", expected: "A short spec where each constraint is something that could *disqualify* a model." },
      { order: 2, action: "Choose the 4–6 comparison axes that actually matter for THIS task (not all eleven), and shortlist 2–3 candidate models. Fill the axes from current official model docs/pricing — noting the date, since these change.", decision: "Which axes are decisive for your task and which are irrelevant? (For internal batch summarisation, is latency really a top axis? Is context size?)" },
      { order: 3, action: "Apply hard constraints first to eliminate, then rank survivors by the axes that matter. Write a one-sentence justified pick.", verify: "Your table supports a defensible choice: someone reading it understands WHY the winner won and what would change the decision." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "The comparison uses axes chosen for the specific task, not a generic list.",
      "Hard constraints are applied first and visibly eliminate at least one option.",
      "Values are sourced from current docs with a date noted (not from memory/leaderboard).",
      "The final pick is justified in one sentence, with a note on what would change it.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Selection is judgement under competing constraints. Each scenario below has a *defensible* answer that depends on requirements and tradeoffs — there's no universal winner.",
  },
  {
    type: "quiz",
    question: "A legal-tech feature answers complex, multi-step questions over contracts where correctness matters far more than speed or cost, and users wait a few seconds happily. Which model class fits best?",
    choices: [
      "The cheapest small model, to save money",
      "A high-capability (often reasoning-capable) model — the task is hard multi-step reasoning where quality dominates and latency/cost tolerance is high",
      "A vision model",
      "Whatever tops the leaderboard regardless of the task",
    ],
    answerIndex: 1,
    explanation: "When correctness dominates and latency/cost tolerance is high, spend capability where it pays off — a strong (possibly reasoning) model. This is the mirror image of the high-volume classification case: match the model's strength and cost profile to what the task actually values.",
  },
  {
    type: "quiz",
    question: "Two models both pass your quality eval for a high-volume extraction task, but Model A costs 5× more per token and is 200ms slower. What additional information do you MOST need before choosing?",
    choices: [
      "Nothing — always pick the cheaper, faster one",
      "Whether the quality difference (if any) matters for THIS task at YOUR volume, plus the actual monthly volume and any latency SLA — so you can weigh the 5×/200ms against real impact",
      "Which one is more popular",
      "The models' parameter counts",
    ],
    answerIndex: 1,
    explanation: "If both clear the bar, the cheaper/faster one is the default — but 'both pass' may hide a quality gap that matters at scale, and the cost/latency deltas only mean something against real volume and any SLA. You need the task's true quality sensitivity and your volume/latency requirements to decide, not popularity or size.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — choose under competing requirements.** No step-by-step; produce a justified decision with tradeoffs made explicit.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Select models for a product with mixed workloads",
    intro: "Scenario: a document-processing product has THREE features — (1) real-time autocomplete/suggestions in an editor (must feel instant), (2) nightly batch extraction of fields from millions of scanned invoices (images), (3) an occasional 'deep analysis' that reasons across a whole 100-page document for a few high-value enterprise users. Budget is finite; some enterprise customers require data to stay in a specific region.",
    steps: [
      { order: 1, action: "For each feature, derive the dominant constraints and pick a model CLASS (not a brand) that fits — a small/fast model, a multimodal model, a large reasoning model — justifying each against its constraints.", decision: "Should all three features use the SAME model? Why is using one model for everything usually the wrong call here?" },
      { order: 2, action: "Address the residency constraint: which feature(s) does it affect, and how does it change your choice (e.g. an in-region/enterprise deployment or a self-hosted option for those customers)?", expected: "The constraint reshapes only the affected workloads, not necessarily all three." },
      { order: 3, action: "State the biggest cost or latency risk in your design and one lever to control it (e.g. route only genuinely-hard cases to the expensive reasoning model).", verify: "Your answer assigns a fit-for-purpose model class to each workload, handles residency where it applies, and names a concrete cost/latency control — with tradeoffs explicit." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Each of the three workloads gets a model CLASS justified by its dominant constraints (latency / modality / reasoning).",
      "You argue against a single-model-for-everything approach.",
      "The data-residency constraint is applied to exactly the workloads it affects and reshapes those choices.",
      "A concrete cost/latency control (e.g. routing hard cases only) is identified, with tradeoffs stated.",
    ],
  },
];

export const content: TopicContent = {
  "unit-llm-landscape-01": learn,
  "unit-llm-landscape-02": practice,
  "unit-llm-landscape-03": review,
};
