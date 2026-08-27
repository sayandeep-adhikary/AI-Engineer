import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Serving AI as an API (FastAPI)" (topic-prod-api).
// 4 units: 01 learn (FastAPI for AI: endpoints, pydantic validation, async, streaming/SSE, safe
// errors) · 02 practice (validated endpoints + safe error mapping) · 03 build (expose P3 as a
// streaming API — P6 m-01 + closes P3 p3-04) · 04 review (load/error test — blocking vs async).
// commonMistakes: Blocking endpoints, No validation, Leaking internal errors. masteryCriteria:
// documented streaming AI API with proper error handling. Deterministic keyless validators/SSE/latency.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You have built RAG pipelines, agents and multimodal apps as scripts. **A script becomes a product when it is a service** — a documented, validated, resilient API other systems can call. This category is that transition, and it starts with the serving layer: **FastAPI**, the standard async Python framework for wrapping an AI app in an HTTP API. The AI logic barely changes; what you add is the discipline that separates a notebook from a system on the internet.",
  },
  {
    type: "prose",
    md: "**Mental model: the API is a contract and a boundary — it defines exactly what goes in, what comes out, and what must never escape.** Inputs are validated at the edge (reject bad requests before they reach your model); outputs are shaped to a schema; internal errors are caught and translated into safe status codes that never leak a stack trace or a secret. And because AI calls are slow I/O, the server must stay responsive under concurrency — which is where `async` and streaming earn their place. Get the boundary right and everything downstream (containers, deploys, monitoring) has something solid to stand on.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "FastAPI", definition: "An async Python web framework built on ASGI/Starlette with Pydantic validation and automatic OpenAPI docs. You declare endpoints as functions with typed parameters; FastAPI validates requests, serializes responses, and generates interactive docs at /docs. The default choice for serving AI apps in Python." },
      { term: "Pydantic model", definition: "A typed schema (a BaseModel subclass) for request and response bodies. FastAPI uses it to validate and parse input before your handler runs, and to shape output. Validation at the boundary means a malformed request is rejected with a 422 automatically — your model code only ever sees well-formed input." },
      { term: "async endpoint", definition: "An endpoint declared with async def, letting the server handle other requests while this one waits on slow I/O (a model call, a DB query). Critical for AI: a single generation can take seconds, and a blocking handler would stall every other request. The catch: a synchronous blocking call inside an async endpoint blocks the whole event loop." },
      { term: "Streaming / SSE", definition: "Sending the response incrementally instead of all at once. For LLMs this means tokens appear as they are generated (lower time-to-first-token). FastAPI uses StreamingResponse; Server-Sent Events (media type text/event-stream) is a simple one-way streaming format where each event is a 'data: ...' line followed by a blank line." },
      { term: "Lifespan", definition: "A startup/shutdown hook (an async context manager passed as FastAPI(lifespan=...)): code before the yield runs once at startup (load a shared model, open a connection pool), code after runs at shutdown (clean up). It replaces the deprecated @app.on_event('startup'/'shutdown') handlers — load expensive shared resources once here, not per request." },
      { term: "Safe error handling", definition: "Catching exceptions and returning a generic message with the right HTTP status (422/404/429/500), never the raw exception, stack trace, or internal detail. A leaked traceback can expose secrets, file paths, and dependency versions to an attacker — the boundary must fail closed and quiet." },
    ],
  },
  {
    type: "prose",
    md: "**Validation at the boundary is the first job.** A Pydantic model rejects a malformed request before your model code runs — cheaply, with a clear error. Here is the check in essence (FastAPI does this for you from the schema):",
  },
  {
    type: "code",
    language: "python",
    caption: "Request validation at the edge (deterministic, keyless — FastAPI does this from a Pydantic model)",
    code: `def validate_request(body):
    # Pydantic-style: required fields + types checked BEFORE the handler runs.
    errors = []
    if "question" not in body:
        errors.append("question: required")
    elif not isinstance(body["question"], str):
        errors.append("question: must be str")
    if "top_k" in body and not isinstance(body["top_k"], int):
        errors.append("top_k: must be int")
    return {"ok": not errors, "errors": errors}

print(validate_request({"question": "what is RAG?", "top_k": 5}))
print(validate_request({"top_k": "five"}))
print(validate_request({"question": 42}))`,
    output: `{'ok': True, 'errors': []}
{'ok': False, 'errors': ['question: required', 'top_k: must be int']}
{'ok': False, 'errors': ['question: must be str']}`,
  },
  {
    type: "prose",
    md: "A valid body passes; a body missing `question` with a wrong-typed `top_k` collects both errors; a numeric `question` is rejected. The point: bad input never reaches your model — it is stopped at the boundary with a 422 and a precise reason. In FastAPI you never write this loop; you declare the Pydantic model and get it (plus OpenAPI docs) for free. That is why 'no validation' is a mistake worth naming — without it, malformed input crashes deep in your handler and leaks a stack trace.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Blocking endpoints, no validation, and leaking internal errors",
    md: "The three commonMistakes this topic exists to prevent:\n\n- **Blocking endpoints** — a synchronous, CPU-bound or blocking call inside an `async def` handler stalls the entire event loop, so one slow request freezes all concurrent ones. Either keep the handler truly async (await the model client) or run blocking work in a threadpool (`def` handler, or `asyncio.to_thread` / `run_in_threadpool`). An AI call is seconds long — blocking is not a minor inefficiency, it is a self-inflicted outage under load.\n- **No validation** — trusting the request body and reading fields directly. A missing or wrong-typed field then crashes inside your logic, often after you have already spent a model call. Validate at the edge (Pydantic) so bad input is a cheap 422, not an expensive 500.\n- **Leaking internal errors** — returning the raw exception or stack trace to the caller. That can expose secrets, file paths, library versions and query internals — reconnaissance for an attacker. Catch, log the detail server-side, and return a generic message with the correct status code.\n\nAll three are boundary failures: the API's job is to be a strict, safe edge around fallible internals."
  },
  {
    type: "quiz",
    question: "Your FastAPI endpoint is `async def answer(...)` and calls a synchronous, blocking embedding function directly inside it. Under concurrent load, throughput collapses and even a health check is slow. What is the root cause?",
    choices: [
      "FastAPI is single-threaded and cannot handle concurrency at all",
      "A synchronous blocking call inside an async endpoint blocks the event loop, so while one request runs the blocking function no other request (not even /health) can be served. Fix by awaiting an async client, or offloading the blocking work to a threadpool (a `def` handler or run_in_threadpool/asyncio.to_thread) so the loop stays free",
      "The model is too large — switch to a smaller model",
      "You need more Pydantic validation on the request body",
    ],
    answerIndex: 1,
    explanation: "An `async def` handler runs on the event loop; a synchronous blocking call inside it holds the loop and prevents any other coroutine — including the health check — from making progress until it returns. The fix is to not block the loop: await a genuinely async client, or push the blocking work to a threadpool so the loop can serve other requests. Model size and validation don't address the concurrency stall caused by blocking the loop.",
  },
  {
    type: "takeaways",
    items: [
      "The API is a contract and a boundary: validate inputs at the edge, shape outputs to a schema, and never let internal errors escape.",
      "Pydantic validation rejects malformed requests with a 422 before your model runs — you declare the schema, FastAPI enforces it and generates OpenAPI docs.",
      "AI calls are slow I/O, so endpoints must stay responsive: keep handlers truly async, or offload blocking work to a threadpool — a blocking call in an async endpoint stalls every request.",
      "Stream responses (StreamingResponse / SSE text/event-stream) to cut time-to-first-token for LLM output.",
      "Load expensive shared resources once in lifespan (not per request); catch exceptions and return safe status codes, never a raw traceback.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'endpoints validate inputs/outputs.' A validated endpoint has two guards: **a schema that rejects bad input**, and **an error layer that maps any failure to a safe response**. You built the input guard in the learn unit; here you add the output/error guard — the piece that stops internal failures from becoming information leaks.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Two guards on every endpoint",
    md: "A production endpoint is sandwiched between two guards:\n\n- **Input guard (Pydantic model)** — required fields, types, ranges. Bad request → automatic 422 before your logic runs.\n- **Output/error guard** — a response model shapes what you return, and an exception layer catches everything else and returns a safe status + generic message (logging the real detail server-side).\n\nThe error guard is where most leaks happen. Map known failures to specific statuses (a validation error is 422, a missing resource 404, an upstream rate limit 429, a timeout 504) and let everything unrecognized fall through to a generic 500 — with the real exception logged, never returned."
  },
  {
    type: "prose",
    md: "**Map internal exceptions to safe HTTP responses — the caller learns the status, never the internals:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Safe error mapping — status + generic message, never the raw exception (deterministic, keyless)",
    code: `def to_http_error(exc_type):
    # Map known internal exceptions to a safe status + generic client message.
    mapping = {
        "ValidationError": (422, "Invalid request"),
        "NotFound":        (404, "Resource not found"),
        "RateLimited":     (429, "Too many requests"),
        "Timeout":         (504, "Upstream timed out"),
    }
    status, msg = mapping.get(exc_type, (500, "Internal server error"))
    return {"status": status, "detail": msg}   # never the raw exception or stack trace

print(to_http_error("ValidationError"))
print(to_http_error("Timeout"))
print(to_http_error("KeyError"))`,
    output: `{'status': 422, 'detail': 'Invalid request'}
{'status': 504, 'detail': 'Upstream timed out'}
{'status': 500, 'detail': 'Internal server error'}`,
  },
  {
    type: "prose",
    md: "Known failures map to their correct status with a clean message; an unrecognized `KeyError` falls through to a generic 500 — no class name, no traceback, no leak. The real exception is logged server-side (with a request ID, next unit) so you can debug without exposing anything. This is the output half of 'validate inputs/outputs': the caller always gets a well-formed, safe response, whatever happened inside.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Build a validated AI endpoint",
    intro: "Both guards on one endpoint: schema in, safe response out.",
    steps: [
      { order: 1, action: "Define request and response Pydantic models (required fields, types, sensible bounds e.g. top_k <= 20). Declare the endpoint with typed params so FastAPI validates and documents it automatically.", expected: "A malformed request returns 422 automatically, before any model call — verified via /docs." },
      { order: 2, action: "Wrap the handler body: catch known exceptions and map them to specific statuses (422/404/429/504); let unknowns become a generic 500. Log the real exception server-side with context; return only the generic message.", decision: "Which failures are the client's fault (4xx) vs yours/upstream's (5xx)? A rate limit from the model provider surfaced to your caller is a 429; a bug in your code is a 500." },
      { order: 3, action: "Add a health endpoint (GET /health → 200) that does NOT call the model, so a load balancer can check liveness cheaply. Confirm inputs and outputs are both validated and no error path returns a traceback.", verify: "Endpoints validate inputs (422 on bad body) and outputs (response model), every error path returns a safe status + generic message, and /health responds without touching the model." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a validated endpoint",
    items: [
      "Request/response Pydantic models; malformed input → automatic 422 before any model call.",
      "Exception layer maps known failures to correct statuses; unknowns → generic 500.",
      "Real exceptions logged server-side; responses never contain a traceback, secret, or internal path.",
      "A cheap GET /health (no model call) for liveness checks.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Every endpoint has two guards: a Pydantic input schema (422 on bad input) and an output/error layer (safe status + generic message).",
      "Map known exceptions to specific statuses (422/404/429/504); let unknowns fall through to a generic 500 — never return the raw exception.",
      "Distinguish client faults (4xx) from server/upstream faults (5xx): a provider rate limit is a 429 to your caller, a bug is a 500.",
      "Log the real error server-side with context (request ID) so you can debug without leaking anything to the caller.",
      "Add a cheap /health that doesn't call the model, so liveness checks stay fast and independent of the AI path.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "Now wrap a real AI app: **expose Project P3 (your RAG app) as a streaming API.** The completion criterion is 'API streams responses with error handling,' and this is **Project P6's milestone `p6-01`** (a documented streaming API live locally) — and it simultaneously closes **Project P3's milestone `p3-04`** (serve the RAG app via an API). One build, two milestones: your RAG pipeline becomes a callable service that streams tokens and fails safely.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *API streams responses with error handling.* Wrap the P3 RAG pipeline in a FastAPI service: a validated `/ask` endpoint that streams the answer (SSE), loads the retriever/index once in `lifespan`, and maps every failure to a safe response. **Roadmap fit:** this is **P6 `p6-01`** ('a documented streaming API is live locally') AND **P3 `p3-04`** ('the app is served via an API with a basic UI') — the serving milestone P3 deferred to this category. Reuse the resilient-client discipline from `topic-api-streaming-robustness` (timeouts, retries) for the upstream model call. The AI logic is unchanged; you are adding the service boundary around it."
  },
  {
    type: "prose",
    md: "**Streaming uses Server-Sent Events: each chunk is a `data:` line ending in a blank line, closed by a sentinel.** The wire format is simple and deterministic:",
  },
  {
    type: "code",
    language: "python",
    caption: "SSE frame formatting for a streamed answer (deterministic, keyless)",
    code: `def sse_frame(data):
    # Server-Sent Events: each event is 'data: <text>' followed by a blank line.
    return f"data: {data}\\n\\n"

tokens = ["Retrieval", "-augmented", " answer"]
stream = "".join(sse_frame(t) for t in tokens) + sse_frame("[DONE]")
print(repr(stream))`,
    output: `'data: Retrieval\\n\\ndata: -augmented\\n\\ndata:  answer\\n\\ndata: [DONE]\\n\\n'`,
  },
  {
    type: "prose",
    md: "Each token becomes a `data:` frame; a final `[DONE]` sentinel tells the client the stream is complete. In FastAPI you return a `StreamingResponse` over an async generator that yields these frames as the model produces tokens (media type `text/event-stream`). The user sees the first token in a fraction of the total time — the same time-to-first-token win from the streaming topic, now at the service boundary. Error handling still applies: if the upstream call fails mid-stream, yield a terminal error frame and stop — never leave the client hanging.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a streaming RAG API",
    intro: "Wrap P3 as a documented, streaming, safe service. Acceptance defines done.",
    steps: [
      { order: 1, action: "Load the retriever/index and model client ONCE in lifespan (not per request). Define a validated /ask endpoint (Pydantic request: question + optional top_k with bounds).", decision: "What belongs in lifespan (expensive shared state) vs per-request (the query)? Loading the index per request would add seconds to every call." },
      { order: 2, action: "Stream the answer via StreamingResponse over an async generator yielding SSE frames as tokens arrive; end with a [DONE] sentinel. Apply timeout + limited retry to the upstream model call (from topic-api-streaming-robustness).", expected: "The client receives tokens incrementally; time-to-first-token is a fraction of total time." },
      { order: 3, action: "Handle errors on every path: map failures to safe responses; if the upstream fails mid-stream, emit a terminal error frame and stop. Keep /docs (OpenAPI) accurate and add /health. Log with a request ID.", verify: "The RAG app is a documented streaming API: /ask validates input, streams tokens, never leaks internals, degrades safely on upstream failure, and /health + /docs work — delivering P6 p6-01 and P3 p3-04." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — streaming RAG API (P6 p6-01 / P3 p3-04)",
    items: [
      "Retriever/index/model client loaded once in lifespan; query handled per request.",
      "Validated /ask endpoint streams tokens via SSE with a [DONE] sentinel; documented at /docs.",
      "Upstream call has timeout + limited retry; mid-stream failure emits a terminal error frame, never hangs.",
      "No error path leaks internals; /health responds without a model call; requests logged with an ID.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — streaming RAG endpoint with lifespan + safe errors (deterministic shape, keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

STATE = {}

@asynccontextmanager
async def lifespan(app):
    STATE["rag"] = load_rag_pipeline()   # your P3 pipeline: retriever + index + client
    yield
    STATE.clear()

app = FastAPI(lifespan=lifespan)

class AskRequest(BaseModel):
    question: str
    top_k: int = Field(default=5, ge=1, le=20)   # bounded at the edge

@app.get("/health")
def health():
    return {"status": "ok"}                       # no model call

@app.post("/ask")
async def ask(req: AskRequest):
    async def gen():
        try:
            async for token in STATE["rag"].stream(req.question, k=req.top_k):
                yield f"data: {token}\\n\\n"
            yield "data: [DONE]\\n\\n"
        except Exception:
            log_exception()                       # detail stays server-side
            yield "data: [ERROR] upstream failed\\n\\n"
    return StreamingResponse(gen(), media_type="text/event-stream")`,
  },
  {
    type: "takeaways",
    items: [
      "Expose P3 as a streaming API: this one build delivers P6 p6-01 (streaming API live locally) AND closes P3 p3-04 (serve the RAG app).",
      "Load the retriever/index/client once in lifespan; handle only the query per request — per-request loading adds seconds to every call.",
      "Stream tokens as SSE frames (data: ... blank line) via StreamingResponse over an async generator, ending with a [DONE] sentinel.",
      "Reuse timeout + retry from the streaming-robustness topic for the upstream model call; on mid-stream failure emit a terminal error frame, never hang.",
      "Keep the boundary safe: validate at the edge, log with a request ID, and never leak internals on any path.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "An API that works for one polite request is not a service. The completion criterion is 'API stays stable under load/errors' — so **load- and error-test it**: fire concurrent requests, inject upstream failures, and confirm it stays responsive and safe. This is where the async design pays off or the blocking bug shows up.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "What load and error testing actually reveals",
    md: "Test the boundary under stress:\n\n- **Concurrency** — fire many simultaneous requests. If throughput collapses and even /health slows, you have a blocking call on the event loop. A correctly async service serves many overlapping slow requests without stalling.\n- **Upstream failure** — make the model client time out, rate-limit, or error. The API should return the right status (504/429/500), never a traceback, and never hang a streaming client.\n- **Malformed input** — send bad bodies; expect fast 422s, not 500s.\n- **The tail** — average latency can look fine while p95/p99 is terrible (one slow dependency, a cold cache). Measure percentiles, not just the mean.\n\nThe question is always 'what boundary fails first under stress?' — and the answer is usually the event loop (blocking) or the error layer (leaks/hangs), not the model."
  },
  {
    type: "prose",
    md: "**Blocking vs async is measurable — an educational simulation of wall-clock time to serve a burst of requests:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Blocking vs async under load — educational simulation, NOT a real benchmark (deterministic, keyless)",
    code: `import math

def wall_time(n_requests, per_call_s, workers, blocking):
    if blocking:
        return round(n_requests * per_call_s, 2)              # serialized: one at a time
    return round(math.ceil(n_requests / workers) * per_call_s, 2)  # up to 'workers' overlap

print(wall_time(8, 0.5, 4, blocking=True))    # blocking endpoint
print(wall_time(8, 0.5, 4, blocking=False))   # async, 4 concurrent`,
    output: `4.0
1.0`,
  },
  {
    type: "prose",
    md: "Eight requests at 0.5s each: the blocking endpoint serializes them into 4.0s; the async endpoint overlaps four at a time into 1.0s — a 4× difference from the same model, purely from not stalling the event loop. This is a simulation (real numbers depend on the loop, the client, and the provider), but the mechanism is exactly why blocking endpoints are the signature production mistake: the model is not slow, the server is stalled. Fix the boundary, not the model.",
  },
  {
    type: "quiz",
    question: "Under a load test, your API's mean latency is a healthy 200ms, but p99 is 3 seconds and some users report timeouts. Nothing in the model changed. What is the most likely explanation and fix?",
    choices: [
      "The model got slower — switch providers",
      "A tail-latency problem: the average hides a slow path (e.g. a cold cache, an occasional blocking call, a retry on a flaky dependency, or a connection-pool exhaustion under concurrency). Investigate p95/p99 traces to find the slow boundary and fix it (non-blocking I/O, pooling, timeouts) — the mean is not the user experience",
      "p99 is always meaningless — only the mean matters",
      "Add more Pydantic validation",
    ],
    answerIndex: 1,
    explanation: "A good mean with a bad p99 means most requests are fast but a meaningful fraction hit a slow path — a cold cache, an intermittent blocking call, a retry on a flaky upstream, or pool exhaustion under load. Users feel the tail, so you investigate p95/p99 with traces to locate the slow boundary and fix it (keep I/O non-blocking, pool connections, set timeouts). Blaming the model or dismissing percentiles both miss where the latency actually comes from.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — prove the service is stable under load and failure.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Load- and error-test your streaming RAG API",
    intro: "Stress the boundary and measure it. Not completion-gated — this is the proof the service is production-shaped.",
    steps: [
      { order: 1, action: "Fire concurrent requests (a load tool or a simple async client). Record throughput and latency percentiles (p50/p95/p99), and watch whether /health stays fast under load.", expected: "Throughput scales with concurrency and /health stays responsive — if not, find the blocking call on the event loop." },
      { order: 2, action: "Inject upstream failures: force the model client to time out, rate-limit, and error. Confirm each maps to the right status, never a traceback, and never hangs a streaming client (terminal error frame).", decision: "For each failure: is it the client's fault (4xx) or yours/upstream's (5xx)? Does the streaming path close cleanly?" },
      { order: 3, action: "Send malformed bodies (expect fast 422s). Then summarize: what boundary failed first under stress, and what fixed it (non-blocking I/O, timeouts, pooling, bounded retries)?", verify: "The API stays responsive under concurrency (no event-loop stall), maps every failure to a safe status without leaks or hangs, rejects bad input cheaply, and you can name the first boundary to fail and its fix." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a load- and error-tested API",
    items: [
      "Concurrency test: throughput scales, /health stays fast (no event-loop stall from blocking calls).",
      "Injected upstream failures map to correct statuses, never leak, never hang the stream.",
      "Malformed input returns fast 422s, not 500s.",
      "Latency percentiles (p95/p99) measured, not just the mean; first-failing boundary identified and fixed.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Load- and error-test the boundary: concurrency reveals blocking calls (throughput collapses, /health slows), failure injection reveals leaks and hangs.",
      "Blocking vs async is measurable: serialized 4.0s vs overlapped 1.0s for the same work — the server was stalled, not the model.",
      "Measure p95/p99, not just the mean: a healthy average can hide a terrible tail (cold cache, flaky retry, pool exhaustion) that users actually feel.",
      "Every injected failure should map to a safe status, never a traceback, and a streaming failure should emit a terminal frame, never hang.",
      "Ask 'what boundary failed first under stress?' — it's usually the event loop or the error layer, not the model.",
    ],
  },
];

export const content: TopicContent = {
  "unit-prod-api-01": learn,
  "unit-prod-api-02": practice,
  "unit-prod-api-03": build,
  "unit-prod-api-04": review,
};
