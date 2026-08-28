import type { ProjectGuide } from "../../types";

// Project guide for P7 — Specialization Capstone (project-p7-specialization).
// Self-directed: the guide teaches how to scope, build and write up a niche system.

export const guide: ProjectGuide = {
  overview:
    "Design and ship a **self-directed advanced system in a niche you choose** — the capstone that proves depth and, more importantly, the ability to **synthesize the whole roadmap** into one coherent, evaluated, secured, operable system. Unlike P1–P6, there is no prescribed build: you pick the direction (RAG-at-scale, a specialized agent, a multimodal application, a domain fine-tune, an eval/observability tool, a context-engineering system) and define the deliverable.\n\nThe discipline is to scope it so it actually **ships**: a concrete deliverable, a measurable outcome, a bounded timebox, and deliberate reuse of skills from across the roadmap. Depth in one thing, done and documented with honest trade-offs, beats breadth in ten half-things. This guide doesn't tell you *what* to build — it tells you how to scope, engineer, evaluate and write up a portfolio-grade capstone so a senior reviewer sees command of the entire discipline.",
  scenario:
    "You are an AI engineer with a portfolio of solid-but-general projects (P1–P6). To stand out — for a role, a promotion, or a specific team — you need **depth in a direction** and evidence you can take an ambitious idea from scope to shipped system on your own. A hiring manager or lead will look at this project to answer one question: *can this person independently design and deliver a non-trivial AI system, make sound engineering trade-offs, prove it works, and explain their reasoning?*\n\nThe constraint is realism: it must be scoped to actually finish (not a perpetual 'platform'), it must reuse the roadmap's skills rather than reinvent them, and it must be demonstrable without requiring an expensive proprietary stack. The capstone is where you prove you can operate as an AI engineer end to end, in a direction that's yours.",
  whatYouBuild:
    "Whatever your chosen niche requires — but scoped as a shippable, measurable, synthesis-rich system. The guide below is the meta-structure you apply to YOUR project: scope it, build it reusing multiple roadmap categories, evaluate it, and write it up.",
  architecture: `Your niche system (example shape — adapt to your choice)

  Input/UI ---> Service/API ---> Orchestration
                                    |
                +-------------------+-------------------+
                v                   v                   v
          Retrieval/Context     Tools/Agents        Model layer
                \\                   |                   /
                 +--------> Grounded/validated output <-+
                                    |
                          Evaluation harness (proves it works)
                                    |
                          Security + deployment + observability

  The point: it visibly integrates SEVERAL roadmap categories,
  not one technique in isolation.`,
  components: [
    "**A clear deliverable** — a specific system/tool/artifact, not a vague 'platform' (e.g. 'an eval harness for legal-doc RAG with a CI gate').",
    "**A synthesis core** — the system reuses several roadmap categories (e.g. RAG/context + agents/tools + evaluation + security + deployment), each visible.",
    "**An evaluation layer** — a way to prove it works: a golden set, metrics, and a measured result (this is non-negotiable for a capstone).",
    "**Engineering controls** — reliability, security and cost handling appropriate to the niche (reuse P1/P3/P4/P6 patterns).",
    "**A deployment/runnable path** — the system is runnable or deployed, reproducibly (even keyless/local where practical).",
    "**A strong write-up** — problem, approach, trade-offs, results, limitations and reproduction steps: the portfolio artifact itself.",
  ],
  learningObjectives: [
    "Self-directed scoping",
    "Cross-roadmap synthesis",
    "Depth in a chosen niche",
    "Engineering trade-off reasoning",
    "Evaluation of your own system",
    "Technical writing / documentation",
    "Portfolio presentation",
  ],
  prerequisites: {
    required: [
      "You have completed (or can confidently apply) the core roadmap — at minimum P3, plus evaluation and security.",
      "You can independently design, build and debug an AI system end to end.",
      "You can define and measure a success metric for a fuzzy task.",
    ],
    helpful: [
      "The advanced topics (context engineering, reasoning models) if your niche uses them.",
      "P6 production skills if you intend to deploy the capstone.",
      "A clear personal interest/direction to specialize in.",
    ],
  },
  techStack: [
    { layer: "Everything", choice: "Whatever your chosen niche genuinely needs — no more", why: "The stack follows the problem, not fashion; don't add cloud services or agents to look impressive." },
    { layer: "Reuse", choice: "Your P1–P6 building blocks (extraction, retrieval, agent, API, eval, deploy)", why: "Synthesis is the point — compose what you already built rather than reinventing it." },
    { layer: "Keyless option", choice: "Local/deterministic components where practical", why: "The learning is proven by the engineering, not an expensive stack; keep it demonstrable." },
    { layer: "Evaluation", choice: "A golden set + metrics appropriate to the task", why: "A capstone without evidence it works is a demo; measurement is mandatory." },
  ],
  functionalRequirements: [
    "You write a scoped plan: a concrete deliverable, a measurable success metric, a bounded timebox, and the roadmap skills it reuses (aim for several).",
    "The scope passes a shippability check: concrete deliverable + measurable outcome + bounded + multi-skill (not vague, not endless, not single-technique).",
    "The system is built end to end and demonstrably integrates several roadmap categories (e.g. retrieval/context + tools/agents + evaluation + security + deployment).",
    "The system meets its stated success metric, measured on an evaluation set you built.",
    "Key failure modes for the niche are handled (reuse the relevant reliability/security patterns).",
    "The system is runnable/reproducible (deployed, or a keyless/local demo path), documented so someone else can run it.",
    "A strong write-up accompanies it: problem, approach, trade-offs, results (honest), limitations, and reproduction steps.",
    "The write-up makes the reused roadmap concepts explicit and explains the major engineering decisions.",
  ],
  nonFunctionalRequirements: [
    "Scoped to finish — a bounded deliverable, not a perpetual platform.",
    "Synthesis-rich — integrates multiple categories, not one technique in isolation.",
    "Evidence-based — a measured result, not 'seems to work'.",
    "Honest — trade-offs and limitations are documented, not hidden.",
    "Reproducible — runnable by a reviewer, ideally without an expensive stack.",
    "Appropriate controls — reliability/security/cost handling proportional to the niche.",
  ],
  phases: [
    {
      name: "Scope & plan (p7-01)",
      intro: "Get the scope right before building — this is where most capstones fail.",
      tasks: [
        "Choose a niche/direction you actually care about.",
        "Write the scoped plan: concrete deliverable, success metric, timebox, reused skills.",
        "Run the shippability check; tighten until it passes (concrete + measurable + bounded + multi-skill).",
      ],
    },
    {
      name: "Build the system (p7-02)",
      intro: "Compose the roadmap, don't reinvent it.",
      tasks: [
        "Build end to end, deliberately reusing several categories (retrieval/context, tools/agents, eval, security, deployment).",
        "Apply the reliability/security patterns relevant to the niche.",
        "Keep a running log of the trade-offs you make for the write-up.",
      ],
    },
    {
      name: "Evaluate",
      tasks: [
        "Build an evaluation set and metric appropriate to the task.",
        "Measure the result against your stated success metric.",
        "Handle the niche's key failure modes; note residual limitations.",
      ],
    },
    {
      name: "Write-up & polish (p7-03)",
      tasks: [
        "Write the full brief: problem, approach, trade-offs, results, limitations, reproduction.",
        "Make the reused concepts and major decisions explicit.",
        "Polish for a reviewer: clear, concise, honest, reproducible.",
      ],
    },
    {
      name: "Ship & present",
      tasks: [
        "Make it runnable/deployed (keyless/local path where practical).",
        "Run the delivery gate: all three milestones met AND synthesis across ≥4 categories.",
        "Publish the repo + write-up; prepare a short demo.",
      ],
    },
  ],
  checklist: [
    "Choose a niche/direction",
    "Write the scoped plan (deliverable, metric, timebox, reused skills)",
    "Pass the shippability check",
    "Build the system end to end",
    "Reuse several roadmap categories (make them visible)",
    "Apply niche-appropriate reliability/security patterns",
    "Build an evaluation set + metric",
    "Measure the result against the success metric",
    "Handle key failure modes; note limitations",
    "Make it runnable/reproducible (keyless/local if practical)",
    "Write the full write-up (problem → reproduction)",
    "Make reused concepts + major decisions explicit",
    "Run the delivery gate (milestones + synthesis)",
    "Publish repo + write-up; prepare a demo",
  ],
  projectStructure: `specialization-capstone/
  README.md            # THE write-up: problem, approach, trade-offs,
                       #   results, limitations, reproduction
  src/                 # your system (shape depends on the niche)
  eval/
    dataset/           # your evaluation set
    measure.py         # the metric + result
  docs/
    DECISIONS.md       # engineering decisions + trade-offs
    ARCHITECTURE.md
  demo/                # runnable/keyless demo path
  (deploy/)            # optional, if you productionize it`,
  decisions: [
    {
      decision: "Which niche to specialize in",
      options: "RAG-at-scale · a specialized agent · multimodal · a domain fine-tune · an eval/observability tool · context engineering.",
      tradeoff: "Choose where your interest, the market, and your existing building blocks overlap. A niche you care about sustains the effort; one that reuses P1–P6 ships faster. Avoid a direction with no concrete deliverable.",
    },
    {
      decision: "Scope: ambitious vs shippable",
      options: "A grand platform · a focused, bounded system.",
      tradeoff: "Ambition impresses only if it ships; an unbounded platform becomes a graveyard. A focused system with a measurable outcome, done and documented, is worth far more than an impressive-sounding half-build. Bound the scope hard.",
    },
    {
      decision: "Breadth of synthesis vs depth of one technique",
      options: "Show one technique deeply · integrate several categories.",
      tradeoff: "A capstone that leans on a single technique reads like another tutorial; one that visibly integrates retrieval, agents, evaluation, security and deployment proves command of the discipline. Aim for synthesis across several categories, with depth in your niche.",
    },
    {
      decision: "Deploy vs local/keyless demo",
      options: "Full cloud deployment · a reproducible local/keyless demo.",
      tradeoff: "Deployment adds production signal (esp. if you did P6) but costs time/money; a keyless local demo proves the engineering without an expensive stack. Either is fine — prioritize a reviewer being able to actually run it.",
    },
  ],
  gotchas: [
    "Choosing a niche with no concrete deliverable — 'an AI platform' never ships; pick a specific artifact.",
    "Unbounded scope — the perpetual project that's always 'almost done'; timebox it.",
    "Leaning on one technique — reads like a tutorial; synthesize several categories.",
    "Skipping evaluation — a capstone without evidence it works is just a demo.",
    "A write-up that's a feature list — reviewers want the WHY: trade-offs and honest limitations, not marketing.",
    "Hiding limitations — omitting them signals you didn't consider them; stating them builds trust.",
    "Requiring an expensive stack just to run it — keep a reproducible/keyless path so it's actually demonstrable.",
    "Turning it into an agent because agents are trendy — let the problem choose the approach.",
  ],
  testing: {
    functional: [
      "The main user flow works end to end.",
      "The system meets its stated success metric on the evaluation set.",
      "A reviewer can run it from the README (deployed or keyless demo).",
    ],
    edgeCases: [
      "The niche's realistic messy inputs and boundary conditions are handled.",
      "The system degrades gracefully on failure rather than producing confident garbage.",
    ],
    failureModes: [
      "External dependency failure → handled per the niche's reliability needs.",
      "Adversarial/unsafe input → handled if the niche has a security surface.",
      "The evaluation reveals a regression → caught and explained, not hidden.",
    ],
    aiEvaluation: [
      "The metric appropriate to your task (retrieval quality, groundedness, task success, accuracy, latency/cost — whichever fits).",
      "A measured result against your success metric, reported honestly (including what didn't work).",
      "Synthesis coverage: which roadmap categories the system demonstrably uses.",
    ],
  },
  definitionOfDone: [
    "A scoped plan exists and passed the shippability check (deliverable + metric + timebox + multi-skill).",
    "The system is built end to end and demonstrably synthesizes several roadmap categories.",
    "It meets its stated success metric, measured on an evaluation set you built.",
    "Key failure modes are handled; limitations are documented.",
    "It is runnable/reproducible (deployed or a keyless/local demo path).",
    "A strong write-up covers problem, approach, trade-offs, results, limitations and reproduction.",
    "The reused concepts and major engineering decisions are explicit.",
    "The delivery gate passes: all three milestones met AND synthesis across ≥4 categories.",
  ],
  expectedOutcome:
    "A portfolio-defining, specialized system that proves depth in a direction AND command of the whole AI-engineering discipline — plus a professional write-up that communicates your engineering judgment. This is the piece you lead with: evidence you can independently take an ambitious AI system from idea to shipped, evaluated, documented reality.",
  outcomeArtifacts: [
    "A shipped, specialized niche system",
    "An evaluation set + a measured result",
    "A synthesis of several roadmap categories in one system",
    "A strong write-up (problem → trade-offs → results → limitations → reproduction)",
    "Architecture + decisions documentation",
    "A runnable/keyless demo path",
    "A flagship GitHub repository + a short demo",
  ],
  stretchGoals: [
    "Productionize it fully (reuse P6): deployment, CI/CD eval gate, monitoring.",
    "Publish a blog post / talk explaining the design and trade-offs.",
    "Open-source it with contribution docs.",
    "Add an automated evaluation/CI pipeline.",
    "Extend to a second niche dimension once the core ships.",
  ],
  skillsDemonstrated: [
    "Independent AI system design",
    "Cross-roadmap synthesis",
    "Depth in a specialization",
    "Engineering trade-off reasoning",
    "Self-evaluation & measurement",
    "Technical communication",
    "Portfolio-grade delivery",
  ],
  portfolio:
    "This is the project you lead with. It proves you can independently scope, build, evaluate and ship a non-trivial AI system in a direction of your choosing, and explain your reasoning — synthesizing retrieval, agents, evaluation, security and deployment rather than demonstrating one trick. A senior reviewer reads the trade-offs and honest limitations and sees command of the discipline: exactly the signal that differentiates a capable AI engineer from someone who has only followed tutorials.",
};
