import type { ProjectGuide } from "../../types";

// Project guide for P2 — Semantic Search Engine over Your Own Data (project-p2-semantic-search).
// Evolves the semantic-search-core artifact (topic-emb-semantic-search-project) — no rebuild.

export const guide: ProjectGuide = {
  overview:
    "Take the **semantic-search core** you built in the embeddings topic and evolve it into a real search product over your own corpus — documentation, notes, a codebase, or a dataset. Instead of exact-keyword matching, users type a natural-language query ('how do I rotate an API key?') and get the most *meaning-relevant* passages back, ranked, filtered by metadata, and fast enough to feel instant.\n\nCrucially, you do **not** rebuild from scratch. You keep the `embed → store → search` interface and swap the in-memory store for a real vector database, add metadata filtering, blend semantic and keyword (hybrid) search, and add a reranking step. The engineering lesson is **evolving an architecture behind a stable seam** — the mark of a system designed to grow.",
  scenario:
    "Your company's knowledge is scattered across hundreds of docs and nobody can find anything with the built-in keyword search — searching 'access token expiry' misses the page titled 'credential lifetimes'. You are asked to build an internal semantic search so employees find the right passage by meaning, not exact words.\n\nKeyword search alone fails because language varies; pure semantic search alone fails on exact identifiers (a product code, an error string) that must match literally. A real system also needs to scope results (only *my team's* space, only *current* docs) and stay fast as the corpus grows. That is why you need a vector database (not a Python list), metadata filtering, and hybrid search — the retrieval infrastructure that P3's RAG app will later sit on top of.",
  whatYouBuild:
    "A search service (CLI or small UI) with an ingestion pipeline and a query pipeline, built on a real vector database. It retrieves — it does **not** generate answers yet (that is P3). The focus is retrieval quality and infrastructure.",
  architecture: `Documents (files / export)
        |
        v
  Ingestion pipeline         <- load, clean, chunk, attach metadata
        |
        v
  Embedding model            <- same model for docs AND queries
        |
        v
  Vector database  <----------------------+
   (vectors + metadata + text)            |
        ^                                 |
        |                                 |
  Query text --> embed --> vector search  |
                     +--> keyword (BM25)   |  hybrid: fuse (RRF)
                     +--> metadata filter -+
                              |
                              v
                        Rerank (optional)
                              |
                              v
                     Ranked results + sources`,
  components: [
    "**Ingestion pipeline** — loads documents, cleans them, splits them into chunks, attaches metadata (source, section, date, tenant), and embeds each chunk.",
    "**Embedding layer** — one model used for both documents and queries (changing it means re-embedding the whole corpus).",
    "**Vector store** — a real vector database holding vectors + text + filterable metadata, behind the same interface your core already used.",
    "**Query pipeline** — embeds the query, runs vector search, applies metadata filters, optionally blends keyword search, and reranks.",
    "**Hybrid + rerank** — reciprocal-rank fusion of semantic and keyword hits, then an optional cross-encoder rerank of the top candidates.",
    "**Interface** — a CLI or minimal UI showing ranked passages with their source and score.",
  ],
  learningObjectives: [
    "Embeddings as learned representations",
    "Chunking strategy",
    "Vector databases",
    "Metadata filtering",
    "Hybrid (semantic + keyword) search",
    "Reranking",
    "Retrieval-quality measurement",
    "Interface behind a stable seam",
    "Ingestion pipelines",
  ],
  prerequisites: {
    required: [
      "You completed the embeddings topic and have the semantic-search core (embed/store/search).",
      "You understand cosine similarity and why the same model must embed docs and queries.",
      "Comfortable with Python data handling (loading files, JSON, simple pipelines).",
    ],
    helpful: [
      "Basic familiarity with a vector DB (Qdrant, pgvector, or Azure AI Search) — you can learn it here.",
      "Awareness of BM25 / keyword search concepts.",
      "Understanding of what a reranker (cross-encoder) does.",
    ],
  },
  techStack: [
    { layer: "Language", choice: "Python 3.11+", why: "Matches your existing core and the embedding/search ecosystem." },
    { layer: "Embeddings", choice: "sentence-transformers (local) OR OpenAI/Azure embeddings", why: "Local is free and keyless for learning; hosted is higher quality. Keep it swappable — the model choice drives dimensions." },
    { layer: "Vector DB", choice: "Qdrant or pgvector (local) — or Azure AI Search (managed)", why: "A real ANN index with metadata filtering and persistence; pick one and hide it behind your store interface." },
    { layer: "Keyword search", choice: "BM25 (rank-bm25) or the DB's full-text search", why: "Provides exact-term matching that semantic search misses; needed for hybrid." },
    { layer: "Reranker", choice: "A cross-encoder (sentence-transformers) — optional", why: "Reorders the top-k for precision; slower, so applied only to a small candidate set." },
    { layer: "Interface", choice: "CLI (typer) or a minimal web UI", why: "Enough to demo ranked results with sources; not the focus." },
  ],
  functionalRequirements: [
    "The ingestion pipeline loads a real corpus and splits documents into chunks with a configurable size and overlap.",
    "Each chunk stores its text, an embedding, and metadata (at least: source id, title/section, and one filterable field like date or tenant).",
    "Documents and queries are embedded with the SAME model; changing the model triggers a re-index, not a silent mismatch.",
    "Vectors and metadata are stored in a real vector database (not an in-memory list), and persist across restarts.",
    "A user can submit a natural-language query and get the top-k most relevant chunks with their source and score.",
    "Metadata filtering works: a query can be scoped (e.g. only one tenant, only recent docs) and the filter is applied server-side before/around vector search.",
    "Hybrid search blends semantic and keyword results via reciprocal-rank fusion; exact-identifier queries still surface literal matches.",
    "An optional reranking step reorders the top candidates for higher precision.",
    "The store is accessed through a stable interface so the backend can change without touching the query pipeline.",
    "The interface displays results with provenance (which document/section each passage came from).",
  ],
  nonFunctionalRequirements: [
    "Query latency stays interactive (target well under a second for top-k on your corpus size).",
    "Re-indexing is explicit and safe — changing the embedding model or chunker does not leave a mixed index.",
    "Metadata filters are enforced as a real constraint (a security-style boundary), not applied only after ranking.",
    "The ingestion pipeline is idempotent — re-running it does not create duplicate chunks.",
    "Retrieval quality is measured, not assumed — you can quantify improvements from tuning.",
    "Secrets/config (DB URL, API keys) come from the environment.",
  ],
  phases: [
    {
      name: "Evolve the store",
      intro: "Keep the interface, swap the backend.",
      tasks: [
        "Define/confirm the store interface (add, query) your core already uses.",
        "Implement a real vector-DB store behind that interface (Qdrant/pgvector/Azure AI Search).",
        "Migrate the in-memory pipeline to the new store with zero changes to the query code.",
      ],
    },
    {
      name: "Ingestion & metadata",
      tasks: [
        "Build the ingestion pipeline: load → clean → chunk (size + overlap) → embed → upsert.",
        "Attach metadata to every chunk (source, section, date, tenant) and make one field filterable.",
        "Make ingestion idempotent (stable chunk ids) so re-runs don't duplicate.",
      ],
    },
    {
      name: "Filtering & hybrid",
      tasks: [
        "Add metadata filtering to the query path and verify it constrains results correctly.",
        "Add keyword (BM25) search and fuse it with semantic results using reciprocal-rank fusion.",
        "Confirm exact-identifier queries now surface literal matches they previously missed.",
      ],
    },
    {
      name: "Reranking & tuning",
      tasks: [
        "Add an optional cross-encoder rerank over the top candidates.",
        "Tune chunk size/overlap and top-k against a small labelled query set.",
        "Measure precision@k / recall before and after each change.",
      ],
    },
    {
      name: "Interface & docs",
      tasks: [
        "Build the CLI/UI that shows ranked passages with source + score.",
        "Write the README: ingestion, config, how to swap the backend, quality numbers.",
        "Document the seam so P3 can plug a generator on top.",
      ],
    },
  ],
  checklist: [
    "Confirm the store interface from your semantic-search core",
    "Implement a real vector-DB store behind that interface",
    "Build the ingestion pipeline (load → clean → chunk → embed → upsert)",
    "Attach metadata and make one field filterable",
    "Make ingestion idempotent (stable chunk ids)",
    "Implement query embedding + top-k vector search",
    "Add metadata filtering to the query path",
    "Add BM25 keyword search",
    "Fuse semantic + keyword with reciprocal-rank fusion",
    "Add optional cross-encoder reranking",
    "Build a small labelled query set",
    "Measure precision@k / recall before and after tuning",
    "Build the CLI/UI with source + score",
    "Write the README and document the seam",
  ],
  projectStructure: `semantic-search-engine/
  src/
    ingest/
      loader.py       # read the corpus
      chunker.py      # size + overlap
      pipeline.py     # load -> chunk -> embed -> upsert
    core/
      embedder.py     # one model for docs + queries
      store.py        # VectorStore interface
      backends.py     # Qdrant / pgvector / Azure AI Search
      search.py       # vector + filter + hybrid + rerank
    app/
      cli.py          # or a small web UI
  eval/
    queries.jsonl     # labelled query -> relevant chunk(s)
    measure.py        # precision@k / recall
  README.md`,
  decisions: [
    {
      decision: "Chunk size and overlap",
      options: "Small chunks (precise, more of them) · large chunks (more context, coarser) · with/without overlap.",
      tradeoff: "Small chunks improve retrieval precision but can fragment meaning; large chunks keep context but dilute relevance and cost more. Overlap avoids splitting an answer across a boundary at the cost of duplication. Tune against your query set rather than guessing.",
    },
    {
      decision: "Semantic vs keyword vs hybrid",
      options: "Pure vector search · pure BM25 · hybrid fusion.",
      tradeoff: "Vector search captures meaning but misses exact identifiers; BM25 nails literals but misses paraphrase. Hybrid (RRF) usually wins overall but adds a second index and fusion logic. Start semantic, add hybrid once you see exact-match misses.",
    },
    {
      decision: "Which vector database",
      options: "pgvector (SQL-native) · Qdrant (purpose-built) · Azure AI Search (managed).",
      tradeoff: "pgvector reuses Postgres you may already run; Qdrant is fast and simple for pure vector work; Azure AI Search is managed with built-in hybrid + filtering (and teaches the Azure path). Hide the choice behind your store interface so it is reversible.",
    },
    {
      decision: "Rerank or not",
      options: "No rerank (fast) · cross-encoder rerank of top candidates.",
      tradeoff: "Reranking improves precision noticeably but adds latency and cost per query. Apply it only to the top-k candidates, and only if measurement shows it helps your corpus.",
    },
    {
      decision: "Metadata filter placement",
      options: "Pre-filter (constrain before/within vector search) · post-filter (rank then drop).",
      tradeoff: "Post-filtering can return too few results (you filtered away the top-k); pre-filtering is correct and, for tenancy, a security boundary. Prefer pre-filtering where the DB supports it.",
    },
  ],
  gotchas: [
    "Embedding docs and queries with different models — silently broken relevance; enforce one model.",
    "Changing the embedding model without re-indexing — same dimensions, different space = garbage results.",
    "Post-filtering that returns zero results because the filter dropped everything in the top-k — pre-filter instead.",
    "Chunk boundaries that cut an answer in half — use overlap or structure-aware splitting.",
    "Duplicated chunks from a non-idempotent ingest re-run — use stable chunk ids.",
    "Trusting a filter applied only client-side for tenant isolation — enforce it server-side.",
    "Benchmarking on a tiny corpus where everything looks fine — test at a realistic size.",
    "Assuming higher similarity means correct — measure precision/recall on labelled queries.",
    "Forgetting exact-identifier queries — pure semantic search will miss them without hybrid.",
  ],
  testing: {
    functional: [
      "Ingesting the corpus produces the expected number of chunks with metadata.",
      "A natural-language query returns relevant passages with sources and scores.",
      "A scoped query returns only results matching the metadata filter.",
      "An exact-identifier query surfaces the literal match (hybrid working).",
    ],
    edgeCases: [
      "Empty query, very long query, and a query with no relevant documents.",
      "A tenant/date filter that matches nothing returns a clean empty result, not an error.",
      "Re-running ingestion does not create duplicates.",
      "A document larger than the chunk size is split correctly.",
    ],
    failureModes: [
      "Vector DB unreachable → clear error, not a crash mid-query.",
      "Embedding service failure → surfaced, with the query not silently returning nothing.",
      "Model/dimension mismatch on query → detected and reported (re-index the corpus).",
    ],
    aiEvaluation: [
      "Precision@k and recall on a small labelled query set, before and after tuning.",
      "Hit-rate / MRR for 'is a relevant chunk in the top-k?'.",
      "Latency per query at your corpus size; measure the rerank cost separately.",
    ],
  },
  definitionOfDone: [
    "Ingestion loads a real corpus, chunks with metadata, and is idempotent.",
    "Vectors + metadata live in a real vector database and persist across restarts.",
    "Queries return ranked, source-attributed passages with interactive latency.",
    "Metadata filtering works and is enforced correctly (pre-filtered).",
    "Hybrid search surfaces both meaning matches and exact identifiers.",
    "Reranking is available and measured, not assumed.",
    "The backend sits behind a stable interface (proven by swapping or by design).",
    "Retrieval quality is quantified with precision@k / recall on a labelled set.",
    "README documents ingestion, config, backend swap and quality numbers.",
  ],
  expectedOutcome:
    "A working semantic search product over your own data, backed by real retrieval infrastructure — and the retrieval backbone that P3's RAG app plugs a generator on top of. You will have evolved an architecture behind a stable seam and learned to measure (not guess at) retrieval quality.",
  outcomeArtifacts: [
    "An ingestion pipeline over a real corpus",
    "A real vector-DB store behind a stable interface",
    "Metadata-filtered, hybrid, reranked search",
    "A labelled query set + precision/recall measurement",
    "A CLI or minimal UI showing sources and scores",
    "A README documenting the system and the seam",
    "A GitHub repository ready to show",
  ],
  stretchGoals: [
    "Integrated vectorization / managed ingestion on Azure AI Search.",
    "Query rewriting or multi-query expansion for recall.",
    "Incremental / streaming ingestion of new documents.",
    "A small web UI with highlighting of the matching passage.",
    "Caching of embeddings and frequent queries.",
    "Multi-tenant isolation with enforced server-side filters.",
  ],
  skillsDemonstrated: [
    "Retrieval infrastructure",
    "Vector databases & ANN search",
    "Hybrid search & reranking",
    "Metadata filtering",
    "Chunking & ingestion pipelines",
    "Retrieval-quality measurement",
    "Interface / seam design",
  ],
  portfolio:
    "This proves you can build **retrieval infrastructure**, not just call an embedding API — ingestion, a real vector DB, hybrid search, filtering, reranking, and measured quality. Reviewers see that you understand the difference between a toy similarity demo and a search system that stays correct and fast at scale, and that you can evolve an architecture without rebuilding it.",
};
