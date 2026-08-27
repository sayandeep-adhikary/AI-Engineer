import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Emerging Patterns & Continuous Learning" (topic-adv-emerging).
// 2 units: 01 learn (staying current responsibly, adopt/pilot/monitor/ignore triage, protocols
// MCP/A2A, new modalities, reading with skepticism) · 02 review (maintain a 'what changed' log,
// triage changes by impact). commonMistakes: Chasing every hype cycle. masteryCriteria: durable
// habit for staying current. Deterministic keyless adoption-triage / change-triage experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "The field moves faster than any curriculum can — models, APIs, protocols and techniques change monthly. The durable skill is not knowing today's frontier; it is a **sustainable practice for staying current without drowning**. This topic is deliberately meta: it teaches you to separate signal from hype, to decide what deserves your attention, and to build a habit that keeps you effective long after this roadmap is stale. It's the skill that makes every other skill last.",
  },
  {
    type: "prose",
    md: "**Mental model: treat new developments like an engineering backlog, not a fear-of-missing-out feed.** For each new thing, ask what problem it solves, how mature it is, whether it fits a real need you have, and what it would cost to adopt — then decide to adopt, pilot, monitor, or ignore. Most hype resolves to 'monitor' or 'ignore.' The engineers who stay effective aren't the ones who try everything; they're the ones who triage ruthlessly, go deep on the few things that matter to their work, and keep a lightweight record of what actually changed.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Reading with skepticism", definition: "Evaluating a paper, benchmark, or release for what it actually demonstrates versus what it claims. Ask: on what data/tasks? compared to what baseline? reproducible? production-tested or research-stage? A striking benchmark result may not transfer to your use case. Skepticism is not cynicism — it's calibrating excitement to evidence." },
      { term: "Adopt / pilot / monitor / ignore", definition: "The triage for any new technique or tool: adopt (production-ready and solves a real problem you have), pilot (promising but unproven — try behind a flag on a low-risk path), monitor (interesting but not yet relevant or mature — watch it), ignore (hype with no real problem it solves for you). Most things land in monitor or ignore." },
      { term: "Changelogs and versioning", definition: "Provider release notes, deprecation notices, and model/API version changes. Tracking them is how you catch a breaking change before it breaks you, or a cost/quality improvement worth evaluating. A model or API you depend on can change under you — an upstream model change is a real production event (evaluation/monitoring catch it)." },
      { term: "Protocols (MCP / A2A)", definition: "Standards for how AI systems interoperate. MCP (Model Context Protocol, from the agents category) standardizes how apps expose tools/data/context to models; A2A (Agent2Agent) is an emerging standard for agents communicating with each other. Protocols matter because they reduce M×N integration work — but treat a third-party server/agent as untrusted (security category)." },
      { term: "New modalities and capabilities", definition: "Emerging inputs/outputs and abilities: richer multimodal reasoning, on-device/small models, longer context, structured generation, better tool use. Each is an opportunity IF it maps to a real need — evaluate it as an engineering choice (cost/quality/latency/maturity), not a mandate to rewrite your stack." },
      { term: "Continuous-learning practice", definition: "A durable, low-effort habit: a small set of trusted sources, a periodic review cadence, and a personal 'what changed' log recording changes that affect (or might affect) your systems and your decision about each. Sustainable beats intense — a habit you keep beats a heroic sprint you abandon." },
    ],
  },
  {
    type: "prose",
    md: "**Triage is the core skill: maturity plus fit decides adopt / pilot / monitor / ignore — not hype:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Adoption triage by maturity and fit (deterministic, keyless)",
    code: `def adoption(tech):
    # Decide by maturity + whether it solves a real problem you have -- not by hype.
    if tech["production_ready"] and tech["solves_real_problem"]:
        return "adopt"
    if tech["solves_real_problem"] and not tech["production_ready"]:
        return "pilot behind a flag"
    if tech["novel"] and not tech["solves_real_problem"]:
        return "monitor"
    return "ignore"

print(adoption({"production_ready": True,  "solves_real_problem": True,  "novel": False}))
print(adoption({"production_ready": False, "solves_real_problem": True,  "novel": True}))
print(adoption({"production_ready": False, "solves_real_problem": False, "novel": True}))`,
    output: `adopt
pilot behind a flag
monitor`,
  },
  {
    type: "prose",
    md: "A production-ready thing that solves a real problem you have: adopt. Promising but unproven, yet aimed at a real need: pilot behind a flag on a low-risk path. Novel and interesting but not solving anything for you right now: monitor. And the unstated fourth branch — hype with no real problem — is ignore. Notice what the decision does NOT depend on: how exciting it is, how many people are posting about it, or fear of missing out. Two questions — is it mature enough, and does it fit a real need — filter almost all the noise. That is how you stay current without chasing every cycle.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Chasing every hype cycle",
    md: "The commonMistake this topic exists to prevent: treating every new model, framework, or technique as something you must adopt immediately. It has real costs:\n\n- **Churn** — rewriting working systems to chase marginal or unproven gains, introducing bugs and instability for little benefit.\n- **Shallow breadth** — spreading attention across everything means mastering nothing; depth in a few relevant areas is worth more than a thin layer over all of them.\n- **Distraction from fundamentals** — the durable skills (evaluation, security, deployment, clear thinking about tradeoffs) outlast any specific tool, but hype-chasing crowds them out.\n\nThe antidote is disciplined triage plus depth: adopt deliberately, pilot the promising few, monitor the rest, and ignore the noise — while going genuinely deep where it matters to your work. And distinguish **established engineering practice** (safe to rely on) from **emerging/research-stage techniques** (interesting, not yet a production guarantee). A new benchmark result is not a deployment recommendation."
  },
  {
    type: "quiz",
    question: "A new agent framework is trending, with impressive demos. Your team's agent (built on your current stack) works well in production. A teammate wants to migrate everything to the new framework this sprint. What's the disciplined response?",
    choices: [
      "Migrate immediately — trending frameworks are always better",
      "Triage before migrating: what specific problem does the new framework solve that your working stack doesn't? Is it production-ready or still research-stage? Migrating a working production system for marginal or unproven gains is churn with real risk. If it's genuinely promising, pilot it behind a flag on a low-risk path and evaluate against your current stack; otherwise monitor it. Don't rewrite working systems to chase hype",
      "Ignore it forever — new frameworks are never worth evaluating",
      "Migrate half the system now and decide later",
    ],
    answerIndex: 1,
    explanation: "A working production system shouldn't be rewritten on the strength of demos and momentum; the disciplined move is to ask what real problem the new framework solves, assess its maturity, and if promising, pilot it behind a flag and evaluate it against the current stack rather than migrating wholesale. That captures upside without the churn and risk of chasing hype. Immediate migration and permanent dismissal are both undisciplined; a half-migration adds complexity without a decision.",
  },
  {
    type: "takeaways",
    items: [
      "Staying current is a sustainable practice, not a race: triage new developments like a backlog (adopt/pilot/monitor/ignore), not a FOMO feed.",
      "Triage on two questions — is it mature enough, and does it fit a real need — which filters almost all hype; most things land in monitor or ignore.",
      "Read with skepticism: what did it actually demonstrate, on what data, vs what baseline, production-tested or research-stage? Calibrate excitement to evidence.",
      "Track changelogs/versioning (an upstream model/API change is a real production event) and know the protocols (MCP for tools, A2A emerging for agent-to-agent) — treat third-party servers/agents as untrusted.",
      "Distinguish established practice (rely on it) from emerging/research techniques (interesting, not a production guarantee); go deep where it matters rather than thin everywhere.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'you keep an updated learning log.' A practice you don't record isn't durable — it evaporates. So this unit is about the habit itself: a lightweight **'what changed' log** where you triage changes by their impact on your systems. It's the smallest sustainable ritual that keeps you current, and it doubles as a record of your own growing judgment.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "A durable 'what changed' log",
    md: "The point is sustainability, not thoroughness:\n\n- **A few trusted sources** — a small set (official changelogs, a couple of high-signal newsletters/researchers), not the entire firehose. Curate ruthlessly.\n- **A cadence** — a short periodic review (weekly/monthly) beats sporadic binges. Put it on the calendar.\n- **The log** — for each notable change: what it is, whether it affects your systems, and your decision (act now / evaluate / note and move on). Keep it short — a line or two.\n- **Bias to your work** — prioritize changes that touch what you actually run (a model you depend on, a security advisory, a cost improvement) over generically interesting news.\n\nThe log's real value compounds: over months it becomes a record of how the field moved AND how your judgment sharpened. The habit you keep beats the intense one you abandon — optimize for something you'll still do in a year."
  },
  {
    type: "prose",
    md: "**Triage each change by impact — act now, evaluate, or note and move on:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Triage a change by its impact on your systems (deterministic, keyless)",
    code: `def triage_change(change):
    # Prioritize by what actually affects the systems you run.
    if change["breaks_api"] or change["security"]:
        return "act now"
    if change["improves_cost_or_quality"]:
        return "evaluate"
    return "note and move on"

print(triage_change({"breaks_api": True,  "security": False, "improves_cost_or_quality": False}))
print(triage_change({"breaks_api": False, "security": False, "improves_cost_or_quality": True}))
print(triage_change({"breaks_api": False, "security": False, "improves_cost_or_quality": False}))`,
    output: `act now
evaluate
note and move on`,
  },
  {
    type: "prose",
    md: "A breaking API change or a security advisory is 'act now' — it affects a system you run and can't wait. A cost or quality improvement is 'evaluate' — worth a measured look against your evals (does it actually help *your* task?), but not an emergency. Everything else is 'note and move on' — logged for awareness, no action. This tiny filter is the whole practice: it stops you from either ignoring a breaking change or dropping everything for interesting-but-irrelevant news. Run it on a cadence over a few trusted sources, and you have a durable habit that keeps you current with minutes, not hours, per week.",
  },
  {
    type: "quiz",
    question: "Your 'what changed' log this week has three entries: (a) a provider deprecates an API you use in 60 days, (b) a new open model claims better benchmarks, (c) a research paper on a novel architecture. How should you triage them?",
    choices: [
      "All three are 'act now' — everything new is urgent",
      "(a) act now / plan the migration — a breaking change to a system you run; (b) evaluate — a claimed improvement, worth testing against YOUR evals and cost before adopting (benchmarks may not transfer); (c) note and move on / monitor — research-stage, no current relevance to your systems. Triage by impact on what you actually run, not by novelty",
      "All three are 'note and move on' — nothing is ever urgent",
      "Adopt (b) and (c) immediately since they're newer",
    ],
    answerIndex: 1,
    explanation: "The deprecation directly threatens a running system and needs planned action; the new model is a claimed improvement to evaluate against your own tasks and costs before trusting benchmarks that may not transfer; the research paper is early-stage with no current relevance, so monitor it. Triage is driven by impact on what you operate, not by how new or exciting each item is — which is why 'all urgent,' 'all ignorable,' or 'adopt the newest' are all wrong.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — stand up a continuous-learning practice you'll actually keep.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build your continuous-learning habit",
    intro: "Design for sustainability, then run it once. Not completion-gated — this is the durable habit the mastery criterion asks for.",
    steps: [
      { order: 1, action: "Curate a small set of trusted, high-signal sources (official changelogs for what you depend on + a couple of vetted newsletters/researchers). Set a realistic review cadence you'll keep (e.g. 20 minutes weekly).", expected: "A short source list and a calendared cadence — curated, not a firehose." },
      { order: 2, action: "Start the 'what changed' log: run one review, and for each notable change record what it is, whether it affects your systems, and your triage decision (act now / evaluate / note). Read each item with skepticism (evidence vs claim).", decision: "For each change: does it touch something you actually run, or is it generically interesting? Prioritize the former." },
      { order: 3, action: "Define your adopt/pilot/monitor/ignore rule and your depth strategy (which one or two areas you'll go deep on vs breadth-scan). Confirm the whole practice is light enough to sustain for a year.", verify: "You have a durable continuous-learning practice: curated sources, a kept cadence, a running 'what changed' log with impact-based triage, a clear adopt/pilot/monitor/ignore rule, and a depth focus — sustainable, not heroic." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a durable learning practice",
    items: [
      "A small, curated set of trusted sources and a realistic, calendared review cadence.",
      "A running 'what changed' log: each change with its system impact and a triage decision (act now / evaluate / note).",
      "An adopt/pilot/monitor/ignore rule and a depth-vs-breadth strategy defined.",
      "The practice is lightweight enough to sustain for a year — a habit you'll keep, not a sprint you'll abandon.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Record the practice or it evaporates: a lightweight 'what changed' log makes staying current durable and doubles as a record of your judgment.",
      "Triage changes by impact on what you run: breaking/security → act now; cost/quality improvement → evaluate (against your evals); else → note and move on.",
      "Curate a few trusted sources and a kept cadence over the firehose and sporadic binges — sustainable beats intense.",
      "Read with skepticism (benchmarks may not transfer to your task) and bias attention to changes touching your systems.",
      "Pair disciplined triage with genuine depth in a few relevant areas — the habit you keep for a year beats the heroic sprint you abandon.",
    ],
  },
];

export const content: TopicContent = {
  "unit-adv-emerging-01": learn,
  "unit-adv-emerging-02": review,
};
