import type { ProjectGuide } from "../../types";

// Project guide for P6 — Production-Grade AI Service (project-p6-production-service).

export const guide: ProjectGuide = {
  overview:
    "Take your P3 RAG app (and/or P4 agent) all the way to **production**: containerized, deployed on Azure with secure config, fronted by a robust streaming API, shipped by an automated CI/CD pipeline with an evaluation gate, monitored for latency/cost/quality, cost-optimized with caching, and security-reviewed. This is the capstone that turns 'it works on my machine' into 'it runs as a service people depend on.'\n\nThe AI logic barely changes — you already built it. What you add is everything that makes an AI system **operable**: a documented API, a reproducible container, a secure cloud deployment with no stored secrets, a pipeline that blocks quality regressions before they ship, monitoring that tells you when something drifts, cost controls, and a security review. This is the single strongest hiring signal in the whole roadmap because it proves you can *operate* AI, not just prototype it.",
  scenario:
    "Your RAG assistant (P3) was a hit in a demo and leadership wants it live for the whole company. Now the real questions arrive: How do we deploy it repeatably? How do we keep secrets out of the code? How do we stop a prompt change from silently degrading answers? How do we know when it's slow or expensive or broken at 2am? How do we roll back a bad release? What if someone tries to jailbreak it?\n\nA prototype answers none of these. A production service answers all of them: it runs in a container on managed cloud infrastructure with identity-based (keyless) access to models and data, every change flows through a pipeline that tests and evaluates before deploying, monitoring and alerts catch regressions and cost spikes, a rollback is one step away, and a security review has closed the obvious holes. Building that is this project — and it's exactly the work an AI engineer is hired to do.",
  whatYouBuild:
    "A production deployment of your P3/P4 system: a containerized streaming API on Azure Container Apps with managed identity + Key Vault, an automated CI/CD pipeline with an eval gate, monitoring + cost controls, and a completed security review. It integrates evaluation (from your eval work) and security (from the security topics) into the operational lifecycle.",
  architecture: `Developer push
     |
     v
  CI/CD pipeline
   test -> EVAL GATE -> build image -> deploy (canary)
     |                                    |
     |            (regression?)           v
     +---- block / rollback <---- Azure Container Apps
                                    |  (managed identity)
                                    v
              +---------------------+---------------------+
              v                     v                     v
        Azure OpenAI          Azure AI Search        Key Vault (secrets)
              \\                    |                    /
               \\                   v                   /
                +--------> Your RAG/agent service <----+
                                    |
                                    v
                    Monitoring: latency (p95/p99), cost, quality, errors
                                    |
                                    v
                            Alerts / dashboards`,
  components: [
    "**API layer** — a robust, documented streaming API (FastAPI) around your P3/P4 app: validated inputs, safe errors, health endpoint, SSE streaming.",
    "**Container** — a lean, reproducible image (multi-stage build, no baked secrets) plus the full stack via compose for local runs.",
    "**Azure deployment** — Container Apps running the image with a managed identity and least-privilege RBAC to Azure OpenAI, AI Search and Key Vault; no stored keys.",
    "**CI/CD pipeline** — on every change: run tests, run an eval gate (blocks quality regressions), build and push the image, deploy (ideally canary), with a tested rollback.",
    "**Monitoring & cost** — latency (p50/p95/p99), error rate, cost per request and quality signals, with alerts; caching + model routing to control cost.",
    "**Security review** — a completed audit closing the findings from the security topics (secrets, authn/authz, injection isolation, PII-safe logs, rate limiting).",
  ],
  learningObjectives: [
    "Serving AI as an API (FastAPI, streaming)",
    "Containerization (Docker, multi-stage)",
    "Cloud deployment (Azure Container Apps)",
    "Managed identity & Key Vault (keyless auth)",
    "CI/CD + evaluation gates",
    "Monitoring, alerting & rollback",
    "Cost optimization (caching, routing)",
    "Security hardening & review",
    "Readiness vs liveness, health checks",
    "LLMOps lifecycle",
  ],
  prerequisites: {
    required: [
      "You have a working P3 RAG app (and/or P4 agent) to productionize.",
      "You completed the production topics (API, Docker, cloud deploy, Azure, CI/CD, scaling/cost).",
      "You completed evaluation and security — this project operationalizes both.",
    ],
    helpful: [
      "An Azure subscription (a free tier / student credits are enough to learn the patterns).",
      "Familiarity with GitHub Actions.",
      "Awareness of tracing/observability tooling.",
    ],
  },
  techStack: [
    { layer: "API", choice: "FastAPI + Uvicorn", why: "Async, validated, documented, streaming API around your AI app." },
    { layer: "Container", choice: "Docker (multi-stage) + docker compose", why: "Reproducible, lean image; compose brings up the full local stack." },
    { layer: "Cloud", choice: "Azure Container Apps", why: "Managed containers with autoscaling, revisions (rollback/canary), health probes and managed identity." },
    { layer: "Identity & secrets", choice: "Managed identity + Key Vault + RBAC (DefaultAzureCredential)", why: "Keyless access to Azure OpenAI/AI Search/Key Vault — no stored secrets; same code local + cloud." },
    { layer: "AI services", choice: "Azure OpenAI + Azure AI Search", why: "Your model + retrieval as managed services (call OpenAI by DEPLOYMENT name)." },
    { layer: "CI/CD", choice: "GitHub Actions", why: "Test → eval gate → build → deploy on every change; keys in CI secrets." },
    { layer: "Observability", choice: "Azure Monitor / Log Analytics (+ LangSmith/Langfuse for traces)", why: "Latency/cost/error/quality signals with alerts; traces localize the failing layer." },
  ],
  functionalRequirements: [
    "The P3/P4 app is exposed via a documented FastAPI service with input validation, safe errors, a health endpoint, and streaming.",
    "The service is packaged as a lean, reproducible container (multi-stage build) with no secrets baked into any layer; compose brings up the full local stack.",
    "The container is deployed to Azure Container Apps with a managed identity and least-privilege RBAC to Azure OpenAI, AI Search and Key Vault — with no stored API keys.",
    "Readiness and liveness health probes gate traffic and restarts correctly.",
    "A CI/CD pipeline runs on every change: tests, then an evaluation gate that FAILS the build on a quality regression, then build + deploy.",
    "Deployment is cautious (canary or revision-based) and a rollback to the last healthy revision is tested and works.",
    "Monitoring captures latency (p50/p95/p99), error rate, cost per request and a quality signal, with alerts on thresholds.",
    "Caching and/or model routing reduce cost/latency without degrading quality (measured).",
    "A security review is completed and its findings fixed: identity-based secrets, authn AND authz, injection isolation, PII-safe logs, and rate limiting.",
    "The deployment is reproducible from scripts/IaC, not manual portal clicks.",
  ],
  nonFunctionalRequirements: [
    "Reproducibility — the deploy is scripted and repeatable; no snowflake environment.",
    "Security — no stored secrets, least-privilege identity, authn≠authz enforced, PII-safe logging, rate limiting (LLM10).",
    "Reliability — health probes, autoscaling bounds, graceful degradation, tested rollback.",
    "Observability — every request traceable by id to the slow/failing layer; p95/p99 measured, not just the mean.",
    "Cost control — bounded per-request cost, caching, a cost alert so a spike can't run an unbounded bill.",
    "Quality protection — the eval gate blocks regressions before they reach users.",
  ],
  phases: [
    {
      name: "API + container",
      intro: "Wrap and package the app.",
      tasks: [
        "Wrap P3/P4 in a documented streaming FastAPI service (validation, safe errors, /health).",
        "Write a multi-stage Dockerfile (lean, non-root, no baked secrets) + a .dockerignore.",
        "Bring up the full stack locally with docker compose.",
      ],
    },
    {
      name: "Azure deploy (secure)",
      intro: "Run it on the cloud, keyless.",
      tasks: [
        "Deploy to Container Apps with a managed identity + least-privilege RBAC (OpenAI/Search/Key Vault).",
        "Configure health probes, ingress, autoscaling bounds and structured logging.",
        "Confirm the app reaches all Azure services with NO stored keys; capture the deploy as scripts/IaC.",
      ],
    },
    {
      name: "CI/CD + eval gate",
      intro: "Automate and protect quality.",
      tasks: [
        "Build a pipeline: test → eval gate (fails on regression) → build/push → deploy.",
        "Make deployment cautious (canary/revision) and TEST a rollback to the last healthy revision.",
        "Keep provider keys/config in CI secrets, not the repo.",
      ],
    },
    {
      name: "Monitoring + cost",
      tasks: [
        "Instrument latency (p95/p99), error rate, cost per request and a quality signal, with alerts.",
        "Add caching and/or model routing; measure the cost/latency reduction with quality intact.",
        "Add a cost/budget alert so a spike can't run an unbounded bill.",
      ],
    },
    {
      name: "Security review & delivery",
      tasks: [
        "Run the security review: identity-based secrets, authn+authz, injection isolation, PII-safe logs, rate limiting — fix findings.",
        "Verify the whole lifecycle end to end (a good change ships monitored; a regression is blocked/rolled back).",
        "Write the README + architecture + runbook; document limitations.",
      ],
    },
  ],
  checklist: [
    "Wrap P3/P4 in a streaming FastAPI service (+ /health)",
    "Write a multi-stage Dockerfile (lean, non-root, no secrets)",
    "Bring up the full stack with docker compose",
    "Deploy to Azure Container Apps with managed identity",
    "Grant least-privilege RBAC (OpenAI/Search/Key Vault)",
    "Confirm no stored keys anywhere",
    "Configure readiness/liveness probes + autoscaling bounds",
    "Capture the deploy as scripts/IaC",
    "Build a CI/CD pipeline (test → eval gate → build → deploy)",
    "Make the eval gate fail on a quality regression",
    "Add canary/revision deploy + a TESTED rollback",
    "Instrument latency (p95/p99), error, cost, quality + alerts",
    "Add caching and/or model routing; measure the savings",
    "Add a cost/budget alert",
    "Complete a security review and fix findings",
    "Verify the full lifecycle end to end",
    "Write README + architecture + runbook",
  ],
  projectStructure: `production-ai-service/
  app/                 # your P3 RAG / P4 agent
  api/
    main.py            # FastAPI: /ask (stream), /health
  Dockerfile           # multi-stage, non-root
  docker-compose.yml   # api + vector store + deps
  infra/               # IaC / az CLI scripts (reproducible deploy)
  eval/
    run_gate.py        # eval gate: non-zero exit on regression
    golden.jsonl
  .github/workflows/
    deploy.yml         # test -> eval gate -> build -> deploy
  ops/
    monitoring.md      # dashboards, alerts
    runbook.md         # incidents, rollback
  README.md  ARCHITECTURE.md`,
  decisions: [
    {
      decision: "Keys vs managed identity for Azure access",
      options: "Store API keys in config · managed identity + RBAC (keyless).",
      tradeoff: "Stored keys must be rotated and can leak; managed identity issues short-lived tokens with no stored secret and the same code works locally and in Azure. Prefer managed identity; use Key Vault only for the few secrets that can't be identity-based.",
    },
    {
      decision: "Scale-to-zero vs a warm minimum",
      options: "min replicas = 0 (cheapest) · min ≥ 1 (steady latency).",
      tradeoff: "Scale-to-zero saves cost for spiky/low traffic but adds a cold-start penalty on the first request; a warm minimum keeps latency steady at a baseline cost. Choose by traffic pattern and latency budget.",
    },
    {
      decision: "What the eval gate blocks on",
      options: "Nothing (deploy freely) · quality floor + tolerance · quality + cost + latency.",
      tradeoff: "No gate lets regressions ship silently; a quality gate catches answer regressions; adding cost/latency catches 'cheaper-but-worse' or 'same-quality-but-slower'. Gate on what your users feel, tuned above eval noise.",
    },
    {
      decision: "Deploy strategy",
      options: "Direct replace · canary (a slice of traffic) · blue/green.",
      tradeoff: "Direct replace is simplest but risky; canary limits the blast radius of a bad deploy and enables automated rollback on unhealthy metrics. Prefer canary/revision-based with a tested rollback.",
    },
    {
      decision: "What to cache",
      options: "Nothing · response/semantic cache for stable queries · prompt-prefix cache.",
      tradeoff: "Caching cuts cost/latency but caching personalized or time-sensitive answers is a correctness bug. Cache only stable, non-personalized results with correct keys and a TTL; measure the hit rate.",
    },
  ],
  gotchas: [
    "Baking secrets into the image or committing them — leaked permanently; use runtime env / Key Vault / managed identity.",
    "Manual, unrepeatable portal deploys — a snowflake nobody can reproduce or roll back; script it.",
    "A liveness probe that calls a downstream service — a downstream blip restarts every instance (restart storm).",
    "No eval gate — a prompt/model change silently degrades quality in production.",
    "No rollback (or an untested one) — an incident drags on; test rollback before you need it.",
    "Deploy-and-forget — no monitoring, so users report problems before you do.",
    "Passing the base model id on Azure instead of the deployment name — 404 DeploymentNotFound.",
    "Autoscaling without provider quota headroom — more replicas just move the bottleneck to 429s.",
    "Watching only the mean latency — the p95/p99 tail is what users feel.",
    "Authentication without authorization — an authenticated user acting beyond their permissions.",
  ],
  testing: {
    functional: [
      "The deployed API answers correctly end to end (RAG/agent behavior intact).",
      "Health probes correctly gate traffic and restarts.",
      "A push triggers the pipeline: tests + eval gate + build + deploy.",
      "A rollback restores the last healthy revision.",
    ],
    edgeCases: [
      "A concurrency spike scales within bounds (and you know the saturation behavior).",
      "Scale-to-zero cold start is within the latency budget (or a warm min is set).",
      "A cost spike triggers the budget alert.",
      "A malformed request is rejected safely at the API boundary.",
    ],
    failureModes: [
      "Inject a quality regression → the eval gate blocks the deploy.",
      "Deploy a bad revision → monitoring alerts and rollback restores health.",
      "A downstream (OpenAI/Search) outage → graceful degradation, not a crash; alerts fire.",
      "An injection / jailbreak attempt → blocked by the security controls; no unauthorized action or leak.",
    ],
    aiEvaluation: [
      "Answer quality on the golden set gated in CI (regressions block).",
      "Production quality signal (e.g. sampled groundedness or feedback) monitored over time.",
      "Latency p95/p99 and cost per request tracked before/after caching + routing.",
      "Security review findings closed and re-verified on the running service.",
    ],
  },
  definitionOfDone: [
    "The app is served as a documented streaming API and runs in a lean, reproducible container.",
    "It's deployed on Azure Container Apps with managed identity + least-privilege RBAC and NO stored keys.",
    "Health probes, autoscaling bounds and structured logging are configured; the deploy is scripted/IaC.",
    "A CI/CD pipeline tests, runs an eval gate that blocks regressions, builds and deploys (canary), with a tested rollback.",
    "Monitoring captures latency (p95/p99), error, cost and quality with alerts; caching/routing reduce cost with quality intact.",
    "A security review is complete with findings fixed (identity secrets, authn+authz, injection isolation, PII-safe logs, rate limiting).",
    "The whole lifecycle is verified end to end.",
    "README, architecture and a runbook (incidents/rollback) are documented.",
  ],
  expectedOutcome:
    "A real, deployed, monitored, secured AI service — the flagship portfolio piece that proves you can operate AI in production, not just prototype it. You will have a live (or reproducibly deployable) system with a CI/CD eval gate, monitoring, cost controls and a security review: the exact evidence senior AI-engineering roles look for.",
  outcomeArtifacts: [
    "A deployed, containerized streaming AI service on Azure",
    "Managed-identity, keyless access to models + data",
    "A CI/CD pipeline with an evaluation gate + tested rollback",
    "A monitoring dashboard (latency/cost/quality) with alerts",
    "Caching/routing cost optimization with measured savings",
    "A completed security review with fixes",
    "README + architecture + runbook, and a demo-ready repo",
  ],
  stretchGoals: [
    "Blue/green or shadow deployments.",
    "Full distributed tracing with cost attribution per request.",
    "Autoscaling tuned to real load tests with p99 SLOs.",
    "Automated security/red-team checks in CI.",
    "Multi-region deployment with data-residency controls.",
    "A/B testing of prompts or models behind the eval gate.",
  ],
  skillsDemonstrated: [
    "Production AI engineering / LLMOps",
    "API design & containerization",
    "Cloud deployment on Azure",
    "Keyless security (managed identity, Key Vault)",
    "CI/CD with evaluation gates",
    "Monitoring, alerting & rollback",
    "Cost optimization",
    "Security hardening & review",
  ],
  portfolio:
    "This is the strongest signal in your portfolio. It proves you can take an AI system all the way to production — deployed, secured, automated, monitored and cost-controlled — which is precisely what companies struggle to do and precisely what they hire AI engineers for. A reviewer sees a CI/CD eval gate, keyless cloud security, monitoring with rollback, and a security review, and knows you can *operate* AI, not just build a demo.",
};
