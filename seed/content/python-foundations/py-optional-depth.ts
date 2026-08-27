import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Optional General Python & CS Depth" (topic-py-optional-depth).
// 2 units: 01 learn "Curated deep-dive links" (a REFERENCE MAP, not a course) · 02 review
// "Do I need this yet?" (deliberate learn/defer decision). Track = optional-depth; masteryCriteria
// says "Reference track — not a gate": checkpoints are self-check only, completion is never gated.
// Every concept follows WHY IT MATTERS -> SIMPLE EXAMPLE -> GOTCHA -> AI-ENGINEERING APPLICATION,
// each tied to an abstraction ALREADY built in this curriculum (Chunk, SearchResult, VectorStore
// Protocol, streaming ingestion). Examples are deterministic where feasible.

const learn: ContentBlock[] = [
  {
    type: "callout",
    variant: "note",
    title: "This is a reference map, not a required course",
    md: "This topic is **optional-depth**. Its whole point is to be consulted **when a real need appears** — not front-loaded. The single biggest mistake here is spending days on advanced Python *instead of building AI apps*. So treat what follows as a **curated map**: each concept is tied to an abstraction you've **already used** in this curriculum (the `Chunk` dataclass, the `SearchResult`, the `VectorStore` protocol, streaming ingestion). Skim it, bookmark it, and come back when your own code would genuinely be cleaner for it. Nothing here gates your progress."
  },
  {
    type: "prose",
    md: "**How to read each entry: WHY IT MATTERS → SIMPLE EXAMPLE → GOTCHA → AI-ENGINEERING APPLICATION.** If the 'why' and 'application' don't match a problem you *currently* have, defer it — that's a valid, encouraged outcome (the next unit helps you decide). The goal is stronger Python *in service of* AI engineering, not language trivia.",
  },

  {
    type: "prose",
    md: "### 1. Generators & iterators\n**Why it matters:** they let you process data **lazily** — one item at a time — instead of loading everything into memory. **AI-engineering application:** streaming a large document corpus through chunk → embed → upsert **without** holding the whole corpus in RAM (exactly the scaling problem the vector-database category is about).",
  },
  {
    type: "code",
    language: "python",
    caption: "A generator streams items lazily (memory stays flat)",
    code: `def read_chunks(lines):
    for line in lines:            # 'yield' pauses and resumes — nothing is materialised
        text = line.strip()
        if text:
            yield text            # produces one chunk at a time

gen = read_chunks(["  intro  \\n", "\\n", "body\\n"])
print(next(gen))   # 'intro'
print(next(gen))   # 'body'  (the blank line was skipped)
print(list(read_chunks(["a\\n", "b\\n"])))   # ['a', 'b']`,
    output: `intro
body
['a', 'b']`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "A generator is single-use and lazy",
    md: "Once exhausted, a generator yields nothing more — iterating it again gives an empty result (there's no rewind). And because it's lazy, **exceptions and work happen only when you consume it**, not when you create it. If you need the data twice, materialise it (`list(gen)`) or rebuild the generator. For huge corpora, prefer streaming and consume once."
  },

  {
    type: "prose",
    md: "### 2. Context managers (`with`)\n**Why it matters:** they guarantee **setup/teardown** even when errors occur — resources get released deterministically. **AI-engineering application:** safely opening/closing a vector-store client, a DB connection, or a file handle during ingestion, so a mid-batch failure doesn't leak connections or leave half-written state.",
  },
  {
    type: "code",
    language: "python",
    caption: "A context manager guarantees cleanup via try/finally",
    code: `from contextlib import contextmanager

@contextmanager
def timed(label):
    import time
    start = time.perf_counter()
    try:
        yield                       # body runs here
    finally:
        # runs even if the body raises — cleanup is guaranteed
        print(f"{label}: done")     # (timing value itself is machine-dependent)

with timed("embed-batch"):
    total = sum(range(1000))
print(total)`,
    output: `embed-batch: done
499500`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "The cleanup must live in finally",
    md: "If you put teardown *after* the `yield` but not in a `finally`, an exception in the `with` body skips it — defeating the purpose. Always wrap the `yield` in `try/finally` (or use a class with `__enter__`/`__exit__`). This is what makes `with open(...)` safe against exceptions, and why it's the right tool for store/connection lifecycles."
  },

  {
    type: "prose",
    md: "### 3. Dataclasses\n**Why it matters:** typed record types with far less boilerplate than hand-written classes. **AI-engineering application:** you already used them — `Chunk(chunk_id, doc_id, text, metadata, vector)` and `SearchResult(...)` are dataclasses. They make the shapes flowing through your retrieval pipeline explicit and self-documenting.",
  },
  {
    type: "code",
    language: "python",
    caption: "A dataclass = a typed record with free __init__/__repr__/__eq__",
    code: `from dataclasses import dataclass, field

@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    text: str
    metadata: dict = field(default_factory=dict)   # NOT metadata={}
    vector: list[float] | None = None

c = Chunk("d1::0", "d1", "hello")
print(c.chunk_id, c.metadata)   # d1::0 {}
print(c == Chunk("d1::0", "d1", "hello"))   # True (value equality, free)`,
    output: `d1::0 {}
True`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Mutable defaults need default_factory",
    md: "Writing `metadata: dict = {}` in a dataclass raises an error (or, in plain functions, shares ONE dict across all instances — the classic mutable-default bug from the Python foundations). Use `field(default_factory=dict)` / `default_factory=list` for mutable defaults so each instance gets its own."
  },

  {
    type: "prose",
    md: "### 4. Typing & Protocols (structural interfaces)\n**Why it matters:** type hints catch interface mistakes **before runtime**, and `Protocol` defines an interface by **shape** (duck typing, checked statically). **AI-engineering application:** the `VectorStore` **Protocol** from the vector-database topics — `InMemoryVectorStore`, `ChromaVectorStore`, and `AzureSearchVectorStore` are interchangeable precisely because they satisfy the same protocol. That's what made 'swap the store, keep the interface' possible.",
  },
  {
    type: "code",
    language: "python",
    caption: "A Protocol defines an interface by shape — no inheritance required",
    code: `from typing import Protocol

class VectorStore(Protocol):
    def add(self, chunks: list) -> None: ...
    def query(self, vector: list[float], k: int) -> list: ...

class InMemoryVectorStore:          # NOTE: does not inherit VectorStore
    def __init__(self): self._items = []
    def add(self, chunks): self._items.extend(chunks)
    def query(self, vector, k): return self._items[:k]

def run(store: VectorStore):        # accepts anything with add + query
    store.add([1, 2, 3])
    return store.query([0.0], 2)

print(run(InMemoryVectorStore()))   # [1, 2] — structurally compatible`,
    output: `[1, 2]`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Type hints don't enforce at runtime",
    md: "Python does not check types at runtime — hints are for **you, your editor, and a static checker** (mypy/pyright). `def f(x: int)` will happily run with a string and fail later. The value comes from running a type checker in CI; without one, hints are documentation. (This mirrors the 'type hints aren't enforced' gotcha from the functions/modules topic.)"
  },

  {
    type: "prose",
    md: "### 5. Decorators\n**Why it matters:** wrap a function to add behaviour (timing, logging, retries, caching) **without editing its body**. **AI-engineering application:** a `@retry` decorator around a flaky embedding/LLM call (you met backoff in the streaming-robustness topic), or a `@logged` decorator to trace ingestion calls.",
  },
  {
    type: "code",
    language: "python",
    caption: "A decorator wraps a function to add behaviour",
    code: `import functools

def logged(fn):
    @functools.wraps(fn)                 # preserve name/docstring
    def wrapper(*args, **kwargs):
        print(f"call {fn.__name__}{args}")
        return fn(*args, **kwargs)
    return wrapper

@logged
def embed_count(texts):
    return len(texts)

print(embed_count(["a", "b", "c"]))
print(embed_count.__name__)              # 'embed_count' (thanks to functools.wraps)`,
    output: `call embed_count(['a', 'b', 'c'],)
3
embed_count`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Use functools.wraps",
    md: "Without `@functools.wraps(fn)`, the wrapped function loses its `__name__`, docstring, and signature — which breaks introspection, logging, and some frameworks. Always wrap the wrapper. If your decorator takes arguments (e.g. `@retry(times=3)`), you need one more layer of nesting — reach for that only when you actually need parameterised decorators."
  },

  {
    type: "prose",
    md: "### When you'll actually want the rest\n- **Classes & inheritance**: when you have several stores/embedders sharing real behaviour (not just an interface — that's what Protocols are for). Prefer composition; inherit sparingly.\n- **pytest**: the moment your retrieval logic matters enough to protect — write tests for chunking boundaries, filter/security enforcement, and tenant isolation.\n- **Packaging**: when `semantic-search-core` becomes something you install and reuse across projects (P2's 'documentation & polish' milestone) rather than copy-paste.\n\nEach is worth learning **when the need is concrete** — not before.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Optional exercises — do the one that fixes a real itch",
    md: "Pick whichever maps to code you're actually writing (none are required):\n- Rewrite corpus ingestion as a **generator** so memory stays flat over a large file.\n- Add a **context manager** around your vector-store client so it always closes.\n- Define your pipeline's records as **dataclasses** (`Chunk`, `SearchResult`).\n- Add a `VectorStore` **Protocol** and type your stores against it; run a type checker.\n- Write a `@retry` or `@logged` **decorator** for your embedding call.\n\nEach should make an existing abstraction cleaner — if it doesn't, defer it."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Optional — apply ONE technique to your own AI code",
    intro: "Only if it improves code you already have. This is a reference track; there's nothing to 'finish'.",
    steps: [
      { order: 1, action: "Choose one technique above that would genuinely improve an abstraction in your semantic-search / vector-DB code (streaming ingestion, store lifecycle, typed records, store protocol, or a retry/log decorator).", decision: "Does this solve a problem you have RIGHT NOW, or are you reaching for it because it's clever? If the latter, stop and defer." },
      { order: 2, action: "Apply it in the smallest possible way and confirm behaviour is unchanged (or improved). Note the WHY→GOTCHA that applied to your case.", expected: "A small, real improvement (clearer types, flat memory, guaranteed cleanup, or less duplicated cross-cutting code) — not a rewrite." },
      { order: 3, action: "Write one sentence: what did it improve, and would you reach for it again? If it added complexity without payoff, revert it and record that lesson.", verify: "You either made a targeted improvement grounded in a real need, or you consciously deferred — both are correct outcomes for an optional-depth topic." },
    ],
  },
  {
    type: "checkpoint",
    title: "Reference self-check (not a gate)",
    items: [
      "You can name the AI-engineering use for generators (streaming ingestion) and context managers (resource lifecycle).",
      "You recognise Chunk/SearchResult as dataclasses and VectorStore as a Protocol you already used.",
      "You know decorators add cross-cutting behaviour (retry/logging) without editing the function body.",
      "You have a map of what to learn LATER (classes/inheritance, pytest, packaging) and when.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "This is a reference map — consult it when a real need appears; front-loading advanced Python instead of building AI apps is the mistake to avoid.",
      "Generators = lazy/streaming (flat memory for large corpora); single-use.",
      "Context managers = guaranteed setup/teardown (store/connection lifecycles); cleanup goes in finally.",
      "Dataclasses = typed records (Chunk, SearchResult); use default_factory for mutable defaults.",
      "Protocols = structural interfaces (VectorStore) enabling swappable stores; type hints aren't enforced at runtime — run a checker. Decorators add cross-cutting behaviour (retry/log) — use functools.wraps.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The most valuable skill in an *optional* topic is deciding — honestly — whether you need it **yet**. This unit is that deliberate learn-or-defer decision. Deferring is a legitimate, often correct answer; this track is a reference, not a gate.",
  },
  {
    type: "quiz",
    question: "You're mid-way through building the P2 retrieval app and feel you 'should' stop to master metaclasses, descriptors, and advanced async internals first. What's the best call?",
    choices: [
      "Pause the project and study all of them thoroughly — depth first",
      "Defer them: none are blocking your retrieval app. Learn advanced Python when a concrete problem in your code demands it; front-loading depth delays shipping and the concepts fade without application",
      "Abandon Python for an easier language",
      "Study them because senior engineers know them",
    ],
    answerIndex: 1,
    explanation: "This topic's core lesson: optional depth is pulled in by real need, not pushed in preemptively. Metaclasses/descriptors aren't blocking a retrieval app; learning them now trades shipping for trivia that won't stick without use. Continue building; revisit depth when a specific problem calls for it.",
  },
  {
    type: "quiz",
    question: "Which situation is a GENUINE signal to go learn a deeper Python topic now?",
    choices: [
      "You saw it mentioned in a blog post",
      "Your ingestion loads an entire multi-GB corpus into RAM and crashes — a strong, concrete reason to learn generators/streaming now",
      "It's on a 'top 10 advanced Python' list",
      "You want your code to look sophisticated",
    ],
    answerIndex: 1,
    explanation: "A real, blocking problem in your own code (out-of-memory ingestion) is exactly the trigger to learn the relevant technique (generators/streaming). Curiosity from lists or aesthetics isn't — those lead to front-loading depth you won't retain. Let concrete needs drive depth.",
  },
  {
    type: "prose",
    md: "**Make the call — explicitly.** A deliberate decision beats vague guilt about 'not knowing enough Python'.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Decide: learn now, or deliberately defer",
    intro: "For each deeper topic, choose and justify. There is no wrong answer if it's reasoned.",
    steps: [
      { order: 1, action: "List the deeper Python topics on your radar (from the map: generators, context managers, dataclasses, protocols/typing, decorators, classes/inheritance, pytest, packaging, plus anything else). For each, write 'need now' or 'defer'.", expected: "Each item has an explicit decision — not an open 'maybe'." },
      { order: 2, action: "For every 'need now', name the CONCRETE problem in your current code it solves. If you can't name one, move it to 'defer'.", decision: "Which single technique, if any, would most improve the code you're writing THIS week — and what's the smallest way to adopt it?" },
      { order: 3, action: "Write your one-line policy for this track (e.g. 'I revisit this map when a real problem appears, and I ship first'). Note that completing this topic is NOT required to progress.", verify: "You produced a deliberate learn/defer decision per topic, grounded in concrete needs, and you're comfortable deferring the rest without guilt." },
    ],
  },
  {
    type: "checkpoint",
    title: "Reference self-check (not a gate)",
    items: [
      "Every deeper topic has an explicit 'need now' or 'defer' decision.",
      "Each 'need now' is tied to a concrete problem in your current code.",
      "You have a one-line policy for when to pull from this reference track.",
      "You accept that deferring — and shipping AI work first — is a correct outcome.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-optional-depth-01": learn,
  "unit-py-optional-depth-02": review,
};
