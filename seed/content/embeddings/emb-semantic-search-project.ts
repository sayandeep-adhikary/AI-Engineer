import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Semantic Search System" (topic-emb-semantic-search-project).
// 3 units: 01 build (the capstone -> produces artifact "semantic-search-core"),
// 02 review (tune + troubleshoot), 03 project (package + hand off to Project P2).
// The core is designed so Project P2 can EVOLVE it without a rebuild:
//   p2-01 import-and-run · p2-02 swap store for a vector DB · p2-03 metadata filtering
//   · p2-04 hybrid + rerank · p2-05 docs.
// => pluggable embed_fn, separated store, chunks carrying doc/chunk id + metadata,
//    separable ranking. A keyless TOY embedder makes the whole pipeline runnable now.

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "This is the category capstone: assemble everything — chunking, embedding, storage, similarity, ranking — into one working **semantic search system**, and package it as a reusable core. The deliverable, `semantic-search-core`, is the *starting point for Project P2*, so you'll design it not just to work, but to be *evolved*: its storage swapped for a real vector database, metadata filtering added, and hybrid/reranking layered on — all without rebuilding the pipeline.",
  },
  {
    type: "prose",
    md: "**Mental model: semantic search is a pipeline with clean seams.** Documents flow through **load → clean → chunk → embed → store**, and a query flows through **embed → score against stored vectors → rank → take top-k → return sources+metadata**. The whole system's job is to answer 'which stored passages are most relevant to this query?' and hand those passages back with enough context to *use* and *cite* them. Everything you learned in this category is one stage of this pipeline; the skill now is composing them behind an interface that won't need tearing down when requirements grow.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Semantic search core", definition: "The reusable object that ingests documents (chunk+embed+store) and answers queries (embed+rank+top-k). The artifact this project produces." },
      { term: "Pluggable embedder (embed_fn)", definition: "A function texts→vectors passed IN, so the core doesn't hardcode a provider. Swap OpenAI, Azure, or a local model without touching search logic." },
      { term: "Store (separated)", definition: "Where chunk records + vectors live. Kept behind a small interface so an in-memory list can later be replaced by a vector database." },
      { term: "SearchResult", definition: "A ranked hit carrying chunk_id, doc_id, text, metadata, and score — enough to display, cite, and (later) filter." },
      { term: "Retrieved context", definition: "The top-k passages returned. In a full RAG system a later generation step consumes them — but that generation step is NOT part of this core." },
    ],
  },
  {
    type: "prose",
    md: "**Design for evolution — the seams that matter for Project P2:**\n\n- **Pluggable `embed_fn`** (texts→vectors): keeps the core provider-agnostic and preserves the same-model invariant (documents and queries go through the *same* passed-in function).\n- **Separated store**: keep the chunk records behind a thin boundary so P2 can replace the in-memory list with a vector DB without changing `add_documents`/`search` callers.\n- **Chunks carry `chunk_id`, `doc_id`, and `metadata`**: this is what makes P2's *metadata filtering* possible later — the fields already exist.\n- **Ranking is a separable step**: scoring and sorting are isolated so P2 can insert hybrid search / reranking around it.\n\nBuild it plainly now, but put those seams in — that's the difference between a demo and a foundation.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Runnable WITHOUT an API key — a toy embedder stands in",
    md: "So you can run the *whole pipeline* today, the reference includes a deterministic **toy embedder** (a hashing bag-of-words). It is *lexical, not semantic* — it matches shared words, not meaning — but it makes the structure execute and rank end-to-end with zero setup. **Swap it for a real embedding model (`embed_fn`) to get true semantic search.** The point of the toy is to validate the *plumbing*; the point of `embed_fn` being pluggable is that upgrading to real semantics is a one-line change.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — build the semantic search core",
    intro: "Acceptance defines done. Design the class/interface yourself, then compare to the reference.",
    steps: [
      { order: 1, action: "Provide add_documents(docs) that chunks each doc, batch-embeds the chunks via the pluggable embed_fn, and stores chunk records (chunk_id, doc_id, text, metadata, vector). Provide search(query, k) that embeds the query with the SAME embed_fn, scores every chunk by cosine, ranks, and returns the top-k as SearchResults with source text + metadata + score.", decision: "Which parts must stay decoupled so Project P2 can (a) swap the store for a vector DB, (b) add metadata filtering, and (c) add reranking — WITHOUT rebuilding the pipeline?" },
      { order: 2, action: "Handle real-world edges: empty corpus → search returns []; k larger than corpus → all results ranked; chunks whose embedding failed are skipped (no crash, no silent wrong ranking); adding documents is incremental (call add_documents again to grow the index).", expected: "The core ingests documents, answers queries with ranked sources, and degrades gracefully on empty/oversized-k/failed-embedding cases." },
      { order: 3, action: "Make it genuinely runnable: wire the toy embedder, ingest a few short documents, run a query, and confirm the most relevant chunk ranks first with its metadata attached. Then show where a real OpenAI/Azure embed_fn would plug in.", verify: "One object exposes add_documents + search; ingest→query works end-to-end with the toy embedder; results carry source+metadata+score; the embedder is swappable; the store, filtering hooks, and ranking are separable for P2." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "add_documents chunks → batch-embeds (pluggable embed_fn) → stores chunk records with chunk_id/doc_id/text/metadata/vector.",
      "search embeds the query with the SAME embed_fn, ranks all chunks by cosine, returns top-k SearchResults (text+metadata+score).",
      "Edges handled: empty corpus, k>corpus, failed/missing embeddings, incremental adds.",
      "Runs keyless via the toy embedder; embed_fn, store, and ranking are separable for P2 evolution.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — SemanticSearchCore (runs keyless via toy embedder)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import hashlib
from dataclasses import dataclass, field
import numpy as np

def cosine(a, b) -> float:
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = np.linalg.norm(a) * np.linalg.norm(b)
    return float(a @ b / d) if d else 0.0

# --- toy embedder: LEXICAL, deterministic, keyless. Swap for a real model. ---
def toy_embed(texts: list[str], dim: int = 64) -> list[list[float]]:
    out = []
    for t in texts:
        v = [0.0] * dim
        for tok in t.lower().split():
            h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
            v[h % dim] += 1.0
        out.append(v)
    return out

@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    text: str
    metadata: dict
    vector: list[float] | None = None

@dataclass
class SearchResult:
    chunk_id: str
    doc_id: str
    text: str
    metadata: dict
    score: float

def default_chunker(text: str, size: int = 40) -> list[str]:
    words = text.split()
    return [" ".join(words[i:i+size]) for i in range(0, len(words), size)] or [""]

class SemanticSearchCore:
    def __init__(self, embed_fn, chunker=default_chunker):
        self.embed_fn = embed_fn          # texts->vectors (pluggable: toy / OpenAI / local)
        self.chunker = chunker
        self._chunks: list[Chunk] = []    # in-memory store (P2 swaps this for a vector DB)

    def add_documents(self, docs: list[dict]) -> None:
        # docs: [{"id","text","metadata"}] -> chunk -> batch-embed -> store
        new = [Chunk(f'{d["id"]}::{i}', d["id"], piece, d.get("metadata", {}))
               for d in docs
               for i, piece in enumerate(self.chunker(d["text"])) if piece.strip()]
        if not new:
            return
        vectors = self.embed_fn([c.text for c in new])   # SAME embedder as queries
        for c, v in zip(new, vectors):
            c.vector = v
        self._chunks.extend(new)

    def search(self, query: str, k: int = 5) -> list[SearchResult]:
        if not self._chunks:
            return []
        qv = self.embed_fn([query])[0]
        scored = [(c, cosine(qv, c.vector)) for c in self._chunks if c.vector is not None]
        scored.sort(key=lambda cs: cs[1], reverse=True)   # ranking = a separable step
        return [SearchResult(c.chunk_id, c.doc_id, c.text, c.metadata, round(s, 4))
                for c, s in scored[:k]]

# --- run it, no API key needed ---
core = SemanticSearchCore(embed_fn=toy_embed)
core.add_documents([
    {"id": "faq1", "text": "Reset your password from the account settings page.",
     "metadata": {"source": "faq"}},
    {"id": "faq2", "text": "Our office is open Monday to Friday.",
     "metadata": {"source": "faq"}},
])
for r in core.search("how do I change my password", k=2):
    print(r.doc_id, r.score, r.metadata)

# To use REAL semantics, pass a provider-backed embed_fn instead of toy_embed:
#   def openai_embed(texts):
#       resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
#       return [d.embedding for d in resp.data]
#   core = SemanticSearchCore(embed_fn=openai_embed)`,
  },
  {
    type: "callout",
    variant: "tip",
    title: "This core RETRIEVES context — it does not generate answers",
    md: "Semantic search ends at 'here are the top-k relevant passages, with sources and metadata'. Feeding those passages to an LLM to *write an answer* (retrieval-augmented generation), scaling the store to millions of vectors with a real vector database, hybrid keyword+vector search, and reranking are all **later topics/projects** — this core is precisely the piece they build on. Keep it focused: retrieve well, return sources, and expose the seams. That focus is what makes it a clean handoff to Project P2.",
  },
  {
    type: "takeaways",
    items: [
      "The core composes chunk→embed→store and embed→rank→top-k behind add_documents/search.",
      "Design for evolution: pluggable embed_fn (same model for docs+queries), separated store, chunks carrying doc/chunk id + metadata, separable ranking.",
      "Results return source text + metadata + score — enough to display, cite, and later filter.",
      "A keyless toy embedder validates the plumbing; a real embed_fn swaps in for true semantics with one line.",
      "It RETRIEVES context only — generation, vector DBs, hybrid, and reranking are later work that builds on this core.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A working pipeline isn't a *good* one until you tune it and can diagnose failures. Retrieval quality is judged by eye against real queries — there's no single number here (formal evaluation is a later topic).",
  },
  {
    type: "prose",
    md: "**Tuning knobs, and what each trades:** chunk **size/overlap/strategy** (precision vs recall vs context — from the chunking topic), the **metric** (cosine by default; confirm normalization), **top-k** (more recall vs more noise), and the **embedding model** (better semantics vs cost/latency, and a change forces a full re-embed). Change *one* knob, re-run the same test queries, and compare — never tune multiple things blindly at once.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — search returns nonsense / irrelevant results for everything",
    md: "**Evidence to gather (in order):** Are documents actually in the store (did `add_documents` run and embed succeed)? Are query and documents embedded by the **same** embed_fn/model? Did you embed the **content** (not metadata/IDs/boilerplate)? Is the **metric** right and are vectors the length you expect? Print one query vector, one doc vector, and their cosine by hand. **Diagnosis** usually lands on: empty/partial store, mismatched embedders, embedding the wrong string, or a metric/normalization bug — the same failure modes from the earlier topics, now composed. Fix the specific cause; don't randomly swap models hoping it helps.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — newly added documents are never retrieved",
    md: "You call `add_documents` with fresh docs but they never appear in results. **Evidence:** did `add_documents` actually run for them and did their embeddings **succeed** (or were they silently skipped as failed)? Do the new chunks have vectors, or `None`? Are they embedded with the **same** model as the query (a mid-project model change would strand them in a different space)? Was the chunker fed empty/whitespace text so it produced no chunks? **Diagnosis:** missing/failed vectors, a model mismatch, or zero chunks — not the ranking. **Fix:** ensure embeddings succeed and are stored, keep one consistent model, and verify chunks were produced.",
  },
  {
    type: "quiz",
    question: "Raising top-k from 3 to 10 surfaces some clearly irrelevant passages in positions 4–10, while positions 1–3 are unchanged. Is retrieval broken?",
    choices: [
      "Yes — irrelevant results mean the system is broken",
      "No — top-k only controls how many ranked results you return; the top items are unchanged, and larger k necessarily includes lower-scored, more marginal passages. It's the recall/noise trade, and it argues for a smaller k or a relevance cutoff, not a rebuild",
      "Yes — you must always return all results",
      "No — top-k changes the scores, so this is expected",
    ],
    answerIndex: 1,
    explanation: "top-k is a cutoff on a fixed ranking; it doesn't change scores or the best hits. A bigger k exposes weaker matches — expected behaviour, the recall-vs-noise trade-off. The response is to tune k or add a relevance threshold, not to conclude the system is broken.",
  },
  {
    type: "quiz",
    question: "After swapping to a better embedding model to improve quality, ALL searches suddenly return irrelevant results. What almost certainly happened?",
    choices: [
      "The new model is worse",
      "The documents were embedded with the OLD model but queries now use the NEW model, so they live in different spaces — you must re-embed the entire corpus with the new model to restore one shared space",
      "top-k is too high",
      "The chunker broke",
    ],
    answerIndex: 1,
    explanation: "Changing the embedding model invalidates existing document vectors: new-model queries and old-model documents occupy incompatible spaces, so every result is noise. The fix is to re-embed the whole corpus with the new model so documents and queries share one space again.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — tune and defend.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Improve retrieval on a test set and justify each change",
    intro: "Treat tuning as controlled experiments.",
    steps: [
      { order: 1, action: "Write 5 test queries with the passage you EXPECT each to retrieve. Run them against your core and note which succeed.", expected: "A concrete, repeatable before-state: N/5 queries retrieve the intended passage in the top-k." },
      { order: 2, action: "Change ONE knob (e.g. smaller chunks, add overlap, adjust k) and re-run the SAME queries. Record the effect.", decision: "Why change only one variable at a time, and how do you know an improvement isn't just luck on these 5 queries?" },
      { order: 3, action: "Pick your best configuration and justify it against the trade-offs (precision/recall/context/cost). State one failure your test set does NOT cover.", verify: "You measured before/after on fixed queries, isolated single changes, chose a justified config, and acknowledged the limits of eyeballing a small test set." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "You built a fixed test set (queries + expected passages) and measured before/after.",
      "You changed one knob at a time and recorded effects.",
      "You justified a final configuration via the trade-offs.",
      "You can diagnose 'nonsense results' and 'new docs never retrieved' to specific causes.",
    ],
  },
];

const project: ContentBlock[] = [
  {
    type: "prose",
    md: "Final step: **package `semantic-search-core` as a clean, documented artifact and hand it off to Project P2.** P2 doesn't rebuild it — it *imports and extends* it: swapping the in-memory store for a real vector database, adding metadata filtering, then hybrid search and reranking. Your job is to make that handoff frictionless: a stable interface, honest documentation of its seams, and a runnable example.",
  },
  {
    type: "prose",
    md: "**The artifact contract — what P2 will rely on:**\n\n- **Import-and-run**: P2 starts by using your core as-is (`add_documents`, `search`) with a real `embed_fn`. So the public interface must be stable and documented.\n- **Swappable store**: the in-memory chunk store must be replaceable with a vector database *without changing callers* — so document where the store boundary is.\n- **Metadata filtering hook**: chunks already carry `metadata`; note where a `where`/filter argument would slot into `search` so P2 can filter by source/date/etc.\n- **Separable ranking**: scoring/sorting is isolated so P2 can add reranking / hybrid (keyword+vector) around it.\n\nDocument these explicitly — the seams are the deliverable as much as the code.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Package and document the handoff",
    intro: "Make the core something another project can pick up cold.",
    steps: [
      { order: 1, action: "Write a short README for the core: what it does (retrieve top-k relevant passages with sources), the public interface (add_documents, search, the embed_fn contract), and a runnable keyless example (toy embedder) plus the real-embedder swap.", decision: "What must the README say about the SAME-model rule and re-embedding so a future maintainer doesn't strand vectors in two spaces?" },
      { order: 2, action: "Document the EXTENSION POINTS P2 needs: where to swap the store for a vector DB, where metadata filtering plugs into search, and where reranking/hybrid would wrap the ranking step. Note what stays stable (the add_documents/search signatures).", expected: "A future developer can locate each seam and understand what changes vs. what stays." },
      { order: 3, action: "State the boundary explicitly: this core RETRIEVES context and returns sources+metadata; it does NOT generate answers, scale to millions of vectors, or do hybrid/rerank — those are P2 and later. Confirm the example runs end-to-end.", verify: "The core is importable, documented (interface + seams + same-model rule + scope boundary), runs keyless, and is ready for P2 to evolve without a rebuild." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — semantic-search-core ready for P2",
    items: [
      "Stable, documented public interface (add_documents, search, embed_fn contract) with a runnable keyless example.",
      "Extension points documented: swappable store (→ vector DB), metadata-filter hook in search, separable ranking (→ hybrid/rerank).",
      "Same-model rule and re-embed-on-model-change are written down for maintainers.",
      "Scope boundary stated: retrieves context + returns sources; does NOT generate, scale, or rerank (that's P2+).",
    ],
  },
  {
    type: "prose",
    md: "**Mastery challenge — explain the whole pipeline end-to-end.** Without looking at the code, narrate what happens to a document from ingestion to retrieval, and to a query from text to ranked results — naming every stage (load→clean→chunk→embed→store; embed→score→rank→top-k→return sources) and, for each, one thing that goes wrong if you get it wrong. If you can teach the pipeline *and* its failure modes, you own this category.",
  },
  {
    type: "takeaways",
    items: [
      "Package the core with a stable, documented interface and a runnable keyless example.",
      "Document the seams P2 evolves: swappable store, metadata-filter hook, separable ranking — plus the same-model rule.",
      "State the scope boundary: retrieve context + return sources; generation, scaling, hybrid, and rerank are later.",
      "The artifact `semantic-search-core` is import-and-run for Project P2, not a rebuild.",
      "Mastery = narrate the full pipeline and each stage's failure mode from memory.",
    ],
  },
];

export const content: TopicContent = {
  "unit-emb-semantic-search-project-01": build,
  "unit-emb-semantic-search-project-02": review,
  "unit-emb-semantic-search-project-03": project,
};
