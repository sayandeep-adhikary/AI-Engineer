import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Local Embeddings & Rerankers" (topic-oss-embeddings-local).
// 3 units: 01 learn (open embeddings SBERT/BGE, cross-encoder rerankers, offline retrieval) ·
// 02 practice (embed locally) · 03 build (swap RAG to local embeddings + reranker).
// Verified against sentence-transformers docs (current): SentenceTransformer.encode (all-MiniLM
// = 384d), .similarity (cosine), encode_query/encode_document (query/doc prompts), CrossEncoder
// .rank/.predict for reranking. Deterministic keyless cosine + dimension-mismatch experiments.
// Reuses Batch 4 embeddings + Batch 6 RAG (VectorStore seam). Model ids hedged; outputs marked.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Back in the Embeddings and RAG categories you used a hosted embedding API. This unit closes the loop on 'fully local': open embedding models and rerankers that run on your machine, so your **entire retrieval stack** — embed, index, retrieve, rerank — has no external dependency. That's the last piece of a privacy-preserving, offline, cost-controlled RAG system. The judgment here is mostly about **compatibility**: an embedding space is only meaningful relative to the model that produced it, so swapping models has consequences most people learn the hard way.",
  },
  {
    type: "prose",
    md: "**Mental model: an embedding is only comparable to other embeddings from the same model — vectors from different models live in different, incompatible spaces.** Your vector index stores numbers a specific model produced. If you query it with vectors from a *different* model (even one with the same dimension), the geometry doesn't line up and retrieval silently degrades. If the dimensions differ, it fails outright. So 'change the embedding model' is never free: it means **re-embedding the whole corpus and rebuilding the index**. Everything in this topic follows from that one fact.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "sentence-transformers (SBERT)", definition: "The standard library for open embedding models. SentenceTransformer(model).encode(texts) → fixed-size vectors; .similarity(a, b) computes cosine. Models like all-MiniLM (384-dim) or BGE run offline." },
      { term: "Bi-encoder (embedding model)", definition: "Encodes each text independently into one vector; similarity is a fast vector comparison. Great for retrieving top-k from a large corpus, but coarser than a reranker." },
      { term: "Cross-encoder (reranker)", definition: "Takes a (query, document) PAIR and scores relevance directly — more accurate than a bi-encoder but far slower (one model pass per pair). Used to re-rank the bi-encoder's top-k." },
      { term: "Embedding dimension", definition: "The vector length a model outputs (e.g. 384, 768, 1024). The index is built for one dimension; a query vector of a different dimension can't be compared — a hard mismatch." },
      { term: "Normalization", definition: "Scaling a vector to unit length. On normalized vectors, dot product equals cosine similarity. Many models expect normalized embeddings; mixing normalized and raw skews scores." },
      { term: "Re-indexing", definition: "Re-embedding the whole corpus and rebuilding the vector index. Required whenever you change the embedding model (or its version), because old vectors are incompatible with the new query vectors." },
    ],
  },
  {
    type: "prose",
    md: "**Local embeddings in one breath.** Load a model, encode text to vectors, compare. The dimension is model-specific — check it, don't assume.",
  },
  {
    type: "code",
    language: "python",
    caption: "Local embeddings + reranker (model ids illustrative — check current models)",
    code: `from sentence_transformers import SentenceTransformer, CrossEncoder

# Bi-encoder: fast retrieval over a large corpus (all-MiniLM-L6-v2 outputs 384-dim vectors).
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print(embedder.get_sentence_embedding_dimension())        # 384  (know your dimension)
vecs = embedder.encode(["open models", "run locally"], normalize_embeddings=True)
print(vecs.shape)                                         # (2, 384)  representative shape

# Cross-encoder: re-rank the bi-encoder's top-k for accuracy (slower, per-pair).
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")
scores = reranker.predict([("what is a KV cache?", "The KV cache stores attention keys/values.")])
print(scores)                                            # representative relevance score(s)`,
  },
  {
    type: "prose",
    md: "The two-stage pattern is the point: a **bi-encoder retrieves** a cheap top-k from the whole corpus, then a **cross-encoder reranks** just those few pairs for accuracy. It's the same retrieve-then-rerank shape you met in the RAG/vector-DB categories — now running entirely on open models with no API.",
  },
  {
    type: "code",
    language: "python",
    caption: "Cosine ignores magnitude; normalized dot == cosine (deterministic, keyless)",
    code: `import numpy as np

def cosine(a, b):
    a, b = np.array(a, float), np.array(b, float)
    return round(float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b))), 3)

print(cosine([1, 0, 0], [2, 0, 0]))   # same direction, different magnitude
print(cosine([1, 1, 0], [1, 0, 0]))   # 45 degrees apart
print(cosine([1, 0, 0], [0, 1, 0]))   # orthogonal

def normalize(v):
    v = np.array(v, float); return v / np.linalg.norm(v)
a, b = normalize([3, 4]), normalize([4, 3])
print(round(float(a @ b), 3))          # dot of normalized vectors == cosine`,
    output: `1.0
0.707
0.0
0.96`,
  },
  {
    type: "prose",
    md: "Cosine sees **direction, not magnitude** (`[1,0,0]` vs `[2,0,0]` = 1.0), and on **normalized** vectors a plain dot product equals cosine (0.96). This is why models that emit normalized embeddings let you use fast dot-product search — but it's also why mixing normalized and un-normalized vectors, or two different models, corrupts your scores.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Dimension / model mismatch when swapping — the silent re-index trap",
    md: "The commonest way to break a local retrieval stack is to change the embedding model without re-indexing:\n\n- **Different dimension** (e.g. 384 → 768) → query vectors can't even be compared to the index → a hard error (best case — at least it's loud).\n- **Same dimension, different model** → the vectors *compare* but live in a **different space**, so retrieval silently returns worse results with no error. This is the dangerous one.\n- **Query encoded with a different model than the documents** → the same silent-mismatch failure, per query.\n- **Normalized vs raw mismatch** → scores skew.\n\nThe rule: **embed documents AND queries with the exact same model (and version), and re-embed the whole corpus whenever that model changes.** A model swap is a re-indexing project, not a config tweak."
  },
  {
    type: "code",
    language: "python",
    caption: "Index/query compatibility check (deterministic, keyless)",
    code: `# An index built from model A's vectors. A query must use a compatible (same) model.
index = {"doc1": [0.1, 0.2, 0.3]}          # 3-dim toy vectors produced by model A

def search(index, query_vec):
    dim = len(next(iter(index.values())))
    if len(query_vec) != dim:
        raise ValueError(f"dim mismatch: index={dim}, query={len(query_vec)} — re-index with the query model")
    return "searched"

print(search(index, [0.5, 0.6, 0.7]))       # same dimension -> ok
try:
    search(index, [0.5, 0.6, 0.7, 0.8])      # 4-dim query from a different model
except ValueError as e:
    print(e)`,
    output: `searched
dim mismatch: index=3, query=4 — re-index with the query model`,
  },
  {
    type: "callout",
    variant: "tip",
    title: "Choosing an open embedding model",
    md: "Pick by fit, not by leaderboard rank:\n\n- **Dimension** — higher can be more accurate but costs more storage and slower search; match it to your index and latency budget.\n- **Domain / language** — general vs domain-tuned; for non-English, use a **multilingual** model (an English-only model embeds other languages poorly).\n- **Query/document asymmetry** — many models (BGE-style) expect a query instruction/prefix or use `encode_query` / `encode_document`; using the wrong side hurts recall.\n- **Size vs quality** — a small model (e.g. MiniLM, 384-dim) is fast and often good enough; larger models improve hard retrieval at a cost.\n- **Normalization convention** — follow the model card (normalize if it says so).\n\nAnd remember: whatever you pick, you're committing your **whole corpus** to it until the next re-index."
  },
  {
    type: "quiz",
    question: "Two RAG systems index documents with embedding models of different dimensions (384 vs 768). Why can't they share an index, and what's the deeper principle?",
    choices: [
      "They can share it if you pad the shorter vectors with zeros",
      "Different-dimension vectors can't even be compared, and more fundamentally, vectors from different models live in DIFFERENT spaces — even at the same dimension the geometry wouldn't align. An index is only valid for the exact model that produced its vectors; using another model requires re-embedding the corpus",
      "They can share it because all embeddings are interchangeable",
      "Dimension never matters for retrieval",
    ],
    answerIndex: 1,
    explanation: "Mismatched dimensions are literally incomparable, but the deeper point is that each model defines its own embedding space, so even same-dimension vectors from different models don't align geometrically. An index is bound to the model that created it; switching models means re-embedding everything. Zero-padding doesn't reconcile two different spaces.",
  },
  {
    type: "quiz",
    question: "After swapping to a 'better' embedding model (same 768 dimension) without rebuilding the index, retrieval quality drops but there's no error. What happened?",
    choices: [
      "The new model is simply worse",
      "Queries are now encoded by the new model while the index still holds the old model's vectors — same dimension, but a different space, so comparisons are meaningless and quality silently degrades. Re-embed the whole corpus with the new model and rebuild the index so queries and documents share one space",
      "Embedding models never affect retrieval quality",
      "The vector database is corrupted",
    ],
    answerIndex: 1,
    explanation: "Matching dimensions let the comparison run without error, but the old index vectors and the new query vectors belong to different spaces, so similarity scores are meaningless and results quietly worsen. The fix is a full re-index with the new model so documents and queries are encoded consistently. The model isn't necessarily worse, and the DB isn't corrupted — the spaces just don't match.",
  },
  {
    type: "takeaways",
    items: [
      "sentence-transformers runs open embedding models locally: SentenceTransformer(model).encode(texts) → vectors, .similarity() → cosine; check .get_sentence_embedding_dimension().",
      "Two-stage retrieval: bi-encoder retrieves a cheap top-k over the corpus, cross-encoder reranks those few pairs for accuracy (slower, per-pair) — a fully local retrieve-then-rerank stack.",
      "Cosine sees direction not magnitude; on normalized vectors dot == cosine. Follow the model's normalization convention; don't mix normalized and raw.",
      "Vectors are only comparable within one model's space — embed documents AND queries with the SAME model/version; different dimension = hard error, same dimension different model = silent quality loss.",
      "Changing the embedding model = re-embedding the whole corpus and rebuilding the index (a re-indexing project), not a config tweak. Choose by dimension/language/asymmetry/size, not leaderboard.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Generate embeddings with a local model and confirm the dimension and compatibility rules by hand. With sentence-transformers installed, encode real text; without it, run the cosine and dimension-check experiments and reason about model choice — the compatibility judgment is what transfers.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Embed locally and verify compatibility (guided)",
    intro: "Know your dimension; prove the same-model rule.",
    steps: [
      { order: 1, action: "Load a small open embedding model, check its dimension, and encode a few sentences. Confirm the output vectors have the expected dimension. Compute cosine similarity between a related and an unrelated pair.", expected: "Vectors have the model's dimension; related sentences score higher than unrelated ones." },
      { order: 2, action: "Encode the SAME sentence with two different models (or reason about it). Compare the vectors — note they differ in dimension and/or values, so they're not interchangeable.", decision: "For YOUR corpus, which single model will you commit to — considering dimension, language, and size?" },
      { order: 3, action: "Run the compatibility check: try to 'search' an index built at one dimension with a query vector of another dimension, and confirm it fails. State what a model swap would require.", verify: "You embedded locally, confirmed the dimension, saw two models produce incompatible vectors, and can state the re-index rule." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You generated local embeddings and confirmed the expected dimension.",
      "You compared related vs unrelated cosine similarity.",
      "You saw that different models produce incompatible vectors (dimension and/or space).",
      "You can state what changing the embedding model requires (full re-index).",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Swap your RAG retrieval to a fully local stack** — local embeddings for retrieval plus a local cross-encoder reranker. The completion criterion: *RAG runs on a fully local retrieval stack.* This is the capstone of the category: it makes the RAG system you built earlier private, offline-capable, and free of per-token embedding cost, by replacing the hosted retrieval half with open models behind the same seams.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *your RAG runs on a fully local retrieval stack.* Reuse the retrieval architecture from earlier categories — the `SemanticSearchCore` / `VectorStore` seam (P2) and the RAG pipeline (P3) — and swap the embedding function to a local bi-encoder and add a local cross-encoder reranker. **Roadmap fit:** this unites Embeddings (Batch 4), Vector DBs / RAG (Batches 5-6), and this category's local-model skills into one fully-local retrieval stack. The pluggable `embed_fn` you designed for P2 pays off here — swapping to local embeddings is a one-function change. CRITICAL: re-index the corpus with the local model (its vectors are a different space from your old hosted ones)."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — fully local retrieval stack for RAG",
    intro: "Swap the retrieval half local; re-index. Acceptance defines done.",
    steps: [
      { order: 1, action: "Replace the embedding function with a local bi-encoder (sentence-transformers). Re-embed the WHOLE corpus with it and rebuild the index — don't reuse vectors from a different (hosted) model.", decision: "Which local embedding model fits your corpus (dimension, language, size), and did you re-index everything with it?" },
      { order: 2, action: "Add a local cross-encoder reranker: retrieve top-k with the bi-encoder, then rerank those pairs and take the top-n for the generation context. Keep the same VectorStore/retrieval seam so only the models changed.", expected: "Retrieval returns relevant chunks reranked locally; the rest of the RAG pipeline is unchanged." },
      { order: 3, action: "Confirm 'fully local': no network calls in the retrieval path. Ensure query and documents use the same embedding model, and handle the empty/low-score case gracefully.", verify: "RAG retrieval runs entirely on local open models (embed + rerank), the corpus was re-indexed with the local model, and query/document models match." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Retrieval embeds with a local bi-encoder and reranks with a local cross-encoder (no hosted API).",
      "The whole corpus re-indexed with the local model; query and documents use the SAME model.",
      "Same VectorStore/retrieval seam reused — only the embedding/rerank models changed.",
      "No network calls in the retrieval path; empty/low-score results handled gracefully.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — local embed + rerank behind the existing retrieval seam (structure)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from sentence_transformers import SentenceTransformer, CrossEncoder

# Swap ONLY the models behind the seams you already built (P2 embed_fn + VectorStore, P3 RAG).
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")   # local bi-encoder
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")            # local reranker

def local_embed(texts):
    # Plug into P2's pluggable embed_fn. RE-INDEX the whole corpus with THIS function.
    return embedder.encode(texts, normalize_embeddings=True)

def retrieve_rerank(query, store, k=20, n=4):
    q = local_embed([query])[0]
    candidates = store.query(q, k)                 # bi-encoder top-k from the SAME-model index
    if not candidates:
        return []                                  # handle empty retrieval gracefully
    pairs = [(query, c.text) for c in candidates]
    scores = reranker.predict(pairs)               # cross-encoder scores each pair (local)
    ranked = sorted(zip(candidates, scores), key=lambda cs: cs[1], reverse=True)
    return [c for c, _ in ranked[:n]]              # top-n reranked chunks for the RAG context
# Generation, citations, and the rest of the RAG pipeline stay exactly as before.`,
  },
];

export const content: TopicContent = {
  "unit-oss-embeddings-local-01": learn,
  "unit-oss-embeddings-local-02": practice,
  "unit-oss-embeddings-local-03": build,
};
