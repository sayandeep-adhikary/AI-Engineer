import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "When to Fine-Tune (vs Prompt/RAG)" (topic-ft-when).
// 2 units: 01 learn (decision framework: prompt -> RAG -> fine-tune) · 02 review
// (classify cases correctly, justified). commonMistakes: Fine-tuning to add knowledge (usually RAG).
// masteryCriteria: reject fine-tuning when RAG/prompting suffices, accept when it doesn't.
// Deterministic keyless intervention classifier. Model outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You've spent ten categories learning cheaper, faster ways to change model behavior — prompting, structured outputs, tools, RAG, orchestration, local models. Fine-tuning is the heavy tool at the end of that ladder, and this category's real lesson is **when NOT to reach for it**. Fine-tuning is expensive, slow to iterate, and easy to get wrong; it's the right answer far less often than people assume. So before any dataset or LoRA config, you need a decision framework that reliably tells you whether *this* problem even belongs in a fine-tune.",
  },
  {
    type: "prose",
    md: "**Mental model: climb the intervention ladder from cheap-and-reversible to expensive-and-sticky, and stop at the first rung that solves the problem.** The ladder: prompt → structured output / tools → RAG → fine-tuning → continued/large-scale pretraining. Each rung up costs more to build, iterate, and maintain. Fine-tuning changes the model's *weights*, so it's slow to update and locks you into a training-and-eval loop — you don't climb to it because the model output is bad; you climb to it only when the cheaper rungs genuinely can't fix *this specific kind* of problem.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Intervention ladder", definition: "prompt → structured output/tools → RAG → fine-tuning → pretraining. Ordered by cost and stickiness. Pick the LOWEST rung that solves the problem." },
      { term: "Knowledge problem", definition: "The model lacks facts (current events, private docs, changing policy). Almost always a RAG job — retrieval injects fresh, cited knowledge. Fine-tuning bakes facts into weights and can't keep up with change." },
      { term: "Behavior / style problem", definition: "The model knows what to do but not consistently HOW (house tone, format, persona, task convention). A genuine fine-tuning candidate — but try prompting + examples first." },
      { term: "Capability problem", definition: "The model fundamentally can't do the task (a reasoning or skill it doesn't possess). Fine-tuning rarely creates new capability from a small dataset; the fix is usually a more capable model (model replacement)." },
      { term: "Format / consistency problem", definition: "Output shape is inconsistent (JSON, schema). Try structured outputs / response_format / tools FIRST; fine-tune only if you need that behavior at scale without prompt overhead." },
      { term: "Catastrophic forgetting", definition: "Fine-tuning on a narrow task can degrade the model's general abilities. A tuned model that wins on your task but regresses elsewhere is a real risk to check for." },
    ],
  },
  {
    type: "prose",
    md: "**Match the symptom to the rung.** The single most common mistake — the one this topic exists to prevent — is **fine-tuning to add knowledge.** If the model needs current facts, private documents, or policies that change weekly, that's a *retrieval* problem: RAG injects fresh, cited knowledge at query time, while a fine-tune freezes a snapshot into the weights that's stale the moment the data changes (and can't cite its sources). Fine-tuning shines for **behavior and style** — a consistent tone, format, or task convention the model already has the knowledge to produce but does inconsistently.",
  },
  {
    type: "code",
    language: "python",
    caption: "Intervention classifier — symptom to cheapest correct rung (deterministic, keyless)",
    code: `def intervention(symptom):
    ladder = {
        "needs_current_facts":   "RAG — retrieve fresh facts; DON'T fine-tune changing knowledge",
        "needs_private_docs":    "RAG — ground answers on your documents (with citations)",
        "inconsistent_json":     "structured outputs / tools FIRST; fine-tune only if needed at scale",
        "needs_to_take_action":  "tools / function calling — not a weights problem",
        "inconsistent_house_style": "fine-tuning — behavior/style adaptation (try prompting first)",
        "lacks_the_capability":  "model replacement — a more capable model; fine-tuning won't create it",
    }
    return ladder[symptom]

print(intervention("needs_current_facts"))
print(intervention("inconsistent_house_style"))
print(intervention("lacks_the_capability"))`,
    output: `RAG — retrieve fresh facts; DON'T fine-tune changing knowledge
fine-tuning — behavior/style adaptation (try prompting first)
model replacement — a more capable model; fine-tuning won't create it`,
  },
  {
    type: "prose",
    md: "That lookup encodes the whole judgment: only **one** of six common symptoms (\"inconsistent house style\") actually routes to fine-tuning, and even then \"try prompting first.\" Knowledge → RAG. Action → tools. Missing capability → a better model. Fine-tuning is the answer for *behavioral consistency the model is already capable of but doesn't reliably produce* — a narrow slice.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Fine-tuning to add knowledge — the signature mistake",
    md: "\"The model doesn't know our product / the new policy / today's prices — let's fine-tune it on our docs.\" This is almost always wrong:\n\n- **It goes stale.** Weights freeze a snapshot; when the policy changes next week you must retrain. RAG just re-indexes.\n- **It doesn't cite.** A fine-tune can't point to the source document; RAG returns provenance.\n- **It's unreliable for facts.** Models blur and hallucinate memorized details; retrieval returns the exact text.\n- **It's expensive per update.** A retraining loop for information that changes is a treadmill.\n\nThe fix for a *knowledge* problem is retrieval (RAG), which you already built. Reserve fine-tuning for *behavior* the model is capable of but produces inconsistently. If you catch yourself reaching for fine-tuning to make the model \"know\" something, stop and ask whether RAG belongs there instead."
  },
  {
    type: "callout",
    variant: "warning",
    title: "Fine-tuning has real costs and failure modes — even when it's the right rung",
    md: "Choosing fine-tuning commits you to:\n\n- **A data problem** — you need a clean, well-formatted, representative dataset (the next topic); dataset quality bounds the result more than any hyperparameter.\n- **An evaluation problem** — you must prove the tuned model beats the base on a held-out set; a finished training job proves nothing about quality.\n- **Catastrophic forgetting** — narrow tuning can degrade general ability; check for regressions, not just target-task wins.\n- **Overfitting** — a tiny dataset memorizes instead of generalizing.\n- **Maintenance** — every base-model update or data change may mean re-tuning and re-evaluating.\n\nSo even when fine-tuning is correct, it's a project with ongoing cost — not a quick fix. Budget for the data and eval work, or the fine-tune will quietly make things worse."
  },
  {
    type: "quiz",
    question: "A model gives correct answers but formats its JSON inconsistently. Should you fine-tune immediately?",
    choices: [
      "Yes — fine-tuning is the standard fix for any inconsistency",
      "No — try the cheaper rungs first: structured outputs / response_format (schema-constrained decoding) or tools usually fix formatting directly and reversibly. Fine-tune for format only if you need that behavior at high volume without prompt overhead AND prompting/structured output proved insufficient",
      "Yes — but only after adding more RAG",
      "No — formatting problems are unfixable",
    ],
    answerIndex: 1,
    explanation: "Inconsistent output shape is a format problem, and the cheapest correct rung is structured outputs / schema-constrained decoding (or tools), which fixes it directly and is trivially reversible. Fine-tuning for format is justified only when you need the behavior at scale without prompt overhead and the cheaper rungs genuinely fell short — not as the first move. Adding RAG addresses knowledge, not formatting.",
  },
  {
    type: "quiz",
    question: "A company wants the model to answer questions about internal policies that change every week. Fine-tuning or RAG — and why?",
    choices: [
      "Fine-tuning — bake the policies into the weights for best accuracy",
      "RAG — the policies are changing KNOWLEDGE, so retrieve them at query time from an updatable index. A fine-tune freezes a snapshot that goes stale weekly, can't cite the source policy, and forces a retraining treadmill; RAG just re-indexes when policy changes",
      "Fine-tuning — because internal data is private",
      "Neither — the task is impossible",
    ],
    answerIndex: 1,
    explanation: "Weekly-changing policies are a knowledge problem, and knowledge that changes belongs in retrieval, not weights: RAG serves the current policy with citations and updates by re-indexing. Fine-tuning would encode a stale snapshot, lose provenance, and demand constant retraining. Privacy is handled by where you host retrieval, not by choosing fine-tuning.",
  },
  {
    type: "quiz",
    question: "An engineer wants to fine-tune because the model 'lacks current factual knowledge.' What should you recommend?",
    choices: [
      "Fine-tune on a large factual dataset",
      "Don't fine-tune for current facts — use RAG (retrieval) so answers come from an up-to-date, citable source. Fine-tuning bakes a frozen snapshot into weights that can't stay current or cite sources; 'lacks current knowledge' is the textbook RAG case, not a fine-tuning case",
      "Replace the model with a bigger one",
      "Add more few-shot examples of facts to the prompt permanently",
    ],
    answerIndex: 1,
    explanation: "\"Lacks current factual knowledge\" is precisely the knowledge problem RAG solves: retrieve the fresh facts at query time from an updatable, citable index. Fine-tuning freezes a snapshot that's immediately drifting and offers no provenance, and a bigger model still won't know your current facts. Stuffing facts into the prompt permanently doesn't scale and still goes stale.",
  },
  {
    type: "takeaways",
    items: [
      "Climb the intervention ladder (prompt → structured output/tools → RAG → fine-tuning → pretraining) and STOP at the first rung that solves the problem; fine-tuning is the heavy, sticky tool near the top.",
      "The signature mistake is fine-tuning to add KNOWLEDGE — current facts, private docs, changing policy are RAG's job (fresh, citable, updatable); weights freeze a stale, uncited snapshot.",
      "Fine-tuning fits BEHAVIOR/STYLE the model is capable of but produces inconsistently (tone, format-at-scale, task convention); format problems try structured outputs first; missing capability is model replacement.",
      "Even when correct, fine-tuning is a project: dataset quality (bounds the result), evaluation vs a baseline, catastrophic forgetting, overfitting, and ongoing maintenance.",
      "'The model got it wrong' is not a reason to fine-tune — diagnose WHICH kind of problem it is (knowledge/behavior/capability/format/action) and pick the cheapest rung that fixes it.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The skill this topic certifies is *classification*: given a real problem, name the right intervention and justify it. The completion criterion is 'each classification is justified' — reasoning, not a coin flip. This unit drills the framework on realistic cases until the routing is automatic.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How to classify a case",
    md: "For each problem, ask in order and stop at the first YES:\n\n1. **Is it missing knowledge/facts?** (current, private, changing) → **RAG**.\n2. **Does it need to take an action or call a system?** → **tools / function calling**.\n3. **Is it an output-shape/format issue?** → **structured outputs**; fine-tune only if needed at scale.\n4. **Is it a consistent behavior/style/convention** the model is capable of but does unreliably? → **fine-tuning** (after prompting fails).\n5. **Does the model fundamentally lack the capability?** → **model replacement** (a stronger model).\n\nThen justify: WHY that rung, and WHY not the cheaper ones. A classification without the 'why not cheaper' is incomplete — that's where the engineering judgment lives."
  },
  {
    type: "quiz",
    question: "A support bot must follow your company's specific de-escalation tone and response structure on every reply, and it already has all the knowledge it needs. Prompting gets it ~70% consistent. Which intervention, and why?",
    choices: [
      "RAG — to retrieve the tone guide",
      "Fine-tuning — this is a consistent behavior/style problem the model is capable of but produces unreliably, and prompting has plateaued. A fine-tune on many well-formatted examples of the desired tone/structure makes the behavior the default. (RAG adds knowledge it already has; structured output only fixes machine shape, not tone)",
      "Model replacement — always use a bigger model for tone",
      "Nothing — 70% is good enough by definition",
    ],
    answerIndex: 1,
    explanation: "Consistent house tone and structure that the model can already produce but does unreliably — after prompting plateaus — is the core behavior/style case for fine-tuning. RAG would inject knowledge it already has; structured outputs constrain machine-readable shape, not conversational tone. A bigger model isn't inherently more on-brand. Fine-tuning on many on-tone examples makes the style the default.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — triage a portfolio of production problems.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Classify several real problems and justify each",
    intro: "Route each to prompting / structured output / RAG / tools / fine-tuning / model replacement.",
    steps: [
      { order: 1, action: "Take 6–8 concrete problems (e.g. 'answers about this week's prices are wrong', 'JSON keys vary', 'won't match our brand voice', 'can't book a meeting', 'fails multi-step math', 'doesn't know our internal API'). For each, apply the classification checklist and name the intervention.", expected: "Each problem mapped to exactly one primary intervention (some may pair, e.g. RAG + tools)." },
      { order: 2, action: "For every case, write the justification: why that rung AND why not the cheaper ones. Flag any where you'd try a cheaper rung first before committing to fine-tuning.", decision: "Which of these are genuinely fine-tuning problems (behavior/style at scale) versus disguised knowledge/format/capability problems?" },
      { order: 3, action: "Summarize how many of the portfolio actually warrant fine-tuning. State the rule you'd give a teammate to avoid the 'fine-tune to add knowledge' trap.", verify: "Every case is classified with a 'why / why-not-cheaper' justification, and you can state how rarely fine-tuning is the right first answer." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — mastery of the decision framework",
    items: [
      "Each problem routed to a specific intervention (prompt/structured/RAG/tools/fine-tune/replace).",
      "Every classification justified with why-that-rung AND why-not-cheaper.",
      "Knowledge problems correctly sent to RAG, not fine-tuning.",
      "You can state how few real problems actually warrant fine-tuning.",
    ],
  },
];

export const content: TopicContent = {
  "unit-ft-when-01": learn,
  "unit-ft-when-02": review,
};
