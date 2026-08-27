import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Reasoning Models & Test-Time Compute" (topic-adv-reasoning-models).
// 3 units: 01 learn (reasoning vs generation, reasoning tokens billed as output + not exposed,
// effort knob, when they help/hurt) · 02 practice (compare on hard tasks — worth-reasoning router)
// · 03 review (cost/quality analysis — cost-per-correct). commonMistakes: Using reasoning models
// for trivial tasks. masteryCriteria: decide when a reasoning model is worth the extra cost.
// Deterministic keyless cost/router/cost-per-correct experiments. Model IDs hedged.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "A **reasoning model** is not 'a smarter model you always use' — it is a model that spends extra inference-time compute (reasoning tokens) to think before answering. On hard, multi-step problems that thinking buys real accuracy; on trivial tasks it buys latency and cost for nothing. This topic is about the engineering judgment the marketing skips: reasoning models change the cost/quality tradeoff, and your job is to decide when the trade is worth it — not to reach for the biggest model by default.",
  },
  {
    type: "prose",
    md: "**Mental model: a reasoning model spends test-time compute — think of it as buying accuracy with tokens and latency.** Instead of emitting an answer immediately, it generates internal reasoning tokens to plan, try approaches, and check itself, then produces the visible answer. Those reasoning tokens are billed as output and occupy the context window, but you don't see them (providers return a summary, not the raw chain-of-thought). So a reasoning call is slower and more expensive than an ordinary generation — justified only when the extra thinking materially improves the result. The knob (reasoning effort) tunes how much it thinks; it is a dial on a tradeoff, not a quality button.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Reasoning tokens", definition: "Internal tokens a reasoning model generates to 'think' before answering — planning, exploring approaches, self-checking. They are billed as output tokens and consume context-window space, but are not returned to you (you can request a summary, not the raw chain-of-thought). They are why a reasoning call costs and takes more than an ordinary generation." },
      { term: "Test-time (inference-time) compute", definition: "Spending more computation at inference to improve a single answer, rather than at training. Reasoning models are one form; others include sampling multiple answers and picking the best. The tradeoff is always the same: more compute (tokens/latency/cost) for potentially higher quality on hard problems." },
      { term: "Reasoning effort", definition: "A provider knob (typical values like low/medium/high, model-dependent) controlling how much the model thinks. Higher effort favors quality on complex tasks; lower favors speed and cost. Treat it as a tuning dial measured against your evals — not the primary way to fix a weak result. Specific values and defaults are provider- and model-specific; hedge them." },
      { term: "Chain-of-thought is not an artifact", definition: "The model's internal reasoning is not a reliable application output. Providers deliberately do not expose the raw chain-of-thought (only summaries), and its wording is not authoritative, verifiable, or safe to show as fact. Never build your app to depend on the visible reasoning; depend on the final answer plus your own validation (structured output, checks, retrieval)." },
      { term: "Overthinking / latency explosion", definition: "A failure mode where a reasoning model burns large amounts of reasoning tokens on a task that didn't need them — huge latency and cost, sometimes worse answers (talking itself out of a correct one). It also risks running out of the token budget during reasoning and returning an incomplete response. The cure is to match effort (or model) to task difficulty." },
      { term: "False confidence", definition: "Reasoning models can produce fluent, elaborate justifications for wrong answers — the reasoning looks rigorous but the conclusion is incorrect. More visible 'thinking' does not mean more correctness, so you still validate outputs (evaluation category) rather than trusting the reasoning narrative." },
    ],
  },
  {
    type: "prose",
    md: "**The cost reality: reasoning tokens are billed as output, so a reasoning call can cost many times an ordinary one even for the same visible answer:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Reasoning tokens are billed as output tokens (deterministic, keyless; prices representative)",
    code: `def response_cost(input_tok, reasoning_tok, output_tok, in_price, out_price):
    # Reasoning tokens are billed as OUTPUT tokens (and occupy the context window).
    billed_output = reasoning_tok + output_tok
    return round((input_tok * in_price + billed_output * out_price) / 1000, 5)

# prices per 1K tokens (representative, not a quote)
print(response_cost(500, 0, 100, 0.005, 0.015))      # ordinary generation
print(response_cost(500, 2000, 100, 0.005, 0.015))   # reasoning: 2000 hidden thinking tokens`,
    output: `0.004
0.034`,
  },
  {
    type: "prose",
    md: "Same input, same 100-token visible answer — but the reasoning call generated 2000 hidden thinking tokens, billed as output, making it about 8.5× more expensive. And it is slower (all those tokens are generated sequentially). This is the trade in numbers: you pay real money and latency for the thinking. On a hard problem where that thinking lifts accuracy from 60% to 95%, it is a bargain; on a classification the cheap model already nails, it is pure waste. The next unit turns that into a decision rule; the mistake to avoid is named right here.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Using reasoning models for trivial tasks",
    md: "The commonMistake this topic exists to prevent: reaching for a reasoning model (or high reasoning effort) by default, including on tasks that don't benefit. The costs are concrete:\n\n- **Latency** — reasoning generates many sequential tokens before the answer; a classification that took 200ms now takes seconds. In an interactive or high-volume path, that is a product problem.\n- **Cost** — reasoning tokens are billed as output, so trivial requests cost multiples of what a fast model would charge.\n- **Overthinking** — on easy tasks the model can talk itself into a worse answer, or exhaust the token budget on reasoning and return an incomplete response (you pay for input + reasoning with no visible answer).\n\nThe rule: match the tool to the task. Use a fast, cheap model (or low/no reasoning effort) for classification, extraction, retrieval, and simple generation; reserve reasoning models (and higher effort) for genuinely hard, multi-step problems where evals show the extra thinking pays. Effort is a dial you tune against evidence, not a quality guarantee you leave on max."
  },
  {
    type: "quiz",
    question: "A team routes ALL requests — including simple intent classification — through a high-effort reasoning model 'to maximize quality.' Latency and cost spike, and classification accuracy is no better than a fast model. What's the correct diagnosis and fix?",
    choices: [
      "The reasoning model is broken — file a bug with the provider",
      "They're using a reasoning model for trivial tasks: classification doesn't benefit from extra thinking, so they pay large latency and cost (reasoning tokens billed as output) for no quality gain, and risk overthinking. Fix by matching the tool to the task — route simple tasks to a fast/cheap model or low effort, and reserve reasoning (higher effort) for genuinely hard multi-step problems where evals show it helps",
      "Increase reasoning effort even further to force better classification",
      "The problem is the prompt — add more few-shot examples to the classifier",
    ],
    answerIndex: 1,
    explanation: "Simple classification gains nothing from inference-time reasoning, so routing it through a high-effort reasoning model adds latency and cost (reasoning tokens are billed as output) with no quality benefit, and can even cause overthinking. The fix is to match the model and effort to task difficulty: fast/cheap or low effort for easy tasks, reasoning for hard multi-step problems validated by evals. Raising effort makes it worse, and the issue isn't a provider bug or prompt wording — it's tool-task mismatch.",
  },
  {
    type: "takeaways",
    items: [
      "A reasoning model spends test-time compute (reasoning tokens) to think before answering — it buys accuracy on hard problems with tokens and latency, not a universal upgrade.",
      "Reasoning tokens are billed as output and occupy the context window, but aren't exposed (summaries only) — a reasoning call can cost many times an ordinary one for the same visible answer.",
      "Reasoning effort is a tuning dial on the cost/quality tradeoff, measured against evals — not the primary way to fix a weak result.",
      "Never treat the visible chain-of-thought as an application artifact: it's not exposed raw, not authoritative, and not a substitute for validating the final answer.",
      "Match the tool to the task: fast/cheap models (or low effort) for trivial tasks; reasoning models for genuinely hard multi-step problems — avoid overthinking, latency explosion, and false confidence.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'you measure the quality difference.' Before you can decide *when* a reasoning model is worth it, you need a way to route: which tasks plausibly benefit from extra thinking, and which don't? Here you build that judgment as a rule you can defend — and then confirm it against the actual quality difference on hard tasks.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Comparing reasoning vs fast models honestly",
    md: "To measure the quality difference:\n\n- **Use hard AND easy tasks** — a fair comparison includes tasks where reasoning should help (multi-step math, complex debugging, planning) and tasks where it shouldn't (classification, extraction). Reasoning that only wins on the hard set is exactly right.\n- **Measure quality on the same eval set** — from the evaluation category. Report accuracy for both models, per task type.\n- **Measure cost and latency too** — the whole point is the tradeoff; quality alone is half the picture.\n- **Watch for overthinking** — cases where the reasoning model does WORSE than the fast one (talked itself out of the answer) are important signal.\n\nThe output isn't 'reasoning is better' — it's a routing rule: for THIS task type, is the quality lift worth the cost/latency? That rule is what you refine in the review unit into a cost-per-correct decision."
  },
  {
    type: "prose",
    md: "**A routing rule encodes when reasoning plausibly pays — hard/multi-step yes, trivial no:**",
  },
  {
    type: "code",
    language: "python",
    caption: "When is reasoning plausibly worth it? A task-difficulty router (deterministic, keyless)",
    code: `def worth_reasoning(task):
    # Reasoning pays off on hard, multi-step or verification-heavy tasks -- NOT trivial ones.
    hard = task["steps"] >= 3 or task["needs_verification"]
    trivial = task["steps"] <= 1 and not task["needs_verification"]
    if trivial:
        return "no: use a fast model"
    if hard:
        return "yes: reasoning likely worth it"
    return "maybe: measure with an eval"

print(worth_reasoning({"steps": 1, "needs_verification": False}))   # classification
print(worth_reasoning({"steps": 5, "needs_verification": True}))    # multi-step + verify
print(worth_reasoning({"steps": 2, "needs_verification": False}))   # borderline`,
    output: `no: use a fast model
yes: reasoning likely worth it
maybe: measure with an eval`,
  },
  {
    type: "prose",
    md: "A one-step classification routes to a fast model; a five-step task needing verification routes to reasoning; a two-step task is 'maybe' — measure it. The router is a heuristic, not a verdict: the 'maybe' branch is the honest part, because task difficulty is a proxy and only your eval set knows the real answer. This turns 'always use the smart model' into a defensible policy that spends reasoning compute where it plausibly pays and cheap compute everywhere else — the routing discipline from the scaling/cost topic, applied to reasoning.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Compare reasoning vs fast models on hard tasks",
    intro: "Measure the quality difference where it should and shouldn't appear.",
    steps: [
      { order: 1, action: "Assemble a small eval set with both hard tasks (multi-step reasoning, complex debugging, planning) and easy tasks (classification, extraction). Define a clear correctness metric per task.", expected: "An eval set that can reveal WHERE reasoning helps, not just an average." },
      { order: 2, action: "Run a fast model and a reasoning model on the same set. Record accuracy, cost, and latency per task type. Note any case where the reasoning model does worse (overthinking).", decision: "On which task types does reasoning actually lift quality enough to matter? Where is it equal or worse?" },
      { order: 3, action: "Turn the results into a routing rule: which task types go to reasoning, which to a fast model, and where effort should be tuned. Confirm the rule against the measured quality difference.", verify: "You have measured the quality difference per task type and produced a defensible routing rule — reasoning where it demonstrably helps, fast models elsewhere — not a blanket 'use the smart model.'" },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a measured reasoning comparison",
    items: [
      "Eval set with both hard and easy tasks; a clear correctness metric per task.",
      "Fast vs reasoning model run on the same set; accuracy, cost, and latency recorded per task type.",
      "Overthinking cases (reasoning worse than fast) identified.",
      "A defensible routing rule produced, confirmed against the measured quality difference.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Compare on hard AND easy tasks: reasoning that only wins on the hard set is the correct outcome — a blanket win would be suspicious.",
      "Measure quality, cost, AND latency per task type on the same eval set — the tradeoff is the point, not quality alone.",
      "A task-difficulty router (hard/multi-step → reasoning, trivial → fast, borderline → measure) turns 'always smart' into a defensible policy.",
      "Watch for overthinking: cases where the reasoning model does worse are important signal, not noise.",
      "This applies the model-routing discipline from the scaling/cost topic specifically to reasoning vs fast models.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'you decide when they're worth it,' and the mastery bar is exactly that decision. The right metric isn't raw accuracy or raw cost — it is **cost per correct answer**, because a cheap model that's often wrong may need retries, and an expensive model that's usually right may be cheaper per *useful* result. This is the synthesis that makes the reasoning-model decision rigorous.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "The right metric: cost per correct answer",
    md: "Deciding 'is reasoning worth it?' on accuracy alone or cost alone both mislead:\n\n- **Accuracy alone** ignores that the reasoning model may cost 8× more — a 5-point accuracy gain may not be worth it.\n- **Cost alone** ignores that a cheap wrong answer often isn't free: you retry, you escalate to a human, or the error causes downstream damage.\n\n**Cost per correct answer** combines them: cost-per-call divided by accuracy approximates what you pay to get one right result (assuming you retry until correct). It naturally captures the tradeoff — a model is 'worth it' when its cost per correct answer is lower for the task, not when it's simply more accurate or simply cheaper.\n\nAdd the task's error cost (a wrong medical summary is far costlier than a wrong movie recommendation) and latency budget, and you have a real decision. The honest answer is often 'it depends on the task' — which is exactly the judgment this topic teaches."
  },
  {
    type: "prose",
    md: "**Cost per correct answer decides the tradeoff — sometimes the cheap model wins, sometimes not:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Cost per correct answer, not raw accuracy or raw cost (deterministic, keyless)",
    code: `def cost_per_correct(cost_per_call, accuracy):
    # Approx cost to get ONE correct answer (retry until correct).
    if accuracy <= 0:
        return float("inf")
    return round(cost_per_call / accuracy, 5)

simple = cost_per_correct(0.004, 0.60)      # cheap, less accurate
reasoning = cost_per_correct(0.034, 0.95)   # expensive, accurate
print("simple:", simple, "reasoning:", reasoning)
print("reasoning worth it:", reasoning < simple)`,
    output: `simple: 0.00667 reasoning: 0.03579
reasoning worth it: False`,
  },
  {
    type: "prose",
    md: "On this task the cheap model is 60% accurate at \\$0.004, costing \\$0.0067 per correct answer; the reasoning model is 95% accurate but at \\$0.034, costing \\$0.0358 per correct answer — over 5× more. So here reasoning is *not* worth it: retrying the cheap model is cheaper per correct result. But flip the inputs — if the cheap model were only 25% accurate (cost per correct \\$0.016) — reasoning would win. That is the whole lesson: the decision is task-specific and turns on cost per correct answer plus the cost of being wrong, not on which model is 'smarter.' Raw accuracy would have chosen reasoning; the right metric chose the cheap model.",
  },
  {
    type: "quiz",
    question: "For a customer-facing legal-document summarizer, a fast model is 70% accurate at low cost and a reasoning model is 96% accurate at 6× the cost. Cost per correct answer slightly favors the fast model. Should you ship the fast model?",
    choices: [
      "Yes — cost per correct answer is the only thing that matters",
      "Not necessarily: cost per correct answer is one input, but the COST OF BEING WRONG matters here — a wrong legal summary can cause real harm, so the 26-point accuracy gain and lower error rate likely justify the extra cost despite a slightly worse cost-per-correct. High-stakes tasks weight accuracy and error cost more heavily; low-stakes tasks weight cost more. The decision is task-specific, not a single formula",
      "No — always use the most accurate model regardless of cost",
      "Yes — legal summaries are low-stakes so cost dominates",
    ],
    answerIndex: 1,
    explanation: "Cost per correct answer captures the retry economics but not the downstream cost of an error, which for legal summaries is high. When being wrong is expensive or harmful, the accuracy gain and reduced error rate of the reasoning model usually justify the extra cost even if cost-per-correct slightly favors the cheap model. The decision weights accuracy, error cost, and cost together by task stakes — it is not a single universal formula, nor 'always cheapest' or 'always most accurate.'",
  },
  {
    type: "prose",
    md: "**Mastery challenge — decide when a reasoning model is worth it for a real task.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build a reasoning-model cost/quality decision",
    intro: "Turn measurements into a defensible per-task decision. Not completion-gated — this is the mastery criterion made concrete.",
    steps: [
      { order: 1, action: "For a real task, measure both a fast and a reasoning model: accuracy, cost per call, latency. Compute cost per correct answer for each.", expected: "Accuracy, cost, latency, and cost-per-correct for both models on the same task." },
      { order: 2, action: "Weigh the task's stakes: the cost of a wrong answer (harm, retry, human escalation) and the latency budget. Combine with cost-per-correct into a recommendation.", decision: "Is this task high-stakes (weight accuracy/error cost) or low-stakes/high-volume (weight cost/latency)? Does the answer change with reasoning effort?" },
      { order: 3, action: "State the decision and its boundary: 'use reasoning when X, use fast when Y,' including the effort level and any routing between them. Note what would change the decision.", verify: "You've decided when the reasoning model is worth it for the task — grounded in cost per correct answer, error cost, and latency, not in which model is 'smarter' — with a clear boundary and the factors that would flip it." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a defensible reasoning decision",
    items: [
      "Fast vs reasoning measured on the real task: accuracy, cost/call, latency, and cost per correct answer.",
      "Task stakes weighed: cost of a wrong answer + latency budget combined with cost-per-correct.",
      "A clear recommendation with a boundary (use reasoning when X, fast when Y, at which effort).",
      "The factors that would flip the decision are named — it's task-specific, not a universal rule.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Decide on cost per correct answer, not raw accuracy or raw cost: cost-per-call / accuracy approximates what you pay for one useful result.",
      "Raw accuracy can pick the wrong model — here the 95%-accurate reasoning model costs 5× more per correct answer than the 60% cheap model.",
      "Add the cost of being wrong and the latency budget: high-stakes tasks justify reasoning even when cost-per-correct is close; low-stakes/high-volume favor fast models.",
      "The honest answer is task-specific — 'it depends' backed by measurements and stakes, not 'always use the smart model.'",
      "This synthesizes evaluation (measure quality) and scaling/cost (routing) into the reasoning-model decision.",
    ],
  },
];

export const content: TopicContent = {
  "unit-adv-reasoning-models-01": learn,
  "unit-adv-reasoning-models-02": practice,
  "unit-adv-reasoning-models-03": review,
};
