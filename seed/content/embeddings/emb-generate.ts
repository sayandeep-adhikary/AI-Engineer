import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Generating Embeddings" (topic-emb-generate).
// 3 units: 01 learn (pipeline + API) · 02 practice (embed + inspect dims) · 03 build
// (batch-embed a corpus, store with IDs/metadata, make a query vector).
// Embedding API shape verified against the OpenAI Python SDK / Azure OpenAI:
// client.embeddings.create(model, input=[...]) -> data[i].embedding (list[float]).
// Dimensions are MODEL-SPECIFIC (e.g. text-embedding-3-small 1536, -3-large 3072);
// OpenAI embeddings are unit-normalized — NOT universal. Concept first, provider second.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You understand what an embedding *is*; now produce them at scale, correctly. The pipeline is simple to state — **text → embedding model → vector** — but the engineering around it (batching, cost, failures, and the *same-model* rule) is where retrieval systems quietly break. This unit is the practical production of vectors you'll store and search.",
  },
  {
    type: "prose",
    md: "**Mental model: an embedding model is a pure function from text to a fixed-length vector — and it must be the *same* function for everything you compare.** Feed it a string, get back e.g. 1536 floats. The single most important rule in this whole category: **documents and queries must be embedded by the same model**, because (from the last topic) each model has its own space. Mix models and your similarity scores are meaningless. Everything else — batching, storage, cost — is optimisation around that invariant.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Embedding model", definition: "The model that maps text→vector (e.g. an OpenAI/Azure embedding model, or a local model like a sentence-transformer). Choice fixes the space and dimensions." },
      { term: "Batching", definition: "Sending many texts in one API call (input as a list) instead of one call per text — far cheaper and faster." },
      { term: "Normalization", definition: "Scaling vectors to unit length. Some providers (e.g. OpenAI) return unit-normalized vectors; others don't — so check, because it affects which metric you use." },
      { term: "Document vs query embedding", definition: "Both go through the SAME model. (Some models offer task 'input types' for doc vs query, but never a different model for each side.)" },
      { term: "Vector store record", definition: "What you persist per chunk: a stable id, the vector, the source text, and metadata (doc id, source, position) — never just the bare vector." },
    ],
  },
  {
    type: "prose",
    md: "**The provider API, concretely (OpenAI / Azure OpenAI).** Concept first: *text list in, vector list out*. The provider implementation:",
  },
  {
    type: "code",
    language: "python",
    caption: "Batch embedding with the OpenAI / Azure embeddings API",
    code: `from openai import OpenAI
client = OpenAI(api_key="...")   # or AzureOpenAI(...) per the API topic

texts = ["how do I reset my password?",
         "I forgot my login credentials",
         "what's the capital of France?"]

resp = client.embeddings.create(
    model="text-embedding-3-small",   # Azure: use your deployment name
    input=texts,                      # a LIST -> one call embeds all of them (batching)
)

vectors = [d.embedding for d in resp.data]   # list of float-lists, in input order
print(len(vectors), len(vectors[0]))         # 3 vectors, each 1536-dim (model-specific)
print(resp.usage.total_tokens)               # you're billed per input token`,
    output: `3 1536
...`,
  },
  {
    type: "prose",
    md: "Notes that matter: `input` takes a **list**, so one call embeds a whole batch (much cheaper/faster than a call per text); `resp.data` comes back **in input order**; the vector length (`1536` here) is a **property of the model**, not a universal — `text-embedding-3-large` is 3072, other models differ, and some let you request a smaller `dimensions=`. On Azure the `model` is your **deployment name** (from the API topic). Cost is per **input token**, so long documents cost more to embed.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Normalization and dimensions are model-specific — don't assume",
    md: "Two 'everyone knows' claims that are actually provider-specific: **(1) dimensionality** — models range from a few hundred to a few thousand dims; never hardcode 1536 as if universal, and never mix models of different dims into one index. **(2) normalization** — OpenAI's embeddings are returned **unit-normalized** (length 1), which means cosine similarity and dot product give the *same* ranking; but not every model normalizes. If your vectors aren't unit-length and you use raw dot product, longer/'bigger' vectors score higher for the wrong reason. The safe default is **cosine similarity** (it normalizes internally, so it's scale-invariant) — and *know* whether your model pre-normalizes. Verify against your model's docs rather than assuming.",
  },
  {
    type: "prose",
    md: "**Store more than the vector.** A bare vector is useless when a search hit comes back — you can't show the user *what* matched or *where* it came from. Persist a record per chunk: a **stable id**, the **vector**, the **source text**, and **metadata** (document id, source/filename, position, any fields you'll later filter on). This is also what lets the P2 project add metadata filtering later without re-embedding.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Embed the CONTENT — not the IDs, metadata, or boilerplate",
    md: "A subtle but ruinous bug: constructing the string you embed from the wrong parts — e.g. embedding `\"doc_00417 | source=wiki | 2026-01-01\"` (the metadata) instead of the actual passage, or embedding a template header that's identical across documents. The vectors then reflect the boilerplate, not the meaning, and everything looks similar to everything. Embed the *semantic content* the user's query should match; keep ids/metadata as *fields alongside* the vector, not inside the text you embed. If retrieval is bizarrely uniform, check what string you actually passed to the model.",
  },
  {
    type: "prose",
    md: "**Failures, rate limits, cost, and reproducibility** — the operational reality of embedding thousands of documents:\n\n- **Failures / rate limits**: batch calls can 429 or error; reuse the retry+backoff discipline from the streaming topic. Critically, a failed batch means **missing vectors** — track which records succeeded so you don't end up with an index full of holes.\n- **Cost**: per input token; don't **re-embed unchanged text** — hash the content and skip re-embedding when it hasn't changed (embeddings are deterministic-enough per model that re-running wastes money).\n- **Reproducibility**: the model + its version defines the space; pin/record which model produced your vectors, because **changing the model invalidates the whole index** (next callout).",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Changing the embedding model invalidates every existing vector",
    md: "If you re-embed queries with a new model but keep documents embedded by the old one, you're comparing across incompatible spaces — search silently returns garbage. Upgrading the embedding model is not a config tweak; it requires **re-embedding the entire corpus** with the new model so documents and queries share one space again. Record which model+version produced each index so you know when a re-embed is required. (This is the operational face of last topic's 'each model has its own space'.)",
  },
  {
    type: "quiz",
    question: "You migrate to a newer, better embedding model but keep the existing document vectors (embedded with the old model) to save time. What happens to search quality?",
    choices: [
      "It improves, since the new model is better",
      "It collapses — queries embedded by the new model live in a different space than the old document vectors, so similarities are meaningless; you must re-embed the whole corpus with the new model",
      "Nothing changes",
      "Only new documents are affected",
    ],
    answerIndex: 1,
    explanation: "Documents and queries must share one embedding space. Mixing an old-model index with new-model queries compares incompatible coordinate systems, producing nonsense rankings. A model change means re-embedding the entire corpus.",
  },
  {
    type: "quiz",
    question: "Embedding 50,000 documents, you notice everything is oddly similar to everything and retrieval is useless. Which cause should you check FIRST?",
    choices: [
      "The similarity metric is wrong",
      "What string you actually embedded — e.g. you embedded metadata/IDs or an identical template header instead of the document content, so vectors reflect boilerplate, not meaning",
      "The vector database is too small",
      "You need more dimensions",
    ],
    answerIndex: 1,
    explanation: "Uniform similarity across everything is the signature of embedding the wrong text — shared boilerplate, metadata, or IDs — so all vectors point the same way. Inspect the exact input string per record; embed the semantic content and keep metadata as separate fields.",
  },
  {
    type: "takeaways",
    items: [
      "Pipeline: text → (one, consistent) embedding model → vector. Documents AND queries must use the same model/space.",
      "Batch by passing a list as input; results come back in order; you're billed per input token.",
      "Dimensions and normalization are model-specific — don't hardcode 1536, don't assume unit length; prefer cosine (scale-invariant).",
      "Store id + vector + source text + metadata; embed the CONTENT, never IDs/metadata/boilerplate.",
      "Handle failures (missing vectors), skip re-embedding unchanged text, and re-embed the whole corpus when the model changes.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Produce real vectors and inspect them. If you have an embedding API key, use it; otherwise use a local model (`pip install sentence-transformers`) or reason precisely about dimensionality and ordering. The goal is to *see* text become fixed-length vectors.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Embed and inspect (guided)",
    intro: "Turn a handful of sentences into vectors and verify their shape.",
    steps: [
      { order: 1, action: "Embed 5 short sentences in ONE batched call (input as a list). Confirm you get 5 vectors back, in the same order.", expected: "len(vectors) == 5; each vector is the same length; order matches your input." },
      { order: 2, action: "Print the dimensionality (len of one vector) and note it's a property of the model you chose. Try a second model (or a smaller `dimensions=`) and observe the length changes.", decision: "If you embedded your documents with model A (dim N) and your queries with model B (dim M≠N), what breaks — and what if M==N by coincidence?" },
      { order: 3, action: "Check normalization: compute the L2 norm of a vector. Is it ~1.0 (unit-normalized) or not? Decide whether that affects your metric choice.", verify: "You can state your model's dimensionality and whether it returns unit-length vectors, and why cosine is the safe metric regardless." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "A batched call returns one vector per input, in order.",
      "You can state the model's dimensionality and that it's model-specific.",
      "You checked whether vectors are unit-normalized and know why cosine is scale-invariant.",
      "You can explain why doc and query models/dims must match.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Batch-embed a document set and store the vectors with IDs and metadata** — the deliverable. This is the ingestion half of a search system; you stop *before* similarity search (that's the next topic), but everything you store here is what search will run over.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — an embed-and-store pipeline",
    intro: "Acceptance defines done; design it yourself.",
    steps: [
      { order: 1, action: "Given a small corpus (a list of {id, text, metadata}), batch-embed the texts with ONE consistent model and store a record per document: stable id, vector, source text, metadata, and which model produced it.", decision: "What do you embed exactly — the raw text, or text combined with metadata? (Recall the 'embed the content, not the metadata' gotcha.) And why record the model name with each vector?" },
      { order: 2, action: "Handle failures and cost: retry transient errors; track which records got a vector and which didn't (no silent holes); and skip re-embedding text that hasn't changed (hash the content).", expected: "A store where every record has a vector or is explicitly marked failed; re-running doesn't re-embed unchanged text or re-bill you." },
      { order: 3, action: "Generate a QUERY embedding with the SAME model and confirm it has the same dimensionality as the document vectors — ready to hand to similarity search next topic.", verify: "Documents are stored with id+vector+text+metadata+model; a query vector is produced by the same model at matching dimensionality; failures are tracked, not hidden." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Each stored record has a stable id, the vector, source text, metadata, and the model name.",
      "You embed the content (not IDs/metadata); documents and queries use the same model.",
      "Failures are tracked (no missing-vector holes); unchanged text isn't re-embedded.",
      "A query vector is produced by the same model with matching dimensionality.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — batch embed + store (pluggable embedder)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import hashlib

MODEL = "text-embedding-3-small"

def embed_texts(client, texts: list[str]) -> list[list[float]]:
    resp = client.embeddings.create(model=MODEL, input=texts)  # batched
    return [d.embedding for d in resp.data]                    # in input order

def build_store(client, corpus: list[dict]) -> list[dict]:
    # corpus items: {"id": str, "text": str, "metadata": dict}
    texts = [c["text"] for c in corpus]                        # embed CONTENT only
    vectors = embed_texts(client, texts)
    store = []
    for c, v in zip(corpus, vectors):
        store.append({
            "id": c["id"],
            "vector": v,
            "text": c["text"],
            "metadata": c.get("metadata", {}),
            "model": MODEL,                                     # so we know the space
            "content_hash": hashlib.sha256(c["text"].encode()).hexdigest(),
        })
    return store

def embed_query(client, query: str) -> list[float]:
    return embed_texts(client, [query])[0]                     # SAME model -> same space`,
  },
];

export const content: TopicContent = {
  "unit-emb-generate-01": learn,
  "unit-emb-generate-02": practice,
  "unit-emb-generate-03": build,
};
