import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Inference Parameters" (topic-llm-inference-params).
// 3 units: 01 learn · 02 practice (controlled sweep, local softmax experiment)
// · 03 review (map params→use-cases + mastery experiment design).
// Verified against Microsoft Learn "Azure OpenAI reasoning models" (updated
// 2026-08-20): reasoning (o-series / GPT-5-series) models do NOT support
// temperature, top_p, presence_penalty, frequency_penalty, or max_tokens; they
// use reasoning_effort and require max_completion_tokens. Non-reasoning defaults
// temperature=1.0, top_p=1.0. Parameter names/ranges are OpenAI-family specific.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Inference parameters are the dials that decide whether the *same* model gives you a reproducible, buttoned-up answer or a varied, exploratory one. Used well, they're how you make a factual pipeline deterministic and a brainstorming feature diverse — from one model. Used badly (high temperature on a data-extraction task) they inject the exact unreliability the previous topics warned you about.",
  },
  {
    type: "prose",
    md: "**Mental model: at each step the model produces a probability distribution over next tokens; parameters reshape or truncate that distribution before one token is sampled.** They do **not** make the model 'smarter' or 'more creative' in any human sense — they change *how the next token is picked* from the model's own probabilities. Hold that picture and every parameter becomes concrete instead of mystical.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "UNIVERSAL CONCEPT vs PROVIDER/MODEL-SPECIFIC IMPLEMENTATION — read this first",
    md: "**Sampling** (choosing a token from a probability distribution) is a *universal concept*. The **parameters** that control it — their names, ranges, defaults, and even whether they exist — are **provider- and model-specific**. Examples: OpenAI's `temperature` ranges 0–2 (default 1.0); some other providers use 0–1. Most importantly, **reasoning models (OpenAI's o-series and GPT-5 series) do NOT support `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, or `max_tokens` at all** — they use a `reasoning_effort` control instead and require `max_completion_tokens`. So never assume a parameter is universal: **check the specific model's docs.**",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "temperature", definition: "Scales the distribution's sharpness before sampling. Low → the top token dominates (near-deterministic); high → flatter, more varied/risky tokens. OpenAI range 0–2, default 1.0." },
      { term: "top_p (nucleus sampling)", definition: "Sample only from the smallest set of tokens whose probabilities sum to p. Low p → only the most likely tokens; p=1 → consider all. Change temperature OR top_p, not both." },
      { term: "max_tokens / max_completion_tokens", definition: "Caps the OUTPUT length. Newer OpenAI models use max_completion_tokens; reasoning models require it (max_tokens unsupported). It does not shrink your input." },
      { term: "stop sequences", definition: "Strings that, when generated, halt output immediately (the stop text isn't included). Useful to end at a delimiter." },
      { term: "seed", definition: "Requests reproducible sampling; with the same seed + inputs you get *mostly* identical output. Provider-specific; pair with system_fingerprint to detect backend changes. Not a hard guarantee." },
      { term: "frequency / presence penalty", definition: "Discourage repetition: frequency scales with how often a token already appeared; presence is a flat penalty for any prior appearance. OpenAI range −2 to 2. Not offered by all providers." },
      { term: "reasoning_effort", definition: "Reasoning-model control (e.g. low/medium/high) for how much the model 'thinks' before answering — a different knob from sampling, on models that don't expose temperature/top_p." },
    ],
  },
  {
    type: "prose",
    md: "**Temperature is not a 'creativity slider'.** Here's what it actually does: it divides the model's logits by the temperature before the softmax. Dividing by a **small** temperature (e.g. 0.2) *sharpens* the distribution — the highest-probability token gets almost all the mass, so generation is near-deterministic. Dividing by a **large** temperature (e.g. 1.5) *flattens* it — lower-probability tokens get a real chance, so output varies and can wander. At `temperature = 0` you effectively always take the top token (greedy). You can watch this happen with pure math, no API needed:",
  },
  {
    type: "code",
    language: "python",
    caption: "See temperature reshape a distribution (local, no API)",
    code: `import numpy as np

logits = np.array([2.0, 1.0, 0.0, -1.0])   # the model's raw scores for 4 tokens

def softmax_temp(logits, t):
    z = logits / t
    z = z - z.max()            # numerical stability
    e = np.exp(z)
    return e / e.sum()

for t in [0.5, 1.0, 2.0]:
    print(t, np.round(softmax_temp(logits, t), 3))`,
    output: `0.5 [0.865 0.117 0.016 0.002]
1.0 [0.644 0.237 0.087 0.032]
2.0 [0.455 0.276 0.167 0.102]`,
  },
  {
    type: "prose",
    md: "Read the output: at `t=0.5` the top token holds **86.5%** of the mass — the model will almost always pick it (consistent, 'safe'). At `t=2.0` the top token is down to **45.5%** and the tail tokens are now plausible — output becomes varied and riskier. Nothing about the model changed; only *how the next token is drawn from its probabilities*. That is the entire mechanism behind 'temperature makes it more creative'.",
  },
  {
    type: "prose",
    md: "**top_p** does the same job by a different route: instead of rescaling, it **truncates** — keep only the smallest group of top tokens whose probabilities sum to `p`, and sample within that. `top_p=0.1` restricts to the very top tokens (focused); `top_p=1.0` allows the whole distribution. Because temperature and top_p both control the same thing (how much of the tail you allow), the standard advice is to **adjust one, leave the other at default** — tuning both makes effects hard to reason about.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "temperature=0 is 'as deterministic as it gets' — not a bit-for-bit guarantee",
    md: "Engineers set `temperature=0` and expect identical output every time. It gets you *greedy* decoding (always the top token), which is *as* reproducible as the API offers — but providers still don't guarantee byte-identical results across backend/model updates, floating-point nondeterminism, or load-balanced hardware. For stronger reproducibility, providers offer a `seed` plus a `system_fingerprint` you can watch for changes — and even that is 'best effort', not a contract. If your system needs *guaranteed* determinism, that logic belongs in **code**, not in a sampled model.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Setting temperature on a reasoning model does nothing useful — it's unsupported",
    md: "A very current trap: you switch a feature to a reasoning model (o-series / GPT-5 series) and keep passing `temperature=0.2` and `max_tokens=500`. Per the provider docs, reasoning models **don't support** `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, or `max_tokens` — you control them with `reasoning_effort` and must use `max_completion_tokens`. Depending on the endpoint you'll get an error or the parameter is ignored, and `max_tokens` in particular can cause failures. Lesson from the universal-vs-specific rule: when you change models, re-check which parameters that model actually accepts.",
  },
  {
    type: "prose",
    md: "**The others, briefly.** **max_tokens / max_completion_tokens** caps output — set it to bound cost/latency and to avoid runaway generations (but leave room, or you'll truncate mid-answer as `finish_reason: length`). **stop** sequences end generation at a delimiter you choose. **frequency/presence penalties** (OpenAI −2…2) reduce repetitive text — handy for long creative output, usually left at 0 for factual tasks. **seed** aids reproducibility as above. Match the dial to the job: factual/extraction → low temperature (or 0), tight max tokens, maybe a seed; brainstorming → higher temperature, penalties to reduce repetition, higher max tokens.",
  },
  {
    type: "quiz",
    question: "A data-extraction pipeline must return the same structured result for the same input every run. A teammate set temperature=1.2 'so it's flexible'. What's wrong, and what's the fix?",
    choices: [
      "Nothing; temperature doesn't affect extraction",
      "High temperature flattens the distribution, injecting variability into a task that needs consistency — set temperature to 0 (greedy), cap output, and consider a seed; determinism-critical logic should live in code",
      "Raise top_p to 1 as well",
      "Switch to a reasoning model and keep temperature=1.2",
    ],
    answerIndex: 1,
    explanation: "Extraction wants reproducibility, so you want the distribution sharp: temperature 0 (greedy) is the right call, optionally with a seed. temperature 1.2 does the opposite — it deliberately allows tail tokens, causing run-to-run variation. And note a reasoning model wouldn't even accept temperature; if strict determinism is required, enforce it in code around the model.",
  },
  {
    type: "quiz",
    question: "Which statement about temperature and top_p is correct?",
    choices: [
      "They are unrelated; always tune both aggressively",
      "Both control how much of the low-probability tail can be sampled (temperature by rescaling, top_p by truncating), so the guidance is to adjust ONE and leave the other at its default",
      "top_p makes the model smarter; temperature makes it faster",
      "temperature only works if top_p is 0",
    ],
    answerIndex: 1,
    explanation: "Temperature rescales the distribution's sharpness; top_p truncates it to a cumulative-probability nucleus. Both govern the same thing — tail access — so tuning both together makes behaviour hard to predict. Pick one knob per experiment.",
  },
  {
    type: "takeaways",
    items: [
      "Parameters reshape/truncate the next-token distribution before sampling — they don't make the model smarter or 'creative' in a human sense.",
      "Temperature rescales sharpness (low→near-deterministic top token, high→flatter/varied); top_p truncates to a cumulative-probability nucleus. Adjust one, not both.",
      "temperature=0 is greedy and maximally reproducible but NOT a bit-identical guarantee; use seed/system_fingerprint for best-effort determinism, and code for hard guarantees.",
      "Sampling is universal; parameter names/ranges/support are provider- and model-specific — reasoning models don't support temperature/top_p/penalties/max_tokens (use reasoning_effort + max_completion_tokens).",
      "Match dials to task: factual → low temp + tight max tokens (+seed); creative → higher temp + penalties + more tokens.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Real understanding comes from *controlled* experiments: change ONE variable, observe, and explain both what changed and what didn't. You can do the core experiment with pure math locally (no key); an optional API version makes it concrete.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Isolate temperature's effect (guided)",
    intro: "Use the local softmax experiment from the lesson as your controlled testbed.",
    steps: [
      { order: 1, action: "Run the softmax_temp block across temperatures [0.2, 0.5, 1.0, 1.5, 2.0] on the same logits. Record the top token's probability at each.", expected: "Top-token probability falls monotonically as temperature rises (sharp → flat). At very low temperature it approaches 1.0 (greedy)." },
      { order: 2, action: "State precisely what CHANGED (the shape of the distribution / likelihood of tail tokens) and what did NOT change (the model's underlying logits — their ORDER is preserved; temperature never reranks the top token, it only changes how often alternatives win).", decision: "At which temperature does a lower-ranked token first get a 'meaningful' (say >15%) chance? What does that imply for when outputs start to visibly vary?" },
      { order: 3, action: "OPTIONAL (needs a chat API key): send one fixed prompt at temperature 0 five times, then at temperature 1.2 five times; compare consistency. Mark this step optional.", verify: "You can explain temperature's effect from the numbers alone, and (if you ran the API version) the observed consistency matched the prediction: near-identical at 0, varied at 1.2." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You measured top-token probability across temperatures and saw it fall as temperature rises.",
      "You can articulate what temperature changes (tail access / distribution shape) vs. what it doesn't (the logits themselves; the top token's rank).",
      "You understand why temperature 0 ≈ greedy ≈ most reproducible.",
      "If you ran the optional API step, observed variability matched the prediction.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Map settings to tasks by reasoning, not superstition, then design a controlled experiment to pick settings for a real task.",
  },
  {
    type: "quiz",
    question: "For a brainstorming feature that should suggest several DIFFERENT product taglines each time, which settings are most appropriate (on a non-reasoning model)?",
    choices: [
      "temperature 0, tight max_tokens",
      "A higher temperature (e.g. ~0.9–1.2) for variety, enough max_tokens for several suggestions, and perhaps a frequency penalty to reduce repetition",
      "temperature 2.0 with top_p 0.1 simultaneously",
      "A reasoning model with temperature 1.5",
    ],
    answerIndex: 1,
    explanation: "Brainstorming wants diversity, so allow more of the distribution's tail (higher temperature), give room for multiple outputs (max_tokens), and optionally penalise repetition. Cranking temperature to the max AND clamping top_p to 0.1 fights itself (tune one), and a reasoning model wouldn't accept temperature at all.",
  },
  {
    type: "quiz",
    question: "An engineer reports: 'I set temperature=0 but I still get slightly different answers across days.' What's the accurate explanation?",
    choices: [
      "temperature=0 doesn't work; it's a no-op",
      "temperature=0 gives greedy decoding — maximally reproducible but not a bit-for-bit guarantee across backend/model updates and hardware; use seed + system_fingerprint for best-effort, and code for hard determinism",
      "They must also set top_p=0",
      "The model is retraining itself each day",
    ],
    answerIndex: 1,
    explanation: "Greedy decoding is as deterministic as sampling gets, but providers don't contractually guarantee identical bytes across model/backend changes or floating-point nondeterminism. seed + system_fingerprint improve reproducibility and let you detect backend shifts; if you truly need guaranteed determinism, put that logic in code, not the model.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design a parameter experiment.** No step-by-step; design a small, controlled study that yields defensible settings.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Determine generation settings for a real task",
    intro: "Scenario: a feature turns bullet-point meeting notes into a concise, professional summary. It must be reliable and consistent (similar notes → similar summaries), readable, and not repetitive. You must recommend concrete settings with evidence.",
    steps: [
      { order: 1, action: "Define what 'good' means as MEASURABLE criteria (e.g. consistency across runs, no repetition, length within a range, faithfulness to the notes) before touching parameters.", decision: "Which single parameter is most likely to matter here, and which should you hold fixed to keep the experiment controlled?" },
      { order: 2, action: "Design the controlled sweep: fix the prompt and inputs, vary ONE parameter across a small set of values, run each setting multiple times, and record your criteria for each.", expected: "A table of (parameter value → measured consistency/repetition/length) that isolates the parameter's effect." },
      { order: 3, action: "Recommend settings with justification, and state what you'd re-test if you later switched to a reasoning model (which wouldn't accept temperature).", verify: "Your recommendation is backed by measured results from a controlled sweep, not vibes, and you flag the provider/model-specific caveat." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Success is defined as measurable criteria BEFORE tuning (consistency, repetition, length, faithfulness).",
      "The experiment varies one parameter at a time with repeats, holding prompt/input fixed.",
      "The recommended settings are justified by the recorded measurements.",
      "You note that a reasoning model wouldn't accept temperature/top_p and would need re-evaluation (reasoning_effort instead).",
    ],
  },
];

export const content: TopicContent = {
  "unit-llm-inference-params-01": learn,
  "unit-llm-inference-params-02": practice,
  "unit-llm-inference-params-03": review,
};
