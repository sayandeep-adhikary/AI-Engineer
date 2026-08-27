import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "HTTP, Async & API Calls" (topic-py-async-http).
// 4 units: 01 learn HTTP+async · 02 practice call REST · 03 build resilient client
// · 04 review sync-vs-async + mastery. Uses httpx (current); patterns are stable.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Every LLM call, every retrieval query, every tool an agent uses is an **HTTP request** underneath. Getting comfortable with HTTP — and with making many requests *concurrently* without your program grinding to a halt — is what separates a toy script from something that holds up under real load. This unit covers the request/response model, resilient calls, and just enough async to overlap I/O.",
  },
  {
    type: "prose",
    md: "**Mental model: a request is a question, a response is an answer with a status code.** You send a *method* (GET to read, POST to create) to a *URL*, with *headers* (auth, content type) and maybe a *body* (JSON). You get back a **status code** (the one-glance verdict) and a body. The status code drives your logic: `2xx` = success, `4xx` = *you* sent something wrong (`401` unauthorized, `404` missing, `429` too many), `5xx` = the *server* failed. Read the code first; parse the body second.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Method", definition: "GET (read), POST (create/submit), PUT/PATCH (update), DELETE. LLM/chat calls are POSTs." },
      { term: "Status code", definition: "2xx success · 4xx client error (401/403/404/429) · 5xx server error. Your branching key." },
      { term: "Headers", definition: "Key/value metadata: `Authorization: Bearer <token>`, `Content-Type: application/json`." },
      { term: "Timeout", definition: "Max time to wait before giving up. Missing timeouts are how programs hang forever." },
      { term: "Concurrency (async)", definition: "Overlapping the *waiting* of many I/O calls on one thread via `async`/`await` — not parallel CPU work." },
      { term: "Backoff", definition: "Waiting longer between retries (0.5s, 1s, 2s...) so you don't hammer a struggling server." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "A GET with auth, timeout, and status handling (httpx)",
    code: `import httpx

resp = httpx.get(
    "https://api.example.com/items/42",
    headers={"Authorization": "Bearer TOKEN"},
    timeout=10.0,                 # ALWAYS set a timeout
)
resp.raise_for_status()          # raise on 4xx/5xx instead of silently continuing
data = resp.json()
print(resp.status_code, data["name"])`,
    output: `200 Example Item`,
  },
  {
    type: "prose",
    md: "`raise_for_status()` is the habit that saves you: without it, a `404` still returns a response object and `resp.json()` blows up somewhere confusing later. With it, a bad status raises `httpx.HTTPStatusError` *right here*, where you can handle it. And `timeout=10.0` matters more than it looks — see the gotcha.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "No timeout = a hang, not an error — and `requests` defaults to none",
    md: "Assumption: 'if the server is down my call will error out.' Reality: without a timeout, a stalled connection can block **forever** — your worker is stuck, not failing. The classic `requests` library has **no default timeout at all**, so `requests.get(url)` can hang indefinitely; httpx defaults to 5 seconds but you should still set it explicitly per call. Recognise the symptom: a program that 'freezes' on a network call rather than raising. Always pass `timeout=`.",
  },
  {
    type: "prose",
    md: "**Async in one idea: overlap the waiting.** A single request spends almost all its time *waiting* for the network. If you must make 50 independent requests, doing them one-by-one wastes that idle time. `async`/`await` lets one thread start all 50, then process each as it returns — the waits overlap. Use `httpx.AsyncClient` and `asyncio.gather` to fan out.",
  },
  {
    type: "code",
    language: "python",
    caption: "Concurrent fetches with asyncio.gather",
    code: `import asyncio, httpx

async def fetch(client, url):
    r = await client.get(url, timeout=10.0)
    r.raise_for_status()
    return r.json()

async def main(urls):
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(fetch(client, u) for u in urls))

results = asyncio.run(main(["https://api.example.com/a",
                            "https://api.example.com/b"]))
print(len(results))`,
    output: `2`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "A blocking call inside async freezes the WHOLE event loop",
    md: "`async` gives you concurrency only if everything you `await` is non-blocking. Drop a *synchronous* blocking call into an async function — `time.sleep(1)`, or a `requests.get()` (sync) instead of `await client.get()` — and it **blocks the single event-loop thread**, so every other coroutine stalls too. Your 'async' program then runs no faster than sequential, or worse. Rule: inside `async def`, use the await-able versions (`await asyncio.sleep(...)`, `httpx.AsyncClient`), never their blocking twins. (CPU-bound work also blocks the loop — send that to processes, not async.)",
  },
  {
    type: "prose",
    md: "**Retries & backoff.** Transient failures (`429`, `5xx`, dropped connections) often succeed on a second try; permanent ones (`400`, `401`, `404`) won't. So retry **only the transient ones**, with exponential backoff, and give up on the rest immediately. Note: httpx does **not** auto-retry HTTP error responses — its transport `retries=` option only retries connection errors, not a `429`/`500` body — so you write the policy yourself (or use a library).",
  },
  {
    type: "quiz",
    question: "Your program occasionally 'freezes' on an API call and never recovers, with no error raised. What's the most likely cause?",
    choices: [
      "The API returned a 500",
      "No timeout was set, so a stalled connection blocks indefinitely",
      "The JSON was malformed",
      "You forgot to call raise_for_status()",
    ],
    answerIndex: 1,
    explanation: "A hang with no exception is the signature of a missing timeout — the call is waiting, not failing. (A 500 or bad JSON would raise; missing raise_for_status hides bad *statuses* but doesn't cause an infinite hang.) Always pass `timeout=`; remember `requests` has no default timeout.",
  },
  {
    type: "quiz",
    question: "You wrap your API calls in `async def` but the program is no faster than the sync version. You're using `requests.get()` inside the coroutines. Why no speedup?",
    choices: [
      "async only helps CPU-bound code",
      "`requests` is synchronous and blocks the event loop, so the awaits can't overlap — use httpx.AsyncClient",
      "You need more threads",
      "asyncio.run is the bottleneck",
    ],
    answerIndex: 1,
    explanation: "Concurrency requires non-blocking awaits. A synchronous `requests.get()` blocks the one event-loop thread, so each call runs to completion before the next starts — exactly like sync code. Swap in `await client.get()` on an `httpx.AsyncClient` (and use asyncio.gather) so the network waits actually overlap.",
  },
  {
    type: "takeaways",
    items: [
      "Read the status code first (2xx/4xx/5xx); call raise_for_status() so bad statuses fail loudly and early.",
      "Always set timeouts — a missing timeout is an infinite hang, and `requests` has no default.",
      "Async overlaps I/O waiting via httpx.AsyncClient + asyncio.gather; it is not parallel CPU work.",
      "Never put a blocking call (time.sleep, requests) inside async — it freezes the whole loop.",
      "Retry only transient failures (429, 5xx, network) with exponential backoff; fail fast on 4xx.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Call a real, public, key-free API and parse its JSON. Good no-auth options: `https://httpbin.org/get`, `https://api.github.com/repos/python/cpython`, or `https://jsonplaceholder.typicode.com/todos/1`. Run these for real.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Fetch and parse (guided)",
    intro: "Hit a public endpoint, check the status, and pull specific fields.",
    steps: [
      { order: 1, action: "GET `https://api.github.com/repos/python/cpython` with a 10s timeout. Call `raise_for_status()`.", expected: "status_code 200; `resp.json()` is a dict with keys like `full_name`, `stargazers_count`." },
      { order: 2, action: "Print `full_name` and `stargazers_count` from the parsed JSON.", expected: "Something like `python/cpython 60000+` (the star count changes over time).", verify: "Change the repo path to a nonexistent repo and confirm `raise_for_status()` now raises an `HTTPStatusError` (404) instead of silently returning." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import httpx

resp = httpx.get("https://api.github.com/repos/python/cpython", timeout=10.0)
resp.raise_for_status()
data = resp.json()
print(data["full_name"], data["stargazers_count"])`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Fetch several concurrently (less guidance)",
    intro: "Requirements + acceptance; you choose the async structure.",
    steps: [
      { order: 1, action: "Given a list of 3–5 repo names, fetch all of them CONCURRENTLY and return a list of `(full_name, stars)` tuples.", decision: "Do you create one AsyncClient shared across all requests, or one per request? Which is correct/efficient, and why does opening a client per call waste connections?" },
      { order: 2, action: "Handle a bad repo in the list so one 404 doesn't sink the whole batch — decide whether to skip it or record an error entry.", verify: "The batch returns results for the good repos even when one name is invalid; total wall-clock time is close to the SLOWEST single request, not their sum." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "A valid request returns 200 and you extracted specific JSON fields.",
      "A bad path triggers raise_for_status() rather than a confusing later crash.",
      "Your concurrent batch reuses one AsyncClient and finishes near the slowest single call, not the sum.",
      "One failing item does not abort the whole batch.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a resilient GET client** — the deliverable here. A thin wrapper that adds the three things every production call needs: a timeout, retries with exponential backoff on *transient* failures, and fast failure on permanent ones.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — get_json(url, *, retries=3)",
    intro: "Acceptance defines done; implement the policy yourself.",
    steps: [
      { order: 1, action: "Write `get_json(url, *, retries=3)` that GETs with a timeout and returns parsed JSON.", decision: "Which failures do you RETRY vs. re-raise immediately? (Transient: connection errors, 429, 5xx. Permanent: 400/401/403/404.) How will you tell them apart from the exception/response?" },
      { order: 2, action: "On a retryable failure, wait with exponential backoff (e.g. 0.5s, 1s, 2s) before the next attempt; after the last attempt, re-raise.", expected: "A flaky endpoint that fails twice then succeeds returns data on the third attempt; a 404 raises immediately with no retries." },
      { order: 3, action: "Verify behaviour against both a transient failure (simulate with a server that 500s then 200s, or mock) and a permanent 404.", verify: "Retryable path recovers; permanent path fails fast; every attempt has a timeout." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Every request has a timeout.",
      "Transient failures (429, 5xx, network) are retried with exponential backoff.",
      "Permanent failures (4xx except 429) raise immediately — no wasted retries.",
      "After exhausting retries, the original error propagates (not swallowed).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import time, httpx

def _retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.TransportError):     # timeouts, connection errors
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        return code == 429 or code >= 500          # transient server-side
    return False

def get_json(url: str, *, retries: int = 3, base: float = 0.5):
    for attempt in range(retries):
        try:
            r = httpx.get(url, timeout=10.0)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            if not _retryable(exc) or attempt == retries - 1:
                raise
            time.sleep(base * 2 ** attempt)        # 0.5s, 1s, 2s...`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Prove to yourself *when* async actually helps, then take on a realistic mastery build. First, a debugging session that surfaces the most common async misconception.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom",
    md: "You rewrote a batch fetch to be 'async for speed'. It's correct, but the wall-clock time is **identical** to the old sequential version — fetching 10 URLs still takes ~10× one request. No errors; just no speedup.",
  },
  {
    type: "code",
    language: "python",
    caption: "The code under investigation",
    code: `import asyncio, httpx

async def fetch(client, url):
    r = await client.get(url, timeout=10.0)
    return r.json()

async def main(urls):
    async with httpx.AsyncClient() as client:
        results = []
        for u in urls:
            results.append(await fetch(client, u))   # <-- ?
        return results`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Diagnose — evidence → root cause → fix → verification",
    intro: "Reason about how the coroutines are scheduled.",
    steps: [
      { order: 1, action: "EVIDENCE: it's genuinely async (AsyncClient, await) yet total time ≈ sum of individual times. What does 'sum, not max' tell you about overlap?", expected: "If waits overlapped, total ≈ the SLOWEST request. 'Sum' means the requests ran one-after-another — no overlap happened." },
      { order: 2, action: "HYPOTHESES: (a) the server is serialising us, (b) we're awaiting each fetch before starting the next, (c) a blocking call is in the loop.", decision: "Look at the loop: `results.append(await fetch(...))`. What does `await` do to the loop right there — does it start the next fetch, or wait for this one to finish first?" },
      { order: 3, action: "ROOT CAUSE: state it precisely.", expected: "`await fetch(u)` inside the for-loop suspends until THAT request completes before the loop starts the next — so the coroutines never run concurrently. Creating a coroutine and immediately awaiting it is just sequential code with extra syntax." },
      { order: 4, action: "FIX: start them all, then await together with `asyncio.gather`. VERIFY by timing.", verify: "`await asyncio.gather(*(fetch(client, u) for u in urls))` drops total time to roughly one request's latency. Timing before/after proves the overlap." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "The fix",
    collapsible: true,
    collapseLabel: "Show the fix",
    code: `async def main(urls):
    async with httpx.AsyncClient() as client:
        # create all coroutines, then let them run concurrently:
        return await asyncio.gather(*(fetch(client, u) for u in urls))`,
  },
  {
    type: "quiz",
    question: "Awaiting each coroutine in a `for` loop (`for u in urls: await fetch(u)`) versus `await asyncio.gather(*(fetch(u) for u in urls))` — what's the practical difference?",
    choices: [
      "None; both run concurrently",
      "The for-loop runs them sequentially (each await blocks until done); gather runs them concurrently, overlapping the I/O waits",
      "gather is only for CPU-bound work",
      "The for-loop is faster because it uses less memory",
    ],
    answerIndex: 1,
    explanation: "`await` yields control but the loop doesn't start the next fetch until the current one finishes, so it's sequential. `gather` schedules all coroutines first, so their network waits overlap and total time approaches the slowest single call. This is THE core async pattern.",
  },
  {
    type: "quiz",
    question: "For a batch of 200 outbound API calls that are each mostly network wait, which approach gives the biggest throughput win with least complexity?",
    choices: [
      "Multiprocessing — one process per call",
      "Async concurrency (AsyncClient + gather), optionally with a concurrency limit",
      "A single synchronous loop",
      "Threads with a global lock around each call",
    ],
    answerIndex: 1,
    explanation: "The work is I/O-bound (waiting on the network), which is exactly async's sweet spot — one thread overlaps hundreds of waits cheaply. Multiprocessing adds heavy per-process overhead for work that isn't CPU-bound. In practice add a semaphore to cap concurrency so you don't trip rate limits.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — a paginated fetch with retries.** Combine everything: pagination, resilient calls, and clean parsing.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build fetch_all_pages(base_url)",
    intro: "Scenario + requirements + acceptance. No step-by-step.",
    steps: [
      { order: 1, action: "A paginated JSON API returns `{\"items\": [...], \"next\": \"<url or null>\"}`. Write `fetch_all_pages(base_url)` that follows `next` until it's null and returns the concatenated `items` from every page.", decision: "Pagination is inherently sequential (you need page N's `next` to fetch N+1). Where, then, can concurrency still help — and where can it not? Justify your choice." },
      { order: 2, action: "Every request must use a timeout and retry transient failures with backoff (reuse your `get_json` from the build unit).", expected: "A transient 503 on page 3 is retried and recovered; the full item list is still complete and in order." },
      { order: 3, action: "Constraint: don't loop forever. Guard against a malformed `next` that points back to a previous page.", verify: "On the sample API the function returns all items across pages; injecting one transient failure mid-run still yields the complete list." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Follows `next` until null and returns every page's items concatenated, in order.",
      "Each request has a timeout and retries transient failures with exponential backoff.",
      "Permanent errors (e.g. 404) fail fast rather than retrying.",
      "A safeguard prevents infinite loops on a cyclic/malformed `next`.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `# assumes get_json(url, *, retries=3) from the build unit
def fetch_all_pages(base_url: str, *, max_pages: int = 1000):
    items, url, seen = [], base_url, set()
    while url and url not in seen and len(seen) < max_pages:
        seen.add(url)
        page = get_json(url)               # timeout + retries inside
        items.extend(page.get("items", []))
        url = page.get("next")             # None ends the loop
    return items`,
  },
  {
    type: "takeaways",
    items: [
      "async is only concurrent when you schedule coroutines together (gather); awaiting each in a loop is sequential.",
      "I/O-bound fan-out → async; CPU-bound → processes. Cap concurrency with a semaphore to respect rate limits.",
      "Resilient calls = timeout + retry transient (429/5xx/network) with backoff + fail fast on 4xx.",
      "Pagination is sequential by nature; you now fetch all pages resiliently and guard against infinite loops.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-async-http-01": learn,
  "unit-py-async-http-02": practice,
  "unit-py-async-http-03": build,
  "unit-py-async-http-04": review,
};
