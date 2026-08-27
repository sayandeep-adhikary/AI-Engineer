import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Data Privacy, Secrets & Compliance Basics" (topic-sec-data-privacy).
// 2 units: 01 learn (secret management, data residency, PII in logs, retention, compliance) ·
// 02 review (audit an app's data handling -> a data-handling policy). commonMistakes: Logging
// prompts with PII, Keys in code. masteryCriteria: write a data-handling policy for an AI app.
// Feeds P6 p6-06. Builds on Batch 1 env-tooling (secrets) + Batch 13 threat-model. Deterministic
// keyless secret/PII scanner (educational) + data-residency classification policy.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "The last piece of security is the one that gets teams fined rather than hacked: **how the data flows through your AI app.** LLM apps have a habit of sending user text to third-party providers, logging whole prompts for debugging, and holding API keys that unlock everything — each a data-handling decision with legal weight. This topic is the responsible-data-handling layer: secrets, PII, residency and retention, done in a way an enterprise (and a regulator) will accept.",
  },
  {
    type: "prose",
    md: "**Mental model: data handling is a set of policies about where data may go, who may see it, and how long it lives — enforced in code, not left to habit.** Every prompt, log line and retrieved chunk is data with a classification (public, internal, restricted). The job is to make the allowed destinations, the redaction rules and the retention windows explicit and mechanical, so a developer in a hurry cannot accidentally send restricted data to the wrong place. Privacy is LLM02 (sensitive information disclosure) seen from the inside: your own carelessness, not an attacker, is the usual cause.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Secret management", definition: "Keeping API keys, connection strings and tokens out of code and out of version control — in environment variables, a secrets manager or a vault, injected at runtime and rotated. A key in code (or in a prompt, or a log) is a leaked key. This extends the env/secrets discipline from the Python-foundations category into a security requirement." },
      { term: "PII (personally identifiable information)", definition: "Data that identifies a person: names, emails, phone numbers, government IDs, health/financial records. In LLM apps it hides in prompts, retrieved documents and logs. It carries legal obligations (consent, minimization, deletion rights) and must be redacted before it reaches a place it shouldn't — especially logs and third-party providers." },
      { term: "Data residency", definition: "Where data is physically stored and processed. Regulations (GDPR, and sector/region rules) can require certain data to stay in a specific region and never leave it. For AI apps this dictates which model endpoint and which region you may call — a US endpoint may be off-limits for EU-restricted data." },
      { term: "Retention & minimization", definition: "Keep the least data for the shortest time. Minimization: don't collect or log what you don't need. Retention: define how long each data class lives and delete on schedule. Indefinite prompt logs 'for debugging' are a retention and privacy liability, not a convenience." },
      { term: "Private endpoints", definition: "Network-level isolation so traffic to a model/service never traverses the public internet (e.g. cloud private endpoints/VNets). Combined with region pinning and enterprise agreements (data not used for training), they're how regulated workloads use hosted models while meeting residency and confidentiality requirements." },
      { term: "Compliance basics", definition: "The obligations that turn good practice into legal requirement: lawful basis and consent, data-subject rights (access, deletion), breach notification, and provider terms (whether prompts are retained or used for training). You don't need to be a lawyer, but you must design so these are satisfiable — deletion is impossible if you logged PII into an immutable store." },
    ],
  },
  {
    type: "prose",
    md: "**The first mechanical control: scan for secrets and PII before data lands somewhere it shouldn't** — especially logs. Here are toy scanners; treat them as an illustration of the idea, not a production DLP tool:",
  },
  {
    type: "code",
    language: "python",
    caption: "TOY secret/PII scanners for log lines — educational only (deterministic, keyless)",
    code: `import re
# TOY educational scanners. Real DLP is far more thorough (formats, context, ML).
SECRET_RE = re.compile(r"sk-[A-Za-z0-9]{8,}")     # example API-key shape
SSN_RE    = re.compile(r"\\b\\d{3}-\\d{2}-\\d{4}\\b")  # US SSN shape

def scan(line):
    return {"secret": bool(SECRET_RE.search(line)),
            "pii": bool(SSN_RE.search(line))}

print(scan("calling model with key sk-ABCD1234WXYZ"))
print(scan("user reported ssn 123-45-6789 in ticket"))
print(scan("summarize the quarterly earnings report"))`,
    output: `{'secret': True, 'pii': False}
{'secret': False, 'pii': True}
{'secret': False, 'pii': False}`,
  },
  {
    type: "prose",
    md: "The first line would leak an API key into your logs; the second, a user's SSN; the third is clean. A real scanner handles far more formats and context, but the principle is exactly this: **redact secrets and PII before they reach a log, a trace, or a third-party provider.** Note the deeper lesson — these are things you did to your own data. The most common privacy incidents are not breaches; they are `logger.info(prompt)` and a key hardcoded in a committed file. Make redaction and secret injection mechanical so a developer cannot leak by habit.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Logging prompts with PII, and keys in code",
    md: "The two commonMistakes that cause most real-world AI privacy failures — both self-inflicted:\n\n- **Logging prompts with PII** — 'let's log the full prompt and response to debug.' Now every user's personal data sits in your logging system, likely a third-party one, probably indefinitely, and you cannot honour a deletion request against it. Log metadata and redacted content; never raw PII. Observability (from the eval category) must be privacy-aware.\n- **Keys in code** — an API key hardcoded in a source file, a notebook, or committed to git. It leaks the moment the repo is shared or goes public, and it unlocks real spend and real data. Keys live in environment variables or a secrets manager, are injected at runtime, and are rotated — the discipline from the Python environment/tooling category, now as a hard security rule.\n\nBoth are prevented not by remembering to be careful but by making the safe path mechanical: a redaction filter on the logger, and secret injection that makes hardcoding unnecessary."
  },
  {
    type: "quiz",
    question: "To debug a quality issue, a teammate adds `logger.info(f'prompt={prompt} response={response}')` to the production RAG app, which serves EU customers. Why is this a compliance problem, not just a style issue?",
    choices: [
      "It isn't a problem as long as the logs are stored securely",
      "Because the prompt and response can contain user PII, which is now written to the logging system (often a third-party service, possibly outside the EU, and retained by default) — creating LLM02 sensitive-information disclosure plus data-residency and deletion-rights (GDPR) violations. The fix is to redact PII before logging and log metadata, not raw content",
      "It is only a problem because f-strings are slower than lazy logging",
      "It is fine because the model provider already saw the prompt anyway",
    ],
    answerIndex: 1,
    explanation: "Prompts and responses routinely contain personal data, so logging them raw copies PII into a logging system that may be third-party, cross-region, and retained indefinitely — implicating sensitive-information disclosure, data residency, and the right to deletion. The remedy is to redact PII before it is logged and to record metadata rather than raw content. Secure storage does not resolve residency or deletion obligations, and the provider having processed the prompt under its terms does not license you to copy PII elsewhere.",
  },
  {
    type: "takeaways",
    items: [
      "Data handling is policy enforced in code: where data may go, who may see it, how long it lives — made mechanical so no one leaks by habit.",
      "Privacy failures are usually self-inflicted (LLM02 from the inside): logging raw prompts with PII and hardcoding keys cause more incidents than attackers do.",
      "Redact secrets and PII before they reach a log, trace or third-party provider; log metadata and redacted content, never raw PII.",
      "Keys live in env vars / a secrets manager, injected at runtime and rotated — never in code, prompts, or logs.",
      "Residency, retention and minimization are design constraints: pin regions/private endpoints for restricted data, keep the least data for the shortest time, and design so deletion is actually possible.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'you identify and fix leak risks,' and the topic masteryCriteria is to **write a data-handling policy for an AI app.** So audit a real app's data flow the way you threat-modeled it: follow every piece of data from entry to storage to third parties, classify it, and check each hop against a policy. The output is a short, enforceable policy plus a list of fixes.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *you identify and fix leak risks*, expressed as a data-handling policy. Trace each data class (user prompt, retrieved doc, model output, logs, traces) through the system: where is it stored, who processes it, does it cross a region boundary, how long is it kept? Classify each as public/internal/restricted and check every destination against the classification. **Roadmap fit:** this reuses the secret/env discipline from the Python environment/tooling category and the threat-model frame from this category's first topic; it is a direct input to Project P6's `p6-06` (security hardening). A policy a reviewer will accept is specific: allowed destinations per class, redaction rules, retention windows, and how deletion requests are honoured."
  },
  {
    type: "prose",
    md: "**A residency/handling policy is a deterministic decision: given a data classification and a destination, is this hop allowed?** Encode it and every ambiguous 'is it OK to send this there?' becomes a lookup:",
  },
  {
    type: "code",
    language: "python",
    caption: "A data-residency / handling policy as an allow-table (deterministic, keyless)",
    code: `# Which destinations may receive each data classification.
ALLOWED = {
    "public":     {"third_party_api", "eu_region", "logs"},
    "internal":   {"eu_region", "logs"},
    "restricted": {"eu_region"},   # PII/secrets: EU region only; no 3rd-party API, no plain logs
}
def may_send(classification, destination):
    return destination in ALLOWED.get(classification, set())

print(may_send("public",     "third_party_api"))   # marketing copy -> fine
print(may_send("restricted", "third_party_api"))   # PII to a US API -> blocked
print(may_send("restricted", "logs"))              # PII into logs   -> blocked
print(may_send("restricted", "eu_region"))         # PII in-region   -> allowed`,
    output: `True
False
False
True`,
  },
  {
    type: "prose",
    md: "Public data may flow to a third-party API; restricted data (PII, secrets) may not — nor into logs — and may only be processed in the permitted region. The value of encoding it: the policy stops being a paragraph people forget and becomes a check a code path must pass. Your audit finds the hops that violate this table (a prompt with PII going to a US endpoint, a restricted field written to logs), and each becomes a fix — redact before the hop, pin the region, or don't collect the field at all. That table plus the redaction and retention rules is your data-handling policy.",
  },
  {
    type: "quiz",
    question: "Auditing an AI app, you find EU customers' support messages (which contain names and order details) are sent to a US-hosted model endpoint and the full prompts are retained 90 days in a US logging service. What does your policy need to fix?",
    choices: [
      "Nothing structural — just shorten retention to 30 days",
      "Both the residency and the logging: restricted (PII) data must be processed on a region-appropriate endpoint (or private endpoint) and must not be retained as raw prompts in a cross-region log. Fix by pinning the model region/using a private endpoint, redacting PII before logging, and setting a retention/deletion policy that honours data-subject rights",
      "Only the model endpoint — logging raw prompts is always fine",
      "Only the logging retention — the model endpoint region doesn't matter",
    ],
    answerIndex: 1,
    explanation: "Two distinct leak risks are present: restricted PII is processed on a cross-region endpoint (a residency violation) and raw prompts containing PII are retained in a cross-region log (a disclosure and deletion-rights problem). A sound policy fixes both — pin the region or use a private endpoint for restricted data, redact PII before logging, and define retention with deletion that satisfies data-subject rights. Shortening retention alone leaves the residency violation, and both the endpoint region and the logging matter.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — write the data-handling policy.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Audit an app and write its data-handling policy",
    intro: "Produce a policy a reviewer would sign off. Not completion-gated — this is the deliverable the masteryCriteria asks for.",
    steps: [
      { order: 1, action: "Inventory the data: list every data class the app touches (user prompt, retrieved doc, model output, logs, traces, cached embeddings) and classify each public/internal/restricted. Trace each from entry to every store and every third party.", expected: "A data map: each class, its classification, and every destination it reaches." },
      { order: 2, action: "Check each hop against an allow-table like the one above: is this classification permitted at this destination/region? Flag every violation (PII to a third party, raw prompts in logs, keys in code/config, indefinite retention).", decision: "For each violation: redact before the hop, pin region / use a private endpoint, drop the field (minimization), or move the secret to a vault — which is the right fix?" },
      { order: 3, action: "Write the policy: allowed destinations per class, redaction rules (what is stripped before logging/sending), retention windows per class, secret-management rules, and how deletion/access requests are honoured. Confirm deletion is actually possible given where data lives.", verify: "You have a written data-handling policy (classifications, allowed destinations, redaction, retention, secrets, data-subject rights) and a fix list for every violation the audit found — deletion is achievable, no PII in logs, no keys in code, residency respected." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a data-handling policy",
    items: [
      "Data inventory: every data class classified (public/internal/restricted) and traced to all destinations.",
      "Every hop checked against an allow-table; violations flagged (PII to third parties, raw prompts in logs, keys in code, indefinite retention).",
      "Policy states allowed destinations per class, redaction rules, retention windows, and secret management.",
      "Data-subject rights (access/deletion) are satisfiable given where data actually lives; a fix listed per violation.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Audit data like you threat-model: trace every data class from entry to storage to third parties, classify it, and check each hop against a policy.",
      "Encode residency/handling as an allow-table — 'may this classification go to this destination?' becomes a deterministic check a code path must pass.",
      "Fix violations by redacting before the hop, pinning region / private endpoints, minimizing (drop the field), or vaulting secrets — not by hoping people remember.",
      "A real policy is specific: allowed destinations per class, redaction rules, retention windows, secret management, and how deletion/access requests are honoured.",
      "Design so deletion is possible: PII in immutable/cross-region logs makes data-subject rights unenforceable — this policy is the input to P6's p6-06 security hardening.",
    ],
  },
];

export const content: TopicContent = {
  "unit-sec-data-privacy-01": learn,
  "unit-sec-data-privacy-02": review,
};
