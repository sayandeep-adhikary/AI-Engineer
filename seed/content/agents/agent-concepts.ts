import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "What Agents Are" (topic-agent-concepts).
// 2 units: 01 learn (agent loop reason→act→observe, autonomy spectrum, agent vs pipeline,
// termination, when NOT to use) · 02 review (classify agent vs pipeline + mastery).
// Builds on LangGraph stateful orchestration (Batch 7) and RAG (Batch 6). Deterministic
// keyless agent-loop simulation. Non-anthropomorphic throughout. Bridges to Project P4.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You can compose chains, run stateful graphs, and build RAG. An **agent** is the next step up — and the one most likely to be misused. Before any framework, get the concept exactly right: an agent is powerful *and* usually the more expensive, less predictable, harder-to-secure choice. The single most valuable skill in this whole category is knowing **when an agent is justified and when a plain pipeline wins.**",
  },
  {
    type: "prose",
    md: "**Mental model: an agent is a model calling tools in a loop until a task is done — the *model* decides the control flow.** Precisely, and without anthropomorphism: an agent is an LLM placed in a loop where, at each step, it (1) **reasons** about the current state, (2) **acts** by choosing a tool to call (or deciding it's finished), and (3) **observes** the tool's result, which feeds the next step. It repeats until a stop condition. It is not 'autonomous intelligence' — it's a control loop whose branching decisions are produced by a model. That framing is what lets you engineer it: loops, tools, and stop conditions are all things you control.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Agent", definition: "An LLM in a loop that chooses actions (tool calls) based on observations until a termination condition. 'Agent = model + harness' — the harness is the loop, tools, prompt, and controls around the model." },
      { term: "Agent loop (reason→act→observe)", definition: "One iteration: reason about state → act (call a tool or finish) → observe the result. Often called ReAct (reason+act). The loop repeats until done or bounded out." },
      { term: "Tool", definition: "A function the model can request to run (search, calculator, API, retrieval). Tools are how a text-only model *acts* on the world. No tools = no agency, just a chatbot." },
      { term: "Autonomy spectrum", definition: "From a fixed pipeline (no model-driven control) → a constrained agent (bounded tools/steps) → an open-ended agent. More autonomy = more capability but less predictability, higher cost, more risk." },
      { term: "Termination", definition: "The stop condition that ends the loop (task complete, step limit, cost budget). The hardest and most-neglected part of agent design — without it the loop can run forever." },
    ],
  },
  {
    type: "prose",
    md: "**Agent vs chain vs workflow vs RAG — the distinction that drives every decision:**\n\n- **Chain** (LCEL): a **fixed linear** sequence. Control flow is hard-coded; the model just fills steps.\n- **Workflow / state graph** (LangGraph): **you** define the branches, loops, and state explicitly. Control flow is yours, and deterministic where you want it.\n- **RAG**: retrieve → generate. It's usually a **pipeline** (fixed control flow), not an agent — even though it uses a model.\n- **Agent**: the **model** decides the control flow at runtime — which tool to call, with what arguments, and when to stop. Flexible for open-ended tasks, but the branching is non-deterministic because a model produces it.\n\nThe test isn't 'does it use an LLM' — chains, RAG, and agents all do. The test is **who decides the control flow: your code (pipeline/workflow) or the model (agent)?**",
  },
  {
    type: "code",
    language: "python",
    caption: "The agent loop, made concrete and deterministic (no model, no key)",
    code: `# A 'policy' stands in for the model's decision. Real agents replace it with an LLM call;
# the LOOP STRUCTURE is identical and is what you engineer.
def run_agent(task, tools, policy, max_steps=5):
    history = []
    for step in range(1, max_steps + 1):
        decision = policy(task, history)          # REASON: choose an action
        if decision["type"] == "final":
            return {"answer": decision["value"], "steps": step}
        result = tools[decision["tool"]](decision["arg"])   # ACT: call the chosen tool
        history.append((decision["tool"], decision["arg"], result))  # OBSERVE
    return {"answer": "stopped: step limit", "steps": max_steps}   # TERMINATION guard

tools = {"length": len, "upper": str.upper}
def policy(task, history):                          # deterministic stand-in for the model
    if not history:
        return {"type": "tool", "tool": "length", "arg": task}
    return {"type": "final", "value": f"'{task}' has {history[0][2]} chars"}

print(run_agent("agents", tools, policy))`,
    output: `{'answer': "'agents' has 6 chars", 'steps': 2}`,
  },
  {
    type: "prose",
    md: "Swap `policy` for a real model call and `tools` for real functions and you have an actual agent — the reason→act→observe loop and the `max_steps` **termination guard** are the parts *you* own. Notice the loop *always* stops: either the policy returns `final`, or the step limit trips. A loop with no guaranteed stop is the defining agent bug (next topics go deep on it).",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "The default mistake: an agent where a pipeline is better and cheaper",
    md: "Agents are fashionable, so they get used where a deterministic pipeline would be **faster, cheaper, more reliable, and easier to secure**. If the control flow is known in advance — 'always do A, then B, then C' — that's a **pipeline**, not an agent. Making it an agent means: multiple model calls (higher cost + latency), non-deterministic branching (harder to test), a loop that can misfire or not terminate, and a bigger security surface (the model now chooses actions). Reach for an agent only when the task genuinely requires **runtime, model-driven decisions** over which steps to take. 'It uses an LLM' is not 'it should be an agent.'"
  },
  {
    type: "callout",
    variant: "warning",
    title: "Don't anthropomorphize — an agent is not 'thinking' or 'deciding' like a person",
    md: "Language like 'the agent wants', 'understands', or 'is smart enough to' hides the engineering. Mechanically: a model predicts a tool call from the conversation so far; your code executes it and appends the result; the model predicts again. There's no persistent intent, no guarantee it picks the right tool, and no built-in stopping. Treating it as a person leads to under-engineering — no validation, no limits, no guardrails — because you assume it'll 'do the right thing.' Treat it as a **stochastic control loop you must bound and verify**, and you'll build reliable systems."
  },
  {
    type: "prose",
    md: "**When NOT to use an agent:**\n\n- The steps are **known and fixed** → pipeline/workflow (deterministic, cheap, testable).\n- You need **strict reliability or auditability** → fewer model-driven decisions, more deterministic code.\n- **Latency or cost** is tight → every agent step is a model call; loops multiply both.\n- The task is a **single transformation** (classify, summarize, extract) → one model call, no loop.\n\n**When an agent earns its cost:** the task requires **choosing among tools/steps at runtime based on intermediate results** — e.g. 'research this open-ended question using whatever tools help,' where you genuinely can't pre-plan the path. Even then, you bound it (tools, steps, cost, approvals).",
  },
  {
    type: "quiz",
    question: "A task is a deterministic three-step process: fetch a record, transform it, write it back. There's no branching and no runtime tool choice. Should it be an agent?",
    choices: [
      "Yes — anything with multiple steps should be an agent",
      "No — the control flow is fixed and known, so a pipeline/workflow is cheaper, faster, deterministic, and easier to test and secure. Making it an agent adds model calls, non-determinism, loop risk, and security surface for no benefit",
      "Yes — agents are always more professional",
      "Only if it uses a database",
    ],
    answerIndex: 1,
    explanation: "When the steps are fixed and there's no runtime, model-driven decision to make, an agent is pure overhead: extra model calls, non-deterministic branching, termination risk, and a larger attack surface. A deterministic pipeline does the same work more reliably and cheaply. Agents are for tasks needing runtime tool/step choices, not fixed sequences.",
  },
  {
    type: "quiz",
    question: "What most fundamentally distinguishes an agent from a RAG pipeline, given both use an LLM?",
    choices: [
      "Agents use bigger models",
      "WHO decides the control flow: in RAG your code fixes the flow (retrieve → generate), while in an agent the MODEL decides at runtime which tool to call and when to stop. The presence of an LLM isn't the distinction — model-driven control flow is",
      "RAG can't use tools and agents can't retrieve",
      "Agents don't need prompts",
    ],
    answerIndex: 1,
    explanation: "Chains, RAG, and agents all call models. The defining difference is control flow: a pipeline (including most RAG) has flow your code determines, whereas an agent delegates the branching (tool choice, iteration, termination) to the model at runtime. That non-determinism is the source of agents' flexibility and their cost/reliability challenges.",
  },
  {
    type: "takeaways",
    items: [
      "An agent = a model calling tools in a loop (reason→act→observe) until termination. Agent = model + harness (loop/tools/prompt/controls).",
      "The distinction from chains/RAG/workflows is WHO decides control flow: your code (pipeline) or the model at runtime (agent).",
      "Tools give a text-only model the ability to act; no tools = a chatbot, not an agent.",
      "More autonomy = more capability but less predictability, higher cost/latency, and more security surface; termination is the hardest part.",
      "Don't use an agent for fixed/known control flow or single transformations — a pipeline is cheaper, faster, more reliable. Don't anthropomorphize: it's a stochastic loop you must bound.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The core judgement of this category: given a task, is an agent justified, or is a pipeline the better engineering choice? Classify and justify — the cost of getting this wrong is real (money, latency, reliability, security).",
  },
  {
    type: "quiz",
    question: "Classify: 'An assistant that, given an arbitrary user question, may need to search docs, run a calculation, or call an API — in an order that depends on what it finds.' Agent or pipeline?",
    choices: [
      "Pipeline — you can hard-code the steps",
      "Agent — the tool sequence depends on runtime intermediate results and can't be pre-planned, which is exactly the case that justifies model-driven control flow (still bounded by step/cost limits and tool permissions)",
      "Neither — this is impossible",
      "Pipeline — agents can't call APIs",
    ],
    answerIndex: 1,
    explanation: "When the path genuinely depends on what earlier steps return and can't be fixed in advance, the model needs to choose tools at runtime — the defining case for an agent. The correct answer still bounds it (max steps, cost budget, least-privilege tools), because 'justified agent' never means 'unbounded agent.'",
  },
  {
    type: "quiz",
    question: "Classify: 'Summarize each incoming support email and tag it billing/technical/account.' Agent or pipeline?",
    choices: [
      "Agent — it involves language understanding",
      "Pipeline — it's a fixed single transformation (one model call, optionally with structured output) applied to each email; there's no runtime tool choice or multi-step branching, so an agent loop would be wasteful and less predictable",
      "Agent — anything with categories needs an agent",
      "Neither — email can't be processed",
    ],
    answerIndex: 1,
    explanation: "Summarize-and-classify is one deterministic transformation per item — a single (optionally structured-output) model call in a pipeline. There's no intermediate result driving a choice of tools, so no loop is needed. Using an agent adds cost, latency, and non-determinism with no benefit. Language understanding alone doesn't imply an agent.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — decide agent-vs-pipeline and justify.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Classify several tasks and defend each decision",
    intro: "Reason from control flow, cost, and reliability — not from novelty.",
    steps: [
      { order: 1, action: "For four tasks — (a) nightly data-cleaning with fixed steps, (b) an open-ended research assistant, (c) a customer-refund flow with conditional approval, (d) a one-shot document classifier — decide agent or pipeline (or workflow) and name the deciding factor for each.", expected: "(a) pipeline; (b) agent (runtime tool choice); (c) workflow/graph with a human approval branch — not necessarily a full agent; (d) pipeline (single transform)." },
      { order: 2, action: "For each task you called an agent, state how you'd BOUND it (max steps, cost budget, allowed tools, approvals). For each you called a pipeline, state what you'd gain over an agent (determinism, cost, testability).", decision: "Which task is the closest call, and what single fact would flip your decision?" },
      { order: 3, action: "State the general rule you'll apply going forward for agent-vs-pipeline, in one sentence, grounded in 'who decides control flow.'", verify: "Each task has a justified classification tied to control flow/cost/reliability; agent choices are bounded; you can articulate a reusable decision rule." },
    ],
  },
  {
    type: "checkpoint",
    title: "Self-check",
    items: [
      "You can classify tasks as agent / workflow / pipeline by who decides control flow.",
      "You can justify each with cost, latency, reliability, and security reasoning.",
      "For agent tasks, you always specify bounds (steps/cost/tools/approvals).",
      "You have a one-sentence reusable rule for agent-vs-pipeline.",
    ],
  },
];

export const content: TopicContent = {
  "unit-agent-concepts-01": learn,
  "unit-agent-concepts-02": review,
};
