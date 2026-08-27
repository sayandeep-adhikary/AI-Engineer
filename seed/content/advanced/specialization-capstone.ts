import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Specialization Capstone" (topic-adv-specialization-capstone).
// 3 units: 01 build (build a niche system — P7 m-01 scope + m-02 build) · 02 review (write-up &
// portfolio polish — P7 m-03) · 03 PROJECT "Deliver Project P7" (final capstone, synthesis across
// the whole roadmap). commonMistakes: Choosing a niche with no real deliverable. masteryCriteria:
// ship a niche advanced system with a strong write-up. Owns P7. Deterministic keyless scope/writeup/P7-gate.
// This is the FINAL topic of the roadmap.

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "This is the end of the roadmap — and the point of all of it. **Project P7 asks you to go deep in one chosen niche and ship a real system**, synthesizing everything you've learned: prompting, structured outputs, RAG, agents, multimodality, open/local models, fine-tuning, evaluation, security, deployment, observability, scaling, and the advanced concepts of this category. The completion criterion for this unit is 'a working niche system is built,' delivering **P7's milestones `p7-01` (choose niche & scope)** and **`p7-02` (build the system)**.",
  },
  {
    type: "prose",
    md: "**Mental model: a capstone is a bounded, deliverable-first bet on depth — pick one niche, define a concrete outcome, and build it end to end.** Unlike the guided projects P1-P6, P7 is self-directed: you choose the direction (RAG-at-scale, a specialized agent, a multimodal application, a domain fine-tune, an eval/observability tool — whatever differentiates you). The discipline is to scope it so it *ships*: a concrete deliverable, a measurable outcome, a bounded timebox, and deliberate reuse of your roadmap skills. Depth in one thing, done and documented, beats breadth in ten half-things.",
  },
  {
    type: "callout",
    variant: "note",
    title: "The P7 contract + how the whole roadmap feeds it",
    md: "Project P7 (`project-p7-specialization`) has three milestones:\n\n- **p7-01 Choose niche & scope** — a scoped niche project plan exists (this unit).\n- **p7-02 Build the system** — a working niche system is built (this unit, + `topic-adv-context-engineering`).\n- **p7-03 Write-up & portfolio polish** — a strong write-up accompanies the shipped project (review unit).\n\nDeliverables: an advanced niche project, a write-up, and portfolio polish. Technologies are 'whatever your chosen niche needs.' **Crucially, P7 is a synthesis capstone**: a strong one reuses concepts from across the roadmap — you might combine RAG (retrieval), agents (tool use), evaluation (an eval gate proving it works), security (injection defenses + authz), deployment (a served API), and context engineering (deliberate context). The keyless path is real: you can demonstrate a specialized system with local/deterministic components — no requirement for expensive proprietary APIs, GPUs, or cloud just to prove the learning."
  },
  {
    type: "prose",
    md: "**A good scope is deliverable-first: concrete output, measurable outcome, bounded, and reusing your skills. The commonMistake is a niche with no real deliverable:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Is the capstone scope shippable? (deterministic, keyless)",
    code: `def scope_ok(project):
    # A good capstone scope: concrete deliverable + measurable outcome + bounded + reuses skills.
    checks = {
        "concrete_deliverable": bool(project.get("deliverable")),
        "measurable_outcome": bool(project.get("metric")),
        "bounded_scope": project.get("weeks", 99) <= 6,
        "reuses_roadmap_skills": len(project.get("skills", [])) >= 3,
    }
    missing = sorted(k for k, v in checks.items() if not v)
    return {"ready": not missing, "missing": missing}

print(scope_ok({"deliverable": "eval harness for legal RAG", "metric": "recall@5",
                "weeks": 4, "skills": ["rag", "eval", "deploy"]}))
print(scope_ok({"deliverable": "", "weeks": 12, "skills": ["agents"]}))`,
    output: `{'ready': True, 'missing': []}
{'ready': False, 'missing': ['bounded_scope', 'concrete_deliverable', 'measurable_outcome', 'reuses_roadmap_skills']}`,
  },
  {
    type: "prose",
    md: "The first scope ships: a concrete deliverable (an eval harness for legal RAG), a measurable outcome (recall@5), a bounded timebox (4 weeks), and three reused skills. The second is the trap this topic names — a vague niche ('agents,' no deliverable, 12 weeks, one skill) that fails every check and never produces anything portfolio-grade. Scope the capstone so it *finishes*: a system you can point at, a number that shows it works, a timebox that forces decisions, and deliberate reuse of what you've built. Then build it — that's p7-01 and p7-02.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — scope and build a niche system",
    intro: "Deliverable-first, synthesis-rich, bounded. Acceptance defines done.",
    steps: [
      { order: 1, action: "Choose a niche and write a scoped plan (p7-01): the concrete deliverable, a measurable success metric, a bounded timebox, and which roadmap skills it reuses (aim for several — RAG, agents, eval, security, deployment, context engineering).", decision: "Does the scope pass the shippability check — concrete deliverable, measurable outcome, bounded, multi-skill? If not, tighten it before building." },
      { order: 2, action: "Build the system end to end (p7-02), deliberately applying earlier categories: engineer the context (this category), prove it works with an eval gate (evaluation), defend it (security: injection/authz/secrets), and make it runnable (a served or reproducible interface). Prefer keyless/local components where practical.", expected: "A working niche system that demonstrably reuses multiple roadmap categories, not a single-technique toy." },
      { order: 3, action: "Instrument it enough to show it works: the success metric measured, key failure modes handled, and the reused concepts visible. Keep a running note of the tradeoffs you made for the write-up.", verify: "A scoped, bounded niche system is built and working, measurably meeting its outcome, synthesizing several roadmap categories, with tradeoffs recorded — delivering P7 p7-01 and p7-02." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a built niche system (P7 p7-01 / p7-02)",
    items: [
      "Scoped plan: concrete deliverable, measurable metric, bounded timebox, multiple reused roadmap skills.",
      "Working end-to-end system synthesizing several categories (e.g. RAG + eval + security + deployment + context engineering).",
      "Success metric measured; key failure modes handled; keyless/local components used where practical.",
      "Tradeoffs recorded for the write-up; the system ships (not a perpetual work-in-progress).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — a synthesis checklist for a niche system (deterministic, keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def synthesis_coverage(system):
    # A strong capstone visibly reuses multiple roadmap categories.
    categories = {
        "retrieval_or_context": system.get("uses_rag_or_context"),
        "tools_or_agents": system.get("uses_tools_or_agents"),
        "evaluation": system.get("has_eval_gate"),
        "security": system.get("has_security_controls"),
        "deployment_or_serving": system.get("is_served"),
    }
    covered = sorted(k for k, v in categories.items() if v)
    return {"covered": covered, "depth_count": len(covered)}

# Example: a specialized legal-RAG assistant with an eval gate and injection defenses, served via API.
print(synthesis_coverage({
    "uses_rag_or_context": True, "uses_tools_or_agents": False,
    "has_eval_gate": True, "has_security_controls": True, "is_served": True,
}))`,
  },
  {
    type: "takeaways",
    items: [
      "P7 is a self-directed depth bet: choose one niche, define a concrete deliverable, and build it end to end — delivering p7-01 (scope) and p7-02 (build).",
      "Scope deliverable-first: concrete output + measurable outcome + bounded timebox + multiple reused skills — or it won't ship.",
      "The commonMistake is a niche with no real deliverable (vague, unbounded, single-skill) — the shippability check catches it.",
      "A strong capstone synthesizes the roadmap: RAG/context, agents/tools, evaluation, security, deployment — not a single-technique toy.",
      "The keyless/local path is real — demonstrate specialized capability without requiring expensive APIs, GPUs, or cloud just to prove the learning.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A shipped system nobody can understand isn't a portfolio piece. The completion criterion is 'a strong write-up accompanies the project,' delivering **P7's milestone `p7-03`**. The write-up is where you turn a working system into a *hiring signal* — communicating not just what you built, but the engineering judgment behind it. For an AI engineer, the ability to explain tradeoffs is as valuable as the ability to build.",
  },
  {
    type: "callout",
    variant: "note",
    title: "What a strong write-up contains",
    md: "A portfolio write-up isn't a README — it's an argument that you can engineer:\n\n- **Problem** — what you set out to solve and why it matters.\n- **Approach** — the design and the roadmap concepts you applied (retrieval, agents, eval, security, deployment, context engineering).\n- **Tradeoffs** — the decisions you made and what you gave up (why this model/pattern over alternatives; where you chose cost over quality or vice versa). This is the part that signals seniority.\n- **Results** — the measured outcome (your success metric), honestly, including what didn't work.\n- **Limitations** — what it doesn't do, and what you'd do next. Honesty here builds trust.\n- **Reproduce** — how someone can run or verify it.\n\nThe tradeoffs and limitations sections are what separate a strong write-up from a feature list — they show you understand the *why*, not just the *how*. Polish for the reader: clear, concise, and honest."
  },
  {
    type: "prose",
    md: "**A complete write-up covers the sections that demonstrate judgment, not just function:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Is the write-up portfolio-complete? (deterministic, keyless)",
    code: `def writeup_complete(sections):
    required = {"problem", "approach", "tradeoffs", "results", "limitations", "reproduce"}
    present = set(sections)
    missing = sorted(required - present)
    return {"complete": not missing, "missing": missing}

print(writeup_complete(["problem", "approach", "tradeoffs", "results", "limitations", "reproduce"]))
print(writeup_complete(["problem", "approach", "results"]))`,
    output: `{'complete': True, 'missing': []}
{'complete': False, 'missing': ['limitations', 'reproduce', 'tradeoffs']}`,
  },
  {
    type: "prose",
    md: "The second write-up has the crowd-pleasing parts (problem, approach, results) but is missing exactly the sections that signal engineering maturity: **tradeoffs** (the decisions and what you gave up), **limitations** (honesty about what it doesn't do), and **reproduce** (so others can verify). Those are the parts a hiring reviewer reads most closely — anyone can list features; showing you understood the tradeoffs and were honest about the limits is what differentiates you. Fill them in, polish for clarity, and the write-up turns a working system into a portfolio piece that earns the 'strong write-up' bar.",
  },
  {
    type: "quiz",
    question: "Your capstone write-up impressively describes what you built and shows a great benchmark result, but omits the tradeoffs you made and the system's limitations. Why might a senior reviewer be unimpressed?",
    choices: [
      "They wouldn't be — a great result and clear description is all that matters",
      "A feature list plus a single result reads like marketing, not engineering: senior reviewers look for judgment — WHY you chose this design over alternatives, what you traded off (cost/quality/latency), and honest limitations. Omitting tradeoffs and limitations suggests you either didn't consider them or are hiding weaknesses; including them signals maturity and trustworthiness. The 'why' and the honesty are the differentiators",
      "The write-up is too long — cut the results section",
      "Benchmark results are irrelevant in a portfolio",
    ],
    answerIndex: 1,
    explanation: "Describing what you built and showing one strong number demonstrates the 'what' but not the engineering judgment reviewers weigh most: the reasoning behind design choices, the tradeoffs accepted, and honest limitations. Omitting those reads as marketing or as hiding weaknesses, while including them signals maturity and builds trust. The differentiator in a portfolio is the 'why' and the honesty, not just an impressive result.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — write the portfolio write-up that sells the judgment, not just the system.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Write up and polish the capstone",
    intro: "Turn a working system into a hiring signal. Not completion-gated — this is P7's write-up milestone.",
    steps: [
      { order: 1, action: "Draft the full write-up: problem, approach (with the roadmap concepts applied), tradeoffs (decisions + what you gave up), results (measured, honest), limitations, and reproduce steps.", expected: "A complete write-up covering all six sections — especially tradeoffs and limitations." },
      { order: 2, action: "Strengthen the judgment sections: for each major decision, state the alternative you rejected and why; for limitations, name what you'd do next. Make the reused roadmap concepts explicit.", decision: "Does each tradeoff show a real decision (not a non-choice)? Would a senior reader learn how you think from this?" },
      { order: 3, action: "Polish for the reader: clear structure, concise prose, honest results, and a reproducibility path. Confirm it reads as an engineering argument, not a feature list.", verify: "A strong, complete write-up accompanies the shipped system — problem through reproduce, with real tradeoffs and honest limitations — that communicates your engineering judgment, delivering P7 p7-03." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a strong write-up (P7 p7-03)",
    items: [
      "All six sections present: problem, approach, tradeoffs, results, limitations, reproduce.",
      "Tradeoffs show real decisions (alternatives rejected and why); limitations are honest with next steps.",
      "Reused roadmap concepts made explicit; results measured and honest (including what didn't work).",
      "Polished, concise, reproducible — reads as an engineering argument, not a feature list.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "The write-up turns a working system into a hiring signal — delivering P7 p7-03; explaining tradeoffs is as valuable as building.",
      "Cover all six sections; the differentiators are tradeoffs (decisions + what you gave up) and limitations (honesty), which senior reviewers read most closely.",
      "Show the 'why': for each major decision, the alternative rejected and the reason — that signals seniority over a feature list.",
      "Make the reused roadmap concepts explicit, and report results honestly including what didn't work — honesty builds trust.",
      "Polish for the reader and include a reproducibility path — clear, concise, and honest beats impressive-but-opaque.",
    ],
  },
];

const project: ContentBlock[] = [
  {
    type: "prose",
    md: "**Project P7 — Specialization Capstone: the final deliverable of the entire roadmap.** The completion criterion is 'P7 is shipped with documentation.' This is where a working niche system and a strong write-up come together into a portfolio-grade capstone that proves depth in your chosen direction — and, more importantly, proves you can synthesize the whole roadmap into one coherent, operable, defensible system.",
  },
  {
    type: "callout",
    variant: "note",
    title: "P7 milestone mapping + the synthesis mandate",
    md: "Project P7 is delivered across this topic's units:\n\n- **p7-01 Choose niche & scope** → build unit (a scoped niche plan exists).\n- **p7-02 Build the system** → build unit (+ `topic-adv-context-engineering`) — a working niche system.\n- **p7-03 Write-up & portfolio polish** → review unit — a strong write-up accompanies it.\n- **Delivery** → this unit: P7 is shipped with documentation.\n\n**The synthesis mandate is what makes this the roadmap's capstone, not just another project.** A strong P7 draws on multiple categories: prompting and structured outputs (reliable model I/O), RAG and context engineering (grounded, deliberate context), agents and tools (action with authorization), evaluation (proof it works), security (injection defenses, authz, secrets), deployment and observability (served and monitored), and scaling/cost (viable to run). It doesn't need all of them — but the best capstones visibly integrate several, and that integration is the signal. And it's achievable keyless/locally: the learning is proven by the engineering, not by an expensive stack."
  },
  {
    type: "prose",
    md: "**Delivery is the conjunction of the three milestones AND demonstrated synthesis across the roadmap:**",
  },
  {
    type: "code",
    language: "python",
    caption: "P7 delivery gate: milestones + roadmap synthesis (deterministic, keyless)",
    code: `def p7_ready(state):
    milestones = {
        "niche_scoped": state.get("niche_scoped"),    # p7-01
        "system_built": state.get("system_built"),    # p7-02
        "writeup_done": state.get("writeup_done"),     # p7-03
    }
    # A capstone must demonstrate synthesis across earlier categories, not one technique.
    synthesis = len(state.get("categories_used", [])) >= 4
    missing = sorted(k for k, v in milestones.items() if not v)
    return {"ready": (not missing) and synthesis,
            "missing_milestones": missing,
            "synthesis_ok": synthesis}

print(p7_ready({"niche_scoped": True, "system_built": True, "writeup_done": True,
                "categories_used": ["rag", "agents", "eval", "security", "deploy"]}))
print(p7_ready({"niche_scoped": True, "system_built": True, "writeup_done": False,
                "categories_used": ["rag"]}))`,
    output: `{'ready': True, 'missing_milestones': [], 'synthesis_ok': True}
{'ready': False, 'missing_milestones': ['writeup_done'], 'synthesis_ok': False}`,
  },
  {
    type: "prose",
    md: "P7 ships only when all three milestones are met AND the system demonstrably synthesizes several roadmap categories — the first case (all milestones done, five categories integrated) is ready; the second (no write-up, a single category) is not, on both counts. That synthesis requirement is the point of the whole capstone: a specialized system that reuses RAG, agents, evaluation, security, and deployment proves not just depth in a niche, but command of the entire discipline. Ship it with documentation, and you have the portfolio piece that closes the roadmap — evidence you can take an AI system from idea to specialized, evaluated, secured, operable reality.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Deliver Project P7",
    intro: "Ship the specialized capstone with documentation. This is the final deliverable of the roadmap.",
    steps: [
      { order: 1, action: "Confirm all three milestones: the niche is scoped (p7-01), the system is built and working against its metric (p7-02), and a strong write-up accompanies it (p7-03).", expected: "All three P7 milestones met — scoped, built, documented." },
      { order: 2, action: "Confirm the synthesis: the system visibly integrates several roadmap categories (e.g. RAG/context + agents/tools + evaluation + security + deployment). Make each reused concept explicit in the write-up.", decision: "Does the capstone demonstrate command across the roadmap, or lean on a single technique? Strengthen the integration if it's thin." },
      { order: 3, action: "Ship it: a runnable/reproducible system plus documentation, polished for a portfolio reviewer. Run the delivery gate (milestones + synthesis) and confirm it's ready.", verify: "P7 is shipped with documentation: a scoped, built, working niche system with a strong write-up that synthesizes multiple roadmap categories — the roadmap's capstone, delivered." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — Project P7 delivered (roadmap capstone)",
    items: [
      "p7-01/02/03 all met: niche scoped, system built and measured, strong write-up complete.",
      "Demonstrated synthesis: the system integrates several roadmap categories (RAG/context, agents, eval, security, deployment), made explicit.",
      "Shipped and reproducible with portfolio-grade documentation; delivery gate passes on milestones AND synthesis.",
      "Keyless/local path used where practical — the learning is proven by the engineering, not an expensive stack.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "P7 is the roadmap's capstone: a shipped, documented, specialized system that proves depth in a niche AND synthesis across the whole discipline.",
      "Delivery requires all three milestones (scope, build, write-up) AND demonstrated integration of several categories — not a single-technique project.",
      "The synthesis is the signal: a capstone reusing RAG/context, agents, evaluation, security, and deployment proves command of the entire roadmap.",
      "Ship it with a strong write-up (tradeoffs + limitations) — the portfolio piece that turns your learning into a hiring signal.",
      "You've completed the journey: from Python foundations to a specialized, evaluated, secured, operable AI system — you can now take AI from idea to production and specialize with depth.",
    ],
  },
];

export const content: TopicContent = {
  "unit-adv-specialization-capstone-01": build,
  "unit-adv-specialization-capstone-02": review,
  "unit-adv-specialization-capstone-03": project,
};
