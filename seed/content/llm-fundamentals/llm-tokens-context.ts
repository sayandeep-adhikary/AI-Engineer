import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Tokens, Context Windows & Limits" (topic-llm-tokens-context).
// 3 units: 01 learn · 02 practice (count tokens, local tiktoken) · 03 review
// (predict overflows + mastery: context strategy). Token counts vary by
// tokenizer/model, so exact integers are NOT asserted; the ~4-chars/~0.75-words
// rule of thumb (OpenAI-documented) and qualitative behaviour are used instead.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Tokens are the currency of everything you'll build: they determine **what fits** in a prompt, **how much it costs**, and **how slow** it is. Most 'the app suddenly broke in production' incidents around LLMs trace back to tokens — a conversation that grew too long, a document that overflowed the window, a bill that ballooned. This unit builds the intuition and the practical habits to reason about all three.",
  },
  {
    type: "prose",
    md: "**Mental model: the model reads and writes in tokens, and there's a fixed-size 'desk' they must all fit on.** A token is a common chunk of text — often a word-piece, sometimes a whole short word, sometimes a single character. The **context window** is the desk: a maximum number of tokens the model can consider at once, shared by your input *and* its output. Everything you send (system prompt + all conversation history + the new message) plus everything it generates must fit on that desk together.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Token", definition: "The unit of text the model processes — a subword piece produced by a tokenizer. English averages ~4 characters per token (~0.75 words)." },
      { term: "Tokenizer", definition: "The algorithm (e.g. BPE) that splits text into tokens. Different models use different tokenizers, so counts differ per model." },
      { term: "Context window", definition: "The maximum total tokens a model can attend to at once — input AND output share this single budget (they are not additive on top of it)." },
      { term: "Input vs output tokens", definition: "Prompt (input) and completion (output) tokens are counted — and usually priced — separately, but both consume the same context budget." },
      { term: "Truncation", definition: "Dropping tokens (usually oldest turns) to make a request fit. A design choice with consequences — you lose whatever you cut." },
    ],
  },
  {
    type: "prose",
    md: "**Why tokens, not characters or words?** Characters are too fine (a model would waste capacity spelling everything); whole words are too many (millions of them, plus every typo and name). Subword tokens are the sweet spot: a fixed vocabulary (~100–200k pieces) that composes any text. Common words become one token; rare or novel strings split into several. This directly explains the #1 gotcha: **tokens ≠ words**.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Words ≠ tokens — and the ratio isn't constant",
    md: "People estimate 'this prompt is 500 words, so ~500 tokens.' Wrong on both counts. A useful rule of thumb for English is **~4 characters per token, or ~100 tokens ≈ 75 words** — but the ratio *varies wildly by content*: common words are 1 token; a rare or misspelled word splits into several; **numbers** often break into digit-chunks; **code** and punctuation are token-heavy; **non-English text** and emoji can be far more tokens per character. So 'number of words' is a poor predictor. When it matters (fitting a window, estimating cost), **count real tokens** with the model's tokenizer — don't eyeball it.",
  },
  {
    type: "prose",
    md: "**Long conversations silently eat the window.** The chat API is stateless (you learned this): to keep context, the application **resends the entire history every turn**. So each turn the input grows — turn 20 sends turns 1–19 *plus* the new message. Add a couple of long document pastes and you can hit the ceiling not because any single message is huge, but because the *accumulated* history is. This is why chat apps 'work fine, then start failing after a while'.",
  },
  {
    type: "prose",
    md: "**What happens at the limit.** If your input alone approaches the window, there's little room left for output — the model may get cut off (`finish_reason: \"length\"`). If input *exceeds* the window, the API rejects the request with an error (e.g. OpenAI's `context_length_exceeded`, a `400`): *'maximum context length is N tokens, however your messages resulted in M tokens.'* It does **not** silently truncate for you — truncation is *your* job. (Note: modern reasoning models also spend hidden **reasoning tokens** that count against the budget and are billed as output — so 'my prompt is small' doesn't guarantee room.)",
  },
  {
    type: "prose",
    md: "**Cost and latency both scale with tokens.** You're billed per token (input and output at different rates), and generation latency grows roughly with the number of tokens produced. So trimming a bloated prompt is simultaneously a *correctness* fix (it fits), a *cost* fix (fewer input tokens), and a *speed* fix. Context windows have grown large (many models now hold hundreds of thousands of tokens, some ~1M — but exact sizes are model-specific and change, so check current model docs), yet 'it fits' never means 'it's free or fast'.",
  },
  {
    type: "prose",
    md: "**Managing context (the ideas; later topics build them).** When history won't fit, common strategies are: **truncate** (drop oldest turns — simple, but you forget), **summarise** (replace old turns with a running summary — keeps the gist, costs a call), and **retrieve** (store everything externally and pull back only the relevant pieces per turn — the basis of RAG, taught later). The engineering question is always: *what must I keep, and what can I drop or compress?*",
  },
  {
    type: "quiz",
    question: "A support chatbot works well, but after ~20 turns that include a few long document pastes, requests start failing with a context-length error. What resource is exhausted, and which fix preserves the most useful information?",
    choices: [
      "The rate limit; add retries",
      "The context window — the resent history + pasted docs exceed it; summarising old turns and/or retrieving only relevant document chunks preserves the gist while fitting",
      "The model's memory chip; restart the service",
      "Output tokens; lower max_tokens",
    ],
    answerIndex: 1,
    explanation: "Stateless chat resends the whole growing history each turn, so accumulated tokens (especially long pastes) overflow the window. Blind truncation fits but forgets; summarising and/or retrieving only the relevant pieces keeps what matters. It's a context-budget problem, not a rate limit or output cap.",
  },
  {
    type: "takeaways",
    items: [
      "The model works in tokens; the context window is a fixed budget shared by input AND output (not additive).",
      "Tokens ≠ words: ~4 chars/token (~100 tokens ≈ 75 words) for English, but numbers/code/other languages vary a lot — count real tokens when it matters.",
      "Stateless chat resends growing history each turn, so long conversations + pastes silently exhaust the window.",
      "Over the limit → an API error (not silent truncation); near the limit → output gets cut (finish_reason 'length'); reasoning tokens also consume budget.",
      "Tokens drive cost and latency; manage a full window by truncating, summarising, or retrieving.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Make tokens observable. `tiktoken` is OpenAI's tokenizer library and runs **entirely locally — no API key, no cost**. Install it (`pip install tiktoken`) and actually watch different text consume different token counts.",
  },
  {
    type: "code",
    language: "python",
    caption: "Count tokens locally with tiktoken",
    code: `import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")   # picks the right tokenizer

def n_tokens(text: str) -> int:
    return len(enc.encode(text))

for s in ["hello", "hello world", "antidisestablishmentarianism",
          "1234567890", "  spaced   out  ", "こんにちは"]:
    print(n_tokens(s), repr(s))`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Observe what drives token count (guided)",
    intro: "Run the block above, then reason about the results.",
    steps: [
      { order: 1, action: "Run it and read the counts next to each string.", expected: "Common words are ~1 token; the long rare word splits into several; the digit string and the Japanese text cost more tokens than their character count suggests; extra whitespace adds tokens." },
      { order: 2, action: "Predict, then check: does `\"hello\"` vs `\" hello\"` (leading space) tokenize the same? Does uppercasing change the count?", decision: "Before running: why might a leading space or capitalisation change tokenization? (Hint: the tokenizer learned pieces *including* their surrounding spaces/case from real text.)" },
      { order: 3, action: "Compute a rough cost estimate: pick input/output token counts and multiply by example per-token rates (from the API topic).", verify: "You can state, for a given text, its exact token count and a cost estimate — without guessing from word count." },
    ],
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Measure conversation growth (less guidance)",
    intro: "Show yourself how history accumulates.",
    steps: [
      { order: 1, action: "Build a list of chat messages and a function that returns the total tokens of the WHOLE messages list (concatenate role + content, or sum per-message). Simulate a 15-turn conversation where turns 4 and 9 paste a long paragraph.", decision: "Should you count only the newest message, or the entire history that gets resent each turn? Which reflects what the API actually receives?" },
      { order: 2, action: "Plot or print the running total after each turn. Identify the turn where you'd cross a chosen 8k-token 'budget'.", verify: "The running total jumps at the paste turns, and you can name the exact turn that overflows an 8k budget — demonstrating that accumulation, not any single message, is the culprit." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You ran tiktoken locally and saw counts differ from word/character counts.",
      "You can explain why rare words, numbers, whitespace, and non-English text cost more tokens.",
      "You measured a growing conversation's total tokens and found where it overflows a budget.",
      "You can produce an exact token count + cost estimate for a given prompt.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Predict failures before they happen, then design a strategy for a workflow that lives near the limit.",
  },
  {
    type: "quiz",
    question: "You paste a 50-page contract into a single prompt and ask for a summary, but get `context_length_exceeded`. The model's window is large. What's the correct read?",
    choices: [
      "The model is down; retry",
      "The document's tokens exceed the window (large ≠ unlimited); you must split/chunk the document and summarise in parts, or use retrieval to pull only relevant sections",
      "Summaries aren't supported for long text",
      "Increase max_tokens to fit the input",
    ],
    answerIndex: 1,
    explanation: "Even large windows are finite, and long documents easily exceed them once tokenized. The fix is to reduce input tokens: chunk the document and summarise piecewise (map-reduce), or retrieve only the relevant sections. `max_tokens` caps *output* and can't make oversized *input* fit.",
  },
  {
    type: "quiz",
    question: "Two prompts have the same word count, but one costs noticeably more tokens. Which is the more likely explanation?",
    choices: [
      "Token cost is random",
      "Content differs: numbers, code, punctuation, or non-English text tokenize into more pieces per word than plain common English",
      "The longer-costing one has more spaces only",
      "One used a different font",
    ],
    answerIndex: 1,
    explanation: "Token count depends on *what* the text is, not just how many words. Digits, code, heavy punctuation, and non-English scripts fragment into more tokens per word, so equal word counts can differ substantially in tokens (and cost). Always measure when it matters.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design a context strategy.** No step-by-step; make and justify engineering decisions.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design context management for a long-running assistant",
    intro: "Scenario: a customer-support assistant holds multi-hour conversations and users paste logs/documents. It must stay within an 8k-token working budget while remaining coherent.",
    steps: [
      { order: 1, action: "Decide what to always keep, what to summarise, and what to offload/retrieve. Specify the token budget allocation (e.g. system prompt, running summary, recent turns, retrieved snippets, room for output).", decision: "Which information is cheap to lose vs. must be preserved verbatim? Where does a rolling summary help, and where would it dangerously drop specifics (e.g. an order number)?" },
      { order: 2, action: "Define the trigger and mechanism: at what measured token threshold do you compress old turns, and how do you guarantee room for the model's output?", expected: "A concrete rule like 'when history > 6k tokens, replace turns older than the last N with a summary; always reserve ≥1k tokens for output.'" },
      { order: 3, action: "State the failure you're preventing and how you'd verify the strategy works (e.g. simulate a long transcript and confirm no request exceeds the budget while key facts survive).", verify: "Your design keeps every request under budget AND preserves must-keep facts; you can name what it intentionally sacrifices." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A token budget is allocated across system prompt, summary, recent turns, retrieved context, and output headroom.",
      "There's a concrete, measured trigger for compressing/offloading old context.",
      "The strategy guarantees room for output (avoids finish_reason 'length').",
      "You can name what information the strategy preserves verbatim vs. compresses vs. drops, and why.",
    ],
  },
];

export const content: TopicContent = {
  "unit-llm-tokens-context-01": learn,
  "unit-llm-tokens-context-02": practice,
  "unit-llm-tokens-context-03": review,
};
