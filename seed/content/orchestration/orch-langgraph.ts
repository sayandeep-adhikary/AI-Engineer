import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Stateful Orchestration (LangGraph)" (topic-orch-langgraph).
// 3 units: 01 learn (state/nodes/edges/conditional routing/loops/checkpoints/HITL/interrupts,
// chain-vs-agent-vs-graph, failure modes) · 02 build (stateful multi-step workflow) · 03 review
// (control vs plain chain + the 4-way decision framework + mastery).
// Verified against current LangGraph (docs.langchain.com/oss/python/langgraph): StateGraph,
// TypedDict state + reducers (add_messages), add_conditional_edges, START/END, compile(
// checkpointer=InMemorySaver()), interrupt + Command(resume=...), idempotency/recursion-limit.
// Deterministic keyless graph example. This is the last topic: it carries the cross-framework
// decision framework and bridges to agents (Project P4).

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "A LangChain chain runs a fixed sequence. An agent loops, but the *model* decides the control flow. **LangGraph** is for when *you* need explicit control over a multi-step, stateful flow — branching, loops, retries, persistence, and human-in-the-loop — modeled as a **graph** you design. It's the bridge from linear chains to controllable agentic systems, and it's what LangChain's own agents are built on. This unit teaches graph/state-machine thinking; it's also the last topic in this category, so it closes with a decision framework across all four approaches.",
  },
  {
    type: "prose",
    md: "**Mental model: a LangGraph app is a state machine — shared `State`, `nodes` that update it, and `edges` that decide what runs next.**\n\n- **State** — a shared data structure (a `TypedDict`) that every node reads and writes. It *is* the memory of the flow.\n- **Nodes** — plain functions `(state) -> partial update`. They do the work (call a model, run code, hit a tool).\n- **Edges** — how control flows between nodes. Normal edges are fixed (`A → B`); **conditional edges** call a routing function to choose the next node, which is how you get **branching and loops**.\n\n*Nodes do the work; edges decide what to do next.* You define the graph, `compile()` it, and `invoke()` it with an initial state.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "State (TypedDict)", definition: "The shared schema every node reads/writes. Nodes return partial updates; a reducer decides how each key merges (default = overwrite; add_messages / operator.add = append)." },
      { term: "Node", definition: "A function (state) -> dict of updates. Contains an LLM call or plain code. Added with builder.add_node(name, fn)." },
      { term: "Conditional edge", definition: "add_conditional_edges(node, routing_fn, mapping): the routing function inspects state and returns which node runs next — the mechanism for branching, loops, and termination." },
      { term: "Checkpointer", definition: "Persistence for state across steps/runs (e.g. InMemorySaver). compile(checkpointer=...) + a thread_id lets a flow pause, resume, and remember — the basis for memory and human-in-the-loop." },
      { term: "interrupt / human-in-the-loop", definition: "interrupt(value) pauses the graph at a node and waits; you resume with Command(resume=...). Requires a checkpointer. Lets a human approve/edit before the flow continues." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "A deterministic stateful graph with branching + a loop — NO API key needed",
    code: `from typing import TypedDict
from langgraph.graph import StateGraph, START, END

class State(TypedDict):        # the shared memory of the flow
    n: int
    log: list

def increment(state: State) -> dict:      # a node: returns a PARTIAL update, doesn't mutate
    new_n = state["n"] + 1
    return {"n": new_n, "log": state["log"] + [f"inc->{new_n}"]}

def route(state: State) -> str:           # conditional edge: decides what's next
    return "continue" if state["n"] < 3 else "stop"   # <-- the TERMINATION condition

builder = StateGraph(State)
builder.add_node("increment", increment)
builder.add_edge(START, "increment")
builder.add_conditional_edges("increment", route, {"continue": "increment",  # loop back
                                                    "stop": END})              # terminate
graph = builder.compile()

print(graph.invoke({"n": 0, "log": []}))`,
    output: `{'n': 3, 'log': ['inc->1', 'inc->2', 'inc->3']}`,
  },
  {
    type: "prose",
    md: "No model, no key — yet it shows every core idea: **shared state**, a **node** that returns updates (not mutations), a **conditional edge** that creates a **loop**, and an explicit **termination condition** (`n < 3`). Swap `increment` for a node that calls a model or a tool and you have a real agentic step; the *control structure* is identical and fully under your control. That control is the whole reason LangGraph exists.",
  },
  {
    type: "prose",
    md: "**Chain vs agent loop vs stateful graph** — the distinction the review unit tests:\n\n- **Chain** (LCEL `prompt | model | parser`): a **fixed, linear** sequence. Predictable, no branching or loops. Great for straightforward transforms.\n- **Agent loop** (`create_agent`): the **model** decides which tool to call and when to stop, looping automatically. Flexible, but control flow is delegated to the model — less predictable, harder to bound.\n- **Stateful graph** (LangGraph): **you** define nodes, edges, and explicit state, so branching, loops, retries, persistence, and human checkpoints are **explicit and controllable**. You can mix deterministic steps with agentic ones. More setup, maximum control.\n\nUse a chain for linear flows, an agent for open-ended tool use, and a graph when you need **explicit control** over a multi-step, stateful process.",
  },
  {
    type: "code",
    language: "python",
    caption: "Persistence + human-in-the-loop (checkpointer + interrupt)",
    code: `from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command

def human_review(state):
    decision = interrupt("Approve this action?")   # PAUSES the graph here
    return {"approved": decision == "yes"}

# A checkpointer makes state durable and enables pause/resume; thread_id scopes the state.
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "session-1"}}

graph.invoke({...}, config)              # runs until interrupt(), then pauses
graph.invoke(Command(resume="yes"), config)   # resumes; interrupt() returns "yes"`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "The failure modes that bite stateful graphs",
    md: "- **Unintended infinite loops.** A conditional edge that never routes to `END` (a broken termination condition) loops forever. LangGraph's **recursion limit** stops it with a `GraphRecursionError` — a safety net, not a design. Always define an explicit stop condition; consider a step/counter guard.\n- **State shape / mutation bugs.** Nodes must **return partial updates**, not mutate state in place, and must return keys that exist in the schema. Forgetting a **reducer** means updates **overwrite** instead of append — e.g. a `messages` list needs `add_messages` (or `operator.add`) or each node clobbers history.\n- **Retrying non-idempotent work.** On resume (after an interrupt/retry), a node **re-runs from the start of its function** — code and side effects *before* the pause run **again**. If a node charges a card, inserts a row, or sends an email, retrying duplicates it. Make node side effects **idempotent** (upserts, idempotency keys, read-before-write) — the same idempotency lesson from streaming/RAG, now enforced by the execution model.\n- **Checkpoint assumptions.** State only persists across runs if you compiled with a **checkpointer** and pass a **thread_id**; without them, there's no memory and `interrupt`/resume won't work.\n- **Uncontrolled agent/tool loops.** An agentic node that keeps calling tools with no termination or cost bound is the runaway-cost failure. Bound iterations/cost explicitly — control is the point of using a graph."
  },
  {
    type: "quiz",
    question: "A LangGraph workflow runs forever and eventually raises GraphRecursionError. Which graph property should you inspect first?",
    choices: [
      "The embedding model",
      "The termination condition in your conditional edge(s): a routing function that never returns END (or a state value that never satisfies the stop condition) creates an infinite loop. The recursion limit caught it — fix the routing/stop logic so the loop can exit",
      "The checkpointer's disk space",
      "The system prompt wording",
    ],
    answerIndex: 1,
    explanation: "An infinite loop means the graph never routes to END. Inspect the conditional edge's routing function and the state it checks — the stop condition is wrong, unreachable, or missing. The GraphRecursionError is the safety net; the fix is correct termination logic (and often an explicit step/counter guard).",
  },
  {
    type: "quiz",
    question: "A node inserts a payment record. After an interrupt-and-resume, customers are charged twice. What architectural assumption failed?",
    choices: [
      "The graph library is broken",
      "That the node runs exactly once. On resume, a node re-executes from the start of its function, so side effects before the pause run again. Non-idempotent work (a raw INSERT/charge) duplicates — you must make node side effects idempotent (idempotency keys, upserts, read-before-write)",
      "The state schema was too large",
      "The checkpointer should prevent all re-execution",
    ],
    answerIndex: 1,
    explanation: "LangGraph checkpoints at super-step boundaries, not mid-node, so a resumed node re-runs its whole function — repeating side effects that ran before the pause. Non-idempotent operations (charging, inserting, emailing) duplicate. The fix is idempotent design: idempotency keys, upserts, or read-before-write — never assume a node body runs exactly once.",
  },
  {
    type: "takeaways",
    items: [
      "LangGraph models a flow as a state machine: shared State (TypedDict), nodes (state→partial update), edges (conditional routing = branching/loops).",
      "Chain = fixed linear; agent loop = model-driven control; stateful graph = YOU control branching/loops/state/persistence/HITL explicitly.",
      "Checkpointer + thread_id = durable state, pause/resume, and interrupt-based human-in-the-loop.",
      "Nodes return partial updates (don't mutate); list state needs a reducer (add_messages / add) or updates overwrite.",
      "Failure modes: no termination → infinite loop (recursion limit); non-idempotent side effects duplicate on resume; missing checkpointer = no memory; unbounded agent/tool loops burn cost.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a stateful multi-step workflow with explicit state and branching.** The completion criterion is 'flow has explicit state and branching' — so design a graph where state carries information across steps and a conditional edge routes based on that state, with a real termination condition. This is also the on-ramp to Project P4 (agents), which is built on exactly these primitives.",
  },
  {
    type: "callout",
    variant: "note",
    title: "What 'done' looks like",
    md: "A compiled LangGraph with: a typed **State**, at least **two nodes**, at least one **conditional edge** that branches on state, an explicit **termination** path to `END`, and (if it loops) a guard so it can't run forever. Bonus: a **checkpointer + thread_id** for durable state, or an **interrupt** for human-in-the-loop. Nodes should return partial updates (not mutate), and any side effect must be idempotent. Keep it small and inspectable — you can build and run the control structure entirely keyless (nodes that manipulate state), then swap in model/tool calls."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — an explicit, controllable multi-step flow",
    intro: "Acceptance defines done. Make state and branching explicit; ensure it terminates.",
    steps: [
      { order: 1, action: "Define a State (TypedDict) that carries information across steps. Add ≥2 nodes that each return partial updates. Wire START → first node, and a conditional edge that routes to different nodes (or END) based on a state value.", decision: "What state value drives your branch, and what is the EXACT termination condition that guarantees the flow reaches END?" },
      { order: 2, action: "If the flow loops, add a guard (a counter in state, or check the routing logic) so it cannot loop forever. Confirm the graph terminates for all inputs you try. Ensure any node side effect is idempotent.", expected: "The graph branches based on state and always terminates; nodes return updates without mutating; side effects are safe to re-run." },
      { order: 3, action: "Optionally add a checkpointer + thread_id (durable state / resumable) or an interrupt (human approval). Inspect the state after each step (stream updates) to verify the flow behaves as designed.", verify: "A compiled graph with explicit state, conditional branching, guaranteed termination, update-not-mutate nodes, and inspectable step-by-step state — optionally durable or human-in-the-loop." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Typed State carries information across ≥2 nodes; nodes return partial updates (no mutation).",
      "A conditional edge branches on a state value; an explicit termination path reaches END.",
      "Loops (if any) are guarded so the flow always terminates; side effects are idempotent.",
      "Step-by-step state is inspectable; optionally checkpointer+thread_id or interrupt added.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — a guarded, branching stateful workflow (keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
    query: str
    attempts: int
    quality: int          # pretend "retrieval quality" score
    result: str

def retrieve(state: State) -> dict:
    # a node: bump attempts, compute a (here deterministic) quality signal
    attempts = state["attempts"] + 1
    quality = min(state["quality"] + 4, 10)      # improves each retry (stand-in)
    return {"attempts": attempts, "quality": quality}

def finalize(state: State) -> dict:
    return {"result": f"answered '{state['query']}' after {state['attempts']} tries"}

def route(state: State) -> Literal["retry", "done"]:
    # branch on STATE, with a guard so it can't loop forever
    if state["quality"] >= 8:
        return "done"
    if state["attempts"] >= 3:        # <-- termination guard (no infinite loop)
        return "done"
    return "retry"

builder = StateGraph(State)
builder.add_node("retrieve", retrieve)
builder.add_node("finalize", finalize)
builder.add_edge(START, "retrieve")
builder.add_conditional_edges("retrieve", route, {"retry": "retrieve", "done": "finalize"})
builder.add_edge("finalize", END)
graph = builder.compile()

# Inspect each super-step's state update (great for debugging routing):
for step in graph.stream({"query": "refunds?", "attempts": 0, "quality": 0, "result": ""}):
    print(step)
# {'retrieve': {'attempts': 1, 'quality': 4}}
# {'retrieve': {'attempts': 2, 'quality': 8}}
# {'finalize': {'result': "answered 'refunds?' after 2 tries"}}`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "When is a graph's control actually warranted over a plain chain — and, stepping back, how do you choose among the direct SDK, LangChain, LlamaIndex, and LangGraph? This unit answers both, and it's the capstone decision framework for the whole category.",
  },
  {
    type: "quiz",
    question: "You have a strictly linear flow: format a prompt, call the model, parse the result. A teammate wants to build it as a LangGraph. Is a graph warranted?",
    choices: [
      "Yes — graphs are always more professional",
      "No — a linear flow with no branching, loops, or persistent state is exactly what a plain chain (LCEL) is for. A graph adds state/node/edge machinery with no payoff here; use a graph when you need explicit branching, loops, retries, persistence, or human-in-the-loop",
      "Yes — chains can't call models",
      "Only if the prompt is long",
    ],
    answerIndex: 1,
    explanation: "Graphs earn their complexity when control flow is non-trivial — branching, loops, durable state, human checkpoints. A straight prompt→model→parse pipeline has none of that, so a chain is simpler and clearer. Using a graph for a trivially linear flow is this topic's common mistake (over-engineering control you don't need).",
  },
  {
    type: "prose",
    md: "**The cross-framework decision framework.** These capabilities overlap heavily, and real systems combine them — treat this as guidance, not law:\n\n- **Direct provider SDK** — best when the app is **simple** and **provider-specific control** matters: one or few calls, no orchestration, minimal dependencies, tight control over params/errors.\n- **LangChain** — useful for **composable orchestration**: chaining prompts/models/tools/retrievers, provider-swapping, agents (`create_agent`), and tracing. The general-purpose composition layer.\n- **LlamaIndex** — particularly strong when the app is **centered on data**: ingestion, indexing, retrieval, and knowledge workflows, with batteries-included query engines.\n- **LangGraph** — for **explicit stateful workflows/agent graphs**: branching, loops, persistence, human-in-the-loop, durable execution, and controllable multi-step/agentic behavior.\n\nThey are **not** mutually exclusive: a system might use LlamaIndex for retrieval, LangChain components for composition, and LangGraph for the stateful control loop.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "The choice depends on more than capabilities",
    md: "Don't pick by feature list alone. Weigh: **application complexity** (simple → SDK; multi-step → framework), **state requirements** (stateless → chain; stateful/branching → graph), **retrieval/data needs** (data-heavy → LlamaIndex), **provider lock-in** tolerance, **observability** needs (tracing), **operational maturity** (durable execution, persistence), **team familiarity**, **dependency/version cost** (these libraries move fast — you saw LangChain's API and docs shift), and **debugging requirements** (can you see through the abstraction?). The low-regret default: **start with the simplest thing that works (often the SDK), and adopt a framework when a concrete need appears** — because adding one later is easier than removing one you didn't need."
  },
  {
    type: "quiz",
    question: "A multi-step support agent must: retrieve from a knowledge base, call tools, sometimes pause for human approval on refunds, remember the conversation, and never loop forever. Which approach fits the CONTROL layer best, and why?",
    choices: [
      "A single LCEL chain — it's simplest",
      "LangGraph — it needs explicit state (conversation + flags), branching (refund vs not), a human-in-the-loop pause (interrupt), persistence (memory across turns), and guaranteed termination — exactly what a stateful graph provides. Retrieval could still be LlamaIndex; composition could use LangChain components",
      "The raw SDK with no structure",
      "LlamaIndex alone, because it does retrieval",
    ],
    answerIndex: 1,
    explanation: "Explicit state, branching, human-in-the-loop, cross-turn memory, and controlled termination are the defining needs LangGraph addresses. A linear chain can't express them; the SDK alone means rebuilding all of it; LlamaIndex handles retrieval, not the stateful control loop. The mature answer composes: LlamaIndex/LangChain for retrieval/composition, LangGraph for control.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design a controllable workflow and place it in the decision framework.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design a LangGraph workflow with explicit state and termination",
    intro: "Show control and judgement together.",
    steps: [
      { order: 1, action: "Design (state schema + nodes + edges) a multi-step workflow that includes at least one branch and one loop with a guaranteed termination condition — e.g. a retrieve→check-quality→(retry|answer) loop, or a draft→review→(revise|approve) loop. State the exact stop condition.", expected: "A graph design where state drives branching and the loop provably terminates (quality threshold or attempt cap)." },
      { order: 2, action: "Identify every failure mode you designed against: infinite loop (guard), non-idempotent side effects (idempotency), state overwrite (reducer), missing persistence (checkpointer if needed). Note where an interrupt/human-in-the-loop belongs, if any.", decision: "Which steps are deterministic code vs model/agent calls, and why does making that split explicit improve control and debuggability?" },
      { order: 3, action: "Justify WHY this is a graph and not a plain chain or a bare agent loop, and place your choice in the 4-way framework (SDK / LangChain / LlamaIndex / LangGraph) — including which OTHER frameworks you'd combine it with and why.", verify: "A terminating, branching graph design; explicit defenses against the key failure modes; and a reasoned placement in the cross-framework decision framework (with composition, not either/or)." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A graph design with explicit state, ≥1 branch, and a loop with a guaranteed termination condition.",
      "Explicit defenses: loop guard, idempotent side effects, correct reducer, checkpointer where needed.",
      "You can justify graph vs chain vs agent loop for the workload.",
      "You placed the choice in the SDK/LangChain/LlamaIndex/LangGraph framework and named sensible combinations.",
    ],
  },
];

export const content: TopicContent = {
  "unit-orch-langgraph-01": learn,
  "unit-orch-langgraph-02": build,
  "unit-orch-langgraph-03": review,
};
