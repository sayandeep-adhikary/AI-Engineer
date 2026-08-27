import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Using a Vector Database" (topic-vdb-hands-on).
// 4 units: 01 learn (CRUD: collections/upsert/query/persistence) · 02 practice (upsert+query
// sample vectors) · 03 build (PORT semantic-search-core onto a vector DB = Project P2
// milestone p2-02) · 04 review (benchmark vs in-memory + troubleshoot + mastery).
// Uses Chroma as the concrete local, free, keyless real vector DB; interface from Batch 4's
// SemanticSearchCore is kept STABLE (storage is an abstraction boundary). Chroma outputs
// labelled representative; the pure-Python InMemory path is deterministic.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Concepts settled, now operate a real vector database. The API surface is small and consistent across products (Chroma, Qdrant, pgvector, Pinecone, Azure AI Search): create a **collection**, **upsert** vectors with ids + metadata, **query** for top-k nearest neighbours, and rely on **persistence** so nothing is lost on restart. This unit uses **Chroma** because it runs **locally, free, with no server** — but everything you learn maps directly onto the others.",
  },
  {
    type: "prose",
    md: "**Mental model: a vector DB is a key-value store where the 'index' is over vector similarity.** You `upsert` records keyed by a stable **id**, each carrying a **vector**, the **document text**, and **metadata**. You never scan it yourself — you ask `query(vector, k)` and the DB uses its ANN index to return the nearest records. The four verbs — **create collection, upsert, query, delete** — plus **persist** are the whole vocabulary.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Collection", definition: "A named container of vectors + metadata (one embedding model, one dimension, one distance metric). Some products call it an index or namespace." },
      { term: "Upsert", definition: "Insert-or-update by id. Re-upserting the same id replaces it — the basis of idempotent re-indexing and updates." },
      { term: "Query", definition: "Given a query vector and k, return the k nearest records with their ids, metadata, documents, and a distance/score." },
      { term: "Distance vs similarity", definition: "Many DBs return a DISTANCE (smaller = closer), not a similarity. For a cosine space, distance ≈ 1 − cosine. Know which your DB returns before you sort/threshold." },
      { term: "Persistence", definition: "The store writes to disk so vectors survive restarts — no re-embedding on boot (which is slow and costs money)." },
    ],
  },
  {
    type: "prose",
    md: "**CRUD with Chroma, concretely.** Create a persistent client, get-or-create a collection with a chosen distance space, add records, and query:",
  },
  {
    type: "code",
    language: "python",
    caption: "Chroma: collection → add → query (runs locally, no server, no key)",
    code: `import chromadb

client = chromadb.PersistentClient(path="./vectorstore")   # writes to disk (persistence)
col = client.get_or_create_collection(
    name="docs",
    metadata={"hnsw:space": "cosine"},   # choose the distance metric UP FRONT
)

# Upsert: ids + vectors + documents + metadata, all aligned by position.
col.add(
    ids=["doc1::0", "doc2::0"],
    embeddings=[[0.11, 0.92, 0.03], [0.87, 0.04, 0.10]],   # your embedding model's output
    documents=["reset your password in settings", "office hours are 9 to 5"],
    metadatas=[{"doc_id": "doc1", "source": "faq"}, {"doc_id": "doc2", "source": "faq"}],
)

res = col.query(
    query_embeddings=[[0.10, 0.90, 0.05]],   # SAME model as the stored vectors
    n_results=2,
    include=["documents", "metadatas", "distances"],
)
print(res["ids"][0])         # ['doc1::0', 'doc2::0']  (nearest first)
print(res["distances"][0])   # cosine DISTANCE (1 - cosine); smaller = closer`,
    output: `['doc1::0', 'doc2::0']
[0.02, 0.71]   # representative — exact distances depend on your vectors`,
  },
  {
    type: "prose",
    md: "Three things to notice, because they're where people trip:\n\n1. **You set the distance metric when you create the collection** (`hnsw:space`) — not per query. Pick the one matching your embedding model (cosine for OpenAI).\n2. **The DB returns a DISTANCE**, not a cosine similarity. For a cosine space, smaller distance = more similar (`distance ≈ 1 − cosine`). If you sort the wrong way or reuse a similarity threshold as a distance threshold, everything breaks.\n3. **You still generate the embeddings.** The DB stored and searched the vectors; your embedding model produced them. (Chroma *can* embed for you, but here you keep that responsibility explicit so the model stays yours to control — and consistent between documents and queries.)",
  },
  {
    type: "callout",
    variant: "note",
    title: "Chroma, Qdrant, pgvector — same shape, pick per constraints",
    md: "The verbs are identical; the packaging differs. **Chroma** — embedded, local, zero-setup (used here). **Qdrant** — runs locally in Docker or as a managed service; rich filtering; also an in-memory mode for tests. **pgvector** — a Postgres extension, great when you already run Postgres and want vectors *next to* relational data + SQL filters. **Pinecone / Azure AI Search** — fully managed. Learn the four verbs once; choosing a product is a constraints decision (ops, existing stack, scale, cost), not a new mental model. This topic's lab works locally so you never need to pay for or stand up infrastructure to understand it.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Dimension mismatch and re-embedding-every-run",
    md: "Two operational mistakes: **(1) Dimension mismatch** — a collection's vectors have a fixed dimension (set by your model). Insert a differently-sized vector (e.g. you switched from a 1536-dim to a 3072-dim model) and the DB rejects it or the search is meaningless. One collection = one model = one dimension. **(2) Re-embedding every run** — because a Python list is ephemeral, the Batch-4 core re-embedded the whole corpus on every start. A persistent vector DB exists precisely so you **embed once, persist, and reload** — upsert is idempotent by id, so re-running ingestion on unchanged content shouldn't re-embed or duplicate. If your bill or startup time is high, check that you're not re-embedding what's already stored.",
  },
  {
    type: "quiz",
    question: "Your Chroma collection is created with cosine space, and a query returns distances [0.02, 0.71]. A teammate sorts DESCENDING to get the 'most similar' first. What's wrong?",
    choices: [
      "Nothing — higher is always more similar",
      "The DB returns DISTANCE (smaller = closer for cosine space, distance ≈ 1 − cosine), so the most similar result has the SMALLEST distance (0.02). Sorting descending returns the least similar first",
      "Chroma is broken; it should return similarities",
      "You must convert to Euclidean first",
    ],
    answerIndex: 1,
    explanation: "Many vector DBs return a distance rather than a similarity. In a cosine space, distance ≈ 1 − cosine, so smaller means closer. The nearest neighbour is the smallest distance; sorting descending inverts relevance. Always confirm whether your DB returns distance or similarity.",
  },
  {
    type: "takeaways",
    items: [
      "Vector DB vocabulary: create collection → upsert (id+vector+text+metadata) → query(vector,k) → delete; plus persistence.",
      "Choose the distance metric at collection creation (cosine for OpenAI); one collection = one model = one dimension.",
      "Most DBs return DISTANCE (smaller = closer), not similarity — sort/threshold accordingly.",
      "You still generate embeddings; the DB stores/indexes/searches them. Keep the same model for docs and queries.",
      "Persist and upsert-by-id so you embed once and reload — never re-embed unchanged content every run.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Get hands on the four verbs with a tiny corpus before touching the real project. Chroma runs locally; if you can't install it, the same steps apply to Qdrant's in-memory mode or a local pgvector.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Upsert and query sample vectors (guided)",
    intro: "Prove you can round-trip vectors + metadata through a real store.",
    steps: [
      { order: 1, action: "Create a persistent collection with cosine space. Upsert 5 short records, each with a stable id, an embedding (from your model or a toy embedder), the source text, and metadata (e.g. source, doc_id).", expected: "5 records persisted; re-running the upsert with the same ids replaces rather than duplicates them." },
      { order: 2, action: "Query with a vector and k=3. Inspect the returned ids, documents, metadata, and distances. Confirm the nearest record has the SMALLEST distance.", decision: "Is your DB returning a distance or a similarity? How did you verify which, and how does that change your sort?" },
      { order: 3, action: "Restart the process (or reload the client) and query again WITHOUT re-adding anything. Confirm the vectors survived (persistence).", verify: "Round-trip works: upsert → query returns sensible neighbours with metadata; ids dedupe; data survives a restart." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Records upsert with id + vector + text + metadata; same-id re-upsert replaces (no duplicates).",
      "query(vector, k) returns ids + documents + metadata + distance.",
      "You confirmed distance-vs-similarity direction and sort accordingly.",
      "Vectors persist across a restart (no re-embedding).",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Port `semantic-search-core` onto a real vector database** — Project **P2, milestone p2-02** ('Move to a vector database'). This is the payoff of Batch 4's design: the store was deliberately separable, so you replace **only** the storage subsystem and keep the `add_documents` / `search` interface **identical**. You are *evolving* the artifact, not rebuilding it.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (from Project P2)",
    md: "P2 milestone p2-01 says the existing core must run as the starting point (no rebuild); p2-02 says search must run on a **persistent vector database**. So: **keep the public interface stable** — `SemanticSearchCore.add_documents(docs)` and `.search(query, k) -> list[SearchResult]` must not change for callers. Introduce a `VectorStore` seam behind them; provide the original in-memory store AND a vector-DB-backed store implementing the same interface. Later milestones (p2-03 filtering, p2-04 hybrid) build on this same seam — don't break it.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — swap the store, keep the interface",
    intro: "Acceptance defines done. Refactor; don't rewrite the pipeline.",
    steps: [
      { order: 1, action: "Extract a VectorStore interface with add(chunks) and query(vector, k). Refactor SemanticSearchCore so add_documents and search delegate to an injected store — the chunk→embed and embed→rank flow is UNCHANGED; only where vectors live changes.", decision: "Which methods must keep identical signatures so P2 milestones p2-01/p2-03/p2-04 and existing callers keep working? What is allowed to change behind the seam?" },
      { order: 2, action: "Implement TWO stores behind the interface: InMemoryVectorStore (the original brute-force list) and a real vector-DB store (Chroma/Qdrant/pgvector) that PERSISTS. Ingestion embeds once and upserts by stable chunk_id; a restart reloads without re-embedding.", expected: "Constructing the core with either store yields the same search interface and comparable results; the DB-backed one survives a restart." },
      { order: 3, action: "Prove the boundary: run the SAME query through both stores, retrieve ids + metadata + score, and confirm the results correspond. Note any differences (e.g. distance-vs-similarity conversion, ANN approximation) and explain them.", verify: "One core, two interchangeable stores; public interface unchanged; DB path persists; you can explain any result differences as store-level (metric/approximation), not pipeline changes." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P2 milestone p2-02",
    items: [
      "add_documents / search signatures unchanged; only the injected store differs.",
      "A VectorStore interface with add + query; InMemory and DB-backed implementations both satisfy it.",
      "DB-backed store persists (embed once, reload on restart, upsert by id — no duplicates/re-embed).",
      "Same query through both stores returns corresponding ids+metadata+score; differences explained at the store level.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — VectorStore seam + in-memory and Chroma implementations",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from typing import Protocol
from dataclasses import dataclass
import numpy as np

# --- Chunk / SearchResult / cosine reused from the Batch-4 semantic-search-core ---
@dataclass
class Chunk:
    chunk_id: str; doc_id: str; text: str; metadata: dict; vector: list[float] | None = None

@dataclass
class SearchResult:
    chunk_id: str; doc_id: str; text: str; metadata: dict; score: float

def cosine(a, b) -> float:
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = np.linalg.norm(a) * np.linalg.norm(b)
    return float(a @ b / d) if d else 0.0

# --- the seam: storage is now an interface (P2 can swap implementations) ---
class VectorStore(Protocol):
    def add(self, chunks: list[Chunk]) -> None: ...
    def query(self, vector: list[float], k: int) -> list[tuple[Chunk, float]]: ...

class InMemoryVectorStore:                      # the ORIGINAL behaviour, now behind the seam
    def __init__(self): self._chunks: list[Chunk] = []
    def add(self, chunks): self._chunks.extend(chunks)
    def query(self, vector, k):
        scored = [(c, cosine(vector, c.vector)) for c in self._chunks if c.vector is not None]
        scored.sort(key=lambda cs: cs[1], reverse=True)
        return scored[:k]

class ChromaVectorStore:                         # NEW: persistent, real vector DB
    def __init__(self, path="./vectorstore", name="docs"):
        import chromadb
        self._col = chromadb.PersistentClient(path=path).get_or_create_collection(
            name=name, metadata={"hnsw:space": "cosine"})
    def add(self, chunks):
        self._col.add(
            ids=[c.chunk_id for c in chunks],
            embeddings=[c.vector for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[{**c.metadata, "doc_id": c.doc_id} for c in chunks])
    def query(self, vector, k):
        r = self._col.query(query_embeddings=[vector], n_results=k,
                             include=["documents", "metadatas", "distances"])
        out = []
        for cid, doc, meta, dist in zip(r["ids"][0], r["documents"][0],
                                        r["metadatas"][0], r["distances"][0]):
            score = 1.0 - dist                    # cosine space: similarity = 1 - distance
            out.append((Chunk(cid, meta.get("doc_id", ""), doc, meta), score))
        return out

# --- the core: pipeline UNCHANGED; only the store is injected ---
class SemanticSearchCore:
    def __init__(self, embed_fn, store: VectorStore, chunker):
        self.embed_fn, self.store, self.chunker = embed_fn, store, chunker
    def add_documents(self, docs: list[dict]) -> None:
        new = [Chunk(f'{d["id"]}::{i}', d["id"], p, d.get("metadata", {}))
               for d in docs for i, p in enumerate(self.chunker(d["text"])) if p.strip()]
        if not new: return
        for c, v in zip(new, self.embed_fn([c.text for c in new])):
            c.vector = v
        self.store.add(new)                        # <-- the only line that "knows" about storage
    def search(self, query: str, k: int = 5) -> list[SearchResult]:
        qv = self.embed_fn([query])[0]
        return [SearchResult(c.chunk_id, c.doc_id, c.text, c.metadata, round(s, 4))
                for c, s in self.store.query(qv, k)]

# Same interface, swap the store:
#   core = SemanticSearchCore(embed_fn, InMemoryVectorStore(), chunker)   # before
#   core = SemanticSearchCore(embed_fn, ChromaVectorStore(), chunker)     # after (persistent)`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Now measure the thing you migrated for — latency at scale — and learn to diagnose the migration's characteristic failures.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Benchmarking honestly — a tiny corpus may show no difference",
    md: "Benchmark brute-force in-memory vs the indexed DB by timing many queries at growing corpus sizes (e.g. 1k, 10k, 100k synthetic vectors). Expect brute-force time to rise roughly **linearly** with N while the ANN index rises much slower — but on a **small local dataset the difference can be invisible or even favour brute force** (index overhead, tiny N). That's not a failure of the exercise; the point is to observe the *scaling curve* and understand *when* the crossover happens, plus measure the DB's **recall** vs exact search where feasible. Report corpus size, query latency, top-k, and recall — don't over-claim from one machine and one N.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — after migrating, newly added documents never appear in results",
    md: "You upsert new docs but searches never return them. **Evidence:** did `add`/upsert actually run and commit (persistence flushed)? Do the new records have **vectors** (embedding didn't silently fail)? Were they embedded with the **same model/dimension** as the collection? Did you write to the **same collection/path** you query? Is there an **id collision** overwriting them? **Diagnosis** is almost always: not indexed (upsert skipped/failed), wrong collection, dimension/model mismatch, or duplicate ids — the vector-DB versions of the same failure modes from in-memory search. **Fix** the specific cause; confirm by querying the record by id directly.",
  },
  {
    type: "quiz",
    question: "You benchmark the vector DB against in-memory on 2,000 vectors and the DB is actually SLOWER. Should you abandon the vector database?",
    choices: [
      "Yes — it's clearly the wrong tool",
      "No — at tiny N, index overhead can make ANN slower than a flat scan; the DB's advantage appears as N grows large (where brute force scales linearly). Benchmark across growing corpus sizes to find the crossover; also weigh persistence/updates/concurrency, not just latency at 2k",
      "Yes — vector databases are always slower",
      "No — the benchmark must be wrong",
    ],
    answerIndex: 1,
    explanation: "ANN indexes carry overhead that only pays off at scale; at 2,000 vectors a flat scan can win. The migration is justified by the scaling curve plus persistence, updates, and concurrency — not by latency at a tiny N. Benchmark across sizes to see where the DB overtakes brute force.",
  },
  {
    type: "quiz",
    question: "Which change is the WHOLE POINT of how semantic-search-core was designed for this migration?",
    choices: [
      "You rewrote the chunking and embedding pipeline for the vector DB",
      "You replaced ONLY the storage subsystem behind a stable VectorStore interface, while add_documents/search and the chunk→embed→rank flow stayed the same — proving storage is an abstraction boundary",
      "You changed the embedding model to match the database",
      "You deleted the in-memory implementation entirely",
    ],
    answerIndex: 1,
    explanation: "The design goal was that storage is swappable: the core delegates to a VectorStore, so moving to a database changes only that implementation. The pipeline and public interface are untouched, and keeping the in-memory store lets you compare and test. That's evolution, not rebuild.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — swap the store, prove the seam.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Replace the store while keeping the retrieval interface stable",
    intro: "Demonstrate the abstraction boundary end-to-end.",
    steps: [
      { order: 1, action: "Take your ported core. Ingest a small corpus with the in-memory store, capture the top-k for 3 queries. Then construct the SAME core with the vector-DB store, ingest the same corpus, and run the same 3 queries.", expected: "The two stores return corresponding results (same interface, same inputs) modulo metric/approximation differences." },
      { order: 2, action: "Confirm you changed NO caller code and NO pipeline code — only the injected store — and that the DB path persists across a restart.", decision: "If a future milestone (metadata filtering, hybrid) needs a new capability, where does it belong — in the core, in the VectorStore interface, or in a specific store implementation? Why?" },
      { order: 3, action: "Write 3–4 sentences explaining any result differences between the stores strictly in terms of the STORE (distance metric, ANN recall), not the pipeline.", verify: "Same interface, two stores, unchanged callers, persistence proven, and you can locate where future capabilities attach without breaking the seam." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Same corpus + queries run through in-memory and DB stores via one unchanged interface.",
      "No caller/pipeline code changed; only the injected store; DB path persists across restart.",
      "You can attribute differences to store-level causes (metric/recall), not pipeline.",
      "You can say where future P2 capabilities (filtering/hybrid) attach to the seam.",
    ],
  },
];

export const content: TopicContent = {
  "unit-vdb-hands-on-01": learn,
  "unit-vdb-hands-on-02": practice,
  "unit-vdb-hands-on-03": build,
  "unit-vdb-hands-on-04": review,
};
