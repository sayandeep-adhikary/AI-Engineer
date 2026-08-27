import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Conversation State & Memory Basics" (topic-api-conversation-state).
// 3 units: 01 learn (+ stateless experiment) · 02 practice (truncation) · 03 build
// (rolling-summary chat + mastery). Focus: WHERE does state live? The app owns it.
// Does NOT teach vector DBs / RAG implementation (later topics) — only the concept.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Here's a distinction that trips up almost everyone building their first chatbot: **LLM inference is stateless — the model does not remember previous API calls.** A coherent multi-turn conversation is an *illusion your application creates* by resending the history every time. Once you internalise 'the state lives in my app, not the model', memory, truncation, and summarisation all become obvious engineering problems instead of mysteries.",
  },
  {
    type: "prose",
    md: "**Mental model: every API call is a blank-slate function of the messages you send.** The model has no session, no memory of your last request, no idea two calls came from the same user. It sees *only* the `messages` array in *this* call and predicts the next tokens. If turn 5 'remembers' turn 1, it's because your application put turns 1–4 back into the messages array for turn 5. The whole topic reduces to one question: **where does the state actually live?** Answer: in your application, which chooses what to include each call.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Message history", definition: "The ordered list of prior user/assistant (and system) messages. Resending it is how the model 'sees' the conversation." },
      { term: "Application-owned state", definition: "The conversation (and any user profile/facts) stored and managed by YOUR app — the model never holds it between calls." },
      { term: "Short-term (working) memory", definition: "The recent turns you keep verbatim in the messages array so the immediate conversation stays coherent." },
      { term: "Long-term memory", definition: "Facts/preferences persisted across sessions (in a store) and selectively injected when relevant — conceptually, retrieval-based memory." },
      { term: "Rolling summary", definition: "A running summary of older turns that replaces them in the prompt, preserving the gist while freeing tokens." },
    ],
  },
  {
    type: "prose",
    md: "**See statelessness for yourself.** This experiment makes the abstract concrete. Run it with any chat API, or reason through the expected results.",
  },
  {
    type: "code",
    language: "python",
    caption: "Experiment — independent calls have no memory; you supply it",
    code: `# (A) Independent second call — NO history resent:
call1 = client.chat.completions.create(model=MODEL,
    messages=[{"role": "user", "content": "My name is Ada. Remember it."}])

call2 = client.chat.completions.create(model=MODEL,
    messages=[{"role": "user", "content": "What is my name?"}])   # fresh slate
# -> the model cannot know; it never saw call1. (It'll say it doesn't know.)

# (B) Same question, but the APPLICATION resends the history:
call3 = client.chat.completions.create(model=MODEL, messages=[
    {"role": "user", "content": "My name is Ada. Remember it."},
    {"role": "assistant", "content": "Got it, Ada."},
    {"role": "user", "content": "What is my name?"},
])
# -> "Ada" — not because the model remembered, but because YOU included turn 1.`,
  },
  {
    type: "prose",
    md: "That contrast is the entire lesson: (A) proves the model retains nothing between calls; (B) proves 'memory' is just *you re-including the relevant history*. The model in (B) isn't recalling — it's reading turn 1 fresh, because your application put it in the array. Nothing about 'same user' or 'same session' matters to the model.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Two calls with the same user ID don't share memory — the ID means nothing to the model",
    md: "A common bug: an app passes a `user` identifier on each request and assumes the model therefore 'knows' the earlier conversation for that user. It doesn't. Provider `user` fields are for abuse-monitoring/analytics, **not** memory — the model still only sees the messages in the current call. If your second request can't answer a question from the first, it's because you didn't resend that context, not because the model 'forgot'. Memory is a *storage-and-assembly* job your application does; the identifier is irrelevant to what the model can recall.",
  },
  {
    type: "prose",
    md: "**But you can't just resend everything forever** — you learned why in the tokens topic: history grows every turn, and unbounded history overflows the context window and inflates cost/latency. So conversation state is a **budget problem**: keep the conversation coherent while bounding tokens. The standard toolkit:\n\n- **Keep recent turns verbatim** (short-term memory) — the immediate back-and-forth needs full fidelity.\n- **Truncate** old turns — simplest, but you forget whatever you drop.\n- **Rolling summary** — fold older turns into a running summary that stays in the prompt: keeps the gist, costs a summarisation call.\n- **Retrieval-based memory** — store everything externally and pull back only the *relevant* pieces per turn. (This is the *concept*; the vector-database/RAG *implementation* is a later topic — here you just need to know that's where large or long-lived memory belongs.)\n- **Structured user state** — durable facts (name, plan, preferences) kept as data your app injects deliberately, not left to chance in chat history.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Don't lose the system prompt when you trim history",
    md: "When history exceeds the budget, the naïve fix is 'drop the oldest messages' — but the **system prompt is usually the oldest message**, and dropping it strips the model's rules, persona, and safety instructions mid-conversation, causing sudden behaviour changes. Always **preserve the system prompt (and any pinned facts)**, and truncate/summarise only the *conversational* turns. Structure your trimming as: keep [system] + [rolling summary] + [most recent N turns], and compress everything in between.",
  },
  {
    type: "prose",
    md: "**Cost and latency scale with what you resend.** Every turn pays for the *entire* assembled prompt — system prompt + summary + recent turns + this message — as input tokens, every time. Long histories aren't just a correctness risk (overflow); they're a recurring bill and a latency drag. Bounding context is simultaneously a coherence, cost, and speed decision — the same trade you saw in the tokens topic, now applied to multi-turn design.",
  },
  {
    type: "quiz",
    question: "Two API requests use the same user ID, but the second can't answer a question that depends on the first request's content. Why?",
    choices: [
      "A caching bug; clear the cache",
      "Inference is stateless: the model only sees the messages in the current call, and the user ID doesn't give it memory — the app didn't resend the earlier context",
      "The model forgot due to high temperature",
      "The two requests hit different servers",
    ],
    answerIndex: 1,
    explanation: "The model has no cross-call memory and the user ID isn't a memory key — it only sees the current messages. To answer from earlier content, the application must include that context (verbatim, summarised, or retrieved) in the second request. Statelessness, not forgetting.",
  },
  {
    type: "quiz",
    question: "A chat assistant starts behaving oddly — ignoring its persona and rules — after long conversations. History is trimmed by dropping the oldest messages when it gets long. What's the likely cause?",
    choices: [
      "The model is overheating",
      "The system prompt (oldest message) is being dropped during truncation, removing the model's rules mid-conversation; preserve system + pinned facts and only trim/summarise conversational turns",
      "Temperature drift over time",
      "The user ID expired",
    ],
    answerIndex: 1,
    explanation: "Blind oldest-first truncation eventually deletes the system prompt, so the model loses its instructions and persona. The fix is to always keep the system message (and any pinned facts), summarising/truncating only the middle conversational turns.",
  },
  {
    type: "takeaways",
    items: [
      "LLM inference is stateless: the model only sees the current messages and remembers nothing between calls; a user ID is not memory.",
      "'Memory' is your application resending relevant history — state lives in the app, not the model.",
      "Bound context: keep recent turns verbatim, summarise or truncate older ones, and use external/retrieval memory (concept) for large/long-lived state.",
      "Never drop the system prompt when trimming — keep [system] + [summary] + [recent turns].",
      "Every resent token costs money and latency each turn, so state management is a coherence + cost + speed tradeoff.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Implement the core bounding operation: keep a conversation within a token budget without losing coherence or the system prompt.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Budget-aware history truncation (guided)",
    intro: "Build the assembly step that fits a growing conversation into the window.",
    steps: [
      { order: 1, action: "Given a system message, a list of prior turns, and a new user message, write `build_messages(...)` that returns the messages to send while keeping the total under a token budget (reuse tiktoken from the tokens topic).", decision: "When you must cut, which messages are safe to drop and which must you keep? Where does the system prompt sit in your assembly, and why can't it be the thing you truncate?" },
      { order: 2, action: "Keep [system] + [most recent turns that fit] + [new user message]; drop the oldest conversational turns first. Reserve headroom for the model's output.", expected: "As the conversation grows, the assembled prompt stays under budget, always retains the system prompt, and keeps the most recent turns verbatim." },
      { order: 3, action: "Test with a long synthetic conversation and confirm the system prompt survives and the token total never exceeds the budget.", verify: "No assembled request exceeds the budget; the system prompt is always present; recent context is preserved." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "The assembled prompt always stays under the token budget with output headroom reserved.",
      "The system prompt is never dropped.",
      "The most recent turns are kept verbatim; oldest conversational turns are dropped first.",
      "You can explain why truncation loses information and when summarisation is the better tool.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a multi-turn chat that stays coherent PAST the context window** using a rolling summary — the deliverable. Truncation forgets; summarisation preserves the gist. This is where 'the app owns state' becomes a real design.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a summarising chat loop",
    intro: "Acceptance defines done; design the state management yourself.",
    steps: [
      { order: 1, action: "Maintain application state: a system prompt, a rolling `summary` of older turns, and a list of recent verbatim turns. Each turn, assemble [system] + [summary] + [recent turns] + [new message], within a token budget.", decision: "What triggers summarisation — a token threshold on the recent-turns buffer? When it triggers, which turns get folded into the summary and which stay verbatim?" },
      { order: 2, action: "When the recent buffer exceeds the threshold, summarise the oldest recent turns (an extra model call) INTO the rolling summary, then drop those turns from the verbatim buffer. Keep the newest turns for fidelity.", expected: "The conversation continues coherently well past the raw context window; older detail survives as summary, recent detail stays exact." },
      { order: 3, action: "Preserve the system prompt and any pinned durable facts (e.g. the user's name) so they never get summarised away or lost. Track/log token usage per turn.", verify: "A conversation far longer than the window stays coherent; the system prompt and pinned facts persist; per-turn tokens stay bounded." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "State (system + rolling summary + recent turns) is application-owned and reassembled each turn within a budget.",
      "Older turns are folded into a summary (not just dropped); recent turns stay verbatim.",
      "The system prompt and pinned durable facts are never lost.",
      "The chat stays coherent beyond the raw context window; per-turn token usage is bounded/tracked.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — rolling-summary chat turn",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `SYSTEM = "You are a helpful assistant. Be concise."

def chat_turn(state, user_msg, *, recent_budget_tokens=2000):
    # state = {"summary": str, "recent": list[dict], "facts": dict}
    messages = [{"role": "system", "content": SYSTEM}]
    if state["facts"]:
        messages.append({"role": "system", "content": f"Known facts: {state['facts']}"})
    if state["summary"]:
        messages.append({"role": "system", "content": f"Summary of earlier conversation: {state['summary']}"})
    messages += state["recent"] + [{"role": "user", "content": user_msg}]

    resp = client.chat.completions.create(model=MODEL, messages=messages)
    reply = resp.choices[0].message.content

    state["recent"] += [{"role": "user", "content": user_msg},
                        {"role": "assistant", "content": reply}]

    # Fold the oldest recent turns into the rolling summary when over budget.
    if count_tokens(state["recent"]) > recent_budget_tokens:
        old, state["recent"] = state["recent"][:-4], state["recent"][-4:]   # keep last 2 exchanges
        state["summary"] = summarize(state["summary"], old)   # one summarisation call
    return state, reply`,
  },
  {
    type: "prose",
    md: "**Mastery challenge — design the state architecture for a multi-turn assistant.** No step-by-step; answer 'where does each kind of state live?' while keeping context growth bounded.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design memory for a long-lived personal assistant",
    intro: "Scenario: an assistant users return to over weeks. It must recall durable facts (name, preferences, ongoing projects), stay coherent within a session, and never blow the context budget — across many sessions.",
    steps: [
      { order: 1, action: "Separate the kinds of state and where each LIVES: durable user facts/preferences (persistent store, injected deliberately), the current session's recent turns (verbatim buffer), older session content (rolling summary), and large/long-lived knowledge (external memory retrieved on demand — concept only).", decision: "Which facts must be stored as structured data and pinned every session vs. which can live in a summary that might drift? Why not just keep the entire multi-week transcript in the prompt?" },
      { order: 2, action: "Define the per-turn assembly and its budget: system + pinned facts + relevant retrieved memory + rolling summary + recent turns — within a token limit, with output headroom.", expected: "A design where context stays bounded every turn regardless of how long the user has been using the assistant." },
      { order: 3, action: "State the failure modes you're preventing (context overflow, lost system prompt, forgotten durable facts, unbounded cost) and how the architecture prevents each.", verify: "Every kind of state has an explicit home; the per-turn prompt is bounded; durable facts and the system prompt always survive; you can explain why the full transcript is never resent." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Each kind of state (durable facts, recent turns, older summary, external memory) has an explicit home — all application-owned.",
      "Per-turn assembly is bounded by a token budget with output headroom.",
      "Durable facts and the system prompt are always preserved; the full transcript is never blindly resent.",
      "Overflow, lost-system-prompt, forgotten-facts, and unbounded-cost failure modes are each addressed.",
    ],
  },
];

export const content: TopicContent = {
  "unit-api-conversation-state-01": learn,
  "unit-api-conversation-state-02": practice,
  "unit-api-conversation-state-03": build,
};
