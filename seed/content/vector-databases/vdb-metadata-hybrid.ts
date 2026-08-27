import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Metadata Filtering & Hybrid Search" (topic-vdb-metadata-hybrid).
// 4 units: 01 learn (filtering + multi-tenant security + hybrid + RRF) · 02 practice (add
// metadata filters) · 03 build (hybrid + reranker = P2 milestones p2-03/p2-04) · 04 review
// (vector vs hybrid quality + troubleshoot + mastery).
// Pre/post-filter and RRF examples are LOCAL and deterministic (exact outputs). Reranking is
// introduced conceptually only (deeper reranking = later RAG topics).

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Pure vector search is rarely the whole answer in a real system. Two capabilities separate a demo from production retrieval: **metadata filtering** (constrain *which* documents are even eligible) and **hybrid search** (combine keyword precision with semantic recall). This topic also introduces a principle that outranks relevance: **metadata filters can be security boundaries.** Getting them right is not optional polish — it's correctness and, sometimes, data isolation.",
  },
  {
    type: "prose",
    md: "**Mental model: retrieval = FILTER the eligible set, then RANK it by relevance.** Similarity tells you *what's most related*; metadata tells you *what's allowed or appropriate to consider at all*. A query like 'the HR policy for employees in **India**' has two parts: a semantic part ('HR policy') and a hard constraint ('country = India'). Similarity alone may surface the right *topic* for the wrong *geography*. Metadata filtering constrains the search space so relevance is computed only over documents that satisfy the constraint.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Metadata filter", definition: "A predicate over stored fields (tenant_id, document_type, language, date, product, department, security level) that includes/excludes candidates during retrieval." },
      { term: "Pre-filter", definition: "Apply the filter BEFORE (or during) nearest-neighbour search, so ranking runs over only eligible documents. Avoids the candidate-truncation trap." },
      { term: "Post-filter", definition: "Retrieve top-k by similarity first, THEN drop non-matching results. Can return too few (or zero) results even when matches exist." },
      { term: "Lexical / keyword search (BM25)", definition: "Ranks by term overlap. Excellent for exact tokens: IDs, product codes, names, rare keywords, error codes." },
      { term: "Hybrid search", definition: "Run lexical + vector search and FUSE the rankings (commonly via Reciprocal Rank Fusion, RRF) into one result set. Often beats either alone." },
    ],
  },
  {
    type: "prose",
    md: "**Why filter *inside* retrieval, not after it.** The tempting shortcut is: retrieve the top-k by similarity, then throw away results that don't match the filter. This breaks because of **candidate-set truncation** — the top-k may be entirely filled by documents that fail the filter, leaving you with too few (or zero) results even though matching documents exist further down the ranking. Filtering *before* ranking (pre-filter) restricts the space first, so the k you return are all eligible.",
  },
  {
    type: "code",
    language: "python",
    caption: "Post-filter vs pre-filter — candidate truncation, exact and deterministic",
    code: `# A user in tenant "A" searches. By raw similarity, tenant B's docs score higher.
chunks = [
    {"id": "a1", "tenant": "A", "sim": 0.42},
    {"id": "a2", "tenant": "A", "sim": 0.31},
    {"id": "b1", "tenant": "B", "sim": 0.95},
    {"id": "b2", "tenant": "B", "sim": 0.91},
    {"id": "b3", "tenant": "B", "sim": 0.88},
]

# POST-filter: rank ALL, take top-3, THEN keep tenant == A
top3 = sorted(chunks, key=lambda c: -c["sim"])[:3]          # b1, b2, b3
post = [c["id"] for c in top3 if c["tenant"] == "A"]        # nothing survives!

# PRE-filter: keep tenant == A FIRST, then rank
pre = [c["id"] for c in
       sorted([c for c in chunks if c["tenant"] == "A"], key=lambda c: -c["sim"])[:3]]

print(post)   # []            <- zero results, though tenant A has documents
print(pre)    # ['a1', 'a2']  <- correct: eligible docs, best first`,
    output: `[]
['a1', 'a2']`,
  },
  {
    type: "prose",
    md: "Same data, same query — the post-filter returns **nothing** while the pre-filter returns the right documents. In a real vector DB you express this by passing the filter *into* the query (e.g. a `where`/`filter` argument) so the engine applies it during search, not as an afterthought in your app code.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Metadata filters are security boundaries — treat them as such",
    md: "The tenant example above isn't only about relevance. A search system serving multiple customers **must not** retrieve tenant A's documents for tenant B. When a metadata filter enforces `tenant_id == <caller>`, it has become an **authorization control**, and the rules change:\n\n- **Derive the tenant/authorization filter from the authenticated session — server-side — never from user input or model output.** A model asked 'which tenant am I?' can be talked into the wrong answer (prompt injection); an LLM must **never** be the source of a security filter.\n- **Enforce authorization outside the model.** The filter is constructed and validated by your trusted application code, not suggested by the model.\n- **Validate filters** before they hit the DB (whitelist fields/operators; reject a missing/empty tenant rather than defaulting to 'all').\n- **Fail closed**: if the tenant can't be determined, return nothing — not everything.\n\nMetadata filtering is a relevance feature *and* a data-isolation mechanism. Confusing the two is how cross-tenant leaks happen.",
  },
  {
    type: "prose",
    md: "**Hybrid search: keyword precision + semantic recall.** The two retrieval styles have complementary strengths:\n\n- **Lexical / keyword (BM25)** excels at **exact tokens**: product codes, IDs (`AZ-104`), legal citations, technical identifiers, people's names, rare keywords. It finds `AZ-104` because the characters match — but it's blind to paraphrase.\n- **Semantic / vector** excels at **meaning**: paraphrases, conceptual similarity, different wording — but can *bury* an exact identifier because, semantically, `AZ-104` looks like generic text.\n\n**Hybrid** runs both and **fuses** the rankings, so a query that mixes concepts *and* exact terms gets the best of each. This is why hybrid so often wins on real corpora full of IDs, codes, and names.",
  },
  {
    type: "prose",
    md: "**Fusion, conceptually — Reciprocal Rank Fusion (RRF).** You can't just add a BM25 score to a cosine score — they're on different scales. RRF sidesteps this by combining **ranks**, not raw scores: each document gets `1 / (K + rank)` from each result list (K is a small constant, commonly 60), and the sums are re-sorted. A document ranked well by *either* method rises; a document ranked well by *both* rises most.",
  },
  {
    type: "code",
    language: "python",
    caption: "RRF fusion — deterministic; rescues an exact-match doc semantic search buried",
    code: `def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:                 # each ranking = ids, best first
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

lexical  = ["d2", "d1", "d3"]   # keyword: only d2 contains "AZ-104" -> ranks it first
semantic = ["d1", "d3", "d2"]   # vector: d2 looks generic -> buried last

for doc_id, s in rrf([lexical, semantic]):
    print(doc_id, round(s, 5))`,
    output: `d1 0.03252
d2 0.03227
d3 0.03200`,
  },
  {
    type: "prose",
    md: "Pure semantic search ranked `d2` (the document that literally contains `AZ-104`) **last**; hybrid fusion pulls it up to **second** by combining the lexical evidence. On a query that cares about the exact identifier, that's the difference between finding the right doc and missing it. (RRF rewards agreement and strong single-method placement — it's a robust default; deeper **reranking** with a cross-encoder model is a later RAG topic, introduced here only as 'a model can re-score the fused shortlist for even better ordering'.)",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Vector-only where keywords matter — and no filtering at all",
    md: "Two failures this topic exists to prevent: **(1) Vector-only on identifier-heavy data.** If users search by SKU, error code, case number, or name, pure semantic search will frustrate them — it buries exact matches. Add lexical/hybrid. **(2) No filtering.** Without metadata filters you retrieve across everything: wrong tenant, wrong language, wrong date range, stale or draft documents. At best it's irrelevant; at worst it's a data leak. Real retrieval almost always needs *both* a filter (eligibility/security) and a ranking strategy suited to the data (often hybrid).",
  },
  {
    type: "quiz",
    question: "A support tool's semantic search cannot find the certification 'AZ-104' even though a document clearly contains that exact string. What's the best explanation and fix?",
    choices: [
      "The embedding model is broken; retrain it",
      "Semantic similarity is weak on exact identifiers — 'AZ-104' embeds like generic text, so the exact-match doc gets buried. Add lexical/keyword search and fuse (hybrid) so exact tokens are matched precisely",
      "The document wasn't embedded; re-embed everything",
      "Increase top-k to 1000",
    ],
    answerIndex: 1,
    explanation: "Vector search targets meaning, not character matches, so rare exact identifiers like 'AZ-104' don't stand out semantically and rank poorly. Keyword/BM25 search matches them precisely; hybrid fusion combines that precision with semantic recall — the standard fix for identifier-heavy corpora.",
  },
  {
    type: "quiz",
    question: "In a multi-tenant search system, where must the tenant_id filter come from?",
    choices: [
      "From the user's query text so they can pick their tenant",
      "From the model, which can infer the tenant from context",
      "From the authenticated server-side session/authorization context — constructed and validated by trusted app code, never from user input or model output, and failing closed if unknown",
      "It doesn't matter as long as filtering happens",
    ],
    answerIndex: 2,
    explanation: "A tenant filter is a security boundary, so it must be derived from the authenticated session by trusted code and validated before use — never taken from user input or an LLM (both manipulable). If the tenant can't be determined, the system should return nothing (fail closed), not default to all tenants.",
  },
  {
    type: "takeaways",
    items: [
      "Retrieval = filter the eligible set, then rank it. Pre-filter (inside the query), don't post-filter, to avoid candidate-set truncation returning too few/zero results.",
      "Metadata filters can be SECURITY boundaries: derive tenant/authorization filters server-side from the session, validate them, never from user/model input, and fail closed.",
      "Lexical (BM25) nails exact tokens (IDs, codes, names); semantic nails meaning/paraphrase; each is blind where the other is strong.",
      "Hybrid runs both and FUSES ranks (RRF: 1/(K+rank)) — rescues exact matches semantic search buries; often best on real data.",
      "Reranking (cross-encoder re-scoring the shortlist) is a later, deeper topic — here it's just 'optionally re-order the fused results'.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Add metadata filtering to your retrieval and see it scope results correctly — including the security-relevant tenant case. Use your vector DB's filter argument (or the in-memory store) so filtering happens during retrieval.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Filter during retrieval (guided)",
    intro: "Make filters part of the query, not an afterthought.",
    steps: [
      { order: 1, action: "Store ~8 chunks with metadata: at least source, a document_type, and a tenant field. Run a query with NO filter and note the top-k.", expected: "Unfiltered results may mix tenants/types — relevant by meaning but not scoped." },
      { order: 2, action: "Add a metadata filter to the SAME query (e.g. tenant == 'A' AND document_type == 'policy') passed INTO the query. Confirm results are restricted to eligible docs and ranked within them.", decision: "Demonstrate the candidate-truncation trap: retrieve top-k then filter in app code vs filter-then-rank. When does the post-filter approach return too few results?" },
      { order: 3, action: "Try an over-restrictive filter that matches nothing and observe zero results. Decide how your system should behave (empty result vs relaxed filter) — and why a tenant filter must NEVER be relaxed automatically.", verify: "Filters scope results during retrieval; you reproduced candidate truncation; you can state why security filters fail closed." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Filters are passed into the query (pre-filter), not applied after top-k.",
      "You reproduced candidate-set truncation (post-filter returning too few/zero).",
      "Over-restrictive filter → zero results, handled deliberately.",
      "You can explain why a tenant/security filter fails closed and is never auto-relaxed.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Add metadata filtering and hybrid search to `semantic-search-core`** — Project **P2 milestones p2-03** ('Add metadata filtering') and **p2-04** ('Add hybrid search + reranking'). You extend the same `VectorStore` seam from the previous topic; the public `search` interface stays stable, gaining optional parameters.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P2 p2-03 + p2-04)",
    md: "p2-03: filters must correctly **scope** results. p2-04: hybrid must **improve relevance over vector-only** and support reranking. Extend `search` additively — e.g. `search(query, k, filter=None, hybrid=False)` — so existing callers (no filter, vector-only) keep working unchanged. Filtering belongs at the store boundary (applied during retrieval); fusion/reranking is a separable step layered on the candidate results. Don't rewrite the pipeline; grow the seam.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — filtered + hybrid retrieval",
    intro: "Acceptance defines done. Extend, don't rewrite.",
    steps: [
      { order: 1, action: "Add metadata filtering: search(query, k, filter=...) applies the filter DURING retrieval (pre-filter) so ranking runs over eligible docs only. Ensure a tenant/authorization filter is enforced server-side and fails closed.", decision: "Where does the filter attach — the core, the VectorStore interface, or a specific store? Why must the security filter be built by trusted code, not passed through from the caller's raw input?" },
      { order: 2, action: "Add hybrid search: run a lexical (keyword/BM25-style) ranking alongside the vector ranking over the (filtered) candidates, then FUSE with RRF. Keep vector-only available (hybrid=False) so you can compare.", expected: "A query mixing an exact identifier + concept ranks the exact-match doc higher under hybrid than under vector-only." },
      { order: 3, action: "Introduce reranking as an OPTIONAL final step over the fused shortlist (a hook/interface), even if your implementation is a simple placeholder. Document that a real cross-encoder reranker is a later topic.", verify: "search supports filter + hybrid additively without breaking vector-only callers; hybrid beats vector-only on an identifier query; filtering scopes correctly and fails closed; a rerank hook exists but isn't required." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P2 p2-03 + p2-04",
    items: [
      "search gains optional filter + hybrid params; vector-only callers unchanged.",
      "Filter applied during retrieval (pre-filter); tenant/security filter built server-side, fails closed.",
      "Hybrid fuses lexical + vector (RRF) and measurably improves an identifier query over vector-only.",
      "An optional rerank hook exists over the fused shortlist (real cross-encoder deferred to later topic).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — filtered + hybrid search over the VectorStore seam",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import re

def keyword_rank(query: str, candidates: list[dict]) -> list[str]:
    # BM25-lite: rank by count of exact query-term hits. Great for IDs/codes/names.
    terms = set(re.findall(r"[a-z0-9\\-]+", query.lower()))
    def hits(c): return sum(c["text"].lower().count(t) for t in terms)
    ranked = sorted(candidates, key=hits, reverse=True)
    return [c["chunk_id"] for c in ranked if hits(c) > 0]

def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, cid in enumerate(ranking):
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
    return [cid for cid, _ in sorted(scores.items(), key=lambda kv: kv[1], reverse=True)]

def build_tenant_filter(session) -> dict:
    # SECURITY: derived from the authenticated session, server-side. Fail closed.
    tenant = session.get("tenant_id")
    if not tenant:
        raise PermissionError("no tenant in session -> return nothing")
    return {"tenant_id": tenant}

class SearchCore:  # extends the ported core; VectorStore.query now accepts a filter
    def __init__(self, embed_fn, store, chunker, reranker=None):
        self.embed_fn, self.store, self.chunker = embed_fn, store, chunker
        self.reranker = reranker            # optional; real cross-encoder = later topic

    def search(self, query, k=5, filter=None, hybrid=False):
        qv = self.embed_fn([query])[0]
        # pre-filter happens INSIDE the store query (eligibility + security)
        hits = self.store.query(qv, k=max(k, 20), filter=filter)   # [(chunk, score)]
        vector_rank = [c.chunk_id for c, _ in hits]
        if hybrid:
            cands = [{"chunk_id": c.chunk_id, "text": c.text} for c, _ in hits]
            fused = rrf([keyword_rank(query, cands), vector_rank])
            order = fused or vector_rank
        else:
            order = vector_rank
        by_id = {c.chunk_id: c for c, _ in hits}
        results = [by_id[cid] for cid in order if cid in by_id][:k]
        return self.reranker(query, results) if self.reranker else results`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Judge whether hybrid actually helps *your* data, and diagnose the two classic filtering/hybrid failures.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — filtering after top-k retrieval returns zero results, though matches exist",
    md: "Users filter by a valid attribute and get nothing back, yet you can see matching documents in the store. **Evidence:** are you retrieving top-k by similarity **first** and filtering in app code **after**? Check whether the pre-filter top-k was entirely filled by non-matching documents (candidate-set truncation). **Diagnosis:** post-filtering truncated the candidate set before your filter ran. **Fix:** push the filter **into** the query (pre-filter) so eligibility is applied during retrieval; if using post-filter for a reason, over-fetch (retrieve a much larger k) before filtering — but pre-filter is the correct default.",
  },
  {
    type: "quiz",
    question: "You add hybrid search and, on a corpus of conceptual how-to articles with NO codes/IDs/names, it performs about the same as vector-only. Did hybrid fail?",
    choices: [
      "Yes — hybrid should always win",
      "No — hybrid's advantage comes from exact-token matching (IDs, codes, names, rare keywords). On purely conceptual text with no such tokens, there's little for lexical search to add, so parity is expected. Hybrid helps most on identifier-heavy data",
      "Yes — you must have implemented RRF wrong",
      "No — hybrid changes the embeddings",
    ],
    answerIndex: 1,
    explanation: "Hybrid wins where lexical precision matters — exact identifiers and rare keywords. A corpus of paraphrase-friendly conceptual prose gives keyword search little unique signal, so hybrid ≈ vector-only. That's expected, and it's why you evaluate hybrid against your actual data rather than assuming a universal win.",
  },
  {
    type: "quiz",
    question: "Two tenants share one vector index. What actually prevents tenant B from retrieving tenant A's documents?",
    choices: [
      "The embedding model keeps them separate automatically",
      "A metadata filter (tenant_id == caller) enforced as a pre-filter, built from the authenticated session by trusted server-side code and validated — not similarity, not the model, not the client",
      "Storing them in the same collection makes them private",
      "Using a higher top-k",
    ],
    answerIndex: 1,
    explanation: "Isolation comes from an enforced, validated pre-filter on tenant_id derived from the authenticated session server-side. Similarity, the embedding model, and the client cannot provide this guarantee; a manipulable or app-side-only filter risks cross-tenant leakage. The filter is a security control and must fail closed.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design a multi-tenant hybrid query.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Combine tenant isolation, filtering, semantic and lexical search",
    intro: "Design the retrieval for a shared, multi-customer knowledge base.",
    steps: [
      { order: 1, action: "Specify the retrieval for: 'employees search their OWN company's docs; results must respect language and document_type; queries often include product codes.' List the metadata fields and which are SECURITY-critical vs relevance-only.", expected: "tenant_id (security, mandatory pre-filter, from session); language + document_type (relevance filters); product code handled by lexical/hybrid. Clear split of security vs relevance." },
      { order: 2, action: "Describe the query pipeline end to end: where the tenant filter is built and validated, where relevance filters attach, how lexical + vector are fused, and where an optional reranker sits.", decision: "What happens if the tenant can't be resolved, and why is auto-relaxing that filter unacceptable even when it returns zero results?" },
      { order: 3, action: "State how you'd VERIFY isolation (a test proving tenant B never retrieves tenant A's docs) and how you'd verify hybrid beats vector-only on a code-bearing query.", verify: "Your design enforces tenant isolation via a validated server-side pre-filter that fails closed, layers relevance filters, fuses lexical+vector, and includes concrete verification for both isolation and hybrid quality." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Security-critical (tenant_id) vs relevance filters (language/type) clearly separated.",
      "Tenant filter built + validated server-side, applied as pre-filter, fails closed.",
      "Lexical + vector fused (RRF); optional reranker placed after fusion.",
      "Concrete verification for BOTH tenant isolation and hybrid-beats-vector-only.",
    ],
  },
];

export const content: TopicContent = {
  "unit-vdb-metadata-hybrid-01": learn,
  "unit-vdb-metadata-hybrid-02": practice,
  "unit-vdb-metadata-hybrid-03": build,
  "unit-vdb-metadata-hybrid-04": review,
};
