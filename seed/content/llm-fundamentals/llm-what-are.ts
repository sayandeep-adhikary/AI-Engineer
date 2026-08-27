import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "What LLMs Are (and Aren't)" (topic-llm-what-are).
// 2 units: 01 learn (conceptual model) · 02 review (explain-back + mastery).
// Conceptual topic — no code exercises required; a local thought-experiment plus
// an OPTIONAL API observation. No anthropomorphising; the "database" mental model
// is explicitly debunked.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You will spend years building on top of LLMs, so a *correct* mental model of what they are pays off every single day. Get it wrong and you'll design systems that expect a database, a calculator, or a truth oracle — and then be baffled when they hallucinate. This unit gives you the accurate model: what the thing actually does, what it can and can't know, and why an application is not the same as the model inside it.",
  },
  {
    type: "prose",
    md: "**The one idea everything rests on: an LLM predicts the next token.** Given a sequence of tokens (roughly, word-pieces), it outputs a probability distribution over *every possible next token*, picks one, appends it, and repeats. That's it. \"Write me an email,\" \"summarise this,\" \"is this positive?\" — all of it is the same loop: *what token most plausibly comes next, given everything so far?* Every capability you'll ever use is an emergent consequence of doing that one thing extremely well.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Language model", definition: "A model that assigns probabilities to sequences of text — in practice, one that predicts the next token given the previous ones." },
      { term: "Token", definition: "The unit the model reads and writes: a common word-piece (~4 characters of English on average), not a whole word or character. (Next topic goes deep.)" },
      { term: "Parameters / weights", definition: "The billions of numbers adjusted during training. The model's 'knowledge' is a lossy, distributed encoding across them — not stored records." },
      { term: "Pretraining", definition: "The expensive phase: adjust the weights to predict the next token across a huge text corpus. Produces the base capability." },
      { term: "Inference", definition: "Using the trained (frozen) model to generate tokens for your prompt. No learning happens; the weights don't change." },
      { term: "Fine-tuning", definition: "Extra training on a narrower dataset to specialise behaviour. Still just next-token prediction, on different data." },
    ],
  },
  {
    type: "prose",
    md: "**Training vs inference — keep them separate.** *Training* (pretraining, then optional fine-tuning) is where the weights are learned by predicting next tokens over enormous text; it costs millions of dollars and happens once. *Inference* is every call you make afterwards: the weights are **frozen**, the model just runs the prediction loop on your input. This is why an LLM can't 'learn' from your conversation or look anything up mid-call — inference changes nothing about the model.",
  },
  {
    type: "prose",
    md: "**Why does 'predict the next token' produce essays, code, and translation?** Because to predict text *well*, the model is forced to internalise the structures that generate text: grammar, world facts, coding patterns, reasoning steps, tone. If the training data contains `The capital of France is `, the only way to predict `Paris` reliably is to encode that association. Scale this to a trillion tokens and the by-products of accurate prediction *look like* knowledge and reasoning. Capability is a **side effect** of the prediction objective — not something anyone programmed in rules.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "The wrong model: 'an LLM stores all the answers and looks them up'",
    md: "It is tempting — and wrong — to picture a giant database of facts inside the weights. Reality: training **compresses** patterns from the data into a fixed set of numbers, *lossily*. There is no record to retrieve; at inference the model **reconstructs** a plausible continuation from those compressed patterns. That's why it can nail a common fact, blur a rare one, and confidently invent a citation that never existed — all with the same machinery. If it were a database, it would return 'not found'. It never does, because it isn't one: it always produces the *most plausible-sounding* next tokens, whether or not they're true.",
  },
  {
    type: "prose",
    md: "**What an LLM does and doesn't 'know'.** Its 'knowledge' is (1) **frozen at a cutoff** — it has no awareness of anything after its training data, and no live access to the web, your files, or the current time unless an application feeds them in; and (2) **lossy** — common, oft-repeated facts are encoded strongly; rare or one-off facts are weak or absent, so it fills the gap with something plausible. It has no internal 'I'm not sure' signal it reliably exposes. (Avoid words like 'understands', 'believes', 'wants' — they smuggle in a mind that isn't there. It's a prediction function.)",
  },
  {
    type: "prose",
    md: "**Output is probabilistic, so it varies.** Because generation *samples* from a probability distribution, the same prompt can yield different answers on different runs (unless you force near-deterministic settings — the parameters topic covers how). This isn't a defect; it's the nature of the mechanism. Designs that assume one prompt → one fixed string will break.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Optional experiment (needs any chat API key) — watch it be probabilistic",
    md: "If you have an API key, send the *exact same* prompt 5 times with a non-zero temperature (e.g. `\"Give me a two-word product name for a coffee app.\"`) and print each result. You'll get different answers. **What this teaches:** there is no single stored 'answer' — each run samples a fresh continuation. **No key?** Do the thought-experiment instead: cover the last word of *'The opposite of hot is ___'* and notice you predicted 'cold' from *pattern*, not by looking it up in a table — and that for *'My favourite colour is ___'* you can only guess a plausible option. That guessing-from-patterns is the model, always.",
  },
  {
    type: "prose",
    md: "**The model is not the application.** The raw model is just the next-token engine. Everything that makes a *product* — the system prompt, conversation memory, retrieval of your documents, tool/function calls, output validation, safety filters, the UI — lives in the **application** wrapped around it. ChatGPT is an *app*; the GPT model is the *engine* inside. This distinction is the whole point of this roadmap: you are learning to build the application layer that turns a probabilistic text engine into something reliable. Later topics (retrieval, tools, structured output, evaluation) are all application-layer answers to the model's intrinsic limits.",
  },
  {
    type: "quiz",
    question: "A teammate says: \"The model gave a wrong date for an event last month, so its training data must have a typo — let's find and fix the record.\" What's the flaw in this reasoning?",
    choices: [
      "There's no typo; the event is fictional",
      "There is no 'record' to fix — knowledge is lossily encoded in weights, and 'last month' is likely past the model's cutoff, so it reconstructed a plausible (wrong) date",
      "The model learns from each conversation, so it already corrected itself",
      "You must retrain the whole model to fix one fact",
    ],
    answerIndex: 1,
    explanation: "LLMs don't store editable records — facts are compressed across billions of weights, and anything after the training cutoff isn't there at all. A wrong recent date is the model reconstructing a plausible answer with no source to check against, not a retrievable typo. The fix at the application layer is to *feed* the model the real date (retrieval/tools), not to hunt for a record.",
  },
  {
    type: "quiz",
    question: "Why can the same prompt produce different answers on different runs, and when is that a problem?",
    choices: [
      "The model is broken; it should be deterministic",
      "Generation samples from a probability distribution, so variation is inherent; it's a problem when your design assumed one fixed output (e.g. exact string matching)",
      "The internet changed between runs",
      "It only varies if the model is fine-tuned",
    ],
    answerIndex: 1,
    explanation: "Sampling makes outputs probabilistic by nature. That's fine for creative or open-ended tasks but breaks designs that expect a single canonical string. The fix is engineering: lower/zero temperature, structured outputs, and validation — not expecting a probabilistic engine to behave like a pure function.",
  },
  {
    type: "takeaways",
    items: [
      "An LLM predicts the next token from the previous ones; every capability emerges from doing that well.",
      "Training learns the weights (once, expensively); inference just runs the frozen model — it can't learn or look things up mid-call.",
      "'Knowledge' is lossy compression in the weights, frozen at a cutoff — not a database, which is why it hallucinates confidently.",
      "Output is probabilistic (sampled), so the same prompt can vary; don't design for one fixed string.",
      "The model is the engine; the application (prompts, retrieval, tools, validation) is what you build around it to make it reliable.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Teaching an idea back in your own words is the strongest test of understanding. Answer these from memory, then attempt the mastery challenge — the topic's bar is being able to explain to a peer *why an LLM hallucinates*.",
  },
  {
    type: "quiz",
    question: "Scenario: an engineer wraps a base LLM in an app and expects it to answer questions about their company's internal wiki (which the model never saw in training). It confidently invents policies. Which statement is the correct diagnosis?",
    choices: [
      "The model is lying and needs a stricter system prompt",
      "The information isn't in the weights (never trained on it), so the model reconstructs plausible-sounding policies; the fix is to feed the wiki in at inference (retrieval), not to prompt harder",
      "The model's temperature is too high",
      "The wiki must be added to the model by fine-tuning before every question",
    ],
    answerIndex: 1,
    explanation: "The model can't reveal what it never encoded. No amount of prompting conjures absent facts — it just produces plausible text. The architectural answer is to supply the real content at inference (retrieval), which later topics build. This is exactly WHY retrieval exists.",
  },
  {
    type: "quiz",
    question: "Which of these correctly distinguishes 'the model' from 'the application'?",
    choices: [
      "They're the same thing with different names",
      "The model is the next-token engine; the application adds prompts, memory, retrieval, tools, validation, and UI around it",
      "The application is the model's training data",
      "The model includes the database; the application is just the UI",
    ],
    answerIndex: 1,
    explanation: "The model is a probabilistic text engine with frozen weights. Reliability, memory, up-to-date knowledge, and actions come from the application layer you build around it. Confusing the two leads to expecting the raw model to do things only the surrounding system can provide.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — explain and predict.** Do this in writing, as if teaching a new teammate. No step-by-step is given; you must reason from the mental model.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Explain hallucination, then predict behaviour",
    intro: "Combine the whole unit into a clear explanation and three predictions.",
    steps: [
      { order: 1, action: "In 3–5 sentences, explain to a peer WHY an LLM hallucinates — grounded in next-token prediction and lossy weight encoding, without anthropomorphising ('it lies', 'it wants').", decision: "What is the single sentence that most people get wrong about this, and how does your explanation correct it?" },
      { order: 2, action: "Predict the behaviour of a bare model (no retrieval/tools) on three inputs: (a) 'What is 4,813 × 197?', (b) 'Summarise this paragraph: <text>', (c) 'What did our CEO announce yesterday?'. For each, say whether it's likely reliable or not, and WHY.", expected: "(a) risky — arithmetic is token prediction, not calculation; (b) reliable — a language transform over provided text; (c) unreliable — post-cutoff, not in the weights, will confabulate." },
      { order: 3, action: "For each unreliable case, name the application-layer technique that would address it (in one phrase — you'll build these later).", verify: "Your reasoning references the mechanism (prediction + lossy weights + cutoff), not vague 'AI is unreliable' hand-waving." },
    ],
  },
  {
    type: "checkpoint",
    title: "Self-check — can you actually teach this?",
    items: [
      "You can explain next-token prediction in one or two plain sentences.",
      "You can say why 'it stores answers' is wrong and what replaces it (lossy encoding).",
      "You can predict which of three tasks a bare model will fail, and justify each with the mechanism.",
      "You can name (not implement) the application-layer fix for each failure.",
    ],
  },
  {
    type: "code",
    language: "text",
    caption: "Reference — a strong explanation of hallucination (compare after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference explanation",
    code: `An LLM generates text by repeatedly predicting the most plausible next token
from the previous ones. Its "knowledge" is a lossy, compressed encoding of
patterns in its training data — not a lookup table — and it is frozen at a
training cutoff. So when a fact is rare, absent, or newer than the cutoff, the
model has nothing to retrieve; it still produces the most plausible-sounding
continuation, which can be fluent, confident, and wrong. Hallucination isn't the
model "lying" — it's the same next-token machinery working exactly as designed,
with no built-in source of truth to check against. That's why reliable systems
add retrieval (supply real facts), tools (do exact work), and validation
(verify) around the model rather than trusting the raw output.`,
  },
];

export const content: TopicContent = {
  "unit-llm-what-are-01": learn,
  "unit-llm-what-are-02": review,
};
