import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Multi-Agent & Orchestrated Systems" (topic-agent-multiagent).
// 4 units: 01 learn (patterns: orchestrator/worker, handoffs, overhead; ROI vs single agent)
// · 02 build (2-agent collaboration) · 03 review (compare to single-agent) · 04 project
// (Deliver Project P4 — the capstone). Track: optional-depth. Skeptical framing ("multi-agent
// theater"). Deterministic single-vs-multi cost comparison. P4 milestone mapping made explicit.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Multi-agent systems are the most over-hyped idea in this category. The pitch — 'a team of specialized agents collaborating' — sounds powerful, and sometimes it is. But far more often it's **multi-agent theater**: extra model calls, coordination overhead, and compounding errors doing what one well-designed agent with good tools could do more cheaply and reliably. This topic teaches the patterns *and* the skepticism to judge their ROI honestly.",
  },
  {
    type: "prose",
    md: "**Mental model: a multi-agent system is multiple agent loops that communicate — and communication is not free.** Instead of one model+harness, you run several, each with its own context, passing messages (handoffs) between them. That buys **context isolation** (each agent has a clean, focused context), **specialization** (distinct roles/tools), and sometimes **parallelism**. It costs **more model calls, more latency, coordination complexity, and error propagation** (one agent's mistake becomes another's input). The engineering question is never 'is multi-agent cool?' but 'does the isolation/specialization/parallelism benefit exceed the overhead — versus a single agent baseline?'",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Orchestrator / worker", definition: "A coordinator agent decomposes a task and delegates sub-tasks to specialized worker agents, then aggregates their results. The most common and useful multi-agent shape." },
      { term: "Handoff", definition: "Passing control (and context) from one agent to another. Each handoff is a message + often a model call; handoffs are where context is lost or errors propagate." },
      { term: "Role specialization", definition: "Giving each agent a focused role, prompt, and tool set (e.g. researcher, writer, checker). Helps when roles genuinely need different tools/context that don't fit one agent well." },
      { term: "Context isolation", definition: "Each subagent runs in its own context window, so one agent's clutter doesn't pollute another's. A real benefit for long tasks that would overflow a single context." },
      { term: "Communication overhead", definition: "The extra model calls, tokens, latency, and coordination logic multi-agent systems add. The core cost you weigh against the benefits — and the source of 'multi-agent theater.'" },
    ],
  },
  {
    type: "prose",
    md: "**The patterns worth knowing:**\n\n- **Orchestrator/worker** (a.k.a. supervisor + subagents): a coordinator plans and delegates to workers, then combines results. Good when sub-tasks are genuinely separable and benefit from isolated contexts or parallel execution.\n- **Sequential handoffs**: agent A finishes and hands to agent B (e.g. research → draft → review). Simple, but each handoff risks losing context.\n- **Parallel workers**: several workers tackle independent sub-tasks at once, results merged. The clearest win — real parallelism the single-agent loop can't get.\n\nFrameworks provide these (e.g. subagent middleware), but the pattern matters more than the API: **decompose, delegate, aggregate**, with explicit roles and bounded loops per agent.",
  },
  {
    type: "code",
    language: "python",
    caption: "Single-agent vs orchestrator/worker — counting the overhead (deterministic)",
    code: `def cost(model_calls, per_call=0.01):
    return round(model_calls * per_call, 3)

# Single agent solves the task in 4 loop steps = 4 model calls.
single = cost(4)

# Orchestrator/worker: orchestrator (plan + delegate + aggregate = 3) + worker A (2) +
# worker B (2) = 7 model calls for the SAME task.
multi = cost(3 + 2 + 2)

print("single-agent calls cost:", single)
print("multi-agent calls cost: ", multi)
print("overhead:", round(multi / single, 2), "x")`,
    output: `single-agent calls cost: 0.04
multi-agent calls cost:  0.07
overhead: 1.75 x`,
  },
  {
    type: "prose",
    md: "For the *same task*, the multi-agent version cost **1.75×** more model calls here — and that's a small example; real orchestration overhead is often larger, plus added latency and coordination code. That overhead is only worth paying when the multi-agent structure buys something a single agent genuinely can't: isolated contexts for a task too big for one window, real parallelism, or specializations that can't coexist in one agent. If it doesn't, you've built theater.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Multi-agent theater — the default failure mode",
    md: "The common mistake this topic exists to prevent: **using multiple agents where one agent with good tools suffices.** Signs you're building theater:\n\n- The 'agents' are really just steps in a fixed pipeline dressed up as collaborators (that's a workflow, not a multi-agent system).\n- Each 'agent' could be a tool or a single prompt; the roles don't need isolated contexts or different tools.\n- Handoffs mostly shuffle context around, losing information and adding latency, without enabling parallelism or isolation.\n- You can't state a concrete task a single well-tooled agent would fail at that the multi-agent version succeeds at.\n\n**The baseline is always a single agent with good tools.** Multi-agent must beat *that*, measurably, on cost-adjusted quality — not just look sophisticated. When in doubt, one bounded agent with the right tools is simpler, cheaper, and easier to debug and secure."
  },
  {
    type: "quiz",
    question: "A team builds a 'research → write → edit' feature as three agents handing off to each other, for a task with a fixed order and no parallelism. Is multi-agent justified?",
    choices: [
      "Yes — three roles means three agents",
      "Probably not — a fixed-order sequence with no parallelism or genuine context-isolation need is a WORKFLOW (or one agent with tools), not a multi-agent win. The handoffs add cost/latency and risk context loss without a benefit a single tooled agent couldn't provide",
      "Yes — more agents always means better quality",
      "Only if each agent uses a different company's model",
    ],
    answerIndex: 1,
    explanation: "A fixed pipeline of roles with no parallelism or real isolation need is better modeled as a workflow or a single agent with tools. Splitting it into handing-off agents adds model calls, latency, and context-loss risk with no offsetting benefit — the essence of multi-agent theater. Multi-agent must beat the single-agent baseline for a concrete reason.",
  },
  {
    type: "quiz",
    question: "Which scenario is the STRONGEST genuine case for a multi-agent system?",
    choices: [
      "A single-step classification task",
      "A large research task split into many INDEPENDENT sub-questions that can run in PARALLEL, each needing its own focused context that would overflow a single window — parallel workers give real speedup and isolation a single agent loop can't",
      "Any task that involves writing text",
      "A task with a fixed, known sequence of steps",
    ],
    answerIndex: 1,
    explanation: "Independent sub-tasks that run in parallel and each need an isolated context are exactly what multi-agent (parallel workers) provides and a single sequential loop can't: genuine speedup plus context isolation for work too large for one window. That concrete benefit justifies the overhead — unlike single-step, fixed-sequence, or generic text tasks.",
  },
  {
    type: "takeaways",
    items: [
      "A multi-agent system is several communicating agent loops; it buys context isolation, specialization, and parallelism at the cost of more calls, latency, coordination, and error propagation.",
      "Core patterns: orchestrator/worker (decompose→delegate→aggregate), sequential handoffs, parallel workers.",
      "The baseline is ALWAYS a single agent with good tools; multi-agent must beat it on cost-adjusted quality for a concrete reason.",
      "'Multi-agent theater' = many agents where one tooled agent suffices; fixed-sequence roles are a workflow, not a multi-agent win.",
      "Justified when sub-tasks are genuinely parallel/independent or need isolated contexts too big for one window — not because it looks sophisticated.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a minimal two-agent collaboration** — the completion criterion is 'two agents cooperate on a task.' Keep it small and honest: a coordinator and a worker (or two specialized agents with one handoff), each a bounded loop, cooperating on a task where the split has a *reason*. You'll compare it to a single-agent baseline in the next unit.",
  },
  {
    type: "callout",
    variant: "note",
    title: "What 'done' looks like",
    md: "Two agents, each with its own role/prompt/tools and its own bounded loop (step + cost limits from the memory-planning topic), cooperating via an explicit handoff to complete a task. Choose a task where the split is defensible (isolated context or specialization), pass context explicitly at the handoff (don't assume shared memory), and keep each agent's trust boundaries (tool validation, results-as-untrusted). Keep generation optional/inspectable; the coordination structure should be demonstrable without a live model."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — two cooperating agents",
    intro: "Acceptance defines done. Keep each agent bounded; make the handoff explicit.",
    steps: [
      { order: 1, action: "Define two agents with distinct roles, prompts, and tool sets (e.g. a researcher that gathers and a writer/checker that produces the result). Give each its own bounded loop (step + cost limits).", decision: "What is the REASON for splitting this task into two agents (isolation? specialization? parallelism?), and what would a single agent with both tool sets do instead?" },
      { order: 2, action: "Implement the handoff: agent A's output is passed EXPLICITLY as agent B's input (don't rely on hidden shared state). Run the pair on a task and confirm they cooperate to a result. Track total model calls / cost across both.", expected: "The two agents complete the task via an explicit handoff; total cost/calls are measured." },
      { order: 3, action: "Preserve the safeguards: each agent bounded and terminating, tool calls validated/authorized, results treated as untrusted, and context passed intact at the handoff (note where information could be lost).", verify: "Two role-specialized, bounded agents cooperate via an explicit handoff to complete a task; total cost is tracked; safeguards hold; you can state why the split is justified (or admit it isn't)." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Two agents with distinct roles/prompts/tools, each a bounded, terminating loop.",
      "An explicit handoff passes context from one agent to the other (no hidden shared state).",
      "They cooperate to complete a task; total model calls / cost are measured.",
      "Trust boundaries hold; you can justify the split or acknowledge a single agent would do.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — two bounded agents with an explicit handoff (keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def bounded_agent(name, task, act_fn, max_steps=4):
    memory, calls = [], 0
    for step in range(1, max_steps + 1):
        calls += 1
        done, output = act_fn(task, memory)     # a real agent: model + tools
        memory.append(output)
        if done:
            return {"agent": name, "output": output, "calls": calls, "trace": memory}
    return {"agent": name, "output": memory[-1], "calls": calls, "trace": memory}

# Researcher gathers; writer composes from the researcher's OUTPUT (explicit handoff).
def research_act(task, memory):
    return (len(memory) >= 2, f"fact-{len(memory)+1}")
def write_act(brief, memory):
    return (True, f"report using {brief['output']}")

def collaborate(task):
    researcher = bounded_agent("researcher", task, research_act)
    writer = bounded_agent("writer", researcher, write_act)      # HANDOFF: pass A's result to B
    total_calls = researcher["calls"] + writer["calls"]
    return {"result": writer["output"], "total_calls": total_calls}

print(collaborate("summarize the topic"))
# {'result': 'report using fact-3', 'total_calls': 4}`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Now the honest judgement: was the second agent worth it? The completion criterion is 'you judge multi-agent ROI critically' — which means comparing to a single-agent baseline, not admiring the architecture.",
  },
  {
    type: "quiz",
    question: "Your two-agent system produces slightly better output than a single agent but uses ~1.8× the model calls and adds latency. How do you judge its ROI?",
    choices: [
      "Keep it — any quality gain justifies multi-agent",
      "Weigh the quality gain against the ~1.8× cost + latency for YOUR requirements: a small gain rarely justifies near-double cost unless quality is critical and latency-tolerant. Often the right move is to fold the second agent's role into the single agent as a tool/step. Multi-agent must clearly beat the single-agent baseline",
      "Remove it — single agents are always better",
      "Keep it because multi-agent is more advanced",
    ],
    answerIndex: 1,
    explanation: "A marginal quality gain bought with ~1.8× cost and added latency usually fails a cost-adjusted comparison. Unless quality is critical and latency-tolerant, folding the role into the single agent (as a tool or step) is simpler and cheaper. 'More advanced' is not an ROI argument; beating the single-agent baseline measurably is.",
  },
  {
    type: "quiz",
    question: "When does a multi-agent design MOST clearly earn its overhead over a single well-tooled agent?",
    choices: [
      "When you want the system to look sophisticated",
      "When sub-tasks are genuinely independent and run in PARALLEL (real speedup), or each needs an isolated context too large for one window — benefits a single sequential agent structurally cannot provide, outweighing the communication overhead",
      "Whenever the task has more than one step",
      "Whenever you use more than one tool",
    ],
    answerIndex: 1,
    explanation: "Real parallelism and context isolation for oversized tasks are structural benefits a single sequential loop can't achieve, so they can justify the overhead. Multi-step or multi-tool tasks alone don't — a single agent handles those. The ROI case rests on concrete structural advantages, not appearance or step/tool count.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — judge multi-agent ROI against a baseline.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Compare your two-agent system to a single-agent baseline",
    intro: "Decide with evidence, and be willing to collapse it back to one agent.",
    steps: [
      { order: 1, action: "Build a single-agent baseline (one bounded agent with BOTH tool sets) for the same task your two-agent system solves. Run both on the same inputs; record output quality, total model calls/cost, and latency.", expected: "A head-to-head comparison: quality vs cost vs latency for single vs multi." },
      { order: 2, action: "Decide whether the multi-agent version is worth it. If the gain doesn't beat the overhead, collapse it to the single-agent design and say why. If it does, name the specific structural benefit (parallelism/isolation) that justifies it.", decision: "What concrete, measurable thing does your multi-agent version do better that the single agent cannot — and is it worth the cost you measured?" },
      { order: 3, action: "Write a one-paragraph ROI verdict: keep multi-agent (with the justifying benefit) or collapse to single-agent (with the reasoning). Be honest about theater if that's the finding.", verify: "A measured single-vs-multi comparison, an evidence-based keep/collapse decision, and a clear statement of the structural benefit or admission of theater." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A single-agent baseline compared head-to-head with the multi-agent version (quality/cost/latency).",
      "An evidence-based decision to keep or collapse multi-agent.",
      "If kept, a concrete structural benefit (parallelism/isolation) named; if collapsed, the reasoning stated.",
      "An honest ROI verdict, including calling out theater if found.",
    ],
  },
];

const project: ContentBlock[] = [
  {
    type: "prose",
    md: "**Deliver Project P4 — the Tool-Using Agent.** This is the category capstone: combine everything into a single, bounded, safe agent that reliably uses multiple tools to complete multi-step tasks. The portfolio value is precisely what most agent demos lack — **bounded autonomy**: termination, cost limits, and security.",
  },
  {
    type: "prose",
    md: "**What P4 pulls together, mapped to its milestones:**\n\n- **Tool calling with 2–3 tools** (p4-01) — the validated tool loop from the tool-calling topic; one tool can wrap your P3 RAG retrieval.\n- **Multi-step planning + memory** (p4-02) — working memory + bounded planning from the memory-planning topic.\n- **Step/cost limits** (p4-04) — provable termination within a budget.\n- **Guardrails / injection defenses** (p4-03) — this connects to the **Security category** (prompt-injection & guardrails topics); treat it as the security milestone layered on top, the way P3's serving milestone connected to production.\n- **Observability / tracing** (p4-05) — this connects to the **Evaluation/observability category**; treat it as the tracing milestone. \n\nThe agent *core* you deliver here is a bounded, tool-using, memory-carrying agent; the guardrails and tracing milestones are completed with the security and eval topics that follow.",
  },
  {
    type: "callout",
    variant: "note",
    title: "P4 evolves from your prior projects — reuse, don't reinvent",
    md: "P4 is the culmination of the whole path: **retrieval (P3 RAG)** becomes a tool the agent can call; **orchestration (LangGraph, Category 7)** provides the loop, state, and persistence; **tool calling, memory, and limits** (this category) provide bounded autonomy. Keep the seams you've maintained: tools are swappable, the model/provider is swappable, memory persists via a checkpointer, and limits are explicit. Don't introduce unrelated architecture — P4 is these pieces, assembled and bounded. Generation-dependent parts stay optional/inspectable; secrets come from the environment."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Deliver the bounded, safe tool-using agent",
    intro: "Assemble the category into P4. Security and tracing milestones connect to later categories.",
    steps: [
      { order: 1, action: "Assemble the agent: 2–3 validated tools (one reusing your RAG retrieval), a bounded loop with working memory and planning, and enforced step + cost limits with no-progress detection. Confirm it completes multi-step tasks and provably terminates.", expected: "A working agent that uses its tools to complete multi-step tasks and always terminates within budget." },
      { order: 2, action: "Apply the security foundation from this category (least privilege, argument validation, authorization, destructive-action confirmation, results-as-untrusted) and note where the deeper guardrails/injection-defense milestone (Security category) and the observability/tracing milestone (Eval category) attach.", decision: "Which components are swappable (tools, model/provider, memory store) without rewriting the agent, and where are those seams?" },
      { order: 3, action: "Document P4: its tools, its termination contract (every stop condition + the no-unbounded-run guarantee), its trust boundaries, and how to run it (keyless-inspectable where possible; keyed generation via env vars). Identify the guardrails and tracing milestones as the security/eval hand-offs.", verify: "P4 is a bounded (step/cost limits, guaranteed termination), safe (validated tools, authorization, results untrusted), multi-tool agent with memory, documented, swappable, and with security/observability milestones clearly identified as later hand-offs." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — Project P4 delivered",
    items: [
      "2–3 validated tools (one reusing RAG retrieval); completes multi-step tasks with memory.",
      "Enforced step + cost limits with no-progress detection; provable termination (bounded autonomy).",
      "Security foundation applied (least privilege, validation, authorization, confirm destructive, results untrusted).",
      "Documented termination contract + trust boundaries; swappable tools/model/memory; guardrails (Security) and tracing (Eval) identified as later milestones.",
    ],
  },
  {
    type: "prose",
    md: "**Mastery — explain bounded autonomy end to end.** Without notes, narrate your agent: how a task flows through reason→act→observe; where each tool is validated and authorized; how working memory carries state; the exact conditions under which it terminates; how results are contained as untrusted data; and which parts are swappable. If you can teach *why your agent cannot run unbounded, cannot be hijacked by a tool result, and cannot execute an unauthorized destructive action* — you understand agents at the level real AI-engineering work demands.",
  },
  {
    type: "takeaways",
    items: [
      "P4 = a bounded, safe, multi-tool agent: validated tool calling + memory/planning + step/cost limits + security foundation.",
      "It evolves from prior work: RAG retrieval becomes a tool; LangGraph provides the loop/state/persistence; this category adds bounded autonomy.",
      "Bounded autonomy — termination, cost limits, security — is the portfolio value most agent demos lack.",
      "Guardrails/injection defenses (p4-03) connect to the Security category; observability/tracing (p4-05) to the Eval category — later milestones on the same core.",
      "Mastery = explaining why the agent cannot run unbounded, be hijacked by a tool result, or take an unauthorized destructive action.",
    ],
  },
];

export const content: TopicContent = {
  "unit-agent-multiagent-01": learn,
  "unit-agent-multiagent-02": build,
  "unit-agent-multiagent-03": review,
  "unit-agent-multiagent-04": project,
};
