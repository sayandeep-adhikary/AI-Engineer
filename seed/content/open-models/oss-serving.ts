import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Serving Open Models (OpenAI-Compatible)" (topic-oss-serving).
// 3 units: 01 learn (vLLM/TGI, OpenAI-compatible API, throughput/batching) · 02 build (serve
// behind an OpenAI-compatible API) · 03 review (load-test throughput).
// Verified against vLLM docs (current): `vllm serve <model>` -> OpenAI-compatible server at
// http://localhost:8000/v1; OpenAI(api_key="EMPTY", base_url=...); one model at a time; --api-key;
// PagedAttention, continuous batching, KV cache; GPU-first/Linux. Deterministic keyless
// throughput-vs-latency batching model. Model ids/flags hedged; model outputs representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Ollama on your laptop proves a model *runs*. Production is a different problem: many concurrent users, predictable latency, high GPU utilization, health checks, and uptime. That's **model serving** — and stacks like **vLLM** and **TGI** exist because naive 'load model, loop over requests' wastes the GPU and falls over under load. The strategic payoff is an **OpenAI-compatible API**: your self-hosted model speaks the exact same dialect as hosted providers, so one client talks to both. This topic is about that production layer and the concurrency mechanics underneath it.",
  },
  {
    type: "prose",
    md: "**Mental model: local dev inference is one request at a time; a serving stack is a throughput engine that keeps the GPU busy across many concurrent requests via continuous batching.** A GPU is fast but expensive; running one request at a time leaves it mostly idle. Serving stacks pack many requests' tokens through the model together and add finished requests' slots to new ones **continuously** (not waiting for a whole batch to finish), so utilization — and throughput — stays high. The KV cache is managed carefully (vLLM's PagedAttention) so memory doesn't fragment. You mostly consume these as behaviors, but you must understand them to reason about latency, throughput, and OOM under load.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Serving stack (vLLM / TGI)", definition: "Software that serves an open model for production inference: high GPU utilization, concurrency, streaming, and an HTTP API. vLLM and Hugging Face TGI (Text Generation Inference) are the common choices." },
      { term: "OpenAI-compatible API", definition: "The server implements OpenAI's /v1/chat/completions (and /v1/completions, /v1/models) so any OpenAI SDK client works by changing base_url + key. One interface for hosted and self-hosted models." },
      { term: "Continuous batching", definition: "The scheduler adds new requests into the running batch as others finish, instead of waiting for a fixed batch to complete. Keeps the GPU busy and raises throughput under concurrency." },
      { term: "PagedAttention / KV cache management", definition: "vLLM's technique for storing the attention KV cache in non-contiguous 'pages', reducing memory fragmentation so more concurrent requests fit in GPU memory." },
      { term: "Throughput vs latency", definition: "Throughput = requests (or tokens) per second across all users; latency = time for one request. Batching raises throughput but can raise individual latency — they trade off." },
      { term: "Health check / backpressure", definition: "A /health endpoint for load balancers, plus limits (max concurrency, queue caps, timeouts) that shed or queue load instead of OOMing when requests exceed capacity." },
    ],
  },
  {
    type: "prose",
    md: "**Serving with vLLM in one breath.** You launch a server for one model; it exposes an OpenAI-compatible API (default `http://localhost:8000`). Then you call it with the OpenAI SDK — only `base_url` and `api_key` change.",
  },
  {
    type: "code",
    language: "bash",
    caption: "Start an OpenAI-compatible server (model id/flags illustrative — check current docs)",
    code: `# vLLM serves ONE model at a time behind an OpenAI-compatible API (default port 8000).
vllm serve Qwen/Qwen2.5-1.5B-Instruct
# Common (hedged) flags — verify names against the current vLLM version:
#   --host / --port         where to listen
#   --api-key <key>         require an API key in the Authorization header
#   --max-model-len <n>     cap context length (bounds KV-cache memory)
#   --gpu-memory-utilization 0.9   fraction of VRAM the engine may use
curl http://localhost:8000/v1/models      # list the served model
curl http://localhost:8000/health         # health check for load balancers`,
  },
  {
    type: "code",
    language: "python",
    caption: "Call the self-hosted model like any provider — only base_url/key change",
    code: `from openai import OpenAI

# Point the SAME OpenAI SDK at your self-hosted server. That's the portability win.
client = OpenAI(api_key="EMPTY", base_url="http://localhost:8000/v1")   # key may be required if you set --api-key

resp = client.chat.completions.create(
    model="Qwen/Qwen2.5-1.5B-Instruct",   # the model you served
    messages=[{"role": "user", "content": "Say hello."}],
)
print(resp.choices[0].message.content)     # representative; model output is non-deterministic`,
  },
  {
    type: "prose",
    md: "That's the whole strategic point: **the app doesn't know or care** whether the model is OpenAI's or your GPU box — same SDK, same call shape. Swapping is a `base_url` change. The provider-configurable client from the LLM APIs category now spans hosted providers *and* your own infrastructure.",
  },
  {
    type: "code",
    language: "python",
    caption: "Throughput vs latency under batching (deterministic, keyless model)",
    code: `import math

def serve(num_requests, batch_size, base_token_ms=20, tokens=100):
    batches = math.ceil(num_requests / batch_size)
    token_ms = base_token_ms + (batch_size - 1)   # per-token time rises with batch (contention)
    batch_ms = token_ms * tokens                  # time to generate one batch's tokens
    makespan_s = batches * batch_ms / 1000
    throughput_rps = round(num_requests / makespan_s, 2)
    latency_ms = batch_ms                         # time a request spends being generated
    return throughput_rps, latency_ms

print(serve(64, 1))     # no batching: one request at a time
print(serve(64, 8))     # batch 8
print(serve(64, 32))    # batch 32`,
    output: `(0.5, 2000)
(2.96, 2700)
(6.27, 5100)`,
  },
  {
    type: "prose",
    md: "From batch 1 to 32, **throughput climbs 0.5 → 6.27 req/s** (the GPU does far more work per second) — but **per-request latency rises 2000 → 5100 ms** (each request shares the GPU with more others). That's the core serving tradeoff: batching is how you get throughput, and it costs individual latency. A serving stack's job is to push throughput up while keeping latency acceptable; your job is to set concurrency/batch limits for *your* latency SLA, not to max one at the other's expense.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Ignoring concurrency/throughput — and shipping with no health checks",
    md: "Two production-grade mistakes this topic exists to prevent:\n\n- **Ignoring concurrency/throughput.** Benchmarking with one request at a time tells you nothing about behavior under 100 concurrent users. Without a serving stack (or with a naive one), concurrent load either serializes (terrible latency) or OOMs the KV cache. Measure under realistic concurrency, and set **backpressure** — max in-flight requests, queue caps, timeouts — so overload degrades gracefully (429 / queue) instead of crashing.\n- **No health checks.** A load balancer needs a `/health` endpoint to route around a dead or overloaded replica; without it, requests get sent into a black hole. Health checks + readiness are table stakes for any real deployment.\n\n'It worked on my one test request' is not 'it's ready to serve' — capacity, backpressure, and health are the difference."
  },
  {
    type: "callout",
    variant: "warning",
    title: "OpenAI-compatible ≠ behaviorally identical",
    md: "The API *shape* matching OpenAI's does not mean the model *behaves* like OpenAI's. Different models have different quality, context limits, tokenization, and supported parameters — and some OpenAI features (certain `response_format` modes, tool-calling behavior, seeds) may be partially supported or absent on a given server/model. Treat 'OpenAI-compatible' as 'I can reuse my client code,' not 'I get GPT-quality outputs' or 'every parameter behaves the same.' Verify the features you rely on against the actual served model."
  },
  {
    type: "quiz",
    question: "Under 100 concurrent users your self-hosted endpoint has poor throughput and requests pile up, though a single request is fast. Which serving-layer mechanism should you investigate first?",
    choices: [
      "The model's weights are corrupted",
      "Batching / continuous batching and concurrency limits: if requests are processed one at a time (or the batch scheduler/GPU-memory settings are misconfigured), the GPU is underutilized and requests queue. A continuous-batching serving stack raises throughput under concurrency; also set backpressure so overload degrades gracefully",
      "Switch to a smaller model — size is the only factor",
      "Nothing can improve concurrent throughput",
    ],
    answerIndex: 1,
    explanation: "Fast single requests but collapsing throughput under load points to a concurrency/batching problem, not corrupted weights. Continuous batching keeps the GPU busy across many simultaneous requests, and concurrency limits plus backpressure prevent pile-ups from becoming OOMs. It's a serving-layer configuration issue, and a smaller model alone doesn't fix underutilization.",
  },
  {
    type: "quiz",
    question: "You migrate an app from OpenAI to a self-hosted OpenAI-compatible endpoint by changing base_url. Outputs and some parameter behaviors differ. Is the migration broken?",
    choices: [
      "Yes — OpenAI-compatible must mean identical outputs",
      "No — OpenAI-compatible means the API SHAPE matches so your client code works, not that a different model produces identical outputs or supports every parameter identically. Verify the specific features/parameters you depend on against the served model; expect different quality and limits",
      "Yes — you must switch back immediately",
      "No — but only the base_url matters, never the model",
    ],
    answerIndex: 1,
    explanation: "OpenAI-compatibility guarantees the request/response shape, letting you reuse client code — it does not promise a different model will produce the same outputs or honor every parameter the same way. Differing outputs and partial parameter support are expected; the migration is fine as long as the features you actually rely on are verified against the served model.",
  },
  {
    type: "takeaways",
    items: [
      "Serving stacks (vLLM/TGI) are throughput engines: continuous batching keeps the GPU busy across concurrent requests; PagedAttention manages KV-cache memory to fit more of them.",
      "They expose an OpenAI-compatible API, so one client (base_url + key) talks to hosted AND self-hosted models — the portability payoff.",
      "Throughput and latency trade off: batching raises req/s but raises per-request latency. Tune concurrency/batch limits to your latency SLA.",
      "Production needs concurrency planning, backpressure (max in-flight, queues, timeouts), and health checks — not just a single successful request.",
      "OpenAI-compatible = reusable client code, NOT identical behavior/quality/parameters; verify the features you depend on against the served model.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Serve an open model behind an OpenAI-compatible API and call it from your app like any other provider.** The completion criterion: *your app calls it like any provider.* This is the mastery criterion of the topic — one interface spanning self-hosted and hosted models — made concrete.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *your app talks to a self-hosted model via the same interface it uses for hosted models.* Launch a serving stack (vLLM/TGI) for an open model, exposing an OpenAI-compatible endpoint, then point your existing client at it. **Roadmap fit:** this unites `topic-api-first-call` (provider-configurable client), `topic-oss-local-inference` (running open models), and production concerns (concurrency, health) into a deployable interface. Serving is GPU-first and Linux-first; if you lack a GPU, reason about the config and reuse the local (Ollama) endpoint as a stand-in for the same OpenAI-compatible interface. Health checks and backpressure are part of 'done,' not extras."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — serve behind an OpenAI-compatible API",
    intro: "One interface, production posture. Acceptance defines done.",
    steps: [
      { order: 1, action: "Launch a serving stack for an open model exposing an OpenAI-compatible endpoint (/v1/chat/completions). Cap context length and GPU memory to sane values; require an API key if exposed beyond localhost.", decision: "What context length and concurrency limits match your hardware and latency target?" },
      { order: 2, action: "Point your existing app client at the endpoint (base_url + key). Run your real task. Confirm the app code is unchanged from the hosted path except for config.", expected: "The app calls the self-hosted model exactly as it calls hosted providers." },
      { order: 3, action: "Add production posture: a health check the app/load-balancer can poll, backpressure (timeouts, max in-flight or a queue), and a clear error when the server is down or overloaded. Verify a hosted↔self-hosted swap is config-only.", verify: "The app calls the self-hosted model via the OpenAI-compatible interface, has health checks + backpressure, and can swap hosted↔self-hosted by config." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "An open model is served behind an OpenAI-compatible /v1 endpoint with sane context/GPU limits.",
      "The app calls it via the same client interface as hosted providers (config-only difference).",
      "Health check + backpressure (timeouts / max in-flight / queue) in place.",
      "Server-down / overloaded produces a clear error; hosted↔self-hosted swap is config-only.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — provider-agnostic client with health check + backpressure (structure)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os, httpx
from openai import OpenAI

def endpoint():
    # One place decides hosted vs self-hosted — the app code below is identical either way.
    if os.getenv("LLM_BACKEND") == "self_hosted":
        return "http://localhost:8000/v1", os.getenv("VLLM_API_KEY", "EMPTY"), os.getenv("SERVED_MODEL")
    return None, os.getenv("OPENAI_API_KEY"), os.getenv("MODEL", "gpt-4o-mini")

def healthy(base_url: str) -> bool:
    try:
        return httpx.get(base_url.replace("/v1", "/health"), timeout=2).status_code == 200
    except Exception:
        return False

def ask(question: str) -> str:
    base_url, key, model = endpoint()
    if base_url and not healthy(base_url):          # health check before sending real traffic
        return "[serving endpoint unhealthy] failing over / retry later"
    client = OpenAI(api_key=key, base_url=base_url)  # base_url=None -> hosted OpenAI
    try:
        resp = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": question}],
            timeout=30,                              # backpressure: bound the wait, don't hang
        )
    except Exception as e:
        return f"[unavailable/overloaded: {type(e).__name__}] shed load / retry with backoff"
    return resp.choices[0].message.content           # representative; model-dependent`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A serving deployment is only real once you know its capacity. This unit load-tests it — the completion criterion is 'you measure requests/sec under load.' Numbers, not vibes: a single fast request tells you nothing about behavior at 10 or 100 concurrent.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How to load-test a serving endpoint",
    md: "Measure capacity and the latency/throughput curve, don't guess it:\n\n- **Ramp concurrency** — send 1, then 8, then 32, then 100 concurrent requests with realistic input/output lengths. Record **throughput (req/s and tokens/s)** and **latency (p50 and p95)** at each level.\n- **Find the knee** — throughput rises with concurrency until the GPU saturates, then latency spikes while throughput plateaus. That knee is your practical capacity per replica.\n- **Test overload** — push past capacity and confirm **graceful degradation** (queueing, timeouts, 429s) rather than crashes/OOM. That validates backpressure.\n- **Right-size** — use the curve to set concurrency limits and decide how many replicas you need for your target load and SLA.\n\nThe deliverable is a throughput/latency curve and a capacity number, which is what lets you plan replicas and cost."
  },
  {
    type: "quiz",
    question: "Your load test shows throughput rising with concurrency up to 24 requests, then flattening while p95 latency climbs sharply. What does the 'knee' at 24 tell you?",
    choices: [
      "The server is broken above 24 requests",
      "It's the practical capacity of one replica: past ~24 concurrent the GPU is saturated, so more concurrency no longer adds throughput and only inflates latency. Set your per-replica concurrency limit near the knee and scale out with more replicas for higher load",
      "You should always run at maximum concurrency",
      "Latency and throughput are unrelated to concurrency",
    ],
    answerIndex: 1,
    explanation: "The knee is where the GPU saturates: below it, added concurrency buys throughput; above it, throughput plateaus while latency spikes because requests contend for a maxed-out GPU. That number is your per-replica capacity — cap concurrency near it and add replicas to serve more load, rather than pushing a single replica into the high-latency regime.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — choose the right serving approach for a workload.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Pick hosted API vs Hugging Face direct vs Ollama vs vLLM/TGI",
    intro: "Justify a serving choice from real constraints, not defaults.",
    steps: [
      { order: 1, action: "For a concrete workload (volume, latency SLA, concurrency, privacy needs, hardware budget, team ops capacity), list the options: hosted API, HF Transformers direct, a local runtime (Ollama), and a serving stack (vLLM/TGI). Note each option's fit on cost, latency, concurrency, privacy, and ops burden.", expected: "A comparison of the four approaches against the workload's real constraints." },
      { order: 2, action: "Choose one (or a hybrid — e.g. hosted for spiky low volume + self-hosted for steady high volume) and justify it. Note what would change your answer (10× volume, stricter privacy, no GPU).", decision: "Which approach best satisfies THIS workload's hard constraints first, then optimizes the soft ones?" },
      { order: 3, action: "State the interface that keeps the choice reversible (OpenAI-compatible client), so you can change serving approach without rewriting the app.", verify: "You compared all four approaches on real axes, made a justified (possibly hybrid) choice, and kept it reversible behind one interface." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Hosted / HF-direct / Ollama / vLLM-TGI compared on cost, latency, concurrency, privacy, ops.",
      "A justified choice (or hybrid) that satisfies the workload's hard constraints first.",
      "Sensitivity noted: what change (volume, privacy, hardware) would flip the decision.",
      "The reversible interface (OpenAI-compatible) that avoids lock-in is identified.",
    ],
  },
];

export const content: TopicContent = {
  "unit-oss-serving-01": learn,
  "unit-oss-serving-02": build,
  "unit-oss-serving-03": review,
};
