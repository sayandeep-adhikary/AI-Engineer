import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Azure AI Platform in Depth" (topic-prod-azure-ai).
// 4 units: 01 learn (Azure AI stack: OpenAI deployments, AI Search, Foundry, Container Apps, Key
// Vault, managed identity) · 02 practice (provision core resources + least-priv RBAC) · 03 build
// (deploy RAG on Azure with managed identity — P6 m-03) · 04 review (security & cost review —
// P6 m-06). commonMistakes: Portal-only clicks with no reproducibility, Keys over managed identity.
// masteryCriteria: secured Azure-hosted RAG using managed identity + Key Vault. Deterministic keyless
// secret-source / RBAC / deployment-name / security-audit experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Enterprise AI frequently runs on Azure, and the reason is not the models — it is the **identity, secrets, networking and compliance** wrapped around them. This topic assembles the enterprise reference stack: **Azure OpenAI** (models), **AI Search** (retrieval), **AI Foundry** (the build/deploy surface), **Container Apps** (hosting), **Key Vault** (secrets) and **managed identity** (keyless auth). The specific service names are Azure's; the concepts — keyless auth, least-privilege roles, externalized secrets, reproducible infra — transfer to any cloud.",
  },
  {
    type: "prose",
    md: "**Mental model: on Azure, an application is an identity with role-based permissions, not a bag of keys.** Instead of storing an API key for every service, your container app is given a managed identity, and you grant that identity least-privilege roles on the resources it needs (read Key Vault secrets, call the OpenAI deployment, query the Search index). The platform issues short-lived tokens automatically — no secret is stored, printed, or leaked. This is the concrete production form of two principles from the security category: keep secrets out of code, and prefer identity over shared credentials.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Azure OpenAI deployment", definition: "On Azure, you don't call a model id directly — you create a named DEPLOYMENT of a model, and your API calls target that deployment name. The same code as OpenAI, but the 'model' argument must be your deployment name, not the base model id (a frequent 404 cause). Deployments have their own quota (tokens per minute)." },
      { term: "Azure AI Search", definition: "Azure's managed retrieval service (the vector + hybrid search index from the vector-databases category, as a managed resource): vector fields, filterable metadata fields, hybrid search with RRF, and optional semantic ranking. Your RAG app's retrieval half, operated by Azure with RBAC access." },
      { term: "Azure AI Foundry", definition: "Azure's unified surface for building, deploying and managing AI apps and models (model catalog, deployments, evaluations, tracing). Conceptually the console/SDK where you wire the stack together — you don't need to memorize the UI, but know it's where deployments and monitoring live." },
      { term: "Key Vault", definition: "A managed secrets store. Instead of an app holding a key, the secret lives in Key Vault and the app's managed identity is granted a role to read it — or, better, the app uses managed identity to call the service directly and stores no secret at all. Key Vault references can also inject secrets into app config at runtime." },
      { term: "Managed identity", definition: "An Azure-managed identity for your app (system-assigned, tied to the app's lifecycle; or user-assigned, standalone and shareable). The app authenticates to other Azure services AS this identity with automatically-issued short-lived tokens — no stored credentials. DefaultAzureCredential uses it in Azure and your dev login locally, so the same code works both places." },
      { term: "Least-privilege RBAC", definition: "Granting the app's identity only the specific roles it needs (e.g. 'Key Vault Secrets User' to read secrets, 'Search Index Data Reader' to query, 'Cognitive Services OpenAI User' to infer) — never broad owner/contributor. If the app is compromised, the blast radius is only what those roles allow. The authorization discipline from the security category, enforced by the cloud." },
    ],
  },
  {
    type: "prose",
    md: "**The credential decision is mechanical: prefer managed identity, fall back to a Key Vault reference, never a hardcoded key:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Choosing a credential source (deterministic, keyless)",
    code: `def secret_source(env):
    # Prefer managed identity (no stored secret); then Key Vault ref; NEVER a hardcoded key.
    if env.get("managed_identity"):
        return "managed_identity (no secret stored)"
    if env.get("key_vault_ref"):
        return "key_vault_reference"
    if env.get("inline_key"):
        return "INSECURE: hardcoded key -- reject"
    return "no credential"

print(secret_source({"managed_identity": True, "inline_key": "sk-..."}))
print(secret_source({"key_vault_ref": "kv://openai"}))
print(secret_source({"inline_key": "sk-abc"}))`,
    output: `managed_identity (no secret stored)
key_vault_reference
INSECURE: hardcoded key -- reject`,
  },
  {
    type: "prose",
    md: "When managed identity is available it wins — even if an inline key is also present, you use the identity and store no secret at all. Next best is a Key Vault reference (the secret is centralized, access-controlled, and rotatable, not in your code or image). A hardcoded inline key is rejected outright — it is the leaked-key mistake from the security category, now as a deploy-time policy. The whole point of the Azure stack is that the top option is achievable: your app can reach OpenAI, Search and Key Vault with zero stored secrets.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Portal-only clicks with no reproducibility, and keys over managed identity",
    md: "The two commonMistakes this topic exists to prevent:\n\n- **Portal-only clicks with no reproducibility** — provisioning the whole stack by clicking through the Azure portal, with no script or template. The result is a snowflake environment nobody can recreate, review, or roll back; staging and prod drift; and a rebuild after an incident is archaeology. Cure: capture provisioning as CLI scripts or infrastructure-as-code (Bicep/Terraform/ARM) so the environment is defined, versioned, and reproducible — and can enter the pipeline.\n- **Keys over managed identity** — reaching for API keys (stored in config, or worse in code) when managed identity would work. Keys must be stored, rotated, and can leak; managed identity stores nothing and issues short-lived tokens automatically. Preferring keys throws away the platform's biggest security advantage. Cure: use managed identity + RBAC for service-to-service auth; use Key Vault only for the few secrets that genuinely can't be identity-based, and grant least-privilege roles.\n\nBoth mistakes trade away the two things enterprises deploy on Azure to get: reproducibility and keyless security."
  },
  {
    type: "quiz",
    question: "Your Azure-hosted app stores the Azure OpenAI API key and the AI Search key in its container config. A reviewer flags it. What is the production-correct fix?",
    choices: [
      "Move the keys into the Dockerfile so they ship with the image",
      "Give the app a managed identity and grant it least-privilege RBAC roles on Azure OpenAI and AI Search (e.g. Cognitive Services OpenAI User, Search Index Data Reader), so it authenticates with automatically-issued short-lived tokens and stores no keys. Use Key Vault (via the identity) only for secrets that genuinely can't be identity-based",
      "Keep the keys but rotate them weekly",
      "Encrypt the keys in the config file and decrypt them at startup",
    ],
    answerIndex: 1,
    explanation: "The secure pattern on Azure is identity, not stored keys: a managed identity with least-privilege RBAC lets the app call OpenAI and Search using short-lived tokens the platform issues, so there are no keys to store, rotate, or leak. Key Vault covers the residual secrets that can't be identity-based, accessed via the same identity. Baking keys into the image is worse, and rotating or encrypting stored keys still leaves a credential to manage and leak.",
  },
  {
    type: "takeaways",
    items: [
      "On Azure, an app is an identity with least-privilege roles, not a bag of keys — the platform issues short-lived tokens automatically.",
      "The reference stack: Azure OpenAI (models, called by DEPLOYMENT name), AI Search (retrieval), Foundry (build/deploy surface), Container Apps (hosting), Key Vault (secrets), managed identity (keyless auth).",
      "Credential order: managed identity (no stored secret) > Key Vault reference > (never) a hardcoded key.",
      "Provision reproducibly (CLI/IaC), not portal clicks — a snowflake environment can't be reviewed, rolled back, or recreated.",
      "Prefer managed identity + RBAC over keys; the concepts (keyless auth, least privilege, externalized secrets) transfer to any cloud.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'resources are provisioned securely.' Provisioning is not just creating resources — it is **granting the right identities the least-privilege roles** to connect them. Here you reason about the RBAC that lets your app reach OpenAI, Search and Key Vault without a single stored key.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Provision securely = resources + identity + least-privilege roles",
    md: "A secure provisioning has three parts:\n\n- **Resources** — Azure OpenAI (with a model deployment), AI Search (with an index), Key Vault, and the Container Apps environment.\n- **Identity** — a managed identity for the app (system- or user-assigned).\n- **Role assignments** — grant that identity ONLY the roles it needs: read Key Vault secrets, call the OpenAI deployment, query the Search index. Not owner. Not contributor.\n\nLeast privilege is the whole game: if the app is compromised, an attacker inherits exactly the roles you granted and nothing more. A 'Search Index Data Reader' can query but not delete the index; a 'Key Vault Secrets User' can read but not write secrets. Provision reproducibly (CLI/IaC) so the role grants are reviewable and repeatable."
  },
  {
    type: "prose",
    md: "**Least-privilege RBAC is a permission check: a role grants specific actions, and nothing else:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Least-privilege role checks for the app's identity (deterministic, keyless)",
    code: `ROLE_GRANTS = {
    "Key Vault Secrets User":         {"kv:get"},
    "Cognitive Services OpenAI User": {"openai:infer"},
    "Search Index Data Reader":       {"search:query"},
}
def can(role, action):
    return action in ROLE_GRANTS.get(role, set())

print(can("Key Vault Secrets User", "kv:get"))            # read a secret -> allowed
print(can("Search Index Data Reader", "search:write"))    # reader can't write -> denied
print(can("Cognitive Services OpenAI User", "openai:infer"))  # call the model -> allowed`,
    output: `True
False
True`,
  },
  {
    type: "prose",
    md: "Each role grants exactly one capability the app needs — read a secret, query the index, call the model. The 'Search Index Data Reader' cannot write, so a compromised app (or a prompt-injection that reaches a tool) can't delete or poison your index. This is the authorization-outside-the-model principle from the security category, now enforced by the cloud's RBAC rather than your code: the app's identity simply lacks the permission, regardless of what any input or model output requests. Grant the minimum, and the blast radius of any compromise is bounded by design.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Provision the core Azure resources securely",
    intro: "Resources + identity + least-privilege roles, reproducibly.",
    steps: [
      { order: 1, action: "Provision Azure OpenAI (with a model deployment), AI Search (with an index matching your embedding model's dimensions), and Key Vault — via CLI/IaC, not portal clicks, so it is reproducible and reviewable.", expected: "The resources exist and the provisioning is captured as a script/template." },
      { order: 2, action: "Create a managed identity for the app and grant it least-privilege roles: read Key Vault secrets, call the OpenAI deployment, query the Search index (reader, not writer, unless it must write).", decision: "For each role: is it the minimum the app needs? A query-only app should get a data-reader role, never contributor/owner." },
      { order: 3, action: "Confirm the app can reach each service using the identity (DefaultAzureCredential) with NO stored keys, and that it cannot perform actions outside its granted roles.", verify: "Resources are provisioned reproducibly; the app's identity has least-privilege roles and reaches OpenAI/Search/Key Vault keylessly; over-privileged or key-based access is eliminated." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — secure provisioning",
    items: [
      "Azure OpenAI (with deployment), AI Search (index dims match the embedding model), and Key Vault provisioned via CLI/IaC (reproducible).",
      "App has a managed identity; roles granted are least-privilege (read secrets, call deployment, query index).",
      "App reaches all services via DefaultAzureCredential with NO stored keys.",
      "App cannot perform actions outside its granted roles (e.g. can query but not delete the index).",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Provision securely = resources + a managed identity + least-privilege role assignments — reproducibly (CLI/IaC), not portal clicks.",
      "Grant only the roles the app needs (read secret, call deployment, query index); never owner/contributor for an app identity.",
      "RBAC enforces authorization outside the model: a data-reader identity can't write, regardless of what any input or model output requests.",
      "Least privilege bounds the blast radius: a compromised app inherits exactly the roles you granted and nothing more.",
      "DefaultAzureCredential lets the same code use managed identity in Azure and your dev login locally — no stored keys either place.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "Now deploy the whole RAG app on Azure. The completion criterion is 'RAG runs on Azure with managed identity,' and this delivers **Project P6's milestone `p6-03`** (deploy to Azure with secure config — Key Vault / managed identity). Your containerized API from the previous topics now runs on Container Apps, calls Azure OpenAI and AI Search as its identity, and stores no secrets.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *RAG runs on Azure with managed identity.* Deploy your containerized RAG API to Container Apps with a managed identity, RBAC roles on Azure OpenAI + AI Search + Key Vault, ingress, health probes, and structured logs — no stored keys. **Roadmap fit:** this is **P6 `p6-03`** ('service runs on Azure with Key Vault / managed identity'), building on the reproducible deploy from topic-prod-cloud-deploy and the Azure Search retrieval from topic-vdb-azure-search. Reuse `DefaultAzureCredential` so the same app runs locally (your dev login) and on Azure (managed identity). One Azure-specific trap dominates: the model argument must be your DEPLOYMENT name."
  },
  {
    type: "prose",
    md: "**The signature Azure runtime error: `model` must be the deployment name, not the base model id:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Azure OpenAI: model argument must be a deployment name (deterministic, keyless)",
    code: `def azure_call(model_arg, deployment_names):
    # On Azure, 'model' MUST be your DEPLOYMENT name, not the base model id.
    if model_arg in deployment_names:
        return "ok: routed to deployment " + model_arg
    return "404 DeploymentNotFound: '" + model_arg + "' is not a deployment"

print(azure_call("gpt-4o-prod", {"gpt-4o-prod", "embed-prod"}))
print(azure_call("gpt-4o", {"gpt-4o-prod", "embed-prod"}))`,
    output: `ok: routed to deployment gpt-4o-prod
404 DeploymentNotFound: 'gpt-4o' is not a deployment`,
  },
  {
    type: "prose",
    md: "Calling the deployment name works; passing the base model id (`gpt-4o`) returns a 404 DeploymentNotFound — the single most common Azure OpenAI mistake, first met in the LLM-APIs category and still true in production. Everything else is the deploy discipline you already have: the container from topic-prod-docker, the managed platform + probes + logs from topic-prod-cloud-deploy, and the identity + least-privilege roles from this topic's practice unit. Wire them together and your RAG app is a secured, keyless, operable Azure service.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — deploy RAG on Azure",
    intro: "Secured, keyless, operable. Acceptance defines done.",
    steps: [
      { order: 1, action: "Deploy the containerized RAG API to Container Apps with a managed identity. Grant least-privilege RBAC on Azure OpenAI (call the deployment), AI Search (query the index), and Key Vault (read any residual secret). Use DefaultAzureCredential in the app.", decision: "Is every service reached via the identity with NO stored key? Any remaining key is a finding to fix." },
      { order: 2, action: "Configure the app to call the Azure OpenAI DEPLOYMENT name (not the model id) and the AI Search index. Add ingress, readiness/liveness probes at /health, autoscaling bounds, and structured logs.", expected: "The RAG app runs on Azure, answers over its public URL, and reaches OpenAI + Search keylessly — no DeploymentNotFound, no stored secrets." },
      { order: 3, action: "Capture the deployment as a reproducible script/IaC (so it can enter the pipeline). Verify end-to-end: a question retrieves from AI Search and generates via the OpenAI deployment, all as the app's identity.", verify: "The RAG app runs on Azure with managed identity + least-privilege RBAC, no stored keys, correct deployment-name calls, health probes, logs, and a reproducible deploy — delivering P6 p6-03." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — Azure RAG deployment (P6 p6-03)",
    items: [
      "Containerized RAG on Container Apps with a managed identity; least-privilege RBAC on OpenAI + Search + Key Vault.",
      "App uses DefaultAzureCredential; NO stored keys anywhere.",
      "Calls target the OpenAI DEPLOYMENT name (no DeploymentNotFound); AI Search index queried for retrieval.",
      "Ingress + health probes + structured logs; deploy captured as reproducible script/IaC.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — keyless Azure OpenAI via managed identity (shape; SDK/versions churn — check current)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

# DefaultAzureCredential uses managed identity on Azure, your dev login locally -- no stored key.
credential = DefaultAzureCredential()
token_provider = get_bearer_token_provider(
    credential, "https://cognitiveservices.azure.com/.default"
)
client = AzureOpenAI(
    azure_endpoint="https://<your-resource>.openai.azure.com/",
    azure_ad_token_provider=token_provider,   # keyless: token from managed identity
    api_version="<current-api-version>",
)
resp = client.chat.completions.create(
    model="gpt-4o-prod",                       # DEPLOYMENT name, not the base model id
    messages=[{"role": "user", "content": "..."}],
)`,
  },
  {
    type: "takeaways",
    items: [
      "Deploy RAG on Azure = containerized API on Container Apps + managed identity + least-privilege RBAC + no stored keys — delivering P6 p6-03.",
      "The signature Azure trap: the model argument must be your DEPLOYMENT name, not the base model id (else 404 DeploymentNotFound).",
      "Use DefaultAzureCredential so the same app runs locally (dev login) and on Azure (managed identity) — keyless both places.",
      "Reuse the container (docker topic), managed platform + probes + logs (cloud-deploy topic), and identity + roles (this topic) — wire them together.",
      "Capture the deploy as reproducible script/IaC so it enters the CI/CD pipeline (next topic).",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A deployed Azure app still needs a hard look before it is production-ready. The completion criterion is 'you address key security/cost findings' — so **run a security and cost review**, which is exactly **Project P6's milestone `p6-06`** (apply guardrails and a security review). This is where the AI-security category (Batch 13) becomes a production checklist, and where you catch the cost mistakes that make an app unviable.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *you address key security/cost findings.* Audit the Azure app against the security controls you already know (secrets, authn/authz, injection, output validation, PII) and the cost levers (deployment quota, caching, model choice, autoscale bounds). **Roadmap fit:** this is **P6 `p6-06`** ('a security review is complete with fixes applied'), and it reuses `topic-sec-guardrails` and `topic-sec-data-privacy` from the AI-security category rather than reteaching them — here they become a deploy-time review. The mandate: not to re-derive the controls, but to verify each one is actually in place on the running service and fix what isn't."
  },
  {
    type: "prose",
    md: "**A security review is a mechanical audit — each finding maps to a known control from the security category:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Security review as an audit against known controls (deterministic, keyless)",
    code: `def security_findings(config):
    findings = []
    if config.get("inline_keys"):
        findings.append("secret in config -> Key Vault + managed identity")
    if config.get("public_ingress") and not config.get("auth"):
        findings.append("unauthenticated public endpoint -> add authn")
    if config.get("logs_raw_prompts"):
        findings.append("PII in logs -> redact")
    if not config.get("rate_limit"):
        findings.append("no rate limit -> add (LLM10 cost/DoS)")
    return findings

print(security_findings({"inline_keys": True, "public_ingress": True, "auth": False, "rate_limit": False}))
print(security_findings({"auth": True, "rate_limit": True}))`,
    output: `['secret in config -> Key Vault + managed identity', 'unauthenticated public endpoint -> add authn', 'no rate limit -> add (LLM10 cost/DoS)']
[]`,
  },
  {
    type: "prose",
    md: "Each finding names a control you already learned: stored secrets → managed identity + Key Vault; an unauthenticated public endpoint → add authentication (and remember authentication is not authorization — you still enforce per-user permissions); raw prompts in logs → redact PII; no rate limit → add one (LLM10 unbounded consumption, which is both a cost and a denial-of-service risk). A clean config returns no findings. The review is not new knowledge — it is verifying the security category's controls are present on the running service, and the cost review does the same for the cost levers (is the deployment quota right, is caching on, is the autoscale max bounded so a spike can't run up an unbounded bill?).",
  },
  {
    type: "quiz",
    question: "Your Azure security review finds the RAG endpoint is public with authentication but no per-user authorization or rate limit, and full prompts are logged. Which findings are genuine production risks?",
    choices: [
      "None — authentication alone is sufficient for a public endpoint",
      "All three: authentication is not authorization (an authenticated user could access data or actions they shouldn't — enforce per-user permissions), no rate limit is an LLM10 cost/DoS risk (a single caller can run up the bill or exhaust quota), and logging full prompts risks PII disclosure (redact before logging). Each maps to a control from the security category that must be present on the running service",
      "Only the missing rate limit matters; the rest are fine",
      "Only the logging matters; auth and rate limits are optional in the cloud",
    ],
    answerIndex: 1,
    explanation: "Authentication proves who the caller is but does not decide what they may do, so per-user authorization is still required; without a rate limit, one caller can drive unbounded cost or deny service (LLM10); and logging full prompts copies user PII into logs, a disclosure risk requiring redaction. Each is a control taught in the security category that the review must confirm on the deployed service — dismissing any of them leaves a real production risk.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — a security and cost review of your Azure app.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Review your Azure RAG app for security and cost",
    intro: "Audit against known controls; fix the findings. Not completion-gated — this is P6's security-hardening review made concrete.",
    steps: [
      { order: 1, action: "Security audit: are all credentials identity-based (no stored keys)? Is the endpoint authenticated AND authorized per-user? Are inputs/outputs validated and untrusted content isolated? Is PII redacted from logs? Is there a rate limit? List each gap as a finding with its control.", expected: "A findings list, each mapped to a control from the security category (secrets, authn/authz, injection, output validation, PII, LLM10)." },
      { order: 2, action: "Cost audit: is the deployment quota (TPM) sized correctly? Is caching enabled for stable queries? Is the autoscale max bounded so a spike can't run an unbounded bill? Is a cheaper model viable for simple requests? List cost findings.", decision: "For each cost lever: what's the smallest change with the biggest saving without hurting quality? (Usually caching + a bounded max + right-sized quota.)" },
      { order: 3, action: "Fix the high-impact findings and re-verify: keyless auth, per-user authorization, redacted logs, a rate limit, bounded cost. Note what changed and the residual risks you accept.", verify: "The Azure app has no stored keys, enforces authn AND authz, isolates/validates untrusted content, redacts PII from logs, rate-limits, and has bounded cost — findings fixed and residual risks documented (P6 p6-06)." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — security & cost review (P6 p6-06)",
    items: [
      "Security findings listed, each mapped to a control (secrets→identity, authn+authz, injection isolation, output validation, PII redaction, rate limit/LLM10).",
      "Cost findings listed (deployment quota, caching, bounded autoscale max, model right-sizing).",
      "High-impact findings fixed and re-verified on the running service.",
      "Residual risks documented; authentication and authorization treated as distinct.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "The security review is P6 p6-06: a mechanical audit that verifies the security category's controls are actually present on the running Azure service — not new knowledge.",
      "Findings map to known controls: stored secret → managed identity + Key Vault; unauth endpoint → authn; PII in logs → redact; no rate limit → LLM10 cost/DoS.",
      "Authentication is not authorization: an authenticated user still needs per-user permission checks enforced by the app.",
      "Cost review is parallel: right-size the deployment quota, enable caching, bound the autoscale max, and right-size the model so a spike can't run an unbounded bill.",
      "Fix the high-impact findings, re-verify on the running service, and document residual risks you accept.",
    ],
  },
];

export const content: TopicContent = {
  "unit-prod-azure-ai-01": learn,
  "unit-prod-azure-ai-02": practice,
  "unit-prod-azure-ai-03": build,
  "unit-prod-azure-ai-04": review,
};
