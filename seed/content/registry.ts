import type { TopicContent } from "../types";

// The lazy-loading boundary for rich lesson content. Each entry maps a topic id
// to a dynamic import of that topic's content module. Vite/Rollup splits each
// import() target into its own chunk, so lesson content stays OUT of the main
// bundle and loads only when a learner opens a topic that has content.
//
// Authoring a new topic = create one module that exports `content: TopicContent`
// and add one line here. No other files change.

export interface TopicContentModule {
  content: TopicContent;
}

export const contentModules: Record<string, () => Promise<TopicContentModule>> = {
  "topic-py-core-syntax": () => import("./python-foundations/py-core-syntax"),
  "topic-py-data-structures": () => import("./python-foundations/py-data-structures"),
  "topic-py-functions-modules": () => import("./python-foundations/py-functions-modules"),
  "topic-py-env-tooling": () => import("./python-foundations/py-env-tooling"),
  "topic-py-async-http": () => import("./python-foundations/py-async-http"),
  "topic-py-errors-logging": () => import("./python-foundations/py-errors-logging"),
  "topic-py-data-libs": () => import("./python-foundations/py-data-libs"),
  "topic-llm-what-are": () => import("./llm-fundamentals/llm-what-are"),
  "topic-llm-tokens-context": () => import("./llm-fundamentals/llm-tokens-context"),
  "topic-llm-capabilities-limits": () => import("./llm-fundamentals/llm-capabilities-limits"),
  "topic-llm-landscape": () => import("./llm-fundamentals/llm-landscape"),
  "topic-llm-inference-params": () => import("./llm-fundamentals/llm-inference-params"),
  "topic-api-first-call": () => import("./llm-apis/api-first-call"),
  "topic-api-prompting-core": () => import("./llm-apis/api-prompting-core"),
  "topic-api-reasoning-patterns": () => import("./llm-apis/api-reasoning-patterns"),
  "topic-api-structured-output": () => import("./llm-apis/api-structured-output"),
  "topic-api-streaming-robustness": () => import("./llm-apis/api-streaming-robustness"),
  "topic-api-conversation-state": () => import("./llm-apis/api-conversation-state"),
  "topic-emb-concepts": () => import("./embeddings/emb-concepts"),
  "topic-emb-generate": () => import("./embeddings/emb-generate"),
  "topic-emb-similarity": () => import("./embeddings/emb-similarity"),
  "topic-emb-chunking": () => import("./embeddings/emb-chunking"),
  "topic-emb-semantic-search-project": () => import("./embeddings/emb-semantic-search-project"),
  "topic-vdb-concepts": () => import("./vector-databases/vdb-concepts"),
  "topic-vdb-hands-on": () => import("./vector-databases/vdb-hands-on"),
  "topic-vdb-metadata-hybrid": () => import("./vector-databases/vdb-metadata-hybrid"),
  "topic-vdb-azure-search": () => import("./vector-databases/vdb-azure-search"),
  "topic-py-optional-depth": () => import("./python-foundations/py-optional-depth"),
  "topic-rag-concepts": () => import("./rag/rag-concepts"),
  "topic-rag-basic-pipeline": () => import("./rag/rag-basic-pipeline"),
  "topic-rag-quality": () => import("./rag/rag-quality"),
  "topic-rag-evaluation": () => import("./rag/rag-evaluation"),
  "topic-rag-advanced-patterns": () => import("./rag/rag-advanced-patterns"),
  "topic-orch-why": () => import("./orchestration/orch-why"),
  "topic-orch-langchain": () => import("./orchestration/orch-langchain"),
  "topic-orch-llamaindex": () => import("./orchestration/orch-llamaindex"),
  "topic-orch-langgraph": () => import("./orchestration/orch-langgraph"),
  "topic-agent-concepts": () => import("./agents/agent-concepts"),
  "topic-agent-tool-calling": () => import("./agents/agent-tool-calling"),
  "topic-agent-memory-planning": () => import("./agents/agent-memory-planning"),
  "topic-agent-frameworks-protocols": () => import("./agents/agent-frameworks-protocols"),
  "topic-agent-multiagent": () => import("./agents/agent-multiagent"),
  "topic-mm-vision": () => import("./multimodal/mm-vision"),
  "topic-mm-speech-audio": () => import("./multimodal/mm-speech-audio"),
  "topic-mm-image-gen": () => import("./multimodal/mm-image-gen"),
  "topic-mm-multimodal-rag": () => import("./multimodal/mm-multimodal-rag"),
  "topic-oss-huggingface": () => import("./open-models/oss-huggingface"),
  "topic-oss-local-inference": () => import("./open-models/oss-local-inference"),
  "topic-oss-serving": () => import("./open-models/oss-serving"),
  "topic-oss-embeddings-local": () => import("./open-models/oss-embeddings-local"),
  "topic-ft-when": () => import("./fine-tuning/ft-when"),
  "topic-ft-data": () => import("./fine-tuning/ft-data"),
  "topic-ft-hosted": () => import("./fine-tuning/ft-hosted"),
  "topic-ft-lora": () => import("./fine-tuning/ft-lora"),
  "topic-eval-why": () => import("./evaluation/eval-why"),
  "topic-eval-methods": () => import("./evaluation/eval-methods"),
  "topic-eval-observability": () => import("./evaluation/eval-observability"),
  "topic-eval-ci": () => import("./evaluation/eval-ci"),
  "topic-sec-threat-model": () => import("./ai-security/llm-threat-landscape"),
  "topic-sec-prompt-injection": () => import("./ai-security/prompt-injection-defenses"),
  "topic-sec-guardrails": () => import("./ai-security/guardrails-moderation"),
  "topic-sec-data-privacy": () => import("./ai-security/data-privacy-compliance"),
  "topic-prod-api": () => import("./production/serving-ai-api"),
  "topic-prod-docker": () => import("./production/containerization-docker"),
  "topic-prod-cloud-deploy": () => import("./production/cloud-deployment"),
  "topic-prod-azure-ai": () => import("./production/azure-ai-platform"),
  "topic-prod-cicd-ops": () => import("./production/cicd-monitoring-llmops"),
  "topic-prod-scaling-cost": () => import("./production/scaling-caching-cost"),
  "topic-adv-context-engineering": () => import("./advanced/context-engineering"),
  "topic-adv-reasoning-models": () => import("./advanced/reasoning-models"),
  "topic-adv-ml-literacy": () => import("./advanced/ml-literacy"),
  "topic-adv-emerging": () => import("./advanced/emerging-patterns"),
  "topic-adv-specialization-capstone": () => import("./advanced/specialization-capstone"),
};

/** Whether a topic has a registered lesson-content module (sync, no import). */
export function hasTopicContent(topicId: string): boolean {
  return Object.prototype.hasOwnProperty.call(contentModules, topicId);
}
