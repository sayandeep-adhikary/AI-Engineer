import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "CI/CD, Monitoring & LLMOps" (topic-prod-cicd-ops).
// 4 units: 01 learn (CI/CD lifecycle, eval gate, monitoring/alerting, rollback, LLMOps) · 02 build
// (pipeline w/ eval gate + monitoring — P6 m-04) · 03 review (simulate incident & roll back) ·
// 04 PROJECT "Deliver Project P6" (the capstone). commonMistakes: Deploy-and-forget, No rollback,
// No cost alerts. masteryCriteria: pipeline that tests, evals, deploys and monitors automatically.
// Deterministic keyless pipeline-gate / canary / rollback / P6-release-gate experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You can deploy manually — once. **Operating an AI app reliably means automating the path from commit to production and watching it after it lands.** That is LLMOps: a pipeline that tests, evaluates and deploys on every change, plus monitoring that tells you when quality, latency or cost drift — and a rollback you have actually practiced. This topic ties the evaluation category (Batch 12) and the deployment topics into one lifecycle, and it is where Project P6 comes together.",
  },
  {
    type: "prose",
    md: "**Mental model: the pipeline is a series of gates from commit to production, and monitoring is the feedback loop that closes back to the next commit.** Code is tested; an eval gate proves quality didn't regress; the build deploys (often cautiously, to a slice of traffic first); monitoring watches quality/latency/cost in production; a regression triggers an alert and a rollback; the fix starts the next commit. The two failure modes to design against are 'deploy and forget' (no monitoring, so you learn about problems from users) and 'no rollback' (a bad deploy that you can't quickly undo).",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "CI/CD pipeline", definition: "Continuous Integration / Continuous Delivery: an automated sequence triggered by a commit — lint, unit tests, build, eval gate, deploy. Each stage must pass for the next to run; the first failure blocks the release. It replaces manual deploys with a defined, versioned, repeatable process (the cure for snowflake deploys)." },
      { term: "Eval gate", definition: "The CI stage that runs your evaluation suite (from the evaluation category) on the change and fails the build if quality drops below a threshold — 'unit tests for a non-deterministic system.' It is what stops a prompt tweak or model bump from silently regressing answer quality. Reused here, not re-derived." },
      { term: "Monitoring & alerting", definition: "Continuous measurement of the live service — latency (p50/p95/p99), error rate, cost per request, and quality signals — with alerts when a metric crosses a threshold. It is how you detect regressions and incidents in production, complementing pre-deploy evals. Built on the tracing/observability from the evaluation category." },
      { term: "Canary / shadow deployment", definition: "Cautious release strategies: a canary sends a small slice of traffic to the new version and promotes it only if its metrics stay healthy (else rolls back); a shadow sends a copy of traffic to the new version without serving its responses, to compare safely. Both limit the blast radius of a bad deploy." },
      { term: "Rollback", definition: "Reverting to the last known-good version quickly when a deploy misbehaves. On a revision-based platform (like Container Apps) you shift traffic back to a previous healthy revision. A rollback you haven't tested is not a rollback — the review unit exists to practice it." },
      { term: "LLMOps lifecycle", definition: "The operational loop for AI apps: version prompts/models/config, evaluate before deploy, deploy cautiously, trace and monitor in production, detect regressions (including from an upstream model change), and roll back or fix. It adds AI-specific concerns (non-determinism, prompt/model versioning, quality drift) to classic DevOps." },
    ],
  },
  {
    type: "prose",
    md: "**A pipeline is a gate sequence: each stage runs only if the prior ones passed, and the first failure blocks the deploy:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Pipeline gating — the first failure blocks the deploy (deterministic, keyless)",
    code: `def pipeline(stages):
    # A stage runs only if all prior stages passed; first failure blocks the release.
    for name, passed in stages:
        if not passed:
            return "blocked at: " + name
    return "deployed"

print(pipeline([("unit_tests", True), ("eval_gate", True), ("deploy", True)]))
print(pipeline([("unit_tests", True), ("eval_gate", False), ("deploy", True)]))`,
    output: `deployed
blocked at: eval_gate`,
  },
  {
    type: "prose",
    md: "When every stage passes, the change deploys. When the eval gate fails — a quality regression — the pipeline blocks at that stage and never reaches deploy, exactly like a failing unit test blocks a merge. This is why the eval gate (from the evaluation category) belongs in CI and not in someone's memory: it makes a quality drop a red build at merge time, not a production incident. The ordering matters too — cheap deterministic checks (lint, unit tests) run before the more expensive eval, so most bad changes fail fast and cheap.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Deploy-and-forget, no rollback, and no cost alerts",
    md: "The three commonMistakes this topic exists to prevent:\n\n- **Deploy-and-forget** — shipping with no monitoring, so you find out about regressions, outages, or a quality drop from angry users or a surprise bill, not from your own alerts. Cure: monitor latency (p95/p99), error rate, cost per request, and quality signals, with alerts on thresholds — the observability loop from the evaluation category, running in production.\n- **No rollback** — a bad deploy you can't quickly undo, so an incident drags on while you hot-fix forward under pressure. Cure: keep the previous known-good version deployable and practice shifting traffic back to it (revision rollback); a rollback you've never tested is a guess.\n- **No cost alerts** — AI cost is per-token and can spike from a traffic surge, a retry storm, or an injected loop, running up an unbounded bill silently. Cure: track cost per request and set budget alerts (this is LLM10 unbounded consumption, operationalized).\n\nAll three are the same gap: shipping without the feedback loop that tells you when production is unhealthy — and the means to recover."
  },
  {
    type: "quiz",
    question: "Your team deploys by merging to main and manually running a deploy script when someone remembers. There's no automated quality check and no monitoring. Over a month, answer quality quietly degrades and one deploy takes the API down for hours before anyone notices. What's the systemic fix?",
    choices: [
      "Deploy less often to reduce risk",
      "Build a CI/CD pipeline: automated tests + an eval gate that blocks quality regressions before deploy, plus monitoring/alerting (latency, error rate, cost, quality) and a tested rollback so a bad deploy is caught and reverted fast. The problem is the absence of automated gates and a feedback loop, not deploy frequency",
      "Add more manual reviewers to each deploy",
      "Switch to a bigger model so quality can't degrade",
    ],
    answerIndex: 1,
    explanation: "The failures come from relying on human diligence with no automated gates or feedback loop: an eval gate in CI would block silent quality regressions before deploy, and monitoring with alerts plus a tested rollback would catch and revert the outage quickly. Deploying less often or adding manual reviewers still depends on people remembering, and a bigger model doesn't prevent regressions or outages. The systemic fix is automation: gates before deploy, observability after.",
  },
  {
    type: "takeaways",
    items: [
      "The pipeline is a gate sequence (test → eval gate → deploy); the first failure blocks the release, so a quality regression is a red build, not a production incident.",
      "Order gates cheap-to-expensive: lint/unit tests before the eval suite, so most bad changes fail fast.",
      "Monitoring closes the loop: watch p95/p99 latency, error rate, cost per request, and quality signals in production, with threshold alerts.",
      "Keep a tested rollback (shift traffic to the last good revision) and release cautiously (canary/shadow) to bound the blast radius of a bad deploy.",
      "Avoid deploy-and-forget, no-rollback, and no-cost-alerts — the LLMOps lifecycle adds AI-specific concerns (non-determinism, prompt/model versioning, quality drift) to DevOps.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "Now automate it. The completion criterion is 'pipeline tests, evals, deploys and monitors,' and this delivers **Project P6's milestone `p6-04`** (automate deploy with an eval gate) and connects to **`p6-05`** (monitoring). You wire your tests, the eval suite from the evaluation category, a cautious deploy, and monitoring into one pipeline that runs on every change.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *pipeline tests, evals, deploys and monitors.* Build a CI/CD pipeline (e.g. GitHub Actions) that on each change: runs unit tests, runs the eval gate (`topic-eval-ci`), builds and pushes the image, deploys (ideally canary), and confirms monitoring is live. **Roadmap fit:** this is **P6 `p6-04`** ('pipeline tests, evals and deploys automatically') and feeds **`p6-05`** (monitoring). Reuse the eval gate from `topic-eval-ci` and the tracing/dashboards from `topic-eval-observability` — don't rebuild them, wire them in. Keep provider keys in CI **secrets** (from the environment/tooling and security categories). The canary + rollback logic is the safety net that makes automated deploy safe."
  },
  {
    type: "prose",
    md: "**A canary promotes the new version only if its metrics stay healthy — otherwise it rolls back automatically:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Canary promotion / automated rollback decision (deterministic, keyless)",
    code: `def canary_decision(error_rate, baseline_rate, threshold=0.02):
    # Promote only if the canary's error rate isn't materially worse than baseline.
    delta = round(error_rate - baseline_rate, 4)
    if delta > threshold:
        return "rollback: canary worse (delta=" + str(delta) + ")"
    return "promote: canary healthy (delta=" + str(delta) + ")"

print(canary_decision(0.011, 0.010))   # delta 0.001 -> promote
print(canary_decision(0.045, 0.010))   # delta 0.035 -> rollback`,
    output: `promote: canary healthy (delta=0.001)
rollback: canary worse (delta=0.035)`,
  },
  {
    type: "prose",
    md: "The canary carries a small slice of traffic; if its error rate is within tolerance of baseline (delta 0.001), it is promoted to full traffic. If it is materially worse (delta 0.035 > 0.02), it is rolled back automatically before most users ever see it. This is the deploy safety net: the eval gate catches regressions before deploy, and the canary catches what only shows up under real traffic (a latency spike, an integration break, a p99 problem) — with the blast radius limited to the canary slice. Same idea applies to latency and cost thresholds, not just error rate.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a pipeline with eval gate + monitoring",
    intro: "Automate commit → production, safely and observably. Acceptance defines done.",
    steps: [
      { order: 1, action: "Build a CI workflow: on push/PR run lint + unit tests, then the eval gate (topic-eval-ci) over the golden set; fail the build on a regression. Keep provider keys in CI secrets.", decision: "What's the cheap-to-expensive order? Lint/unit tests before the eval so most bad changes fail fast; the eval gate blocks quality regressions before any deploy." },
      { order: 2, action: "Add build + push (versioned image) and a deploy step — ideally a canary that shifts a slice of traffic and promotes on healthy metrics, rolls back otherwise. Confirm monitoring (latency/error/cost/quality) is live post-deploy (topic-eval-observability).", expected: "A change that passes gates deploys via canary and is monitored; a regression is blocked (eval gate) or rolled back (canary)." },
      { order: 3, action: "Add cost + latency alerts (budget thresholds, p95). Verify the whole pipeline end-to-end: a good change flows to production monitored; a bad change is stopped.", verify: "The pipeline tests, evals, deploys (canary), and monitors automatically on every change, with keys in secrets and cost/latency alerts — delivering P6 p6-04 and feeding p6-05." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — automated pipeline (P6 p6-04 / p6-05)",
    items: [
      "CI runs lint + unit tests + eval gate on each change (cheap-to-expensive); regression fails the build; keys in CI secrets.",
      "Build + push versioned image; deploy via canary with automated promote/rollback on healthy metrics.",
      "Monitoring live post-deploy (latency p95/p99, error rate, cost per request, quality signals).",
      "Cost + latency alerts set; whole pipeline verified end-to-end (good change ships monitored, bad change stopped).",
    ],
  },
  {
    type: "code",
    language: "yaml",
    caption: "Reference — CI/CD with eval gate + gated deploy (GitHub Actions; action versions churn — check current)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `name: deploy
on: [push]
jobs:
  ci-cd:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest                              # cheap deterministic tests first
      - name: Eval gate
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}   # key from CI secrets
        run: python eval/run_gate.py             # non-zero exit on regression -> blocks deploy
      - name: Build + push image
        run: docker build -t registry/app:\${{ github.sha }} . && docker push registry/app:\${{ github.sha }}
      - name: Canary deploy
        run: ./deploy_canary.sh registry/app:\${{ github.sha }}   # shift a slice; promote/rollback on metrics`,
  },
  {
    type: "takeaways",
    items: [
      "Automate commit → production: tests + eval gate + build + canary deploy + monitoring, on every change — delivering P6 p6-04 and feeding p6-05.",
      "The eval gate (from topic-eval-ci) blocks quality regressions before deploy; the canary catches what only shows under real traffic, with a bounded blast radius.",
      "Order gates cheap-to-expensive (lint/tests before the eval suite) so most bad changes fail fast and cheap.",
      "Promote a canary only on healthy metrics (error/latency/cost within tolerance of baseline); roll back automatically otherwise.",
      "Keep provider keys in CI secrets, and set cost + latency alerts — reuse the eval gate and observability from the evaluation category, don't rebuild them.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A rollback you have never run is a hope, not a control. The completion criterion is 'rollback restores a healthy state' — so **simulate an incident and roll back**: deploy something bad, detect it, revert to the last good revision, and confirm recovery. Fire drills for production; the time to discover your rollback is broken is not during a real outage.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Running an incident drill",
    md: "A good rollback drill:\n\n- **Inject a regression** — deploy a version with a quality drop, a latency spike, or an error surge (a broken prompt, a bad model swap, a slow dependency).\n- **Detect it via monitoring** — confirm your alerts actually fire (error rate, p95, cost, quality). If they don't, your monitoring has a gap — a finding as important as the regression.\n- **Roll back** — shift traffic to the last known-good revision and confirm recovery (metrics return to baseline). Time it: how long from detection to healthy?\n- **Post-incident** — what boundary failed first? Did the eval gate miss it (add a regression case), or was it something only visible under real traffic (tighten monitoring/canary)?\n\nThe recurring production questions apply: what happens after a bad deploy (can you revert fast)? what happens when an upstream model changes (does monitoring catch the quality drift)? A tested rollback answers them."
  },
  {
    type: "prose",
    md: "**Rollback targets the most recent healthy revision — and there must be one:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Rollback to the last known-good revision (deterministic, keyless)",
    code: `def rollback_target(revisions):
    # Roll back to the most recent revision that was healthy.
    healthy = [rev for rev, ok in revisions if ok]
    return healthy[-1] if healthy else "no healthy revision"

print(rollback_target([("v1", True), ("v2", True), ("v3", False)]))
print(rollback_target([("v1", False), ("v2", False), ("v3", False)]))`,
    output: `v2
no healthy revision`,
  },
  {
    type: "prose",
    md: "When the current revision (v3) is bad, you shift traffic back to v2 — the most recent healthy one — and recover in seconds. The second case is the nightmare a revision-based platform prevents: if no revision was ever healthy, there is nothing to roll back to, and you are hot-fixing forward under fire. That is why you keep the previous good revision deployable and never delete your only working version. Rollback is fast recovery, not a fix — you revert first to stop the bleeding, then diagnose and fix forward through the pipeline at your own pace.",
  },
  {
    type: "quiz",
    question: "You deploy a new prompt that improves offline eval scores, but in production p95 latency doubles and users complain. Your monitoring alerts fire. What's the correct immediate action, and the follow-up?",
    choices: [
      "Leave it deployed and try to optimize the prompt live under pressure",
      "Immediately roll back to the last known-good revision to restore healthy latency (stop the bleeding), THEN diagnose why offline eval missed the latency regression — likely because the eval measured quality, not latency, so add latency to the gate and/or a canary that watches p95 before full promotion. Revert first, fix forward second",
      "Delete the monitoring alerts since the deploy improved quality scores",
      "Nothing — offline eval passed, so production is fine by definition",
    ],
    answerIndex: 1,
    explanation: "The immediate priority is recovery: roll back to the last healthy revision so users get acceptable latency again. Then investigate why the regression slipped through — an offline eval that scores quality won't catch a latency regression, so the fix is to add latency to the gate and use a canary that checks p95 before promoting. Optimizing live under pressure, deleting the alerts, or trusting offline eval over real user impact all leave the regression in production.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — run an incident drill end to end.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Simulate an incident and roll back",
    intro: "Break it on purpose, detect, revert, learn. Not completion-gated — this is the proof your recovery works.",
    steps: [
      { order: 1, action: "Deploy a deliberately bad version (quality drop, latency spike, or error surge). Confirm your monitoring detects it and alerts fire — if they don't, that's a monitoring gap to fix.", expected: "The regression is detected by your own monitoring, not by users — or you've found a monitoring gap." },
      { order: 2, action: "Roll back to the last known-good revision; confirm metrics return to baseline. Time detection→recovery. Verify a healthy revision was always available to roll back to.", decision: "Was rollback fast and clean? If there was no healthy revision to return to, fix your release process so the previous good version stays deployable." },
      { order: 3, action: "Post-incident: identify the first boundary that failed and why the pre-deploy gates missed it (eval measured the wrong thing? only visible under real traffic?). Add the missing guard (regression case, latency/cost gate, canary metric).", verify: "You injected a regression, detected it via monitoring, rolled back to a healthy revision restoring baseline, and closed the gap that let it through — a tested, trustworthy rollback." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a tested rollback",
    items: [
      "A deliberately bad deploy is detected by your own monitoring (alerts fire), not by users.",
      "Rollback to the last known-good revision restores baseline metrics; detection→recovery time measured.",
      "A healthy revision was always available to roll back to (release process keeps the previous good version deployable).",
      "Post-incident: first-failing boundary identified and the missing guard added (regression case / latency-cost gate / canary metric).",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Practice rollback before you need it: inject a regression, detect it via monitoring, revert to the last good revision, confirm recovery — an untested rollback is a guess.",
      "Rollback targets the most recent healthy revision; keep the previous good version deployable so there's always one to return to.",
      "Revert first (stop the bleeding), diagnose and fix forward second — rollback is fast recovery, not the fix.",
      "Offline eval that scores quality won't catch a latency or cost regression — add those to the gate and let a canary watch p95 before promotion.",
      "Post-incident, close the gap that let the regression through (regression case, latency/cost gate, canary metric) — every incident hardens the pipeline.",
    ],
  },
];

const project: ContentBlock[] = [
  {
    type: "prose",
    md: "**Project P6 — Production-Grade AI Service (Capstone Integration).** This is the flagship: take your P3 RAG app (and P4 agent) all the way to production — containerized, deployed on Azure with secure config, automated CI/CD with an eval gate, monitoring and cost controls, and a security review. The completion criterion is 'P6 is deployed, monitored, secured and cost-optimized.' Every topic in this category, plus evaluation (Batch 12) and security (Batch 13), converges here.",
  },
  {
    type: "callout",
    variant: "note",
    title: "The exact P6 contract (six milestones)",
    md: "Project P6 (`project-p6-production-service`) is assembled from six milestones, each delivered by work you've now done:\n\n- **p6-01 API** — wrap P3/P4 in a robust, documented streaming API (`topic-prod-api`).\n- **p6-02 Container** — a lean, reproducible image + full stack (`topic-prod-docker`).\n- **p6-03 Azure deploy** — runs on Azure with Key Vault / managed identity (`topic-prod-azure-ai` + `topic-prod-cloud-deploy`).\n- **p6-04 CI/CD + eval gate** — pipeline tests, evals, deploys automatically (`topic-prod-cicd-ops` + `topic-eval-ci`).\n- **p6-05 Monitoring + cost controls** — latency/cost monitored and controlled (`topic-eval-observability` + `topic-prod-scaling-cost`).\n- **p6-06 Security hardening** — a security review complete with fixes applied (`topic-sec-guardrails` + `topic-sec-data-privacy`).\n\nExpected deliverables: a Dockerized API, an Azure deployment (Key Vault / managed identity), CI/CD with an eval gate, a monitoring dashboard, cost/caching optimization, and a security review. This is the strongest hiring signal in the whole roadmap — it proves you can operate AI in production, not just prototype it."
  },
  {
    type: "prose",
    md: "**Release readiness is the conjunction of all six milestones — a deterministic gate over the P6 contract:**",
  },
  {
    type: "code",
    language: "python",
    caption: "P6 release-readiness gate over the six milestones (deterministic, keyless)",
    code: `def p6_release_ready(state):
    checks = {
        "api_streaming":     state.get("api_streaming"),      # p6-01
        "containerized":     state.get("containerized"),      # p6-02
        "azure_deployed_mi": state.get("azure_deployed_mi"),  # p6-03 (managed identity)
        "cicd_eval_gate":    state.get("cicd_eval_gate"),     # p6-04
        "monitoring_cost":   state.get("monitoring_cost"),    # p6-05
        "security_review":   state.get("security_review"),    # p6-06
    }
    missing = sorted(k for k, v in checks.items() if not v)
    return {"ready": not missing, "missing": missing}

print(p6_release_ready({"api_streaming": True, "containerized": True, "azure_deployed_mi": True,
                        "cicd_eval_gate": True, "monitoring_cost": True, "security_review": True}))
print(p6_release_ready({"api_streaming": True, "containerized": True}))`,
    output: `{'ready': True, 'missing': []}
{'ready': False, 'missing': ['azure_deployed_mi', 'cicd_eval_gate', 'monitoring_cost', 'security_review']}`,
  },
  {
    type: "prose",
    md: "P6 is release-ready only when all six milestones are met; the second case shows a half-finished service (API + container, but no Azure deploy, no pipeline, no monitoring, no security review) and names exactly what's missing. This mirrors the reality of shipping: a demo has the API and maybe a container; a *product* has the deploy, the automated gate, the monitoring, and the security review too. The gate isn't bureaucracy — each missing item is a way the service fails in production (unreproducible deploy, silent regressions, blind operation, unaddressed vulnerabilities).",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Deliver Project P6",
    intro: "Assemble the production service from its six milestones. This is the capstone build.",
    steps: [
      { order: 1, action: "API + Container (p6-01, p6-02): wrap P3/P4 in a documented streaming FastAPI service; containerize it lean and reproducibly with its full stack (compose). Verify streaming, validation, safe errors, and a fast /health.", expected: "A documented streaming API in a lean container that builds and runs reproducibly." },
      { order: 2, action: "Azure deploy (p6-03): deploy to Container Apps with a managed identity + least-privilege RBAC on OpenAI/Search/Key Vault, ingress, health probes, and structured logs — no stored keys. Capture it as reproducible IaC/scripts.", decision: "Is every credential identity-based? Is the deploy reproducible enough to live in the pipeline?" },
      { order: 3, action: "CI/CD + Monitoring + Cost (p6-04, p6-05): a pipeline that tests, runs the eval gate, builds, deploys (canary), and confirms monitoring (latency/error/cost/quality) with alerts; add caching + model routing for cost/latency. Practice a rollback.", expected: "Every change flows through automated gates to a monitored deploy; cost/latency are controlled; rollback is tested." },
      { order: 4, action: "Security review (p6-06): audit the running service (no stored keys, authn AND authz, injection isolation, output validation, PII-safe logs, rate limit) and fix findings. Then run the release-readiness gate over all six milestones.", verify: "P6 is deployed on Azure with managed identity, served as a documented streaming API in a lean container, shipped by an automated eval-gated pipeline, monitored with cost controls, and security-reviewed with fixes applied — all six milestones met." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — Project P6 delivered",
    items: [
      "p6-01/02: documented streaming API in a lean, reproducible container (+ full stack via compose).",
      "p6-03: deployed on Azure Container Apps with managed identity + least-privilege RBAC + Key Vault; no stored keys; reproducible deploy.",
      "p6-04/05: automated CI/CD with an eval gate, canary deploy, monitoring (latency/error/cost/quality) + alerts, caching/routing for cost, tested rollback.",
      "p6-06: security review complete with fixes (authn+authz, injection isolation, output validation, PII-safe logs, rate limit); release-readiness gate passes all six milestones.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "P6 is the capstone: P3/P4 taken to production across six milestones — API, container, Azure deploy, CI/CD + eval gate, monitoring + cost, security review.",
      "Release-ready = all six milestones met; each missing item is a concrete production failure mode (unreproducible deploy, silent regression, blind ops, unaddressed vulnerability).",
      "It integrates the whole roadmap: RAG/agent (P3/P4), evaluation (eval gate + observability), security (the review), and every production topic — wired together, not rebuilt.",
      "The through-line: the model decided vs the application authorized; application policy vs model behavior — enforced at every boundary from API to deploy to pipeline.",
      "This is the strongest hiring signal in the roadmap: it proves you can operate AI in production, not just prototype it.",
    ],
  },
];

export const content: TopicContent = {
  "unit-prod-cicd-ops-01": learn,
  "unit-prod-cicd-ops-02": build,
  "unit-prod-cicd-ops-03": review,
  "unit-prod-cicd-ops-04": project,
};
