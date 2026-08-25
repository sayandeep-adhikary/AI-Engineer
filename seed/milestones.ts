import type { ProjectMilestone } from "./types";

// Ordered milestones — the progress units for projects. Each references its
// project and related curriculum topics. No runtime/activity events here.
export const milestones: ProjectMilestone[] = [
  // P1 — Structured-Output Utility
  { id: "milestone-p1-01", projectId: "project-p1-structured-output", order: 1, title: "Call model & parse response", description: "Make a working chat call and read the response/usage.", completionCriteria: "The tool returns and parses a model response.", relatedTopicIds: ["topic-api-first-call"] },
  { id: "milestone-p1-02", projectId: "project-p1-structured-output", order: 2, title: "Enforce pydantic schema + validation", description: "Return schema-valid, validated structured output.", completionCriteria: "Every output validates against a pydantic schema.", relatedTopicIds: ["topic-api-structured-output"] },
  { id: "milestone-p1-03", projectId: "project-p1-structured-output", order: 3, title: "Retries / backoff", description: "Add resilient error handling with backoff.", completionCriteria: "Transient failures recover automatically.", relatedTopicIds: ["topic-api-streaming-robustness", "topic-py-errors-logging"] },
  { id: "milestone-p1-04", projectId: "project-p1-structured-output", order: 4, title: "Streaming + token/cost tracking", description: "Stream output and log token usage/cost.", completionCriteria: "Streaming works and cost is logged.", relatedTopicIds: ["topic-api-streaming-robustness"] },
  { id: "milestone-p1-05", projectId: "project-p1-structured-output", order: 5, title: "Provider-swappable (OpenAI↔Azure)", description: "Select provider via configuration.", completionCriteria: "The same logic runs on OpenAI and Azure OpenAI.", relatedTopicIds: ["topic-api-first-call"] },

  // P2 — Semantic Search Engine (evolves topic 4.5)
  { id: "milestone-p2-01", projectId: "project-p2-semantic-search", order: 1, title: "Import semantic-search core", description: "Start from the 4.5 semantic-search-core artifact.", completionCriteria: "The existing core runs as the starting point (no rebuild).", relatedTopicIds: ["topic-emb-semantic-search-project"] },
  { id: "milestone-p2-02", projectId: "project-p2-semantic-search", order: 2, title: "Move to a vector database", description: "Migrate storage to a real vector DB.", completionCriteria: "Search runs on a persistent vector database.", relatedTopicIds: ["topic-vdb-hands-on"] },
  { id: "milestone-p2-03", projectId: "project-p2-semantic-search", order: 3, title: "Add metadata filtering", description: "Filter results by metadata.", completionCriteria: "Filters correctly scope search results.", relatedTopicIds: ["topic-vdb-metadata-hybrid"] },
  { id: "milestone-p2-04", projectId: "project-p2-semantic-search", order: 4, title: "Add hybrid search + reranking", description: "Fuse keyword + vector and rerank.", completionCriteria: "Hybrid search improves relevance over vector-only.", relatedTopicIds: ["topic-vdb-metadata-hybrid"] },
  { id: "milestone-p2-05", projectId: "project-p2-semantic-search", order: 5, title: "Documentation & polish", description: "Document usage and polish for portfolio.", completionCriteria: "Repo has clear docs and a usable interface.", relatedTopicIds: ["topic-emb-semantic-search-project"] },

  // P3 — Production-Style RAG Application
  { id: "milestone-p3-01", projectId: "project-p3-rag-app", order: 1, title: "Basic RAG with citations", description: "End-to-end RAG that cites sources.", completionCriteria: "App answers from docs with citations.", relatedTopicIds: ["topic-rag-basic-pipeline"] },
  { id: "milestone-p3-02", projectId: "project-p3-rag-app", order: 2, title: "Reranked hybrid retrieval", description: "Improve retrieval with hybrid + rerank.", completionCriteria: "Retrieval relevance measurably improves.", relatedTopicIds: ["topic-rag-quality", "topic-vdb-metadata-hybrid"] },
  { id: "milestone-p3-03", projectId: "project-p3-rag-app", order: 3, title: "Evaluation harness", description: "Measure faithfulness and relevance.", completionCriteria: "A repeatable eval catches regressions.", relatedTopicIds: ["topic-rag-evaluation"] },
  { id: "milestone-p3-04", projectId: "project-p3-rag-app", order: 4, title: "API + basic UI", description: "Serve the RAG app with an interface.", completionCriteria: "The app is served via an API with a basic UI.", relatedTopicIds: ["topic-prod-api"] },
  { id: "milestone-p3-05", projectId: "project-p3-rag-app", order: 5, title: "Apply an advanced pattern", description: "Add one advanced RAG pattern where needed.", completionCriteria: "The pattern closes a real, measured gap.", relatedTopicIds: ["topic-rag-advanced-patterns"] },

  // P4 — Tool-Using Agent
  { id: "milestone-p4-01", projectId: "project-p4-agent", order: 1, title: "Tool calling with 2–3 tools", description: "Agent reliably calls real tools.", completionCriteria: "Agent uses tools to complete tasks.", relatedTopicIds: ["topic-agent-tool-calling"] },
  { id: "milestone-p4-02", projectId: "project-p4-agent", order: 2, title: "Multi-step planning + memory", description: "Add memory and bounded planning.", completionCriteria: "Agent completes multi-step tasks with memory.", relatedTopicIds: ["topic-agent-memory-planning"] },
  { id: "milestone-p4-03", projectId: "project-p4-agent", order: 3, title: "Guardrails / injection defenses", description: "Add safety and injection defenses.", completionCriteria: "Agent resists injection and unsafe actions.", relatedTopicIds: ["topic-sec-prompt-injection", "topic-sec-guardrails"] },
  { id: "milestone-p4-04", projectId: "project-p4-agent", order: 4, title: "Step/cost limits", description: "Bound autonomy with limits.", completionCriteria: "Agent terminates within step/cost budget.", relatedTopicIds: ["topic-agent-memory-planning"] },
  { id: "milestone-p4-05", projectId: "project-p4-agent", order: 5, title: "Observability / tracing", description: "Instrument the agent with traces.", completionCriteria: "Agent runs are traceable end-to-end.", relatedTopicIds: ["topic-eval-observability"] },

  // P5 — Multimodal Application
  { id: "milestone-p5-01", projectId: "project-p5-multimodal", order: 1, title: "Single-modality feature", description: "Build a first vision or audio feature.", completionCriteria: "A working single-modality feature ships.", relatedTopicIds: ["topic-mm-vision", "topic-mm-speech-audio"] },
  { id: "milestone-p5-02", projectId: "project-p5-multimodal", order: 2, title: "Structured extraction", description: "Extract structured data from media.", completionCriteria: "Media is turned into validated structured data.", relatedTopicIds: ["topic-mm-vision"] },
  { id: "milestone-p5-03", projectId: "project-p5-multimodal", order: 3, title: "Multimodal RAG", description: "Answer grounded in figures/tables.", completionCriteria: "App answers from figures/tables of documents.", relatedTopicIds: ["topic-mm-multimodal-rag"] },
  { id: "milestone-p5-04", projectId: "project-p5-multimodal", order: 4, title: "Robustness pass", description: "Handle edge-case media.", completionCriteria: "App degrades gracefully on hard inputs.", relatedTopicIds: ["topic-mm-vision"] },

  // P6 — Production-Grade AI Service
  { id: "milestone-p6-01", projectId: "project-p6-production-service", order: 1, title: "API", description: "Wrap P3/P4 in a robust API.", completionCriteria: "A documented streaming API is live locally.", relatedTopicIds: ["topic-prod-api"] },
  { id: "milestone-p6-02", projectId: "project-p6-production-service", order: 2, title: "Container", description: "Containerize the service.", completionCriteria: "A lean reproducible image builds and runs.", relatedTopicIds: ["topic-prod-docker"] },
  { id: "milestone-p6-03", projectId: "project-p6-production-service", order: 3, title: "Azure deploy", description: "Deploy to Azure with secure config.", completionCriteria: "Service runs on Azure with Key Vault / managed identity.", relatedTopicIds: ["topic-prod-azure-ai", "topic-prod-cloud-deploy"] },
  { id: "milestone-p6-04", projectId: "project-p6-production-service", order: 4, title: "CI/CD + eval gate", description: "Automate deploy with an eval gate.", completionCriteria: "Pipeline tests, evals and deploys automatically.", relatedTopicIds: ["topic-prod-cicd-ops", "topic-eval-ci"] },
  { id: "milestone-p6-05", projectId: "project-p6-production-service", order: 5, title: "Monitoring + cost controls", description: "Add monitoring, caching and cost limits.", completionCriteria: "Latency/cost are monitored and controlled.", relatedTopicIds: ["topic-eval-observability", "topic-prod-scaling-cost"] },
  { id: "milestone-p6-06", projectId: "project-p6-production-service", order: 6, title: "Security hardening", description: "Apply guardrails and a security review.", completionCriteria: "A security review is complete with fixes applied.", relatedTopicIds: ["topic-sec-guardrails", "topic-sec-data-privacy"] },

  // P7 — Specialization Capstone
  { id: "milestone-p7-01", projectId: "project-p7-specialization", order: 1, title: "Choose niche & scope", description: "Pick a specialization and define scope.", completionCriteria: "A scoped niche project plan exists.", relatedTopicIds: ["topic-adv-specialization-capstone"] },
  { id: "milestone-p7-02", projectId: "project-p7-specialization", order: 2, title: "Build the system", description: "Implement the advanced niche system.", completionCriteria: "A working niche system is built.", relatedTopicIds: ["topic-adv-specialization-capstone", "topic-adv-context-engineering"] },
  { id: "milestone-p7-03", projectId: "project-p7-specialization", order: 3, title: "Write-up & portfolio polish", description: "Document and polish for portfolio.", completionCriteria: "A strong write-up accompanies the shipped project.", relatedTopicIds: ["topic-adv-specialization-capstone"] },
];
