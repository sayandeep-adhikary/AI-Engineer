import type { ProjectGuide } from "../../types";

// Project guide for P3 — Production-Style RAG Application (project-p3-rag-app).

export const guide: ProjectGuide = {
  overview:
    "Build the canonical AI-engineer deliverable: a **grounded question-answering system** over a real document set that retrieves relevant evidence for each question, generates an answer *from that evidence*, cites its sources, is evaluated for quality, and is served behind an API — not a demo notebook. A user asks 'what is our refund window for enterprise customers?' and gets a correct, source-cited answer drawn from the actual policy docs, or an honest 'I don't have enough information' when the evidence isn't there.\n\nThis project sits on top of the retrieval backbone from P2 and adds the three things that make RAG real: **grounded generation with citations**, **evaluation** (so you can prove it works and catch regressions), and a **served API**. The core lesson is that RAG is four separable stages — retrieval, context construction, generation, evaluation — that fail independently, and an engineer debugs from the earliest failing stage rather than blaming the prompt.",
  scenario:
    "Support agents waste hours hunting through policy and product docs to answer customer questions, and different agents give different answers. You are asked to build an internal assistant that answers questions from the company's documents with citations, so agents can trust and verify each answer.\n\nA plain LLM can't do this: it doesn't know your private docs and will confidently hallucinate. Fine-tuning the knowledge in is expensive and stale the moment a doc changes. RAG is the right tool — retrieve the relevant passages at query time and make the model answer only from them, with citations so a human can verify. The real constraints: answers must be grounded (no invented policy), the system must say 'I don't know' when evidence is missing, quality must be measured (a prompt tweak shouldn't silently regress it), and it must be callable as a service.",
  whatYouBuild:
    "A RAG pipeline wrapped in an API. It reuses P2's retrieval, adds context assembly, grounded generation with citations, an evaluation harness, and a served endpoint (with a basic UI). It answers from evidence and abstains when evidence is insufficient.",
  architecture: `                 Documents ---> [P2 retrieval backbone]
                                        |
User question ---> API ---> Retrieve (top-k, filtered, hybrid)
                              |
                              v
                     Context construction    <- select, dedup, budget, order
                              |
                              v
                     Generation (LLM)         <- answer ONLY from context
                              |
                     +--------+--------+
                     v                 v
              Answer + citations   "insufficient evidence"
                     |
                     v
               API response ---> Basic UI
                     |
              Evaluation harness (offline)  <- retrieval + groundedness + relevance`,
  components: [
    "**Retrieval** — the P2 backbone (vector DB, filtering, hybrid, rerank) returning top-k evidence chunks.",
    "**Context construction** — selects, deduplicates, budgets and orders the retrieved chunks into the prompt; preserves provenance for citations.",
    "**Generation** — an LLM prompted to answer ONLY from the provided context, cite sources, and abstain when evidence is missing.",
    "**Citations** — each answer links back to the source chunks it used, so a human can verify.",
    "**Evaluation harness** — an offline suite scoring retrieval quality and answer groundedness/relevance against a golden set.",
    "**API + UI** — a FastAPI service exposing an `/ask` endpoint (ideally streaming) and a basic UI to ask questions and see answers with sources.",
  ],
  learningObjectives: [
    "RAG architecture (four stages)",
    "Grounded generation",
    "Citations & provenance",
    "Context construction",
    "Retrieval quality",
    "RAG evaluation (groundedness, relevance)",
    "Handling missing evidence",
    "Prompt injection via documents",
    "API design (FastAPI)",
    "Failure-stage debugging",
  ],
  prerequisites: {
    required: [
      "You completed the RAG topics and understand retrieve → context → generate.",
      "You have P2's retrieval (or equivalent) available to build on.",
      "You can make structured LLM calls and handle errors (P1-level reliability).",
    ],
    helpful: [
      "Familiarity with FastAPI and async endpoints (you can learn it here).",
      "Awareness of Ragas-style metrics (faithfulness, context precision/recall).",
      "Basic front-end skills for the minimal UI (optional).",
    ],
  },
  techStack: [
    { layer: "Language", choice: "Python 3.11+", why: "The RAG + serving ecosystem lives here." },
    { layer: "Retrieval", choice: "Your P2 vector DB / Azure AI Search", why: "Reuse the backbone; don't rebuild retrieval." },
    { layer: "Orchestration", choice: "Direct SDK calls, or LangChain / LlamaIndex", why: "A framework speeds wiring but hide it behind your own seams; direct calls keep control. Your choice." },
    { layer: "Model", choice: "A current chat model (provider's current id, in config)", why: "Generation quality matters; keep the id swappable and evaluate cost vs quality." },
    { layer: "API", choice: "FastAPI + Uvicorn", why: "Async, validated, documented endpoints with streaming (SSE) support." },
    { layer: "Evaluation", choice: "A golden Q/A set + retrieval metrics + an LLM-as-judge (Ragas-style)", why: "Turns 'seems good' into measured groundedness/relevance and catches regressions." },
    { layer: "UI", choice: "A minimal web page or Streamlit", why: "Enough to ask a question and see the answer + sources; not the focus." },
  ],
  functionalRequirements: [
    "The system ingests a real document set (reusing P2's ingestion) into the retrieval backbone.",
    "Given a question, it retrieves the top-k relevant chunks (filtered/hybrid as in P2).",
    "It constructs the context deliberately: selects, deduplicates, budgets to a token limit, and orders the chunks — not a raw dump.",
    "It generates an answer that uses ONLY the retrieved context and does not invent facts.",
    "Every answer includes citations pointing to the source chunks/documents it used.",
    "When retrieval finds insufficient evidence, the system abstains ('I don't have enough information') instead of guessing.",
    "Retrieved document text is treated as untrusted data — an instruction embedded in a document cannot change the system's behavior.",
    "The pipeline is exposed via a FastAPI `/ask` endpoint with validated input and safe errors; streaming is supported.",
    "A basic UI lets a user ask a question and see the answer with its sources.",
    "An evaluation harness scores retrieval quality and answer groundedness/relevance over a golden Q/A set.",
    "The four stages (retrieval, context, generation, evaluation) are separable so a failure can be localized to one.",
  ],
  nonFunctionalRequirements: [
    "Groundedness first — the system must prefer abstaining over hallucinating.",
    "Input validation and safe errors at the API boundary (no leaked internals or secrets).",
    "Untrusted document content is isolated from instructions (prompt-injection defense).",
    "Answer latency is acceptable and streaming reduces time-to-first-token.",
    "Cost per answer is tracked; context size is bounded to control spend.",
    "Quality is measured and regressions are catchable before shipping a change.",
    "Provenance is preserved end to end so every claim is traceable to a source.",
  ],
  phases: [
    {
      name: "Grounded pipeline",
      intro: "Retrieve → context → generate, with citations.",
      tasks: [
        "Wire P2 retrieval into a pipeline that returns top-k chunks with provenance.",
        "Build context construction: select, dedup, budget, order; keep source ids.",
        "Prompt the model to answer only from context, cite sources, and abstain when evidence is thin.",
      ],
    },
    {
      name: "Serve it",
      tasks: [
        "Expose an `/ask` FastAPI endpoint with input validation and safe errors.",
        "Add streaming (SSE) for responsive answers; load the retriever once at startup.",
        "Build a basic UI that shows the answer and its sources.",
      ],
    },
    {
      name: "Evaluate",
      intro: "Prove it works and catch regressions.",
      tasks: [
        "Create a golden Q/A set with known answers and source passages.",
        "Measure retrieval quality (hit-rate / precision@k) and answer groundedness/relevance.",
        "Identify failure cases and attribute each to a stage (retrieval vs context vs generation).",
      ],
    },
    {
      name: "Harden retrieval & context",
      tasks: [
        "Add reranking / hybrid where evaluation shows retrieval misses.",
        "Isolate untrusted document content from instructions; test an injection attempt.",
        "Tune top-k, chunking and context budget against the eval set.",
      ],
    },
    {
      name: "Advanced pattern & polish",
      tasks: [
        "Apply one advanced RAG pattern for a measured gap (query rewriting, parent-child, multi-stage).",
        "Add cost/latency tracking per answer.",
        "Write the README + architecture doc; record quality numbers and limitations.",
      ],
    },
  ],
  checklist: [
    "Ingest the document set into the retrieval backbone",
    "Retrieve top-k chunks with provenance",
    "Build deliberate context construction (select/dedup/budget/order)",
    "Prompt for grounded, cited answers",
    "Implement 'insufficient evidence' abstention",
    "Isolate untrusted document content from instructions",
    "Expose an `/ask` FastAPI endpoint with validation + safe errors",
    "Add streaming (SSE)",
    "Build a basic UI showing answer + sources",
    "Create a golden Q/A evaluation set",
    "Measure retrieval quality (hit-rate / precision@k)",
    "Measure groundedness / relevance",
    "Attribute failures to a stage",
    "Add reranking / hybrid where retrieval misses",
    "Apply one advanced RAG pattern for a measured gap",
    "Track cost/latency per answer",
    "Write README + architecture doc",
  ],
  projectStructure: `rag-application/
  src/
    retrieval/        # reuse P2 backbone
    context/
      assemble.py     # select, dedup, budget, order
    generate/
      prompt.py       # answer-only-from-context + citations + abstain
      generate.py
    api/
      main.py         # FastAPI: /ask (+ streaming), /health
      schemas.py
    ui/               # minimal page or Streamlit
  eval/
    golden.jsonl      # question -> answer + source passages
    run_eval.py       # retrieval + groundedness/relevance
  README.md
  ARCHITECTURE.md`,
  decisions: [
    {
      decision: "How much context to pass",
      options: "Top-k raw dump · deliberate select/dedup/budget · large-context everything.",
      tradeoff: "More context is not better — it dilutes the signal (lost-in-the-middle), raises cost, and increases injection surface. Deliberate, budgeted context of a few high-signal chunks usually beats a big dump. Measure against the eval set.",
    },
    {
      decision: "Abstain threshold",
      options: "Always answer · abstain when top similarity is low · abstain when the model says evidence is insufficient.",
      tradeoff: "Answering always maximizes coverage but invites hallucination; abstaining too eagerly frustrates users. Combine a retrieval-score floor with a model-side 'insufficient evidence' instruction, tuned so false answers are rare.",
    },
    {
      decision: "Framework vs direct SDK",
      options: "LangChain/LlamaIndex · direct SDK calls.",
      tradeoff: "A framework speeds wiring and gives ready components but hides behavior and adds churn; direct calls keep control and clarity. Either is fine — hide the choice behind your own seams so it's reversible, and don't let the framework obscure which stage failed.",
    },
    {
      decision: "Streaming vs non-streaming API",
      options: "Stream tokens (SSE) · return the whole answer.",
      tradeoff: "Streaming cuts perceived latency and suits chat UIs, but complicates citation assembly and error handling mid-stream. Support both; make the citations resolve on completion.",
    },
    {
      decision: "Judge-based eval vs deterministic checks",
      options: "LLM-as-judge for groundedness/relevance · deterministic retrieval metrics · both.",
      tradeoff: "Deterministic retrieval metrics are cheap and stable but don't measure answer quality; an LLM judge measures groundedness but is itself fallible and must be validated against human labels. Use both — anchor with a golden set.",
    },
  ],
  gotchas: [
    "Dumping top-20 chunks into the prompt — dilution and lost-in-the-middle lower answer quality; construct context deliberately.",
    "No abstention path — the model hallucinates a confident answer when evidence is missing.",
    "Trusting retrieved text as instructions — a document saying 'ignore your rules' must be treated as data, not a command.",
    "Citations that don't actually match the claim — verify provenance, not just that a source is attached.",
    "Prompt-tuning broken retrieval — most RAG failures are retrieval failures; fix the earliest failing stage first.",
    "Evaluating on a handful of cherry-picked questions — build a real golden set and measure.",
    "Ignoring token/context budget — cost balloons and quality drops as context grows.",
    "Leaking internal errors or the raw prompt through the API — return safe, typed errors.",
    "Re-embedding with a different model than the corpus — silent relevance collapse (from P2).",
  ],
  testing: {
    functional: [
      "A question with a clear answer returns a correct, cited answer.",
      "A question with no supporting evidence returns an honest abstention.",
      "The `/ask` endpoint validates input and streams a response.",
      "Citations resolve to the actual passages used.",
    ],
    edgeCases: [
      "Ambiguous questions, multi-part questions, and questions about excluded documents.",
      "A document containing an injected instruction does not change behavior.",
      "Very long questions and empty questions are handled.",
      "A question whose evidence is split across multiple documents.",
    ],
    failureModes: [
      "Retrieval backend down → safe error, not a hallucinated answer.",
      "LLM timeout / rate-limit → retried or surfaced cleanly; stream closes gracefully.",
      "Model returns an ungrounded answer → caught by evaluation and flagged.",
      "No relevant chunks found → abstention, not a guess.",
    ],
    aiEvaluation: [
      "Retrieval: hit-rate / precision@k / recall on the golden set.",
      "Groundedness / faithfulness: does the answer stay within the retrieved evidence?",
      "Answer relevance: does it actually address the question?",
      "Abstention correctness: does it decline when it should?",
      "Cost and latency per answer.",
    ],
  },
  definitionOfDone: [
    "The full retrieve → context → generate pipeline works and cites sources.",
    "Answers are grounded; the system abstains when evidence is insufficient.",
    "Untrusted document content cannot hijack the system (injection test passes).",
    "A FastAPI `/ask` endpoint serves answers (with streaming) and a basic UI works end to end.",
    "An evaluation harness measures retrieval quality and groundedness/relevance on a golden set.",
    "Failures can be attributed to a specific stage.",
    "Cost and latency per answer are tracked; context is budgeted.",
    "One advanced RAG pattern is applied for a measured gap.",
    "README + architecture doc explain the system, quality numbers and limitations.",
  ],
  expectedOutcome:
    "The flagship mid-roadmap deliverable: a grounded, evaluated, served RAG application — the exact system most 'AI engineer' job posts describe. You will have a portfolio piece that answers real questions from real documents with citations, proves its quality with an eval harness, and is reused as the foundation of the production service in P6.",
  outcomeArtifacts: [
    "A grounded RAG pipeline with citations and abstention",
    "A FastAPI service with streaming + a basic UI",
    "A golden Q/A evaluation set + eval harness",
    "Retrieval + groundedness/relevance quality numbers",
    "An injection-defense demonstration",
    "README + architecture documentation",
    "A demo-ready GitHub repository",
  ],
  stretchGoals: [
    "Conversational memory (multi-turn follow-ups with context).",
    "Query rewriting / multi-query retrieval for recall.",
    "Reranking + parent-child (small-to-big) retrieval.",
    "An eval gate in CI that fails on a groundedness/quality regression.",
    "Feedback capture (thumbs up/down) feeding evaluation.",
    "Deploy it (bridges directly into P6).",
  ],
  skillsDemonstrated: [
    "RAG application engineering",
    "Grounded generation & citations",
    "Retrieval quality & context construction",
    "AI evaluation (groundedness/relevance)",
    "Prompt-injection defense",
    "API design (FastAPI, streaming)",
    "Failure-stage debugging",
  ],
  portfolio:
    "RAG is the single most-requested AI-engineering capability, and most portfolio RAG apps are ungrounded, unevaluated demos. This proves you can build the *real* thing: grounded answers with citations, honest abstention, injection defense, a measured eval harness, and a served API. A reviewer sees that you can ship a trustworthy knowledge system and prove it works — the core of the job.",
};
