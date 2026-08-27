import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Streaming, Errors, Retries & Cost Control" (topic-api-streaming-robustness).
// 4 units: 01 learn · 02 practice (backoff+jitter) · 03 build (resilient wrapper +
// cost tracking) · 04 review (inject failures + mastery). Production API behaviour;
// error/retry semantics and streaming (stream=True; delta.content; usage only with
// stream_options include_usage) are consistent with the OpenAI/Azure Chat Completions API.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "A prototype calls the API and hopes. Production code assumes the network, the provider, and your budget will all misbehave — and stays up anyway. This topic is the difference: streaming for responsiveness, a real error taxonomy so you *diagnose* instead of blindly retrying, retries that don't make outages worse, and cost control that's an engineering tradeoff rather than 'use a cheaper model'.",
  },
  {
    type: "prose",
    md: "**Streaming exists to cut *perceived* latency, not total time.** A long completion can take many seconds to finish; streaming sends tokens as they're generated, so the user sees output almost immediately (low **time-to-first-token**) even though the **total** completion time is about the same. For any interactive UI, that first-token responsiveness is the difference between 'instant' and 'frozen'. The cost is complexity: you now handle *partial* output and streams that can fail *mid-flight*.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Time-to-first-token (TTFT)", definition: "How long until the first output token arrives. Streaming optimises this; it's what makes a UI feel responsive." },
      { term: "Transient error", definition: "A temporary failure that may succeed on retry: 429 (rate limit), 5xx (server), timeouts, dropped connections." },
      { term: "Permanent error", definition: "A failure retrying won't fix: 401 (auth), 400 (bad request), 404, and context-length-exceeded. Fix the cause, don't retry." },
      { term: "Exponential backoff + jitter", definition: "Wait longer after each failure (0.5s, 1s, 2s…) plus randomness, so many clients don't retry in lockstep and hammer a recovering server." },
      { term: "Idempotency", definition: "A repeated operation has the same effect as one. Essential when retries might duplicate a side-effecting call." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Streaming with progressive rendering + partial-output safety",
    code: `chunks = []
try:
    stream = client.chat.completions.create(
        model=MODEL, messages=messages, stream=True,
        stream_options={"include_usage": True},   # usage only arrives if you ask
    )
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            piece = chunk.choices[0].delta.content
            chunks.append(piece)
            print(piece, end="", flush=True)       # render as it arrives
except Exception as e:
    # The stream dropped mid-way: we still have partial text in \`chunks\`.
    partial = "".join(chunks)
    handle_stream_interruption(partial, error=e)   # show partial + mark incomplete
text = "".join(chunks)`,
  },
  {
    type: "prose",
    md: "Two streaming facts that bite people: each chunk's `delta.content` can be **empty/None** (role-only or finish chunks), so guard before appending; and a streamed response does **not** include a `usage` object unless you pass `stream_options={\"include_usage\": True}` — so naïve streaming code that reads `resp.usage` for cost tracking gets nothing. And because a stream can drop after partial output, decide up front whether to show the partial text (marked incomplete) or discard it.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "A dropped stream isn't 'done' — partial output can look complete but be truncated",
    md: "When a connection drops mid-stream, you're left holding whatever tokens arrived. The trap: rendering that partial text as if it were the final answer. A half-generated JSON object, a sentence cut off mid-word, or a list missing its last items can silently corrupt downstream logic or mislead a user. Always distinguish 'the model finished' (a proper stop) from 'the stream ended early' (an interruption), surface incompleteness in the UI, and never parse partial streamed output as final. Treat stream interruption as a first-class case, not an afterthought.",
  },
  {
    type: "prose",
    md: "**Diagnose errors — don't retry everything.** Blindly retrying every failure wastes money on permanent errors and can worsen outages. Classify first:\n\n- **401 auth / 400 invalid request / 404** — *permanent*: your key/request is wrong. Fix it; retrying just repeats the failure.\n- **429 rate limit** — *transient*: back off (respect a `Retry-After` header if present) and retry.\n- **5xx / timeout / dropped connection** — *transient*: retry with backoff.\n- **context-length-exceeded** — *permanent-ish*: retrying won't help; **reduce input** (truncate/summarise) first.\n- **malformed output** — not an HTTP error: **repair** or fail safe (previous topic), don't just re-fire the same call.\n\nThe SDKs auto-retry some transient cases (typically 429/5xx/connection, a couple of times) — know what your client already does so you don't double-retry.",
  },
  {
    type: "prose",
    md: "**Retries that don't cause a stampede.** Use **exponential backoff** (each wait roughly doubles) plus **jitter** (randomness), because without jitter every client that failed at the same instant retries at the same instant — a synchronised **retry storm** that re-crushes a server just as it recovers. Add a **retry budget** (max attempts, and/or a cap on total retry time) so you fail fast instead of hanging. And crucially: **only retry idempotent or safe operations** — retrying a side-effecting tool call (a charge, an email) without an idempotency key can duplicate the effect.",
  },
  {
    type: "code",
    language: "python",
    caption: "Backoff with jitter (deterministic structure; the sleep is randomised)",
    code: `import random, time

def backoff_delay(attempt: int, base: float = 0.5, cap: float = 8.0) -> float:
    raw = min(cap, base * (2 ** attempt))      # 0.5, 1, 2, 4, 8 (capped)
    return raw * (0.5 + random.random() * 0.5)  # 50-100% jitter -> desynchronise

# attempt 0 -> ~0.25-0.5s, attempt 1 -> ~0.5-1s, attempt 2 -> ~1-2s ...`,
  },
  {
    type: "prose",
    md: "**Cost control is a four-way tradeoff, not 'pick a cheaper model'.** You're balancing **cost ↔ latency ↔ reliability ↔ quality**, and every lever moves several at once:\n\n- **Input tokens** dominate more than people expect: the system prompt, **resent conversation history**, retrieved context, and few-shot examples are paid *every call*. Trim them.\n- **Output tokens** — cap with a max-output limit and discourage needless verbosity ('answer in ≤2 sentences').\n- **Repeated context** — providers offer **prompt caching** for stable prefixes (system prompt, long instructions), cutting the cost/latency of resending them.\n- **Model selection** — a smaller model for easy calls (cheaper, faster) but validate quality.\n- **Batching** — non-urgent, high-volume work can go through batch endpoints at lower cost (higher latency).\n\nEach choice trades against the others: more retries buy reliability but add cost/latency; a cheaper model saves money but may cost quality; caching saves cost but can serve stale prefixes. Engineering is choosing the balance your task needs.",
  },
  {
    type: "quiz",
    question: "An API client retries every request 3 times, 500ms apart, whenever it gets a 429. Under load, the provider gets *worse*, not better. What's wrong with this design?",
    choices: [
      "Nothing; 3 retries is fine",
      "Fixed short intervals with no exponential backoff and no jitter cause synchronised retry storms that hammer the rate-limited/recovering server; use exponential backoff + jitter, respect Retry-After, and cap attempts",
      "It should retry 10 times instead",
      "429 means success, so it shouldn't retry at all",
    ],
    answerIndex: 1,
    explanation: "A flat 500ms retry with no jitter means every throttled client retries in lockstep, amplifying the overload. Exponential backoff spreads attempts out, jitter desynchronises clients, honouring Retry-After respects the server's own guidance, and a retry budget prevents endless hammering. This is the classic retry-storm anti-pattern.",
  },
  {
    type: "quiz",
    question: "Your app streams responses fine, but when the connection drops it sometimes shows corrupted or half-finished text as if it were the answer. What must the application account for?",
    choices: [
      "Nothing; streaming can't be interrupted",
      "Streams can end early with only partial output; distinguish a proper finish from an interruption, mark partial output as incomplete, and never treat/parse it as final",
      "It should disable streaming entirely",
      "Increase the timeout to infinity",
    ],
    answerIndex: 1,
    explanation: "Partial streamed output is not a completed answer. The app must detect early termination, avoid rendering/parsing partial text as final, and communicate incompleteness (retry or show a clear state). Treating 'the stream stopped' as 'the model finished' is the bug.",
  },
  {
    type: "takeaways",
    items: [
      "Streaming cuts perceived latency (TTFT), not total time; handle empty deltas, request usage via stream_options, and treat mid-stream drops as first-class partial output.",
      "Classify errors: 401/400/404/context-exceeded are permanent (fix, don't retry); 429/5xx/timeout are transient (retry).",
      "Retry with exponential backoff + jitter, a retry budget, and Retry-After; only retry idempotent/safe operations.",
      "Cost control balances cost↔latency↔reliability↔quality: trim input (history/context), cap output, cache stable prefixes, right-size the model, batch non-urgent work.",
      "Know what your SDK already retries so you don't double-retry.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Build the retry logic that separates production code from prototypes: back off with jitter, and only retry the errors that can actually recover.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Retry only what's transient (guided)",
    intro: "Wrap an API call so transient failures recover and permanent ones fail fast.",
    steps: [
      { order: 1, action: "Write a classifier: given an error/status, return retryable (429, 5xx, timeout, connection) vs not (400, 401, 404, context-length-exceeded).", decision: "Why must context-length-exceeded be NON-retryable, and what's the correct response to it instead of retrying?" },
      { order: 2, action: "Implement the retry loop with exponential backoff + jitter and a max-attempts budget; if a Retry-After is provided on a 429, respect it.", expected: "A simulated endpoint that 429s twice then succeeds returns on the 3rd attempt; a 401 fails immediately with no retries." },
      { order: 3, action: "Confirm you don't retry a side-effecting call without an idempotency key.", verify: "Transient failures recover; permanent ones fail fast; delays grow and are jittered; unsafe operations aren't blindly retried." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Retryable vs permanent errors are correctly classified.",
      "Backoff is exponential WITH jitter, bounded by a max-attempts/time budget.",
      "429 Retry-After is respected when present.",
      "Side-effecting operations aren't retried without idempotency.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a resilient LLM client wrapper with cost tracking** — the deliverable. One place that every call goes through, so streaming, retries, and cost logging are consistent instead of copy-pasted.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a production-ish client wrapper",
    intro: "Acceptance defines done; design the wrapper yourself.",
    steps: [
      { order: 1, action: "Wrap chat calls with: a timeout on every request; retry of transient failures with exponential backoff + jitter and a budget; and correct classification so permanent errors fail fast.", decision: "Where do you get token usage when streaming? (You must opt in via stream_options include_usage — decide how the wrapper exposes usage in both streaming and non-streaming modes.)" },
      { order: 2, action: "Support streaming with safe partial-output handling (progressive callback, and an explicit 'incomplete' signal if the stream drops).", expected: "Callers get streamed tokens and a final result, or a clear incomplete/failed outcome — never silently-truncated text treated as final." },
      { order: 3, action: "Track cost: capture prompt/completion tokens per call and accumulate an estimated cost (using per-token rates), logged for observability.", verify: "Every call is timed-out, transient-retried, and logs tokens + estimated cost; streaming interruptions are surfaced, not hidden." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Every request has a timeout; transient failures retry with backoff+jitter and a budget; permanent ones fail fast.",
      "Streaming is supported with explicit partial-output/interruption handling.",
      "Token usage is captured (including the stream_options path) and an estimated cost is logged per call.",
      "One wrapper is the single entry point, so behaviour is consistent across the app.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — resilient wrapper (core of the retry + cost path)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import random, time, logging
import openai

logger = logging.getLogger(__name__)
RATES = {"in": 0.0025, "out": 0.01}   # example USD / 1K tokens — check current pricing

def _retryable(exc: Exception) -> bool:
    if isinstance(exc, (openai.RateLimitError, openai.APITimeoutError, openai.APIConnectionError)):
        return True
    if isinstance(exc, openai.APIStatusError):
        return exc.status_code >= 500
    return False   # 400/401/403/404 -> permanent

def complete(client, *, model, messages, retries=4, base=0.5, timeout=30.0):
    for attempt in range(retries):
        try:
            resp = client.chat.completions.create(
                model=model, messages=messages, timeout=timeout,
            )
            u = resp.usage
            cost = u.prompt_tokens/1000*RATES["in"] + u.completion_tokens/1000*RATES["out"]
            logger.info("llm ok model=%s tokens=%s cost=$%.4f", model, u.total_tokens, cost)
            return resp
        except Exception as exc:
            if not _retryable(exc) or attempt == retries - 1:
                logger.warning("llm permanent/failed: %s", exc)
                raise
            delay = min(8.0, base * 2 ** attempt) * (0.5 + random.random() * 0.5)
            time.sleep(delay)   # exponential backoff + jitter`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Reliability is proven by injecting failures on purpose. Then design the whole client strategy for a demanding scenario.",
  },
  {
    type: "quiz",
    question: "Under a burst of load your app gets many 429s and, because every worker retries immediately, the provider stays overloaded and your latency explodes. Besides backoff+jitter, what else limits the damage?",
    choices: [
      "Retry forever until it works",
      "A retry budget (cap attempts/total time) plus respecting Retry-After, and shedding/queueing load — so you fail fast and stop amplifying the overload",
      "Remove all retries",
      "Switch every request to the most expensive model",
    ],
    answerIndex: 1,
    explanation: "Backoff+jitter desynchronises retries, but you also need to bound total retry effort (budget), honour the server's Retry-After, and control inflow (queue/shed) so you don't keep piling on. Infinite retries amplify outages; zero retries drops recoverable requests — bounded, jittered, guided retries are the balance.",
  },
  {
    type: "quiz",
    question: "A team 'controls cost' solely by switching to the cheapest model, and quality on their hardest task drops below acceptable. What did they miss?",
    choices: [
      "Nothing; cheapest is always right",
      "Cost is a tradeoff with latency, reliability, and QUALITY — they should also trim input tokens (history/context), cap output, cache stable prefixes, and route only hard cases to a stronger model, rather than degrade everything",
      "They should use the most expensive model everywhere",
      "Cost can't be controlled",
    ],
    answerIndex: 1,
    explanation: "Model choice is one lever among many, and it trades directly against quality. Trimming resent context, capping output, caching stable prefixes, and routing by difficulty often cut cost more safely than a blanket downgrade that sacrifices the quality the task requires.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design an API client strategy.** No step-by-step; cover the whole reliability + cost surface.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design the client strategy for a high-traffic assistant",
    intro: "Scenario: a customer-facing assistant handles thousands of streamed chats/hour. It must feel responsive, survive provider hiccups and rate limits, never double-charge on tool retries, and stay within a monthly budget.",
    steps: [
      { order: 1, action: "Specify: timeouts, the error classification, retry policy (backoff+jitter, budget, Retry-After, which errors), and streaming with interruption handling. State what is and isn't retried.", decision: "Which failures do you retry vs surface to the user immediately, and how do you keep retries from turning a provider blip into a self-inflicted outage?" },
      { order: 2, action: "Specify the cost strategy across levers: input-token trimming (history/context), output caps, prompt caching for the stable prefix, model routing by difficulty, and batching any non-interactive work. Tie each to its latency/quality/reliability tradeoff.", expected: "A budget approach that names several levers and their tradeoffs, not just 'use a cheaper model'." },
      { order: 3, action: "Address side effects: how tool calls (e.g. issuing a refund) stay safe under retries (idempotency keys) and how you observe cost/latency/error rates in production.", verify: "The design is responsive (streaming), resilient (bounded jittered retries on transient errors only), safe under retries (idempotency), budget-aware (multiple cost levers with tradeoffs), and observable." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Timeouts + error classification + backoff/jitter/budget + Retry-After are all specified; permanent errors fail fast.",
      "Streaming is used with explicit interruption/partial-output handling.",
      "Cost strategy names multiple levers (input trim, output cap, caching, routing, batching) with their tradeoffs — not just model choice.",
      "Side-effecting operations are idempotent under retries; cost/latency/errors are observable.",
    ],
  },
];

export const content: TopicContent = {
  "unit-api-streaming-robustness-01": learn,
  "unit-api-streaming-robustness-02": practice,
  "unit-api-streaming-robustness-03": build,
  "unit-api-streaming-robustness-04": review,
};
