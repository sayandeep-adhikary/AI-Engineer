import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Capabilities, Hallucination & Failure Modes" (topic-llm-capabilities-limits).
// 3 units: 01 learn · 02 practice (provoke failures) · 03 review (categorize + mastery).
// Teaches WHY architectural techniques (retrieval/tools/validation/etc.) exist,
// without teaching their implementation (later topics).

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "This is the most important topic in LLM Fundamentals, because it decides *where you can trust the model and where you must not*. An engineer who knows the failure modes designs systems that verify the right things; one who doesn't ships confident nonsense to users. The goal here isn't to memorise 'LLMs hallucinate' — it's to predict **where** a given task will fail, **why**, and **what an application must add** to compensate.",
  },
  {
    type: "prose",
    md: "**Mental model: an LLM is a fluent pattern-continuer, not a truth engine.** It's excellent at *transforming and generating language* and unreliable at *being correct about the world*. The single most dangerous property is that **fluency and confidence are decoupled from accuracy** — the same smooth, authoritative prose is produced whether the content is right or invented. So your job is to separate *'the model produced a plausible answer'* from *'the answer is actually verified'*. Those are different claims, and only one of them is safe to build on.",
  },
  {
    type: "prose",
    md: "**What LLMs are genuinely good at** (language *over text you provide or patterns they learned well*):\n\n- Rewriting, summarising, translating, tone/style changes\n- Extraction and classification from given text\n- Drafting (emails, code scaffolds, boilerplate)\n- Explaining common concepts; brainstorming options\n- Following clear, well-scoped instructions on provided content\n\n**What they are unreliable at:**\n\n- Exact facts, especially rare, recent, or precise ones (dates, numbers, citations)\n- Arithmetic and multi-step exact calculation (it's predicting digits, not computing)\n- Anything after the knowledge cutoff or about *your* private data it never saw\n- Perfect consistency (same prompt, different runs)\n- Faithfulness (it may add plausible details not in your source)\n- Rigorous multi-step logic on novel problems",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Hallucination", definition: "Fluent, confident output that is unsupported or fabricated. A natural consequence of next-token prediction with no source of truth — not a 'bug' a prompt can fully remove." },
      { term: "Knowledge cutoff", definition: "The point after which the model has no training data. It can't know later events or your private/current data unless an app supplies them." },
      { term: "Non-determinism", definition: "Sampling means the same prompt can vary run to run; even 'temperature 0' isn't bit-guaranteed across backends." },
      { term: "Faithfulness", definition: "Whether output stays true to a provided source. Low faithfulness = the model invents details the source didn't contain." },
      { term: "Confidence ≠ correctness", definition: "The model's assured tone carries no information about accuracy. Treat confident and unsure output identically until verified." },
    ],
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Better prompting reduces failures — it cannot eliminate them",
    md: "A common belief: 'if it hallucinates, my prompt is bad; a perfect prompt would fix it.' Prompting genuinely helps (clear scope, 'say I don't know if unsure', give the source text) — but it **cannot** conjure facts the model never encoded, make arithmetic exact, or guarantee consistency, because those limits are intrinsic to a probabilistic pattern-continuer with a frozen, lossy memory. Assuming prompting alone makes output trustworthy is how unverified claims reach production. When correctness *matters*, you need **architecture** (below), not just wording.",
  },
  {
    type: "prose",
    md: "**Why the architectural techniques you'll learn later exist — each targets a specific limit:**\n\n- **Retrieval (RAG)** → the model lacks your/current facts: supply them at inference so it answers *from provided text* instead of memory.\n- **Tools / function calling** → it can't compute or act exactly: hand off arithmetic, lookups, and actions to deterministic code.\n- **Structured outputs** → free text is hard to trust/parse: constrain the shape so downstream code can rely on it.\n- **Validation** → any output can be wrong: check it (schemas, rules, a second model) before use.\n- **Citations / grounding** → claims need provenance: require the model to point at sources so a human/system can verify.\n- **Deterministic code** → some logic must be exact and repeatable: don't ask the model to do what a function should.\n- **Human review** → high-stakes decisions: keep a person in the loop.\n- **Guardrails** → safety/misuse: filter inputs and outputs.\n\nYou're not learning to *build* these here — you're learning **why each exists**, so later topics land on a foundation instead of feeling arbitrary.",
  },
  {
    type: "prose",
    md: "**Diagnosing a bad output — six distinct causes.** When an AI feature misbehaves, the *cause* determines the *fix*, so name it precisely:\n\n1. **Model uncertainty** — a rare/precise fact the weights encode weakly (→ retrieval, verification).\n2. **Missing context** — the info simply wasn't provided/known (→ supply it: retrieval, user input).\n3. **Ambiguous instruction** — the prompt allowed multiple readings (→ clarify the spec).\n4. **Unsupported claim** — output added details not in the source (→ grounding, faithfulness checks).\n5. **Deterministic software bug** — the *code* around the model is wrong (parsing, off-by-one) (→ fix the code).\n6. **Bad system design** — using an LLM for a job it's structurally wrong for (→ redesign; maybe don't use an LLM).\n\nConflating these — e.g. 'tweaking the prompt' when the real issue is a parsing bug — wastes days.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Optional experiment — provoke a hallucination on purpose",
    md: "With any chat API (or a free playground): ask for something precise and obscure that likely isn't well-encoded — e.g. *'Give the DOI and exact page numbers of the 2013 paper by <plausible-but-fictional author> on <niche topic>.'* Observe a confident, well-formatted, entirely invented citation. **What it teaches:** the model optimises for *plausible*, not *true*, and formatting/confidence are no signal of accuracy. **No key?** Recall a time an assistant gave you a crisp answer you later found wrong — that felt-certainty is exactly the trap this topic trains you to distrust.",
  },
  {
    type: "quiz",
    question: "An LLM feature extracts totals from uploaded invoices. For one vendor it reports a total that doesn't appear anywhere on the invoice. Before touching prompts, which cause should you FIRST rule in or out, and how?",
    choices: [
      "Model uncertainty — switch to a bigger model",
      "Determine whether it's an unsupported claim (model invented/miscomputed the total) vs a deterministic bug (your code parsed the wrong field) — inspect the raw model output vs. your post-processing",
      "Ambiguous instruction — rewrite the prompt immediately",
      "Bad system design — stop using AI",
    ],
    answerIndex: 1,
    explanation: "Fabricated numbers on an extraction task have two very different causes: the model produced an unsupported/miscalculated value, OR your surrounding code grabbed/parsed the wrong field (a deterministic bug). Look at the raw model output first: if the model returned the right number and your code mangled it, no prompt change helps. Diagnose the cause before applying a fix.",
  },
  {
    type: "quiz",
    question: "A stakeholder says: \"The model sounded completely sure, so the answer is probably right.\" What's the correct engineering response?",
    choices: [
      "Agree — confidence indicates the model checked its facts",
      "Confidence is decoupled from correctness; the model produces assured prose regardless of truth, so the claim must be verified independently before it's trusted",
      "Raise the temperature to make it less sure",
      "Only long answers are reliable",
    ],
    answerIndex: 1,
    explanation: "Fluent certainty is a property of the generation process, not evidence of accuracy — the model has no reliable internal 'I'm sure' signal it exposes. Treat confident and hedged output identically: verify against a source, a tool, or a rule before acting on it.",
  },
  {
    type: "takeaways",
    items: [
      "LLMs are strong at language transforms over provided text, weak at exact facts, math, freshness, consistency, and faithfulness.",
      "Fluency and confidence are decoupled from correctness — 'plausible answer' ≠ 'verified answer'.",
      "Prompting reduces but cannot eliminate hallucination; intrinsic limits require architecture, not just wording.",
      "Retrieval, tools, structured output, validation, citations, deterministic code, human review, and guardrails each target a specific limit — that's WHY they exist.",
      "Diagnose bad output by cause: model uncertainty, missing context, ambiguous instruction, unsupported claim, deterministic bug, or bad design.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "You understand failure modes best by *causing* them deliberately and studying the wreckage. Trigger and document at least three distinct failures. Use any chat API or a free playground; where you lack access, construct the failing case and reason precisely about what would happen and why.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Provoke and document three failures (guided)",
    intro: "Aim for three DIFFERENT modes, not three of the same.",
    steps: [
      { order: 1, action: "Trigger a factual hallucination: ask for a precise, obscure, or post-cutoff fact (a citation, a very recent event, a niche statistic). Record the prompt, the confident wrong output, and how you'd verify it's wrong.", expected: "A fluent, authoritative answer that verification shows to be fabricated or outdated." },
      { order: 2, action: "Trigger an arithmetic/consistency failure: ask for a multi-digit multiplication, or send the same non-trivial prompt several times and compare.", expected: "A wrong or varying result — evidence that generation isn't calculation and isn't deterministic." },
      { order: 3, action: "Trigger a faithfulness/instruction failure: give a short source text and ask a question whose answer ISN'T in it, or give a subtly ambiguous instruction.", decision: "Did the model say 'not stated', or did it invent an answer? Was your instruction genuinely unambiguous? Record which mode each failure is.", verify: "You have three reproducible cases, each labelled with its failure mode and how you confirmed it." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Three distinct, reproducible failures — not three of the same kind.",
      "Each has the exact prompt, the output, and how you verified it was wrong.",
      "Each is labelled with a mode (hallucination / arithmetic / non-determinism / faithfulness / ambiguity).",
      "You can state, for each, whether prompting could reduce it and whether it could ever fully fix it.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The senior skill is **triage**: given a symptom, name the real cause, because the cause dictates the fix. Practise categorising, then analyse a whole workflow for where verification belongs.",
  },
  {
    type: "quiz",
    question: "A chatbot answers 'What's our refund window?' with '30 days' — but the company policy is 14 days, and the policy text was never given to the model. Which cause is this, and what's the class of fix?",
    choices: [
      "Deterministic bug — debug the code",
      "Missing context — the policy wasn't provided or in training; supply it at inference (retrieval) so the model answers from the real text",
      "Ambiguous instruction — reword the question",
      "Non-determinism — set temperature to 0",
    ],
    answerIndex: 1,
    explanation: "The model can't know a private policy it never received; '30 days' is a plausible guess. This is missing context, and the architectural fix is to provide the actual policy at inference (retrieval), not to prompt harder or lower temperature.",
  },
  {
    type: "quiz",
    question: "An extraction pipeline returns the correct value from the model, but the stored record is off by one row. The model output is verifiably right. Which cause, and which fix?",
    choices: [
      "Hallucination — add a stronger system prompt",
      "Deterministic software bug — the code around the model mishandled the data (off-by-one); fix the code, not the model or prompt",
      "Model uncertainty — use a bigger model",
      "Missing context — add retrieval",
    ],
    answerIndex: 1,
    explanation: "If the raw model output is correct and the stored result is wrong, the defect is in your deterministic code. No amount of prompt or model changes will fix a parsing/indexing bug. This is why you inspect the raw output before blaming the model.",
  },
  {
    type: "quiz",
    question: "Two engineers debate whether to add retrieval or just 'improve the prompt' for a feature that must cite the company's latest pricing. What single fact settles it?",
    choices: [
      "Prompts are always cheaper, so improve the prompt",
      "The latest pricing is post-cutoff/private, so it isn't in the weights — no prompt can supply absent facts; retrieval (providing the pricing at inference) is required",
      "Retrieval is always better; never prompt",
      "Use a higher temperature for freshness",
    ],
    answerIndex: 1,
    explanation: "Prompt quality can't add information the model doesn't have. Current/private pricing must be supplied at inference, which is exactly what retrieval does. The decision hinges on 'is the needed information in the model at all?' — here it isn't.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — audit a workflow for verification points.** No step-by-step; reason as the responsible engineer.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Analyse an unreliable AI workflow",
    intro: "Scenario: an app takes a user's uploaded medical-bill PDF, asks an LLM to (a) extract line items and totals, (b) explain each charge in plain English, and (c) tell the user whether they were overcharged versus 'typical' prices. Users have complained about wrong numbers and confident-but-wrong overcharge claims.",
    steps: [
      { order: 1, action: "For each of the three sub-tasks (a/b/c), classify how reliable a bare LLM is and identify the dominant failure mode(s).", decision: "Which sub-task is a safe language transform, which risks unsupported claims, and which is structurally the WRONG job for an LLM alone — and why?" },
      { order: 2, action: "Mark exactly WHERE verification, tools, retrieval, or human review should sit — and where they shouldn't (over-verifying safe steps wastes cost/latency).", expected: "e.g. extraction totals verified by re-summing with code (a tool); 'overcharged?' requires real reference-price data (retrieval) and likely a confidence threshold or human review; the plain-English explanation is the low-risk part." },
      { order: 3, action: "State the single highest-risk claim in the workflow and the minimum mechanism that makes it safe to show a user (or the decision to NOT show it).", verify: "Your audit ties each risk to a specific mechanism and justifies where NOT to add friction — not 'verify everything' or 'trust everything'." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Each sub-task is rated for reliability with its dominant failure mode named.",
      "Verification/tools/retrieval/human-review are placed where the risk actually is — and deliberately omitted where it isn't.",
      "The highest-risk claim (overcharge judgement) is identified with a concrete safeguard or a decision not to surface it.",
      "Your reasoning distinguishes a safe language transform from an unsupported factual/judgement claim.",
    ],
  },
];

export const content: TopicContent = {
  "unit-llm-capabilities-limits-01": learn,
  "unit-llm-capabilities-limits-02": practice,
  "unit-llm-capabilities-limits-03": review,
};
