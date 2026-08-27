import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Agent Memory, Planning & Multi-step" (topic-agent-memory-planning).
// 4 units: 01 learn (working/long-term memory, planning/decomposition, reflection, step/cost
// limits, termination) · 02 practice (add memory) · 03 build (multi-step agent w/ limits =
// P4 milestones p4-02 + p4-04) · 04 review (stress-test for loops).
// Deterministic keyless bounded-loop experiment (step + cost budget). Builds on LangGraph
// state/checkpointer (Batch 7). Termination is the throughline.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "A single tool call is easy; a *dependable multi-step* agent is hard. The difference is three things: **memory** (so the agent knows what it already did), **planning** (so it decomposes a task instead of flailing), and — above all — **termination** (so it actually stops). An agent that can't reliably terminate within a budget isn't a feature; it's an incident waiting for a bill. Bounded multi-step behavior is what turns an agent from a demo into something you'd run in production.",
  },
  {
    type: "prose",
    md: "**Mental model: an agent's competence comes from what it remembers and how it bounds itself, not from the model being 'smart.'** Each loop iteration, the model sees the accumulated **memory** (prior steps + results) and decides the next action. Memory is what prevents it from repeating work or forgetting the goal. **Planning** structures the sequence. **Limits** (step count, cost budget, no-progress detection) guarantee it stops. You engineer all three around the model — they're not emergent.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Working (short-term) memory", definition: "The state within a single run — the message history and any scratch state the agent accumulates across steps. In LangGraph/create_agent this is the AgentState messages, persisted per thread_id via a checkpointer." },
      { term: "Long-term memory", definition: "Information persisted ACROSS runs/sessions — user facts, past outcomes — stored externally (a DB or a retrieval store) and loaded when relevant. Distinct from the within-run working memory." },
      { term: "Planning / decomposition", definition: "Breaking a task into sub-steps. 'Plan-then-execute' creates a plan up front; 'reactive' (ReAct) decides step-by-step from observations. Each has tradeoffs (foresight vs adaptivity)." },
      { term: "Reflection", definition: "The agent evaluating its own progress/output to decide whether to continue, retry, or stop. Useful but adds model calls (cost) and can loop if it never concludes 'good enough.'" },
      { term: "Termination / limits", definition: "Conditions that stop the loop: task complete, step limit, cost/token budget, or no-progress detection. The single most important reliability control in an agent." },
    ],
  },
  {
    type: "prose",
    md: "**Memory — two distinct kinds, don't conflate them:**\n\n- **Working (short-term)**: everything within the current run. It's how the agent recalls that it already searched, what a tool returned, and what the goal is. Frameworks persist this per conversation (`thread_id` + a checkpointer), so a paused run resumes with its memory intact.\n- **Long-term**: facts that outlive a run — a user's preferences, prior results — kept in an external store and retrieved when relevant (this is where the retrieval skills from RAG return). Loading *everything* forever overflows the context window; long-term memory is about **selectively recalling** what matters.\n\nMost agent bugs blamed on 'the model forgot' are really **working-memory design bugs** — state not carried between steps.",
  },
  {
    type: "prose",
    md: "**Planning: plan-then-execute vs reactive.**\n\n- **Reactive (ReAct)**: decide each step from the latest observation. Adaptive to surprises, but can wander or loop without a global view.\n- **Plan-then-execute**: draft a plan of sub-tasks first, then execute them. Better foresight and boundedness, but a bad initial plan can misdirect the whole run.\n\nNeither is universally right; many robust agents blend them (a rough plan + reactive adjustment). What matters more than the style is that **every plan has a finite number of steps and a stop condition.**",
  },
  {
    type: "code",
    language: "python",
    caption: "A bounded multi-step loop — step limit AND cost budget (deterministic, keyless)",
    code: `def run_bounded(task, step_fn, max_steps=10, max_cost=1.0, cost_per_step=0.25):
    memory, cost = [], 0.0
    for step in range(1, max_steps + 1):
        if cost + cost_per_step > max_cost:                 # COST budget guard
            return {"status": "stopped: cost budget", "steps": step - 1, "memory": memory}
        cost += cost_per_step
        done, note = step_fn(task, memory)                  # model uses memory to decide
        memory.append(note)                                 # WORKING MEMORY grows
        if done:
            return {"status": "done", "steps": step, "cost": round(cost, 2), "memory": memory}
    return {"status": "stopped: step limit", "steps": max_steps, "memory": memory}  # STEP guard

# A step function that never signals completion — the GUARDS must stop it (no infinite loop).
def never_finishes(task, memory):
    return False, f"step-{len(memory) + 1}"

print(run_bounded("x", never_finishes, max_steps=10, max_cost=1.0, cost_per_step=0.25))`,
    output: `{'status': 'stopped: cost budget', 'steps': 4, 'memory': ['step-1', 'step-2', 'step-3', 'step-4']}`,
  },
  {
    type: "prose",
    md: "The loop **cannot** run away: even though `never_finishes` never returns done, the cost budget stops it at step 4 (4 × 0.25 = 1.0; a 5th step would exceed 1.0). Real agents replace `step_fn` with a model+tool step, but the **two guards — step limit and cost budget — are non-negotiable**, and a third (no-progress detection) is often wise. Now a version that terminates *by finishing*, driven by memory:",
  },
  {
    type: "code",
    language: "python",
    caption: "Memory-driven termination — the agent recalls prior steps to decide it's done",
    code: `def gather_then_summarize(task, memory):
    if len(memory) >= 3:                    # RECALL: already gathered 3 things -> finish
        return True, "summarize"
    return False, f"gather-{len(memory) + 1}"

print(run_bounded("research", gather_then_summarize, max_steps=10,
                  max_cost=5.0, cost_per_step=0.25))`,
    output: `{'status': 'done', 'steps': 4, 'cost': 1.0, 'memory': ['gather-1', 'gather-2', 'gather-3', 'summarize']}`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "The failure trio: infinite loops, unbounded cost, no termination criteria",
    md: "These are the same bug wearing three hats, and they define this topic's common mistakes:\n\n- **Infinite loops** — the agent repeats the same action (calls the same tool, re-asks the same question) because nothing forces progress or a stop. Frameworks have a **recursion/step limit** as a safety net (LangGraph raises after the limit), but a limit is a backstop, not a design — add an explicit stop condition and **no-progress detection** (e.g. stop if the last N steps didn't change state).\n- **Unbounded cost** — every step is a model call (plus tools); a loop that runs 200 steps is a 200× bill. A **cost/token budget** caps this independently of step count.\n- **No termination criteria** — the agent doesn't know what 'done' looks like, so it never stops cleanly. Define the completion condition explicitly (task satisfied, answer produced, or budget hit) and make the agent check it.\n\nBounded autonomy — not raw capability — is what makes an agent dependable. If you can't state the exact conditions under which your agent stops, it isn't finished."
  },
  {
    type: "quiz",
    question: "An agent loses all context of what it did after the process restarts mid-task. Which mechanism is missing?",
    choices: [
      "A bigger model with more parameters",
      "Persistent working memory: a checkpointer + a thread/conversation id so the agent's state (message history, scratch state) survives a restart and the run can resume where it left off. Without persistence, working memory lives only in process RAM and vanishes",
      "More tools",
      "A higher temperature",
    ],
    answerIndex: 1,
    explanation: "Within-run memory that only exists in process memory is lost on restart. Persisting it (a checkpointer keyed by thread_id) lets the agent reload its state and resume. This is the same durable-state mechanism from LangGraph. It's a memory-persistence design gap, not a model-capability problem.",
  },
  {
    type: "quiz",
    question: "An agent runs for hundreds of steps and produces a huge bill before you kill it. Both a step limit and a cost budget were absent. Which is the more robust single guard, and why still add both?",
    choices: [
      "Neither matters; just watch it manually",
      "A cost/token budget most directly caps spend regardless of how cheap each step looks, but you add BOTH: a step limit bounds iterations (and catches loops early), while a cost budget bounds spend when steps are expensive or variable. Together they cover both failure shapes",
      "A step limit alone is always sufficient",
      "Only prompt engineering can prevent this",
    ],
    answerIndex: 1,
    explanation: "A cost budget directly bounds the thing you care about (money/tokens) even if steps vary in expense, while a step limit bounds iteration count and catches loops. Each misses a case the other catches (many cheap steps vs few expensive ones), so robust agents enforce both, plus no-progress detection.",
  },
  {
    type: "takeaways",
    items: [
      "Dependable multi-step agents need memory (recall prior steps), planning (decompose), and — above all — termination (guaranteed stop).",
      "Working memory = within-run state (persist via checkpointer + thread_id); long-term memory = across-run facts in an external store, selectively recalled.",
      "Plan-then-execute (foresight) vs reactive/ReAct (adaptivity) — blend them, but every plan must be finite with an explicit stop condition.",
      "Enforce BOTH a step limit and a cost/token budget, plus no-progress detection; framework recursion limits are a backstop, not a design.",
      "'The model forgot' is usually a working-memory design bug; if you can't state exactly when your agent stops, it isn't finished.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Give your agent working memory and prove it recalls prior steps — the completion criterion is 'agent recalls prior steps.' Keep it deterministic: you're testing the memory plumbing, not the model.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Add working memory (guided)",
    intro: "Carry state across steps and use it to avoid repetition.",
    steps: [
      { order: 1, action: "Take your tool-calling agent (or the bounded loop above) and ensure each step appends its action + result to a working-memory structure the next step can read. Run a multi-step task and print the memory after each step.", expected: "Memory grows across steps; each step can see what earlier steps did and returned." },
      { order: 2, action: "Make the agent USE memory to avoid repeating: e.g. don't call the same tool with the same args twice; decide 'done' based on what's already gathered. Demonstrate it skipping a redundant action.", decision: "How would you persist this working memory so a restart mid-task doesn't lose it (checkpointer + thread_id), and when would you need LONG-term memory instead?" },
      { order: 3, action: "Add a simple no-progress check: if the last two steps produced no new information, stop. Confirm the agent recalls prior steps AND terminates when stuck.", verify: "Memory is carried across steps, used to avoid repetition and decide completion, and a no-progress check prevents spinning." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Working memory grows across steps and is readable by later steps.",
      "The agent uses memory to avoid repeating actions and to decide 'done.'",
      "You can explain how to persist working memory (checkpointer + thread_id) vs long-term memory.",
      "A no-progress check stops the agent when it stops making progress.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a multi-step agent with step and cost limits** — Project **P4, milestones p4-02** ('Multi-step planning + memory') and **p4-04** ('Step/cost limits'). The agent completes a multi-step task using memory, and it **provably terminates** within an explicit step and cost budget. This is what separates your P4 from the average agent demo.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P4 p4-02 + p4-04)",
    md: "p4-02 completion: *the agent completes multi-step tasks with memory*. p4-04 completion: *the agent terminates within a step/cost budget*. Build on the p4-01 tool agent: add working memory carried across steps, bounded planning (decompose the task), and enforce **both** a step limit and a cost/token budget, plus no-progress detection. If you use `create_agent`, it persists working memory via a checkpointer + thread_id and its LangGraph recursion limit bounds steps — but you still design the explicit stop conditions and cost budget. Keep it inspectable; the guards must be demonstrable without a live model."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — bounded multi-step agent",
    intro: "Acceptance defines done. Termination is the headline requirement.",
    steps: [
      { order: 1, action: "Extend your tool agent to complete a multi-step task using working memory (recall prior actions/results). Persist that memory so a mid-task restart can resume (checkpointer + thread_id, or your own store).", decision: "What is the EXACT completion condition for your task, and what does the agent check each step to know it's satisfied?" },
      { order: 2, action: "Enforce termination: a maximum step count AND a cost/token budget, plus a no-progress guard. Prove the agent stops in all three cases — task complete, step limit, and budget exhausted — including when a step never signals done.", expected: "The agent completes normal tasks AND provably terminates under step-limit, cost-budget, and no-progress conditions." },
      { order: 3, action: "Make the bounds inspectable: log steps taken, cost consumed, and why it stopped. Confirm no configuration of inputs can make it run unbounded.", verify: "A multi-step agent that uses persisted memory, completes tasks, and terminates within explicit step + cost budgets with no-progress detection — with the stop reason inspectable." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P4 p4-02 + p4-04",
    items: [
      "Completes a multi-step task using working memory (recalls prior steps); memory persists across a restart.",
      "Enforces a step limit AND a cost/token budget, plus no-progress detection.",
      "Provably terminates in all cases (done / step limit / budget), including when a step never signals done.",
      "Steps taken, cost consumed, and stop reason are inspectable; no input makes it run unbounded.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — bounded agent step controller (keyless, testable)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from dataclasses import dataclass, field

@dataclass
class AgentRun:
    max_steps: int = 8
    max_cost: float = 2.0
    cost_per_step: float = 0.25
    no_progress_limit: int = 2
    memory: list = field(default_factory=list)
    cost: float = 0.0

    def run(self, task, step_fn):
        stale = 0
        for step in range(1, self.max_steps + 1):
            if self.cost + self.cost_per_step > self.max_cost:
                return self._stop("cost budget", step - 1)
            self.cost += self.cost_per_step
            done, note, made_progress = step_fn(task, self.memory)   # model+tool step
            self.memory.append(note)
            if done:
                return self._stop("done", step)
            stale = 0 if made_progress else stale + 1
            if stale >= self.no_progress_limit:                      # NO-PROGRESS guard
                return self._stop("no progress", step)
        return self._stop("step limit", self.max_steps)              # STEP guard

    def _stop(self, reason, steps):
        return {"stop_reason": reason, "steps": steps,
                "cost": round(self.cost, 2), "memory": self.memory}

# Fully testable without a model. Example: a step that stalls -> stops on no-progress.
stall = lambda task, mem: (False, "no-op", False)
print(AgentRun().run("x", stall))
# {'stop_reason': 'no progress', 'steps': 2, 'cost': 0.5, 'memory': ['no-op', 'no-op']}`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The only way to trust an agent's termination is to *try to break it*. This unit stress-tests for loops — the completion criterion is 'agent never loops unbounded.'",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — the agent loops, repeating the same action",
    md: "The agent calls the same tool with the same arguments over and over (or re-asks the same sub-question), making no progress. **Debug from the earliest boundary:** \n\n1. **Termination logic** — is there an explicit stop condition, and does the state ever satisfy it? A missing/unreachable completion check is the usual culprit.\n2. **No-progress detection** — does the agent notice it's not advancing? Without it, a model that keeps choosing the same action loops until the step limit.\n3. **Memory** — is prior state actually reaching the model? If each step can't see that it already did X, it'll do X again. A working-memory gap *causes* loops.\n4. **The guards** — are the step limit and cost budget actually enforced, or just declared?\n\n**Fixes:** add/repair the explicit completion condition; add no-progress detection (stop after N stale steps); ensure memory carries prior actions/results; verify the step and cost limits fire. The framework recursion limit should be your *last* line of defense, not your only one."
  },
  {
    type: "quiz",
    question: "An agent keeps calling the same search tool with the same query and never stops until it hits the framework's recursion limit. What's the BEST fix (not just relying on that limit)?",
    choices: [
      "Raise the recursion limit so it has more room",
      "Add explicit termination + no-progress detection and ensure memory carries prior actions: the agent should see it already ran that search, recognise it made no progress, and stop (or change strategy). The recursion limit is a backstop, not the intended stopping mechanism",
      "Remove the search tool",
      "Lower the temperature to 0",
    ],
    answerIndex: 1,
    explanation: "Hitting the recursion limit means the intended stop conditions failed. The fix is design-level: carry prior actions in memory so the model sees the repetition, add no-progress detection to break stale loops, and define an explicit completion condition. Raising the limit just delays the runaway; the recursion cap is a safety net, not the plan.",
  },
  {
    type: "quiz",
    question: "Your agent terminates fine on tasks it can solve, but on an IMPOSSIBLE task (no tool can satisfy it) it spins until the step limit. Is that acceptable?",
    choices: [
      "No — it should solve every task",
      "It's acceptable that it stops (the step/cost limit contained it), but better is to detect 'insufficient tools/evidence' and stop early with an honest 'I can't complete this' — saving steps and cost. Bounded termination is the floor; graceful early give-up is the goal",
      "Yes — spinning to the limit is ideal",
      "No — remove the step limit so it keeps trying",
    ],
    answerIndex: 1,
    explanation: "Hitting the limit means the guard worked, so it's safe — but wasteful. A well-designed agent recognises when no available tool/evidence can satisfy the task and terminates early with an honest failure, conserving steps and cost. Bounded termination prevents disaster; early, honest give-up is the quality bar above it.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — prove your agent cannot loop unbounded.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Stress-test termination under adversarial conditions",
    intro: "Try hard to make it run forever; show it can't.",
    steps: [
      { order: 1, action: "Run your agent against tasks designed to induce loops: an impossible task, a task where a tool always returns the same unhelpful result, and a task with a subtly unreachable completion condition. Record steps taken, cost, and stop reason for each.", expected: "Every case terminates with a clear stop reason (done / no-progress / step limit / cost budget) — none run unbounded." },
      { order: 2, action: "For any case that only stopped at the raw step/recursion limit, add earlier, more graceful termination (no-progress detection, insufficient-evidence give-up) and re-test.", decision: "What's the difference between 'safe' termination (a limit caught it) and 'good' termination (it recognised it was stuck and stopped early)?" },
      { order: 3, action: "Write your agent's termination contract: every condition under which it stops, and the guarantee that no input can make it exceed the step/cost budget.", verify: "All loop-inducing tasks terminate; raw-limit stops were upgraded to graceful ones where possible; you can state the full termination contract and its unbounded-run guarantee." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Loop-inducing tasks (impossible / stuck tool / unreachable completion) all terminate with a clear stop reason.",
      "Raw-limit stops were upgraded to graceful no-progress / insufficient-evidence termination where possible.",
      "You can state the full termination contract (every stop condition).",
      "No input can make the agent exceed its step or cost budget.",
    ],
  },
];

export const content: TopicContent = {
  "unit-agent-memory-planning-01": learn,
  "unit-agent-memory-planning-02": practice,
  "unit-agent-memory-planning-03": build,
  "unit-agent-memory-planning-04": review,
};
