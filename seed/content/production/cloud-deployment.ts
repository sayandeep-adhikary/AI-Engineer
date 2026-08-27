import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Deploying to the Cloud" (topic-prod-cloud-deploy).
// 3 units: 01 learn (container hosting, config, scaling, health checks — readiness vs liveness,
// logs) · 02 build (deploy the container to a managed service — feeds P6 m-03) · 03 review
// (verify scaling/logging — autoscale bounds, correlation IDs). commonMistakes: Manual snowflake
// deploys, No health checks/logging. masteryCriteria: reachable, monitored deployment.
// Deterministic keyless probe/cold-start/autoscale experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "A container on your laptop is still not a product. **Deployment is making it reachable, healthy, and observable on infrastructure you don't babysit.** Managed container platforms (Azure Container Apps, Cloud Run, ECS, and friends) run your image, route traffic to healthy instances, scale with load, and collect logs — if you give them what they need: a health signal, externalized config, and a reproducible deploy. This topic is the durable concepts behind that, so they transfer across any cloud.",
  },
  {
    type: "prose",
    md: "**Mental model: the platform is a supervisor that only knows what your app tells it.** It asks 'are you alive?' and 'are you ready for traffic?' via health probes; it reads config and secrets from the environment; it starts more instances when load rises and fewer when it falls; it collects your logs if they go to stdout in a structured form. A deploy that answers these questions well is operable; one that doesn't is a black box that fails silently. The two mistakes to avoid are the same everywhere: a manual snowflake deploy nobody can reproduce, and a service with no health checks or logs.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Managed container platform", definition: "A service that runs your container image without you managing servers: it pulls the image, runs N instances, load-balances traffic, autoscales, restarts unhealthy instances, and aggregates logs. Examples: Azure Container Apps, Google Cloud Run, AWS ECS/Fargate. You provide the image + config + health probes; it operates them." },
      { term: "Liveness probe", definition: "A health check that asks 'is this instance broken?' If it fails, the platform restarts the instance. Use it for unrecoverable states (deadlock, wedged process). A liveness check should be cheap and must NOT depend on downstream services, or a downstream outage will trigger pointless restarts." },
      { term: "Readiness probe", definition: "A health check that asks 'can this instance serve traffic right now?' If it fails, the platform stops routing to it (but does not restart it) until it passes again. Use it during startup (model still loading) or transient overload. Readiness gates traffic; liveness gates restarts — conflating them causes restart storms." },
      { term: "Externalized config", definition: "Configuration and secrets supplied by the environment (env vars, a secrets manager, a config service) rather than baked into the image. The same image runs in dev/staging/prod with different config. Secrets come from a vault / managed identity, never from the image (from the container topic)." },
      { term: "Autoscaling", definition: "The platform runs more instances as load rises and fewer as it falls, between a min and max you set. Scale-to-zero (min=0) saves cost but adds a cold-start penalty on the first request. Bounds matter: too low a max and you saturate under a spike; too low a min and every idle period pays cold starts." },
      { term: "Structured logging", definition: "Emitting logs as machine-parseable records (JSON with fields: level, message, request_id, latency) to stdout, where the platform collects them. Structured logs are searchable and correlatable; unstructured print statements are noise. Never log secrets or raw PII (from the security category)." },
    ],
  },
  {
    type: "prose",
    md: "**The single most important production distinction here is readiness vs liveness — they trigger different actions:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Readiness vs liveness — different failures, different actions (deterministic, keyless)",
    code: `def probe_action(liveness_ok, readiness_ok):
    if not liveness_ok:
        return "restart"                       # the instance is broken -> kill + restart
    if not readiness_ok:
        return "remove from load balancer"     # not ready -> stop routing, do NOT restart
    return "serve"

print(probe_action(True, True))
print(probe_action(True, False))
print(probe_action(False, True))`,
    output: `serve
remove from load balancer
restart`,
  },
  {
    type: "prose",
    md: "A healthy, ready instance serves. An instance that is alive but not ready (still loading the model, briefly overloaded) is **pulled from the load balancer but not killed** — it recovers and comes back. An instance that fails liveness is **restarted** — it is wedged. Conflating the two is a classic outage: if your liveness probe calls a downstream service and that service blips, every instance fails liveness and restarts at once — a self-inflicted restart storm during a dependency outage. Keep liveness cheap and self-contained; put dependency readiness in the readiness probe.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Manual snowflake deploys and no health checks/logging",
    md: "The two commonMistakes this topic exists to prevent:\n\n- **Manual snowflake deploys** — deploying by clicking through a portal or SSHing in and running commands, with no recorded, repeatable process. The result is a 'snowflake': a running system nobody can reproduce, roll back, or recreate after an incident. Config drifts, the next deploy behaves differently, and disaster recovery is a guess. Cure: reproducible deploys (CLI scripts / IaC / a pipeline — next topics), so the deployment is defined, versioned, and repeatable.\n- **No health checks / logging** — deploying a container with no readiness/liveness probes and no structured logs. The platform can't tell a healthy instance from a wedged one (so it routes traffic to broken instances), and you can't see what happened when something breaks (so every incident is blind). Cure: a cheap liveness probe, a readiness probe that gates traffic, and structured logs to stdout with request IDs.\n\nBoth mistakes make a system unoperable: one you can't reproduce, the other you can't observe."
  },
  {
    type: "quiz",
    question: "Your liveness probe calls the model provider's API to 'check everything works.' When the provider has a brief outage, ALL your instances restart simultaneously and the whole service goes down harder than the outage itself. What went wrong?",
    choices: [
      "The provider outage is the only problem — nothing to fix on your side",
      "The liveness probe depends on a downstream service, so a downstream blip makes every instance fail liveness and restart at once — a self-inflicted restart storm. Liveness should be cheap and self-contained (is THIS process wedged?); dependency health belongs in the readiness probe, which pulls an instance from the load balancer without killing it",
      "You need more instances so restarts don't matter",
      "Health probes should be removed entirely to avoid this",
    ],
    answerIndex: 1,
    explanation: "A liveness probe that depends on a downstream service turns any downstream outage into mass restarts, because every instance simultaneously reports itself broken. Liveness must answer 'is this process itself wedged?' with a cheap, self-contained check; whether a dependency is reachable is a readiness concern, and failing readiness only removes the instance from rotation without a restart. Adding instances or removing probes doesn't fix the coupling that caused the storm.",
  },
  {
    type: "takeaways",
    items: [
      "Deployment = reachable + healthy + observable on infrastructure you don't babysit; the platform only knows what your app tells it.",
      "Readiness gates traffic (not ready → removed from the load balancer, not killed); liveness gates restarts (broken → restarted). Don't conflate them.",
      "Keep liveness cheap and self-contained — a liveness probe that depends on a downstream service turns an outage into a restart storm.",
      "Externalize config and secrets (env / vault / managed identity); the same image runs everywhere with different config.",
      "Emit structured logs to stdout with request IDs (never secrets/PII); autoscale between a min and max, mindful of scale-to-zero cold starts.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "Now deploy it. The completion criterion is 'API is reachable with logging,' and this feeds **Project P6's milestone `p6-03`** (deploy to Azure with secure config). Here you publish your container to a managed service with health probes, externalized config, and logs — the first time your AI app is a public, operable service.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *API is reachable with logging.* Push your image to a registry and deploy it to a managed container platform with: ingress (a public URL), readiness + liveness probes, config/secrets from the environment (secrets from a vault / managed identity — next topic goes deep on Azure), autoscaling bounds, and structured logs collected by the platform. **Roadmap fit:** this is the deploy half of **P6 `p6-03`**; the Azure-specific secure-config half (Key Vault + managed identity) is the next topic. Prefer a scripted/reproducible deploy over portal clicks so it can go into the CI/CD pipeline (topic-prod-cicd-ops) later. Reuse the /health endpoint from topic-prod-api for the probes."
  },
  {
    type: "prose",
    md: "**Scale-to-zero is the cost/latency lever you set at deploy time — the first request after idle pays a cold start:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Cold-start penalty from scale-to-zero (deterministic, keyless)",
    code: `def request_latency(warm_instances, cold_start_s, call_s):
    # With no warm instance, the first request pays the cold-start penalty.
    if warm_instances > 0:
        return round(call_s, 2)
    return round(cold_start_s + call_s, 2)

print(request_latency(warm_instances=2, cold_start_s=4.0, call_s=0.8))   # warm
print(request_latency(warm_instances=0, cold_start_s=4.0, call_s=0.8))   # scaled to zero`,
    output: `0.8
4.8`,
  },
  {
    type: "prose",
    md: "A warm instance answers in 0.8s; after scaling to zero, the first request pays a 4.0s cold start on top — 4.8s. That is the tradeoff you choose at deploy: `min=0` (scale to zero) minimizes cost for spiky/low traffic but makes the first request after idle slow; `min>=1` keeps a warm instance for steady latency at a baseline cost. For a user-facing AI API, a small warm minimum is often worth it; for a rarely-hit internal tool, scale-to-zero saves money. Neither is 'correct' — you decide based on the traffic pattern and the latency budget.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — deploy the container",
    intro: "Reachable, healthy, observable. Acceptance defines done.",
    steps: [
      { order: 1, action: "Push the image to a registry (versioned tag, not 'latest'). Deploy to a managed platform with ingress (public URL), readiness + liveness probes pointing at /health, and config/secrets from the environment.", decision: "What min/max replicas fit the traffic? Scale-to-zero (min=0) for low/spiky traffic vs a warm minimum for steady latency — justified by the latency budget." },
      { order: 2, action: "Confirm structured logs reach the platform's log store (JSON to stdout with request IDs). Set resource limits (CPU/memory) so an instance can't consume the node.", expected: "The API is reachable at its URL, only healthy instances get traffic, and logs are searchable with request IDs." },
      { order: 3, action: "Make the deploy reproducible: capture it as a CLI script / config (not portal clicks) so it can enter the pipeline later. Verify a redeploy produces the same result.", verify: "The containerized API is publicly reachable, gated by health probes, configured from the environment, emitting structured logs, and deployed by a reproducible script — the deploy half of P6 p6-03." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a reachable deployment (P6 p6-03 deploy half)",
    items: [
      "Image pushed with a versioned tag; deployed to a managed platform with a public URL.",
      "Readiness + liveness probes at /health; only healthy instances receive traffic.",
      "Config/secrets from the environment; autoscaling bounds set for the traffic pattern.",
      "Structured logs (with request IDs) collected by the platform; deploy captured as a reproducible script.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Deploying = push a versioned image + run it on a managed platform with ingress, health probes, env config, autoscaling, and log collection.",
      "Scale-to-zero (min=0) minimizes cost but adds a cold-start penalty on the first request (0.8s → 4.8s here); a warm minimum trades cost for steady latency.",
      "Point readiness + liveness probes at your cheap /health; only healthy instances should receive traffic.",
      "Emit structured logs with request IDs to stdout so the platform can collect and you can search them; set CPU/memory limits.",
      "Make the deploy reproducible (script/config, not portal clicks) so it can go into the CI/CD pipeline — the deploy half of P6 p6-03.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A deploy you haven't watched under load or traced through logs is a hope. The completion criterion is 'scaling and logs work as expected' — so **verify operability**: does it scale up under load and back down when idle, and can you trace a single request through the logs? This is where 'deployed' becomes 'operable.'",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Verifying scaling and observability",
    md: "Two things to prove:\n\n- **Scaling behaves** — drive load up and watch replicas increase toward your max; stop and watch them scale back (to min). Then push past capacity: what happens at saturation? Requests queue and latency climbs (or you shed load) — you need to know which, and whether your max is high enough for a realistic spike.\n- **Logs are usable** — pick one request and follow it across the logs by its request ID (correlation ID). If you can't, your logging isn't structured or isn't propagating the ID. A trace should tell you which layer was slow (retrieval, model, post-processing) — the failing-boundary skill from the evaluation category, now in production.\n\nThe recurring production questions: what happens when traffic spikes (do you scale in time, or saturate)? what happens after a restart (does state persist, do you re-warm)? what happens at p95/p99 (is the tail acceptable)? A deploy answers these or it doesn't."
  },
  {
    type: "prose",
    md: "**Autoscaling is bounded — under a spike you scale toward the max, and past it you saturate:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Replicas needed under load, clamped to min/max (deterministic, keyless)",
    code: `import math

def replicas_needed(rps, per_replica_rps, min_r, max_r):
    need = math.ceil(rps / per_replica_rps) if rps > 0 else 0
    return max(min_r, min(max_r, need))

print(replicas_needed(rps=0,   per_replica_rps=50, min_r=1, max_r=10))   # idle -> min
print(replicas_needed(rps=340, per_replica_rps=50, min_r=1, max_r=10))   # ceil(6.8)=7
print(replicas_needed(rps=900, per_replica_rps=50, min_r=1, max_r=10))   # ceil(18) capped at max`,
    output: `1
7
10`,
  },
  {
    type: "prose",
    md: "Idle traffic sits at the minimum (1). A moderate 340 rps needs 7 replicas (each handles 50). But a 900 rps spike would need 18 replicas — and you capped `max` at 10, so you saturate: the extra load queues, latency climbs, and some requests time out. That is not a bug in autoscaling; it is the max doing its job (protecting cost and downstream quotas). The lesson: your max must be sized for a realistic spike AND your downstream (the model provider's rate limit) must be able to absorb it — otherwise scaling up just moves the bottleneck to the provider's 429s. Scaling and rate-limits are one system.",
  },
  {
    type: "quiz",
    question: "A traffic spike hits your deployed API. It scales to its max replicas, but latency still spikes and you see 429 errors from the model provider. What's actually happening?",
    choices: [
      "Autoscaling is broken — it should keep adding replicas past the max",
      "You hit two limits at once: replicas are capped at max (so extra load queues, raising latency), AND the added replicas collectively exceed the model provider's rate limit (429s). Scaling compute doesn't raise the upstream quota — you need a higher max sized to a realistic spike AND provider capacity (rate-limit handling, backoff, or a higher quota). Compute scaling and upstream limits are one system",
      "The model got slower under load",
      "Switch to a bigger container and the problem disappears",
    ],
    answerIndex: 1,
    explanation: "At the replica cap, additional load queues and latency rises; meanwhile more replicas mean more concurrent calls to the provider, which enforces its own rate limit and returns 429s. Adding compute cannot raise the upstream quota, so you must size the max for a realistic spike and ensure the provider side can absorb it (backoff, higher quota, caching, or routing). Treating it as broken autoscaling or a slow model misreads a coupled compute-and-upstream limit.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — prove your deployment is operable under load and traceable in logs.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Verify scaling and observability of your deployment",
    intro: "Drive load, watch it scale, trace a request. Not completion-gated — this is the operability proof.",
    steps: [
      { order: 1, action: "Drive increasing load and observe replicas scale up toward max; stop and confirm scale-down toward min. Record the rps at which you saturate and what happens then (queueing, latency, timeouts, provider 429s).", expected: "Replica count tracks load within your bounds; you know your saturation point and its symptoms." },
      { order: 2, action: "Trace a single request end-to-end by its request ID across the structured logs. Confirm you can tell which layer was slow (retrieval vs model vs post-processing).", decision: "If you can't follow one request by ID, is the log unstructured or is the ID not propagated? Fix it — observability is a deploy requirement, not a nice-to-have." },
      { order: 3, action: "Check the tail: measure p95/p99 under load, and check behavior after a restart (state persistence, re-warm). Note whether the max is sized for a realistic spike AND provider capacity.", verify: "The deployment scales within bounds and you know its saturation behavior, you can trace any request by ID to the slow layer, the p95/p99 tail is acceptable, and restarts behave — it is operable, not just running." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — an operable deployment",
    items: [
      "Scaling verified: replicas track load within min/max; saturation point and symptoms known.",
      "A single request traceable by ID across structured logs to the slow layer.",
      "p95/p99 measured under load; restart behavior (state/re-warm) checked.",
      "Max sized for a realistic spike AND downstream (provider) capacity — scaling and rate-limits treated as one system.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Verify operability, not just reachability: does it scale up under load and back down when idle, and can you trace a request through the logs?",
      "Autoscaling is bounded: at the max you saturate (queueing, latency, timeouts) — size the max for a realistic spike.",
      "Compute scaling and upstream rate-limits are one system: more replicas mean more provider calls, so scaling up can just trade queueing for 429s.",
      "Structured logs + request IDs let you follow one request to the slow layer — the failing-boundary skill from evaluation, now in production.",
      "Check the tail (p95/p99) and restart behavior — 'works on average' and 'works until it restarts' are not operable.",
    ],
  },
];

export const content: TopicContent = {
  "unit-prod-cloud-deploy-01": learn,
  "unit-prod-cloud-deploy-02": build,
  "unit-prod-cloud-deploy-03": review,
};
