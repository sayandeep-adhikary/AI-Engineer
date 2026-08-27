import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Why Vector Databases" (topic-vdb-concepts).
// 2 units: 01 learn (ANN & indexes conceptually) · 02 review (DB-vs-memory decision + mastery).
// Concept-first. Builds directly on the Batch-4 semantic-search-core (brute-force in-memory).
// Timing numbers are LABELLED representative (hardware-dependent); complexity is exact.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You already built semantic search: chunk → embed → store in a Python list → compare the query against **every** vector with cosine. That works, and for a few thousand chunks it's the right amount of complexity. This unit is about the moment it *stops* being enough — and what a **vector database** actually adds. The goal isn't 'learn a product'; it's understanding **what problem a vector DB solves, what abstraction it provides, and what tradeoffs it introduces**, so you reach for one only when the requirement justifies it.",
  },
  {
    type: "prose",
    md: "**Mental model: a vector database is storage + an index + search for vectors — it is NOT an embedding model.** Keep the two responsibilities separate:\n\n- **Embedding model**: `TEXT → VECTOR`. Turns content into numbers. (You met this in the embeddings category.)\n- **Vector database**: `VECTOR + METADATA → STORE / INDEX / SEARCH`. Persists vectors, builds an index that makes nearest-neighbour search fast, filters by metadata, and survives restarts.\n\nA vector DB never *creates* embeddings — you still call your embedding model, then hand the vectors to the DB. Confusing these two is the most common conceptual mistake in the whole category.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Brute-force (exact / flat) search", definition: "Compare the query vector against every stored vector. Exact and simple; cost grows linearly with corpus size — O(N·d) per query." },
      { term: "ANN (approximate nearest neighbour)", definition: "Search a prebuilt index that finds the likely nearest vectors without scanning all of them. Sub-linear latency at the cost of occasionally missing a true neighbour." },
      { term: "Index (vector)", definition: "A data structure built over the vectors (e.g. an HNSW graph) that makes nearest-neighbour lookup fast. Built ahead of time; must be updated as vectors change." },
      { term: "Recall", definition: "The fraction of the TRUE nearest neighbours an approximate search actually returns. ANN trades a little recall for a lot of speed." },
      { term: "Collection / index / namespace", definition: "A named container of vectors + metadata inside the DB (terminology varies by product). Conceptually: one searchable space, usually one embedding model + one dimension." },
    ],
  },
  {
    type: "prose",
    md: "**Why in-memory brute force stops being sufficient.** Brute force compares the query to all `N` vectors, each of dimension `d`, so each query costs on the order of `N·d` multiply-adds. That's fine at `N = 5,000`. At `N = 5,000,000` every single query touches five million vectors — latency climbs linearly, and it all has to live in RAM in one process. The problems compound:\n\n- **Latency**: query time grows with the corpus (O(N)).\n- **Memory**: all vectors sit in one process's RAM; millions of 1536-dim floats is gigabytes.\n- **Persistence & durability**: a Python list vanishes on restart/crash — you'd re-embed everything (slow and costly).\n- **Concurrency & scale**: one process can't serve many users or scale horizontally.\n- **Updates/deletes**: adding, changing, or removing documents in a flat list means rescans and manual bookkeeping.",
  },
  {
    type: "prose",
    md: "**What the vector database provides** in exchange:\n\n- **An ANN index** so query latency stays low as the corpus grows.\n- **Persistence & durability** — vectors survive restarts; no re-embedding on boot.\n- **Metadata storage + filtering** alongside each vector (next topic goes deep here).\n- **Updates/deletes** — upsert by id, delete by id, without rescanning everything.\n- **Scalability & concurrency** — serve many queries, often across machines.\n- **Collections/namespaces** to separate spaces (e.g. per model, per tenant).",
  },
  {
    type: "callout",
    variant: "note",
    title: "Exact vs approximate — the central tradeoff",
    md: "**Exact (brute-force) search**: compare against every vector. *Advantages*: simple, exact, predictable — you always get the true nearest neighbours. *Disadvantage*: cost grows linearly with the corpus, so it gets slow.\n\n**ANN (approximate) search**: build an index that retrieves the likely nearest neighbours by exploring only part of the space. *Advantage*: query latency stays low even on huge corpora. *Tradeoffs*: it's **approximate** (may miss a true neighbour → lower recall), the index takes time/memory to **build and configure**, and you tune a **recall ↔ latency** knob. Neither is 'better' — small corpus → exact is perfect; large corpus with latency limits → ANN earns its complexity.",
  },
  {
    type: "prose",
    md: "**HNSW, conceptually (why it exists, not how to memorise it).** *Hierarchical Navigable Small World* is the most common ANN index. The intuition: instead of checking every vector, it builds a **navigable graph** where each vector links to nearby vectors, with a few 'long-range' links at higher layers. A search starts at the top, greedily hops toward the query through progressively finer layers, and only ever examines a small fraction of the corpus. That's why it's fast — and why it's *approximate* (the greedy path can miss a true neighbour). You do **not** need to implement HNSW; you need to know it's a graph index that trades exhaustive scanning for fast, approximate navigation, exposing knobs that trade recall for latency/build-cost.",
  },
  {
    type: "code",
    language: "python",
    caption: "Brute force is O(N·d) — the cost you're trying to avoid at scale",
    code: `import numpy as np

def brute_force_search(query, vectors, k=5):
    # vectors: (N, d) matrix. Every query touches ALL N vectors.
    sims = vectors @ query / (
        np.linalg.norm(vectors, axis=1) * np.linalg.norm(query) + 1e-9)
    topk = np.argsort(-sims)[:k]
    return list(zip(topk.tolist(), sims[topk].round(4).tolist()))

rng = np.random.default_rng(0)
small = rng.normal(size=(1_000, 128))     # 1k vectors
large = rng.normal(size=(200_000, 128))   # 200k vectors
q = rng.normal(size=128)

# Same code, same query. The ONLY thing that changed is N.
# Wall-clock scales ~linearly with N: 200k takes ~200x the work of 1k.
print(len(brute_force_search(q, small)))   # 5
print(len(brute_force_search(q, large)))   # 5  (but far more compute)`,
    output: `5
5`,
  },
  {
    type: "prose",
    md: "The result count is the same; the **work** is not. Brute force is correct at any size — it just gets linearly more expensive. An ANN index changes the *shape* of that curve from linear toward roughly logarithmic, which is the entire point of a vector database at scale. (You'll measure this yourself in the hands-on topic; on a tiny local dataset the difference may be invisible — that's expected, the lesson is the *scaling behaviour*, not the stopwatch.)",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Configuration mistakes that silently corrupt a vector index",
    md: "A vector DB won't protect you from these — most produce *wrong results*, not errors:\n\n- **Wrong embedding dimension**: the index expects `d` (say 1536); you insert `d = 3072` vectors → rejected or garbage. Dimension is fixed by the model.\n- **Mixing embedding models**: vectors from two models share no space (embeddings category) — one collection must use **one** model.\n- **Wrong distance metric**: configuring euclidean when your model is normalised for cosine skews every ranking.\n- **Stale index / forgetting to index new vectors**: you added documents but never upserted them → they exist 'in your data' but are unsearchable.\n- **Deleting a document but leaving its chunks**: orphaned chunks keep getting retrieved.\n- **Duplicate IDs**: upserting the same id overwrites (or duplicates, per product) — dedupe intentionally.\n- **Missing metadata**: no `doc_id`/source stored → you can't trace, cite, or filter a hit.\n\nAll of these trace back to the same discipline you learned in embeddings: **one model, one space, consistent ids + metadata.**",
  },
  {
    type: "quiz",
    question: "A teammate says 'let's use a vector database so we don't have to call the embedding model anymore.' What's wrong with this statement?",
    choices: [
      "Nothing — vector databases generate embeddings",
      "A vector database stores, indexes, and searches vectors + metadata; it does NOT generate embeddings. You still call an embedding model (TEXT→VECTOR), then hand the vectors to the DB (VECTOR→STORE/INDEX/SEARCH)",
      "Vector databases only work with keyword search",
      "You should never use a vector database",
    ],
    answerIndex: 1,
    explanation: "Embedding generation and vector storage/search are separate responsibilities. The embedding model turns text into vectors; the vector database persists, indexes, filters, and searches those vectors. Adopting a vector DB doesn't remove the embedding step.",
  },
  {
    type: "quiz",
    question: "You switch from brute-force in-memory search to an ANN index and notice a query occasionally misses a document that brute force always found. Is the index broken?",
    choices: [
      "Yes — a correct index always returns the exact nearest neighbours",
      "No — ANN is APPROXIMATE by design; it trades a small amount of recall for large latency gains. Missing an occasional true neighbour is the expected recall/latency tradeoff, tunable via index parameters (or use exact search if you need guarantees)",
      "Yes — you must have the wrong distance metric",
      "No — ANN changes the similarity scores themselves",
    ],
    answerIndex: 1,
    explanation: "Approximate nearest neighbour search explores only part of the space, so it can miss a true neighbour — that's the recall cost of its speed. It's a tunable tradeoff, not a bug. If you need exact guarantees on a small corpus, exact/brute-force search is appropriate.",
  },
  {
    type: "takeaways",
    items: [
      "A vector DB = storage + ANN index + search + metadata + persistence; it is NOT an embedding model (TEXT→VECTOR stays your job).",
      "Brute force is exact but O(N·d) per query — fine small, painful at millions of vectors (latency, RAM, no persistence, hard updates).",
      "Exact vs ANN is the core tradeoff: exact = simple/exact/slow-at-scale; ANN = fast/approximate/recall↔latency-tunable/build cost.",
      "HNSW is a navigable graph index — know why it exists (fast approximate navigation), not how to implement it.",
      "One collection = one model = one dimension = one metric; keep consistent ids + metadata or you silently corrupt retrieval.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The real skill here is a *judgement call*: when does a corpus justify a vector database, and when is a Python list the correct, simpler choice? Premature infrastructure is its own failure mode.",
  },
  {
    type: "quiz",
    question: "Which scenario most clearly justifies moving from in-memory brute force to a vector database?",
    choices: [
      "A prototype searching 800 FAQ entries, rebuilt fresh each run",
      "A production support search over 4 million chunks that must answer in <100ms, survive restarts without re-embedding, and accept continuous document updates/deletes",
      "A one-off script that ranks 200 paragraphs once and exits",
      "A notebook demo comparing cosine scores on 50 sentences",
    ],
    answerIndex: 1,
    explanation: "The justification is scale + latency + durability + mutation: millions of vectors under a latency budget, needing persistence and ongoing updates/deletes — exactly what an ANN index and a managed store provide. The other cases are small, ephemeral, or one-shot, where a list is simpler and sufficient.",
  },
  {
    type: "quiz",
    question: "A team reflexively deploys a distributed vector database for a 1,500-chunk internal tool that runs once a day. What's the likely outcome?",
    choices: [
      "Dramatically better search quality",
      "Premature complexity: operational overhead, cost, and maintenance with no measurable benefit — an in-memory search (or a lightweight local store) would deliver the same results far more simply",
      "The embeddings become more accurate",
      "Nothing works until they add more vectors",
    ],
    answerIndex: 1,
    explanation: "A vector DB adds infrastructure, cost, and failure modes that only pay off at scale/latency/durability requirements this tool doesn't have. Retrieval quality comes from embeddings + chunking, not from the storage engine. Matching infrastructure to the actual requirement is the engineering judgement being tested.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — justify the switch with numbers.** Reason about scale, don't hand-wave.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Decide for a 10-million-document corpus",
    intro: "Build the argument an engineer would take to a design review.",
    steps: [
      { order: 1, action: "For a corpus that chunks into ~10 million vectors and must serve interactive queries (say <200ms) to many concurrent users, explain WHY brute-force in-memory search fails on at least three distinct axes (latency, memory, persistence/durability, concurrency).", decision: "Which single axis breaks FIRST as the corpus grows from 10k → 100k → 1M → 10M, and why?" },
      { order: 2, action: "State what an ANN-indexed vector database changes for each axis you named, and name the new tradeoff you accept in return (approximation/recall, index build cost, operational complexity).", expected: "A balanced argument: what you gain (sub-linear latency, persistence, updates, scale) AND what you pay (recall tuning, build/config, ops)." },
      { order: 3, action: "Give the counter-case: describe a smaller version of the SAME product where you would NOT adopt a vector DB, and justify staying in-memory.", verify: "Your recommendation is tied to concrete thresholds (corpus size, latency budget, durability, update rate) — not to fashion — and you can argue both directions." },
    ],
  },
  {
    type: "checkpoint",
    title: "Self-check",
    items: [
      "You can name the axes brute force fails on at scale (latency O(N), memory, persistence, concurrency).",
      "You can state what an ANN vector DB changes and the recall/latency/ops tradeoff it introduces.",
      "You can argue the counter-case where in-memory remains the right choice.",
      "Your decision is grounded in concrete requirements, not defaults.",
    ],
  },
];

export const content: TopicContent = {
  "unit-vdb-concepts-01": learn,
  "unit-vdb-concepts-02": review,
};
