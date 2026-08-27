import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Similarity & Semantic Comparison" (topic-emb-similarity).
// 4 units: 01 learn (metrics + worked math) · 02 practice (compare pairs) · 03 build
// (in-memory top-k search) · 04 review (analyze rankings + troubleshoot + mastery).
// All cosine numbers are computed exactly with tiny hand-made vectors (verifiable),
// so no fabricated model output. Reuses the numpy cosine idea from py-data-libs.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Retrieval is, at its core, one operation: **rank items by how similar their vectors are to the query's vector.** This unit makes vector similarity intuitive and exact — starting with tiny 2-D vectors you can verify by hand, then scaling the *idea* (not the visualisation) to the thousand-dimensional embeddings from the last topic. Get the metric right and search works; get it subtly wrong and everything looks similar.",
  },
  {
    type: "prose",
    md: "**Mental model: similarity is about the *direction* two vectors point, and distance is about how far apart they are.** For embeddings we almost always care about direction — two texts are 'similar' if their vectors point the same way — which is exactly what **cosine similarity** measures. Distance metrics (like Euclidean) measure separation, which also mixes in magnitude. Since embedding meaning lives mostly in *direction*, cosine is the workhorse; but you must know the difference to avoid the classic bugs.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Cosine similarity", definition: "cos(θ) = (A·B) / (‖A‖‖B‖). The cosine of the angle between two vectors: +1 same direction, 0 orthogonal, −1 opposite. Scale-invariant." },
      { term: "Dot product (A·B)", definition: "Sum of element-wise products. On UNIT-length vectors, dot product == cosine; on non-normalized vectors it also rewards magnitude." },
      { term: "Euclidean distance", definition: "Straight-line distance ‖A−B‖. Smaller = closer. Sensitive to magnitude; a distance, not a similarity." },
      { term: "Normalized (unit) vector", definition: "A vector scaled to length 1. If your embeddings are unit-normalized, cosine and dot product rank identically." },
      { term: "Top-k", definition: "Return the k highest-similarity items. k is the retrieval knob that trades completeness (recall) against noise (precision)." },
    ],
  },
  {
    type: "prose",
    md: "**Cosine, worked by hand.** The formula is `cos(θ) = (A·B) / (‖A‖·‖B‖)`. Start with 2-D vectors you can picture:\n\n- **Same direction** `A=[1,0]`, `B=[1,0]`: `A·B = 1`, `‖A‖=‖B‖=1` → `cos = 1/1 = 1.0`.\n- **Orthogonal** `A=[1,0]`, `B=[0,1]`: `A·B = 0` → `cos = 0.0`.\n- **Opposite** `A=[1,0]`, `B=[-1,0]`: `A·B = -1` → `cos = -1.0`.\n- **Partial** `A=[2,1]`, `B=[1,2]`: `A·B = 2+2 = 4`, `‖A‖=‖B‖=√5` → `cos = 4/5 = 0.8`.\n\nThat's the whole intuition: **aligned → 1, perpendicular → 0, opposite → −1.** Verify it in code:",
  },
  {
    type: "code",
    language: "python",
    caption: "Cosine similarity — exact, verifiable",
    code: `import numpy as np

def cosine(a, b) -> float:
    a, b = np.asarray(a, float), np.asarray(b, float)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print(round(cosine([1, 0], [1, 0]), 3))    # same direction
print(round(cosine([1, 0], [0, 1]), 3))    # orthogonal
print(round(cosine([1, 0], [-1, 0]), 3))   # opposite
print(round(cosine([2, 1], [1, 2]), 3))    # partial overlap`,
    output: `1.0
0.0
-1.0
0.8`,
  },
  {
    type: "prose",
    md: "Nothing changes conceptually at 1536 dimensions — you just can't *draw* it. The angle between two vectors is still well-defined, and cosine still returns +1…−1. **Don't try to visualise hundreds of dimensions**; trust the algebra. Ranking works by computing this score between the query vector and every document vector, then sorting.",
  },
  {
    type: "code",
    language: "python",
    caption: "Ranking by similarity — the core retrieval operation",
    code: `query = [1, 1, 0]
docs = {"d1": [1, 1, 0],    # same direction as query
        "d2": [1, 0, 0],    # partial
        "d3": [0, 0, 1]}    # orthogonal

ranked = sorted(docs.items(), key=lambda kv: cosine(query, kv[1]), reverse=True)
for doc_id, v in ranked:
    print(doc_id, round(cosine(query, v), 3))`,
    output: `d1 1.0
d2 0.707
d3 0.0`,
  },
  {
    type: "prose",
    md: "Change the query and the ranking changes — that *is* semantic search in miniature. `d1` points exactly along the query (score 1.0), `d2` is partly aligned (0.707), `d3` is orthogonal (0.0). Real search replaces these toy vectors with embeddings, but the operation is identical: score against the query, sort, take the top-k.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "A similarity score is NOT a probability — and there's no universal 'good' threshold",
    md: "Two traps that ship bad search:\n\n1. **Score ≠ probability.** A cosine of `0.82` does **not** mean '82% relevant' or '82% confident'. It's the cosine of an angle in a model-specific space — an *ordering* signal, not a calibrated probability. Don't multiply it, average it as a percentage, or show it as confidence.\n2. **No universal threshold.** '0.8 means similar' is false in general. What counts as 'relevant enough' depends on the *embedding model* (different models produce different score distributions), the *task*, and your data. On one model 0.45 is a strong match; on another 0.8 is mediocre. **Calibrate thresholds empirically per model+task** — look at real results and pick a cutoff that separates good from bad *for you*. Ranking (top-k) is usually more robust than absolute thresholds.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Wrong metric / wrong normalization assumption = silently wrong ranking",
    md: "If your vectors are **not** unit-normalized and you rank by raw **dot product**, longer vectors get an unfair boost — a document can rank high for having a big-magnitude vector, not for being relevant. Cosine avoids this by dividing out magnitude (scale-invariant). Conversely, if your vectors *are* already unit-length, dot product and cosine agree (and dot is a hair faster). The bug is a **mismatch**: assuming normalization you don't have, or picking Euclidean when you meant angular similarity. Default to cosine unless you've confirmed your vectors are unit-length and you want the speed of dot.",
  },
  {
    type: "quiz",
    question: "Two documents have the same keywords but opposite meanings (e.g. 'the drug is safe' vs 'the drug is not safe'), and naïve keyword similarity rates them nearly identical. Why can embeddings do better — and why might they still sometimes struggle?",
    choices: [
      "Embeddings only look at keywords too",
      "Embeddings encode meaning/usage, so negation and opposite sense can push the vectors apart — though subtle negation is genuinely hard, so this isn't guaranteed; you verify empirically",
      "Embeddings always perfectly capture negation",
      "You should just use keyword matching",
    ],
    answerIndex: 1,
    explanation: "Because embeddings represent meaning, opposite-sense sentences can separate where keyword overlap can't distinguish them. But negation/subtle sense is a known hard case, so 'better' isn't 'perfect' — validate on your data rather than assuming embeddings always resolve it.",
  },
  {
    type: "quiz",
    question: "A similarity score of 0.82 is observed for a retrieved document. Can you automatically conclude the document is relevant?",
    choices: [
      "Yes — 0.8+ always means relevant",
      "No — the score is a model- and task-specific ordering signal, not a probability or a universal relevance threshold; you must calibrate what 'relevant' means for your model/task/data (and ranking often beats absolute cutoffs)",
      "Yes, if you're using cosine",
      "No — 0.82 is always too low",
    ],
    answerIndex: 1,
    explanation: "Scores aren't calibrated probabilities and thresholds aren't portable across models/tasks. 0.82 might be excellent or mediocre depending on the embedding model's score distribution and your relevance bar. Calibrate empirically; prefer top-k ranking over hard universal thresholds.",
  },
  {
    type: "takeaways",
    items: [
      "Cosine = (A·B)/(‖A‖‖B‖): +1 aligned, 0 orthogonal, −1 opposite; scale-invariant and the default for embeddings.",
      "Ranking = score the query against every vector, sort, take top-k. Toy vectors and 1536-dim embeddings use the identical operation.",
      "Dot product == cosine only on unit-normalized vectors; on non-normalized vectors dot rewards magnitude (a bug source).",
      "Similarity is NOT a probability, and there is NO universal threshold — calibrate per model+task; prefer ranking.",
      "Pick cosine unless you've confirmed unit-length vectors; a metric/normalization mismatch silently corrupts ranking.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Compute and compare similarities until the metric is second nature. Use tiny vectors for exactness, then (optionally) real embeddings for meaning.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Compare pairs and predict, then verify (guided)",
    intro: "Build intuition with hand-checkable vectors.",
    steps: [
      { order: 1, action: "Using the `cosine` function, compute similarity for these pairs and PREDICT each before running: [1,2,3]&[2,4,6]; [1,0,0]&[0,1,0]; [1,1]&[-1,-1].", expected: "[1,2,3]&[2,4,6] → 1.0 (same direction, just scaled — proving cosine ignores magnitude); [1,0,0]&[0,1,0] → 0.0; [1,1]&[-1,-1] → -1.0." },
      { order: 2, action: "Explain WHY [1,2,3] and [2,4,6] score exactly 1.0 despite different magnitudes.", decision: "What does that tell you about why cosine is preferred when vectors aren't normalized?" },
      { order: 3, action: "(Optional, needs embeddings) Embed 'a happy dog', 'a joyful puppy', 'a tax audit'; confirm the first two are far more similar than either is to the third.", verify: "Your predictions matched; you can articulate that scaling a vector doesn't change its cosine similarity." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You predicted then confirmed cosine values including a scaled pair scoring 1.0.",
      "You can explain why cosine ignores magnitude (direction-only).",
      "You know 0 = orthogonal and −1 = opposite.",
      "(If run) real embeddings ranked the semantically-similar pair above the unrelated one.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a small in-memory top-k semantic search** — the deliverable. Given a set of embedded items and a query vector, return the k most similar, ranked. This is brute-force nearest-neighbour (fine for small corpora; the vector-database category scales it later).",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — search(query_vector, k) over stored vectors",
    intro: "Acceptance defines done; implement it yourself.",
    steps: [
      { order: 1, action: "Given a list of records {id, vector, text, metadata} (from the previous topic) and a query vector, compute cosine similarity to every record and return the top-k, each with its score and source text/metadata.", decision: "What must be true about the query vector relative to the stored vectors for the scores to be meaningful? (Same model/space, same dimensionality.)" },
      { order: 2, action: "Make k configurable and handle edge cases: an empty store returns []; a k larger than the corpus returns everything (ranked); records missing a vector are skipped, not crashed on.", expected: "search returns up to k ranked SearchResults with scores; empty/oversized-k/missing-vector cases are handled gracefully." },
      { order: 3, action: "Return enough to be useful: the source text and metadata (doc id, source), not just an id and a number — so a caller can show WHAT matched and WHERE it came from.", verify: "Changing the query changes the ranking sensibly; results carry source+metadata; edge cases don't crash." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Cosine similarity is computed against every stored vector; results are sorted descending and truncated to k.",
      "k is configurable; empty store → []; k > corpus → all ranked; missing vectors skipped.",
      "Each result includes score + source text + metadata (not just id).",
      "Query and stored vectors are from the same model/space (same dimensionality).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — brute-force top-k search",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import numpy as np

def cosine(a, b) -> float:
    a, b = np.asarray(a, float), np.asarray(b, float)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(a @ b / denom) if denom else 0.0

def search(store: list[dict], query_vector: list[float], k: int = 5) -> list[dict]:
    if not store:
        return []
    scored = [
        {"id": r["id"], "score": round(cosine(query_vector, r["vector"]), 4),
         "text": r["text"], "metadata": r.get("metadata", {})}
        for r in store if r.get("vector") is not None
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:k]`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Ranking is only trustworthy if you can explain it — and diagnose it when it goes wrong. Analyse behaviour, then a classic failure.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — 'every pair has similarity ≈ 1.0'",
    md: "Your search reports near-perfect similarity between essentially everything, so ranking is meaningless. **Evidence** to gather: are you accidentally comparing vectors to *themselves* (query included in the corpus)? Did you **embed the same string** for many records (e.g. the boilerplate/metadata bug from the generating topic)? Is there a **normalization/implementation bug** making all vectors point the same way (e.g. summing into the same bucket)? **Diagnosis:** print a few raw vectors and a few pairwise scores by hand — if distinct texts have identical vectors, it's an embedding-input bug; if vectors differ but cosine is always ~1, it's a metric/implementation bug. **Fix** the actual cause (embed real content; correct the metric). Uniform ~1.0 is almost never 'the documents really are all identical'.",
  },
  {
    type: "quiz",
    question: "Your in-memory search returns cosine ≈ 1.0 for nearly all query/document pairs. Which is the LEAST likely explanation to check?",
    choices: [
      "You embedded the same boilerplate/metadata string for many records, so their vectors are identical",
      "A normalization/implementation bug makes vectors collapse toward one direction",
      "The documents genuinely are all near-duplicates in meaning",
      "The embedding model is simply very accurate, so real diverse texts correctly score ~1.0",
    ],
    answerIndex: 3,
    explanation: "A good model does NOT map diverse texts to ~1.0 similarity — that's the giveaway of a bug, not accuracy. Realistic causes are embedding identical strings, comparing vectors to themselves, or a metric/normalization bug. 'The model is just accurate' is the wrong conclusion.",
  },
  {
    type: "quiz",
    question: "You change top-k from 3 to 20 and the results 'change dramatically'. What does top-k actually control, and is this alarming?",
    choices: [
      "top-k changes the similarity scores themselves; something is broken",
      "top-k only controls HOW MANY of the already-ranked results you return; a larger k appends lower-ranked (often less relevant) items — the top items are unchanged, so seeing more marginal results is expected, not a bug",
      "top-k re-embeds the corpus each time",
      "top-k should never change the results",
    ],
    answerIndex: 1,
    explanation: "top-k is just the cutoff on a fixed ranking. Raising it doesn't alter scores or the top items — it exposes more lower-scored results, which are naturally more marginal. That's the precision/recall trade (more results = more recall, more noise), not a malfunction.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — rank by hand and justify.** No code required; prove you understand the metric.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Manually rank a small vector set",
    intro: "Given a query and candidates, compute and order by cosine, showing your work.",
    steps: [
      { order: 1, action: "Query q = [1, 1]. Candidates: a = [2, 2], b = [1, 0], c = [-1, -1], d = [0, 1]. Compute cosine(q, each) by hand (A·B and the norms), then rank.", expected: "a: 1.0 (same direction, scaled); b: ~0.707; d: ~0.707; c: -1.0. Ranking: a > (b ≈ d) > c." },
      { order: 2, action: "Explain why a scores 1.0 despite being 'longer' than q, and why b and d tie.", decision: "What would change if you (wrongly) ranked by dot product on these NON-normalized vectors instead of cosine?" },
      { order: 3, action: "State what a real system does with these scores (rank + take top-k) and why you would NOT hard-code a 'relevant if > 0.8' rule here.", verify: "Your manual scores are correct, you can justify the ties and the scale-invariance, and you can explain the dot-product-vs-cosine difference on non-normalized vectors." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Manual cosine values are correct (a=1.0, b≈0.707, d≈0.707, c=−1.0) with work shown.",
      "You explain scale-invariance (a=1.0 despite larger magnitude) and the b/d tie.",
      "You can state how dot product would differ on these non-normalized vectors.",
      "You justify using ranking/top-k over a hard universal threshold.",
    ],
  },
];

export const content: TopicContent = {
  "unit-emb-similarity-01": learn,
  "unit-emb-similarity-02": practice,
  "unit-emb-similarity-03": build,
  "unit-emb-similarity-04": review,
};
