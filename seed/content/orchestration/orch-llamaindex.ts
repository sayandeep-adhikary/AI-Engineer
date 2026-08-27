import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "LlamaIndex for Data-Centric RAG" (topic-orch-llamaindex).
// 3 units: 01 learn (documents/nodes, indices, query engines, synthesis, Settings, storage,
// postprocessors; contrast with LangChain) · 02 practice (ingest & query a dataset) · 03 build
// (document Q&A app).
// Verified against current LlamaIndex (developers.llamaindex.ai): SimpleDirectoryReader,
// VectorStoreIndex.from_documents, as_query_engine().query(), Settings (replaced removed
// ServiceContext), storage_context.persist / load_index_from_storage, node parsers,
// postprocessors. Generation needs a model/key — local-model + inspection paths noted.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "LangChain gives you general composition primitives. **LlamaIndex** is built around one thing done extremely well: **connecting an LLM to your data.** If your application is fundamentally about *ingesting documents, indexing them, retrieving the right pieces, and synthesizing grounded answers*, LlamaIndex packages that entire data-centric pipeline into a few high-level calls — the same RAG pipeline you built by hand, with batteries included. This unit teaches its data model and where it fits versus LangChain.",
  },
  {
    type: "prose",
    md: "**Mental model: LlamaIndex is a data pipeline — `documents → nodes → index → query engine → response`.** You already know every stage (it's your RAG pipeline): load documents, chunk them into pieces, embed and store them, retrieve by similarity, and synthesize an answer from the retrieved pieces. LlamaIndex names these stages as first-class objects (`Document`, `Node`, `Index`, `QueryEngine`) and wires them for you, so `VectorStoreIndex.from_documents(docs)` does load→chunk→embed→store, and `index.as_query_engine()` does retrieve→synthesize.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Document", definition: "A unit of source data (a file, a web page, a DB row) loaded by a reader like SimpleDirectoryReader. Carries text + metadata." },
      { term: "Node", definition: "A chunk of a Document (LlamaIndex's 'chunk' from the chunking topic), with its own metadata and relationships. Produced by a node parser / splitter." },
      { term: "Index", definition: "A structure over nodes that enables retrieval — most commonly a VectorStoreIndex (embeddings + similarity). Built once, queried many times." },
      { term: "Query engine", definition: "The retrieve-then-synthesize interface: index.as_query_engine().query(q) retrieves relevant nodes and has the LLM compose a grounded answer with source_nodes for provenance." },
      { term: "Node postprocessor", definition: "A step that filters/re-ranks retrieved nodes before synthesis (e.g. a similarity cutoff or a reranker) — the framework version of your retrieval-quality stage." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "The whole data-centric pipeline in a few calls (current API)",
    code: `from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

# load -> chunk into Nodes -> embed -> index  (your P2 ingestion, batteries included)
documents = SimpleDirectoryReader("data").load_data()      # -> list[Document]
index = VectorStoreIndex.from_documents(documents)         # builds the index

# retrieve -> synthesize a grounded answer  (your build_context + generate)
query_engine = index.as_query_engine(similarity_top_k=5)
response = query_engine.query("What did the author study in college?")

print(str(response))            # the synthesized answer (model output)
for node in response.source_nodes:   # PROVENANCE: which chunks grounded the answer
    print(node.node_id, round(node.score, 3), node.metadata)`,
    output: `# answer text is model output (varies); source_nodes give retrieved chunks + scores`,
  },
  {
    type: "prose",
    md: "Notice how much is hidden: chunking (a default node parser), embedding (a default embed model), the vector store, retrieval, and answer synthesis all happen inside two calls. That's the appeal — and the thing you must be able to *open up* when results are poor. `response.source_nodes` is your window into retrieval: it shows exactly which chunks were fed to the model, so you can tell a retrieval problem from a synthesis problem (the same earliest-stage-first debugging as raw RAG).",
  },
  {
    type: "prose",
    md: "**Configuring the pipeline — `Settings`, node parsers, postprocessors, storage:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Global config, chunking, filtering, and persistence",
    code: `from llama_index.core import Settings, StorageContext, load_index_from_storage
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

# Settings = global defaults (this REPLACED the removed ServiceContext).
Settings.llm = OpenAI(model="gpt-4o-mini")                 # use your current model id
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)   # your chunking knobs

# No API key? Use local models instead (keyless path):
#   from llama_index.embeddings.huggingface import HuggingFaceEmbedding
#   from llama_index.llms.ollama import Ollama
#   Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
#   Settings.llm = Ollama(model="llama3.2")

# Filter weak chunks before synthesis (retrieval-quality stage, framework version):
query_engine = index.as_query_engine(
    similarity_top_k=8,
    node_postprocessors=[SimilarityPostprocessor(similarity_cutoff=0.7)],
)

# Persist so you don't re-embed every run:
index.storage_context.persist("storage")
index = load_index_from_storage(StorageContext.from_defaults(persist_dir="storage"))`,
  },
  {
    type: "callout",
    variant: "note",
    title: "LlamaIndex vs LangChain — different centers of gravity",
    md: "They overlap on RAG, but their *strengths* differ:\n\n- **LlamaIndex** is **data-centric**: readers/connectors for many sources, first-class documents/nodes/indices, and batteries-included query engines with response synthesis. Reach for it when the app is fundamentally about **ingesting, indexing, retrieving, and querying knowledge** — document Q&A, knowledge bases, data-heavy RAG.\n- **LangChain** is **composition-centric**: a general Runnable/LCEL model for chaining prompts, models, tools, retrievers, and agents. Reach for it when the app is about **general multi-step orchestration**, tools, and agent behavior.\n\n**Overlap:** both do RAG; LlamaIndex retrievers/indices can plug into LangChain, and vice-versa. **Why choose one:** pick LlamaIndex when data ingestion/indexing is the hard part and you want strong defaults; pick LangChain when composition/tools/agents are the hard part. Many real systems use both — LlamaIndex for the retrieval layer, LangChain/LangGraph for the surrounding orchestration. It's not either/or, and duplicating the *same* pipeline in both frameworks needlessly is a real anti-pattern (this topic's common mistake)."
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "The high-level API hides cost and behavior — know what to open",
    md: "- **Defaults call a provider.** `VectorStoreIndex.from_documents(...)` embeds every chunk and `as_query_engine()` calls an LLM — by default OpenAI, which **needs a key and costs money**. On a large corpus this is a surprising bill. Configure `Settings` (or local models) deliberately.\n- **Not persisting = re-embedding every run.** Without `storage_context.persist(...)`, each run rebuilds the index from scratch (slow, costly). Persist and reload — the same 'embed once' rule from the vector-DB topics.\n- **`ServiceContext` is removed.** Old tutorials pass `service_context=...`; the current API is the global **`Settings`** (or per-call overrides). Copying ServiceContext code will break.\n- **Response synthesis mode matters.** Query engines synthesize answers in modes (e.g. `compact`, `refine`, `tree_summarize`) that trade cost/latency/quality and make *multiple* LLM calls over many nodes — surprising if you expected one call.\n- **A too-aggressive postprocessor returns nothing.** A high `similarity_cutoff` can filter out every node, yielding an empty/'I don't know' answer even when relevant chunks exist — the candidate-truncation trap in a new costume.\n\nWhen answers are poor, **inspect `response.source_nodes` first**: if the right chunk isn't there, it's retrieval (chunking/embedding/top_k/cutoff); if it is there but the answer is wrong, it's synthesis."
  },
  {
    type: "quiz",
    question: "A LlamaIndex query engine returns a vague, wrong answer. You print response.source_nodes and the correct chunk is NOT among them. Which layer do you fix?",
    choices: [
      "The LLM — switch to a bigger model or tune the prompt",
      "The RETRIEVAL layer — the answer's evidence never reached synthesis. Inspect chunking (node parser / chunk_size), the embed model, similarity_top_k, and any postprocessor cutoff that may be filtering it out. No synthesis/model change fixes missing evidence",
      "The storage format",
      "Nothing — LlamaIndex answers are always approximate",
    ],
    answerIndex: 1,
    explanation: "source_nodes shows what the synthesizer actually received. If the correct chunk is absent, it's a retrieval failure — chunking, embeddings, top_k, or an over-aggressive similarity cutoff. Changing the model or prompt can't ground on evidence that was never retrieved. This is the same 'retrieval is upstream of generation' rule, surfaced through LlamaIndex's objects.",
  },
  {
    type: "quiz",
    question: "You're building an app whose core challenge is ingesting 12 different document sources, indexing them well, and answering questions with citations. Which framework is the more natural primary fit, and why?",
    choices: [
      "LangChain, because it's more popular",
      "LlamaIndex — the app is data-centric (ingestion, indexing, retrieval, querying), which is exactly its strength: readers/connectors, documents/nodes/indices, and batteries-included query engines with source_nodes for citations. You could still add LangChain/LangGraph for surrounding orchestration",
      "Neither can do retrieval",
      "You must use both fully or the app won't work",
    ],
    answerIndex: 1,
    explanation: "When the hard part is data — many sources, indexing, retrieval, grounded querying — LlamaIndex's data-centric design and strong defaults fit naturally, and source_nodes give provenance for citations. It isn't exclusive: LangChain/LangGraph can orchestrate around a LlamaIndex retrieval core. Choosing by the app's center of gravity (data vs composition) is the point.",
  },
  {
    type: "takeaways",
    items: [
      "LlamaIndex is a data pipeline: documents → nodes → index → query engine → response (your RAG pipeline, batteries included).",
      "VectorStoreIndex.from_documents = load→chunk→embed→store; as_query_engine().query() = retrieve→synthesize; response.source_nodes = provenance.",
      "Configure via Settings (llm/embed_model/node_parser) — Settings REPLACED the removed ServiceContext; persist to avoid re-embedding.",
      "LlamaIndex = data-centric (ingest/index/retrieve/query); LangChain = composition-centric (chains/tools/agents); they overlap on RAG and compose together.",
      "Defaults call a provider (cost!); synthesis modes make multiple LLM calls; an aggressive similarity_cutoff can return nothing — inspect source_nodes to split retrieval from synthesis.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Ingest a small dataset and query it — then open the box and inspect what was retrieved. The completion criterion is 'queries return grounded answers,' which means you must verify grounding via `source_nodes`, not just read the answer.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Ingest and query, then inspect (guided)",
    intro: "Build the pipeline and verify grounding. Local models make this keyless.",
    steps: [
      { order: 1, action: "Put a few text files in a folder. Load with SimpleDirectoryReader, build a VectorStoreIndex, and query it. Configure Settings for local models if you have no API key. Print the answer.", expected: "A synthesized answer to a question your documents can support." },
      { order: 2, action: "Print response.source_nodes: the retrieved chunks, their scores, and metadata. Confirm the answer is actually grounded in those chunks (spot-check a claim against a source node).", decision: "If the answer looks right but a claim isn't in any source_node, what does that tell you about grounding vs fluency?" },
      { order: 3, action: "Change similarity_top_k and add a SimilarityPostprocessor cutoff; observe how the retrieved node set (and the answer) changes. Push the cutoff too high and watch results vanish.", verify: "You produced grounded answers, inspected source_nodes to confirm grounding, and saw how top_k / cutoff change retrieval." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "A dataset ingested into a VectorStoreIndex and queried.",
      "You inspected source_nodes (chunks + scores + metadata) to confirm grounding.",
      "You changed top_k / similarity_cutoff and observed the effect on retrieval.",
      "You can distinguish a grounded answer from a fluent-but-unsupported one.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a document Q&A app with LlamaIndex** — the app answers questions from *your* documents with grounding. This is the data-centric counterpart to your LangChain RAG build: same problem, LlamaIndex idioms, with persistence so it's not re-embedding on every run.",
  },
  {
    type: "callout",
    variant: "note",
    title: "What 'done' looks like",
    md: "A document Q&A that: ingests a real document set, persists its index, answers questions grounded in the documents, and exposes provenance (`source_nodes`) so answers are traceable. Configure `Settings` deliberately (model + embeddings + chunking), persist and reload the index (embed once), and keep generation optional/inspectable where possible. Read keys from the environment; never hard-code them. Local models make the whole thing runnable without a paid key."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — grounded document Q&A",
    intro: "Acceptance defines done. Configure deliberately; persist; verify grounding.",
    steps: [
      { order: 1, action: "Ingest a document set (SimpleDirectoryReader or an appropriate reader), configure Settings (llm, embed_model, node_parser/chunk size), build a VectorStoreIndex, and PERSIST it. Reload from storage on subsequent runs.", decision: "What chunk size/overlap suits your documents (recall the chunking topic), and why must you persist rather than rebuild each run?" },
      { order: 2, action: "Expose a query interface that returns the answer AND its source_nodes. Verify answers are grounded (claims traceable to source_nodes) and that an unanswerable question doesn't get a confidently fabricated answer.", expected: "Grounded, source-cited answers over your documents; unsupported questions handled honestly." },
      { order: 3, action: "Tune one retrieval knob (top_k, cutoff, or chunk size) using source_nodes as evidence, and note the cost/behavior of the response synthesis mode. Keep secrets in env vars.", verify: "A persisted document Q&A that answers from your docs with traceable provenance, deliberately configured, with retrieval tuned by inspecting source_nodes." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Ingests a real document set; index persisted and reloaded (embed once, not every run).",
      "Answers are grounded and expose source_nodes for provenance; unsupported questions handled honestly.",
      "Settings configured deliberately (model, embeddings, chunking); secrets via env vars.",
      "At least one retrieval knob tuned using source_nodes as evidence.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — persisted document Q&A with provenance",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os
from llama_index.core import (VectorStoreIndex, SimpleDirectoryReader, Settings,
                              StorageContext, load_index_from_storage)
from llama_index.core.node_parser import SentenceSplitter

Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)
# Configure Settings.llm / Settings.embed_model for your provider (or local models).
# Keys come from the environment — never hard-code them.

PERSIST_DIR = "storage"

def build_or_load_index():
    if os.path.exists(PERSIST_DIR):                        # embed ONCE, then reload
        return load_index_from_storage(
            StorageContext.from_defaults(persist_dir=PERSIST_DIR))
    documents = SimpleDirectoryReader("data").load_data()
    index = VectorStoreIndex.from_documents(documents)
    index.storage_context.persist(PERSIST_DIR)
    return index

def ask(index, question, k=5):
    engine = index.as_query_engine(similarity_top_k=k)
    response = engine.query(question)
    return {
        "answer": str(response),
        "sources": [                                       # provenance for grounding
            {"node_id": n.node_id, "score": round(n.score or 0, 3),
             "metadata": n.metadata, "preview": n.get_content()[:120]}
            for n in response.source_nodes
        ],
    }

# index = build_or_load_index()
# result = ask(index, "What does the document say about refunds?")
# print(result["answer"]); print(result["sources"])   # verify answer is grounded in sources`,
  },
];

export const content: TopicContent = {
  "unit-orch-llamaindex-01": learn,
  "unit-orch-llamaindex-02": practice,
  "unit-orch-llamaindex-03": build,
};
