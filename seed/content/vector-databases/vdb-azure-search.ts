import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Azure AI Search for Retrieval" (topic-vdb-azure-search).
// 3 units: 01 learn (managed service, index schema, vector/hybrid/semantic, integrated
// vectorization, auth, cost) · 02 practice (create/query an index; local fallback + optional
// Azure) · 03 build (back P2/P3 retrieval with Azure AI Search via the VectorStore seam).
// Verified against Microsoft Learn (docs dated 2026): vectorQueries kind:"vector", RRF hybrid,
// vectorFilterMode pre/postFilter, HNSW/eKNN, dimensions must match, vector fields NOT
// filterable (separate filterable field), no-extra-charge vector search, keyless RBAC vs admin
// key. Concept-vs-provider kept explicit; network outputs labelled representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Everything you've learned about vector storage, ANN, filtering, and hybrid search is **transferable** — now see it in a real **managed** service that enterprises actually run: **Azure AI Search**. The value here is bridging your general knowledge to a production platform without losing the concepts. Keep a firm line in your head: **the CONCEPT (vector + hybrid retrieval) is universal; the IMPLEMENTATION (field types, index schema, API shape) is Azure-specific.**",
  },
  {
    type: "prose",
    md: "**Mental model: Azure AI Search is a managed search engine where vectors are just another field type.** The pipeline is the same one you built: `APPLICATION → AZURE AI SEARCH → vector / hybrid retrieval → results`. You define an **index** (a schema of typed fields), push **documents** into it (each with text, metadata, and one or more **vector fields**), and issue **queries** that can be vector-only, keyword-only, or **hybrid** — all server-side, persistent, scalable, and filterable. Azure runs the ANN index (HNSW) and, for hybrid, fuses keyword + vector results with **RRF** for you.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Index", definition: "The schema + stored documents. A fields collection with a document key, human-readable text fields, filterable metadata fields, and vector field(s). Analogous to a 'collection'." },
      { term: "Vector field", definition: "type Collection(Edm.Single), searchable=true, with a fixed dimensions matching your embedding model and a vectorSearchProfile. Vector fields are NOT filterable/sortable." },
      { term: "vectorSearch profile", definition: "Named binding of an algorithm (HNSW or exhaustiveKNN) — and optional compression — referenced by each vector field. Sets the metric (cosine for Azure OpenAI)." },
      { term: "Hybrid query", definition: "One request with both a full-text search string and vectorQueries; runs BM25 + vector in parallel and merges via Reciprocal Rank Fusion (RRF)." },
      { term: "Integrated vectorization", definition: "Azure chunks + embeds your data during indexing (indexer + skillset + vectorizer) and can embed the query too — vs 'external', where you generate embeddings yourself and push them in." },
    ],
  },
  {
    type: "prose",
    md: "**The index schema — where Azure-specific rules bite.** A vector index is a fields collection plus a `vectorSearch` configuration. Two rules cause most beginner errors: **(1)** a **vector field** must be `searchable`, have `dimensions` equal to your model's output, and reference a profile — and it **cannot** be filtered/sorted. **(2)** To filter (metadata!), you need a **separate** filterable text/numeric field. Here's a minimal schema (REST/JSON; the SDK builds the same shape):",
  },
  {
    type: "code",
    language: "json",
    caption: "Azure AI Search index schema — vector field + filterable metadata (verified structure)",
    code: `{
  "name": "docs",
  "fields": [
    { "name": "chunk_id", "type": "Edm.String", "key": true, "filterable": true },
    { "name": "doc_id",    "type": "Edm.String", "filterable": true },
    { "name": "tenant_id", "type": "Edm.String", "filterable": true },
    { "name": "content",   "type": "Edm.String", "searchable": true, "retrievable": true },
    {
      "name": "content_vector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "dimensions": 1536,
      "vectorSearchProfile": "vprofile"
    }
  ],
  "vectorSearch": {
    "algorithms": [ { "name": "hnsw-1", "kind": "hnsw", "hnswParameters": { "metric": "cosine" } } ],
    "profiles":   [ { "name": "vprofile", "algorithm": "hnsw-1" } ]
  }
}`,
  },
  {
    type: "prose",
    md: "Notice the split: `content_vector` holds the embedding (searchable, fixed 1536 dims, profile-bound, **not** filterable); `tenant_id`/`doc_id`/`content` are ordinary fields, with the metadata ones marked **filterable**. That separation is exactly the 'vector fields aren't filterable — add a filterable field' rule. The `vectorSearch` block picks the ANN algorithm (HNSW) and the **cosine** metric that matches Azure OpenAI embeddings.",
  },
  {
    type: "code",
    language: "python",
    caption: "Azure AI Search via the Python SDK (azure-search-documents) — create, upload, query",
    code: `from azure.identity import DefaultAzureCredential          # keyless (recommended)
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField, SearchField, SearchFieldDataType,
    VectorSearch, HnswAlgorithmConfiguration, VectorSearchProfile)
from azure.search.documents.models import VectorizedQuery

endpoint = "https://<your-service>.search.windows.net"
cred = DefaultAzureCredential()   # RBAC roles: Search Service + Index Data Contributor
                                  # (or AzureKeyCredential(admin_key) for key auth)

# 1) Define the index (vector field + filterable metadata)
fields = [
    SimpleField(name="chunk_id", type=SearchFieldDataType.String, key=True, filterable=True),
    SimpleField(name="doc_id", type=SearchFieldDataType.String, filterable=True),
    SimpleField(name="tenant_id", type=SearchFieldDataType.String, filterable=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SearchField(name="content_vector",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True, vector_search_dimensions=1536,
                vector_search_profile_name="vprofile"),
]
vs = VectorSearch(algorithms=[HnswAlgorithmConfiguration(name="hnsw-1")],
                  profiles=[VectorSearchProfile(name="vprofile",
                                                algorithm_configuration_name="hnsw-1")])
SearchIndexClient(endpoint, cred).create_or_update_index(
    SearchIndex(name="docs", fields=fields, vector_search=vs))

# 2) Upload documents (you generate the embeddings with your model, same as the DB)
client = SearchClient(endpoint, "docs", cred)
client.upload_documents(documents=[
    {"chunk_id": "d1::0", "doc_id": "d1", "tenant_id": "A",
     "content": "reset your password in settings", "content_vector": qv_for_d1},
])

# 3) Query: hybrid (search_text + vector) + metadata filter, in ONE request
vq = VectorizedQuery(vector=query_vec, k_nearest_neighbors=5, fields="content_vector")
results = client.search(
    search_text="AZ-104 password reset",   # None => vector-only; text => HYBRID (BM25+vector, RRF)
    vector_queries=[vq],
    filter="tenant_id eq 'A'",             # OData filter over a FILTERABLE field
    select=["chunk_id", "doc_id", "content"],
    top=5)
for r in results:
    print(r["chunk_id"], r["@search.score"])   # representative; scores are Azure's`,
    output: `d1::0 0.0326   # representative — real scores/order depend on your data + service`,
  },
  {
    type: "prose",
    md: "**Reading that query:** passing `search_text` **and** `vector_queries` in one call is exactly **hybrid search** — Azure runs BM25 and vector retrieval in parallel and merges them with **RRF**, returning `@search.score`. `filter` is an **OData** expression over a filterable field (`tenant_id eq 'A'`) — your metadata/security boundary. Set `search_text=None` for pure vector search. Optionally, **semantic ranker** (`query_type='semantic'` + a semantic configuration) re-scores the fused shortlist and adds `@search.rerankerScore` — a managed reranking step (conceptually the reranker from the last topic).",
  },
  {
    type: "callout",
    variant: "note",
    title: "Integrated vectorization vs bringing your own vectors",
    md: "Two ways embeddings get into Azure AI Search:\n\n- **External (push)** — you chunk + embed in your own code and push the vectors into the index (what the SDK example does). Maximum control; the model stays yours.\n- **Integrated vectorization (pull)** — an **indexer + skillset + vectorizer** chunks and embeds your data **during indexing**, and a matching **vectorizer** can embed the *query* at search time so callers send plain text. Less code, but you configure the pipeline and pair the same model on both sides.\n\nEither way, the **same-model rule** holds: documents and queries must be embedded by the **same** model, and the field's `dimensions` must match it.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Auth and cost — the practical guardrails",
    md: "**Authentication**: prefer **keyless RBAC** (Microsoft Entra ID via `DefaultAzureCredential`) with roles like *Search Service Contributor* + *Search Index Data Contributor*; admin **API keys** work but are less secure. **Cost**: vector search itself is available on **all tiers at no extra charge** — but you pay for the **search service tier** (capacity/quota) and, separately, for **embedding generation** from your model provider. Integrated vectorization adds AI enrichment charges. Pick a tier for your scale; a small dev/basic tier is enough to learn. Don't spin up premium capacity just to understand the concepts.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Azure-specific failure modes and how to diagnose them",
    md: "- **Dimension mismatch**: the field's `dimensions` ≠ your model's output → upload/query errors or meaningless results. Match them exactly (e.g. 1536).\n- **Field not searchable**: a vector field must be `searchable: true` or vector queries can't target it.\n- **Filter fails**: you filtered on a field that isn't `filterable: true` (remember vector fields can't be filtered — use a separate field). Fix the schema (often a drop + rebuild).\n- **Wrong endpoint/index name or auth**: 403/404 — verify service URL, index name, and RBAC role/key.\n- **Stale index**: you changed the schema or embedding model but didn't reload/re-embed documents → old or missing vectors. Reindex.\n- **Incompatible query vector**: query embedded with a different model than the documents → nonsense scores. Same model both sides.\n- **Vector works but hybrid is 'off'**: check you actually passed `search_text` (hybrid needs both), that text fields are `searchable`, and remember hybrid uses RRF — its score scale differs from pure vector, and pure-vector score thresholds don't transfer to hybrid.",
  },
  {
    type: "quiz",
    question: "You configured a vector field and now a query with filter=\"category eq 'docs'\" fails or is rejected. What's the most likely Azure-specific cause?",
    choices: [
      "Vector fields support filtering; the syntax must be wrong",
      "You're trying to filter a field that isn't marked filterable — and vector fields can't be filtered at all. Designate a separate filterable text/numeric field (e.g. 'category') and filter on that",
      "Azure AI Search doesn't support filters",
      "You must switch to Euclidean distance",
    ],
    answerIndex: 1,
    explanation: "In Azure AI Search, vector fields are searchable but not filterable, and any field you filter on must be configured filterable=true. Metadata filtering requires a separate filterable text/numeric field; filtering a vector field or a non-filterable field fails. Fix the index schema (often via rebuild).",
  },
  {
    type: "quiz",
    question: "A vector-only query returns results with reasonable scores, but adding search_text for hybrid gives an unexpected order and different score magnitudes. Is hybrid broken?",
    choices: [
      "Yes — hybrid should return the same scores as vector-only",
      "No — hybrid runs BM25 + vector in parallel and merges via RRF, which produces its own (smaller, differently-scaled) scores and can reorder results by combining keyword + semantic evidence. Different magnitudes/order are expected; don't reuse vector-only thresholds on hybrid scores",
      "Yes — you must remove the vector query",
      "No — but you should sort ascending for hybrid",
    ],
    answerIndex: 1,
    explanation: "Hybrid fuses two ranked lists with Reciprocal Rank Fusion, so its @search.score is on a different, compressed scale and its ordering reflects both keyword and vector evidence. Expecting identical scores/order to vector-only — or applying a vector-only threshold — misreads how RRF works.",
  },
  {
    type: "takeaways",
    items: [
      "Azure AI Search is a managed engine where vectors are a field type: APP → index (fields+vectors) → vector/hybrid retrieval → results.",
      "Vector field = Collection(Edm.Single), searchable, fixed dimensions (match your model), profile-bound, NOT filterable — add separate filterable fields for metadata/security.",
      "Hybrid = one request with search_text + vectorQueries, merged by RRF; filter is an OData expression; semantic ranker optionally reranks (@search.rerankerScore).",
      "Integrated vectorization embeds during indexing/query; external = push your own vectors. Same-model rule + matching dimensions always apply.",
      "Prefer keyless RBAC; vector search is free across tiers but you pay for service tier + embeddings; a small tier suffices to learn.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Create an index, load documents, and run vector + filtered + hybrid queries. **You do not need to spend money**: do the whole exercise locally on the vector DB from the earlier topic (same concepts), and treat the Azure steps as **optional** if you have a subscription (a free/basic tier suffices).",
  },
  {
    type: "callout",
    variant: "note",
    title: "Two paths — pick one",
    md: "**Local (recommended, free):** reproduce the index/query/filter/hybrid flow on Chroma/Qdrant/pgvector — every concept (schema-of-fields, vector field, filterable metadata, hybrid, pre-filter) has a local analogue. **Optional Azure:** if you have a subscription, create a small search service, define the index, upload a few docs, and run the same queries in the portal's Search Explorer or via the SDK. The *learning objective is the schema + query model*, which is identical either way."
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Define an index and query it (guided)",
    intro: "Model fields, load documents, and run the three query shapes.",
    steps: [
      { order: 1, action: "Define an index/collection: a key field, human-readable content, at least two FILTERABLE metadata fields (e.g. tenant_id, document_type), and a vector field with dimensions matching your embedding model.", expected: "Schema has a distinct vector field (searchable, correct dimensions) AND separate filterable metadata fields — not filtering on the vector field." },
      { order: 2, action: "Upload ~6 documents (text + metadata + embedding). Run: (a) a vector-only query, (b) the same query with a metadata filter, (c) a hybrid query (add a keyword/text search alongside the vector).", decision: "For a query containing an exact code/ID, which of the three shapes ranks the exact-match document best, and why?" },
      { order: 3, action: "On the optional Azure path, note where each concept maps: fields collection, vectorSearchProfile, filterable fields, search_text+vector_queries (hybrid), OData filter. If local-only, map your store's equivalents.", verify: "You ran vector-only, filtered, and hybrid queries; you can point to the vector field vs filterable fields; you can explain when hybrid helps." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Index/collection has a vector field (correct dimensions) + separate filterable metadata fields.",
      "You ran vector-only, filtered, and hybrid queries over the same data.",
      "You identified when hybrid ranks an exact code/ID best.",
      "You mapped each concept to Azure (or your local store) — no paid infra required.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Back the P2/P3 retrieval app with Azure AI Search** — implement Azure AI Search as another `VectorStore` behind the *same* seam, so `semantic-search-core` can run on a managed enterprise store without changing its interface. This is the enterprise deployment of the store you migrated in the hands-on topic, and the retrieval backbone P3 (RAG) will reuse.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + no-cost path",
    md: "Keep `add_documents` / `search(query, k, filter, hybrid)` **stable** — Azure AI Search becomes a new `VectorStore` implementation (`add` → upload_documents; `query` → client.search with vector_queries + filter, optionally search_text for hybrid). Callers don't change. **You are NOT required to provision Azure to complete this** — implement the interface, verify its shape against a local store, and mark the live-Azure run as an optional step. Do not make paid infrastructure mandatory to finish the build."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — Azure AI Search as a VectorStore",
    intro: "Acceptance defines done. Reuse the seam; don't rebuild the pipeline.",
    steps: [
      { order: 1, action: "Implement an AzureSearchVectorStore satisfying the VectorStore interface: add(chunks) uploads documents (chunk_id/doc_id/metadata/content + content_vector); query(vector, k, filter) issues a vector query with an OData filter over filterable fields. Map results back to (chunk, score).", decision: "Which fields must be filterable for your metadata/security filters, and why must the vector field's dimensions equal your embedding model's output?" },
      { order: 2, action: "Support hybrid + filtering through the existing search signature: pass search_text for hybrid (BM25+vector, RRF) and translate your filter dict to an OData expression (tenant_id built server-side, fail closed). Keep vector-only + no-filter working.", expected: "The core runs unchanged on the Azure-backed store; vector, filtered, and hybrid queries all work; the tenant filter is enforced server-side." },
      { order: 3, action: "Verify the interface parity locally; document the OPTIONAL live-Azure steps (create service, index schema, RBAC auth, upload, query) and the cost note. Confirm no caller/pipeline code changed.", verify: "Azure AI Search plugs in as a VectorStore behind the stable interface; hybrid + filtering supported; live-Azure is optional and documented; pipeline/callers untouched." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "AzureSearchVectorStore implements add + query (+ filter/hybrid) behind the stable VectorStore seam.",
      "Vector field dimensions match the model; metadata/security fields are filterable; tenant filter server-side + fail closed.",
      "Vector-only, filtered, and hybrid (search_text, RRF) queries work; callers/pipeline unchanged.",
      "Live-Azure provisioning is OPTIONAL and documented (schema, RBAC, cost); build completes without paid infra.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — AzureSearchVectorStore behind the same VectorStore interface",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

def to_odata(filter: dict | None) -> str | None:
    # Translate a small filter dict to an OData expression over FILTERABLE fields.
    if not filter:
        return None
    return " and ".join(f"{k} eq '{v}'" for k, v in filter.items())

class AzureSearchVectorStore:                 # satisfies the VectorStore seam (add, query)
    def __init__(self, endpoint, index="docs"):
        self._client = SearchClient(endpoint, index, DefaultAzureCredential())

    def add(self, chunks) -> None:
        self._client.upload_documents(documents=[{
            "chunk_id": c.chunk_id, "doc_id": c.doc_id,
            "tenant_id": c.metadata.get("tenant_id", ""),
            "content": c.text, "content_vector": c.vector,
        } for c in chunks])

    def query(self, vector, k, filter=None, search_text=None):
        vq = VectorizedQuery(vector=vector, k_nearest_neighbors=k, fields="content_vector")
        results = self._client.search(
            search_text=search_text,          # None = vector-only; text = HYBRID (RRF)
            vector_queries=[vq],
            filter=to_odata(filter),          # OData over filterable fields (server-side)
            select=["chunk_id", "doc_id", "content", "tenant_id"],
            top=k)
        out = []
        for r in results:
            from types import SimpleNamespace
            chunk = SimpleNamespace(chunk_id=r["chunk_id"], doc_id=r["doc_id"],
                                    text=r["content"],
                                    metadata={"tenant_id": r.get("tenant_id", "")})
            out.append((chunk, r["@search.score"]))
        return out

# Same SemanticSearchCore, new managed store — interface unchanged:
#   core = SemanticSearchCore(embed_fn, AzureSearchVectorStore(endpoint), chunker)`,
  },
];

export const content: TopicContent = {
  "unit-vdb-azure-search-01": learn,
  "unit-vdb-azure-search-02": practice,
  "unit-vdb-azure-search-03": build,
};
