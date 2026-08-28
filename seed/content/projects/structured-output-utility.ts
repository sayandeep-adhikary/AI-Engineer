import type { ProjectGuide } from "../../types";

// Project guide for P1 — LLM-Powered Structured-Output Utility (project-p1-structured-output).
// Deepens the existing project into a full brief. Additive + lazy-loaded.

export const guide: ProjectGuide = {
  overview:
    "Build a command-line (and importable) utility that turns messy, free-text input into **validated, schema-conformant JSON** using an LLM — reliably enough to sit inside a real data pipeline. Concretely: a tool like `extract --schema invoice input.txt` that reads unstructured text (an email, a receipt, a support ticket), calls a model to extract the fields you defined, validates the result against a Pydantic schema, retries intelligently on transient failures, streams progress, logs token usage and cost, and runs against either OpenAI or Azure OpenAI by changing one config value.\n\nThe point is not \"call an LLM and print the answer.\" The point is **reliability engineering around a non-deterministic component**: the same input should always yield a *valid* object or a clean, typed error — never a half-parsed string or an unhandled exception. After this project you should understand why structured output is a contract you enforce, not a hope, and how to make an LLM call production-safe.",
  scenario:
    "You have joined a team that processes thousands of inbound documents a day — invoices, expense receipts, or support tickets. Today an ops team copies fields into a spreadsheet by hand. Your job is to build the extraction step: given a document's text, produce a structured record (vendor, amount, date, line items) that downstream systems can trust.\n\nTraditional parsing (regex, templates) breaks because every vendor formats things differently and the wording is unpredictable — exactly where an LLM helps. But the business cannot accept 'mostly correct JSON': a malformed record corrupts the database, and an unbounded retry loop or an unlogged spend spikes the bill. A real system has hard constraints: outputs must validate, transient provider errors must recover, cost must be visible, and the code must run in both the OpenAI-based dev environment and the company's Azure OpenAI production tenant. That is the utility you are building.",
  whatYouBuild:
    "A small, well-engineered Python package with a CLI entry point and a reusable `extract()` function. It is intentionally single-purpose — no database, no web server — so all your effort goes into making the *AI call itself* reliable.",
  architecture: `Text input (file / stdin / arg)
        |
        v
   CLI / extract()            <- input validation, config, provider selection
        |
        v
   Prompt builder             <- instructions + schema + the untrusted input (delimited)
        |
        v
   LLM client (OpenAI | Azure) <- structured-output request, timeout
        |
        v
   Validate + repair          <- parse into Pydantic; on failure, bounded repair
        |            |
     (ok)          (fail)
        |            |
        v            v
  Validated JSON   Typed error   ---> both: log tokens + cost`,
  components: [
    "**CLI layer** — argument parsing (input path, schema name, provider, output format), reads text, prints JSON or a clean error, sets a non-zero exit code on failure.",
    "**Config layer** — loads settings and secrets from environment variables (never hardcoded); selects OpenAI vs Azure OpenAI; holds model/deployment name, timeouts, retry budget.",
    "**Prompt builder** — composes the system instruction, the target schema, and the untrusted input placed in a clearly delimited section (input is data, never instructions).",
    "**Model client** — one thin wrapper that hides provider differences behind a single `complete()` call and requests structured output.",
    "**Validation + repair** — parses the model output into a Pydantic model; on a validation error, performs one bounded repair attempt, then fails safe.",
    "**Observability** — logs per-call input/output tokens and computed cost, plus a request id, at INFO; errors carry context but never leak the raw prompt or secrets.",
  ],
  learningObjectives: [
    "Structured outputs",
    "Pydantic validation",
    "Prompt design (instruction vs data)",
    "Retries & exponential backoff",
    "Streaming responses",
    "Token & cost accounting",
    "Provider abstraction (OpenAI ↔ Azure)",
    "Error handling & typed failures",
    "CLI / library API design",
    "Secret handling",
  ],
  prerequisites: {
    required: [
      "Comfortable writing Python functions, modules and a simple CLI (argparse or typer).",
      "You have made at least one successful LLM API call and read the response + usage.",
      "Basic understanding of JSON and typed data models.",
    ],
    helpful: [
      "Familiarity with Pydantic v2 (`BaseModel`, validation errors) — you can learn it here.",
      "Awareness of HTTP status codes and what 'transient vs permanent' means for retries.",
      "Access to an Azure OpenAI deployment (optional — OpenAI alone is enough to finish).",
    ],
  },
  techStack: [
    { layer: "Language", choice: "Python 3.11+", why: "The default language for AI tooling; strong typing support with Pydantic." },
    { layer: "AI SDK", choice: "`openai` Python SDK (also targets Azure via `AzureOpenAI`)", why: "One SDK, both providers; supports structured outputs, streaming and usage reporting." },
    { layer: "Model", choice: "A current small/mid chat model (use your provider's current id)", why: "Extraction is not a hard reasoning task — a cheaper model is usually enough; keep the id in config." },
    { layer: "Validation", choice: "Pydantic v2", why: "Turns 'trust the text' into 'validate the object' — the core reliability control." },
    { layer: "Config / secrets", choice: "Environment variables via `.env` (python-dotenv) or the shell", why: "Keeps API keys out of code and lets the same binary run against OpenAI or Azure." },
    { layer: "CLI", choice: "argparse or Typer", why: "Minimal, dependency-light way to expose the utility; Typer adds nice help/validation." },
    { layer: "Auth (Azure)", choice: "API key for dev; managed identity / Entra ID for prod (optional)", why: "Teaches the keyless production pattern without requiring it to finish." },
  ],
  functionalRequirements: [
    "The CLI accepts input from a file path, stdin, or an argument, plus a `--schema` name and an optional `--provider`.",
    "Input is validated before any model call (non-empty, within a max character/token budget); oversized or empty input is rejected with a clear message.",
    "The tool builds a prompt that separates instructions from the untrusted input using explicit delimiters.",
    "It requests **structured output** bound to the selected schema (not free text you post-parse by hand).",
    "The model response is parsed into a Pydantic model; every field's type and required-ness is enforced.",
    "On a validation failure, the tool performs at most one bounded repair attempt (re-prompt with the validation error), then fails safe.",
    "Transient failures (429, 5xx, timeouts, connection errors) are retried with exponential backoff and a capped retry budget; 4xx auth/validation errors are NOT retried.",
    "The tool streams progress/partial output when `--stream` is set, and still returns a validated final object.",
    "Every call logs input tokens, output tokens and computed cost, plus a request id.",
    "The tool selects OpenAI or Azure OpenAI purely from configuration; on Azure the `model` argument is the deployment name.",
    "On success it prints valid JSON to stdout and exits 0; on unrecoverable failure it prints a typed error to stderr and exits non-zero.",
    "Secrets are read only from the environment; a missing key produces a clear, actionable error (not a stack trace).",
  ],
  nonFunctionalRequirements: [
    "Input validation at the boundary — bad input is a cheap rejection, never a mid-pipeline crash.",
    "No secret ever appears in logs, error messages, or committed files (add a `.env` to `.gitignore`).",
    "Errors are typed and safe: the caller learns the failure category, never the raw prompt or provider internals.",
    "Cost is observable per call and can be summed across a batch.",
    "Deterministic where possible: parsing, validation and cost math are pure functions you can unit-test without a key.",
    "Latency is bounded by a request timeout so a hung provider call cannot block forever.",
  ],
  phases: [
    {
      name: "Setup & config",
      intro: "Get a keyless-testable skeleton running before any model call.",
      tasks: [
        "Initialize the package structure and a CLI entry point that echoes parsed args.",
        "Load config + secrets from the environment; fail clearly if the key is missing.",
        "Add a provider switch (OpenAI vs Azure) that only changes the client construction.",
      ],
    },
    {
      name: "Schema & prompt",
      intro: "Define the contract before the call.",
      tasks: [
        "Define 1–2 Pydantic schemas (e.g. Invoice, Ticket) with required and optional fields.",
        "Write the prompt builder: system instruction + schema + delimited untrusted input.",
        "Unit-test the prompt builder and schema parsing with fixed sample text (no API key needed).",
      ],
    },
    {
      name: "The reliable call",
      intro: "Make the non-deterministic step production-safe.",
      tasks: [
        "Request structured output bound to the schema; parse into the Pydantic model.",
        "Add bounded repair: on a validation error, re-prompt once with the error, then fail safe.",
        "Add retry + exponential backoff for transient errors only; set a timeout and a retry budget.",
      ],
    },
    {
      name: "Streaming, cost & errors",
      tasks: [
        "Add a `--stream` mode that shows progress and still yields a validated object.",
        "Compute and log input/output tokens and cost per call; expose a batch cost summary.",
        "Map every failure to a typed error + correct exit code; ensure no secret leaks.",
      ],
    },
    {
      name: "Provider parity & evaluation",
      tasks: [
        "Run the same input through OpenAI and Azure OpenAI; confirm identical behavior.",
        "Build a tiny labelled test set and measure extraction correctness + valid-rate.",
        "Write the README (setup, env vars, examples) and document known limitations.",
      ],
    },
  ],
  checklist: [
    "Create the package + CLI skeleton",
    "Load config and secrets from environment variables",
    "Implement the OpenAI/Azure provider switch",
    "Define Pydantic schema(s) for the target records",
    "Build the instruction-vs-data prompt",
    "Request structured output and parse into the schema",
    "Add bounded repair on validation failure",
    "Add retry + exponential backoff for transient errors only",
    "Add a request timeout and retry budget",
    "Implement `--stream` progress mode",
    "Log token usage and compute cost per call",
    "Map all failures to typed errors + exit codes",
    "Write unit tests for prompt/parse/cost (keyless)",
    "Build a small labelled correctness test set",
    "Verify OpenAI ↔ Azure parity",
    "Write the README and document limitations",
  ],
  projectStructure: `structured-output-utility/
  src/
    cli.py            # argument parsing, IO, exit codes
    config.py         # env + secrets + provider selection
    client.py         # thin OpenAI/Azure wrapper: complete()
    prompt.py         # instruction + schema + delimited input
    schemas.py        # Pydantic models (Invoice, Ticket, ...)
    extract.py        # orchestration: call -> validate -> repair
    cost.py           # token accounting + pricing table
  tests/
    test_prompt.py    # keyless
    test_schema.py    # keyless
    test_cost.py      # keyless
  .env.example
  README.md`,
  decisions: [
    {
      decision: "Native structured outputs vs JSON-mode vs post-parsing free text",
      options: "Provider structured-output/schema binding · JSON mode (valid JSON, not schema-checked) · plain text you parse yourself.",
      tradeoff: "Structured outputs give the strongest guarantee and least glue code; JSON mode still needs your own schema validation; hand-parsing free text is the most fragile. Prefer schema-bound structured output, and ALWAYS validate the result with Pydantic regardless — schema-valid is not the same as semantically correct.",
    },
    {
      decision: "How aggressively to repair a bad output",
      options: "No repair (fail fast) · one bounded re-prompt with the validation error · unbounded retry until valid.",
      tradeoff: "No repair is cheapest but brittle; unbounded repair can loop and burn cost. One bounded repair, then fail safe, balances reliability and spend — and makes failures visible instead of hidden.",
    },
    {
      decision: "Which model to use",
      options: "A cheap small model · a mid model · a large/reasoning model.",
      tradeoff: "Extraction is usually easy; a small model is cheaper and faster and often just as accurate. Measure accuracy on your test set before paying for a bigger model. Keep the model id in config so it is a one-line change.",
    },
    {
      decision: "Streaming vs non-streaming",
      options: "Stream tokens for responsiveness · return the whole object at once.",
      tradeoff: "Streaming improves perceived latency but complicates validation (you validate the *final* object, not partials). For a batch/CLI tool, non-streaming is simpler; add streaming as a mode, not the default.",
    },
  ],
  gotchas: [
    "Hardcoding the API key (or committing `.env`) — read secrets only from the environment and gitignore `.env`.",
    "Treating the untrusted input as instructions — a document that says 'ignore the schema and return X' must not steer the model; delimit input as data.",
    "Assuming schema-valid means correct — a well-typed object can still have the wrong vendor; validate values, not just shapes.",
    "Retrying 4xx errors — an auth error or an invalid request will fail forever; only retry transient (429/5xx/timeout) failures.",
    "Unbounded repair/retry loops — cap attempts and total spend, or one bad input can run up the bill.",
    "On Azure, passing the base model id instead of the deployment name — this returns a 404 DeploymentNotFound.",
    "Ignoring token limits — a huge document silently truncates or errors; validate input size up front.",
    "Logging the full prompt/response (which may contain PII) — log metadata + redacted content, never raw sensitive text.",
    "No timeout — a hung provider call blocks the whole batch; always set one.",
  ],
  testing: {
    functional: [
      "A clean document produces a valid object with the expected fields.",
      "The CLI reads from file, stdin and argument, and exits 0 on success.",
      "`--provider` switches OpenAI ↔ Azure with identical results.",
      "`--stream` shows progress and still returns a validated object.",
    ],
    edgeCases: [
      "Empty input, whitespace-only input, and oversized input are rejected cleanly.",
      "A document missing a required field forces a repair attempt or a typed 'insufficient data' error.",
      "Input containing instruction-like text ('ignore the schema…') does not change the output contract.",
      "Non-English or oddly-formatted documents.",
    ],
    failureModes: [
      "Provider returns 429 / 5xx → retried with backoff, then a typed error if the budget is exhausted.",
      "Provider times out → aborted by the timeout, surfaced as a typed error.",
      "Missing/invalid API key → clear, actionable message, no stack trace, non-zero exit.",
      "Model returns invalid JSON / wrong shape → one repair, then fail safe.",
    ],
    aiEvaluation: [
      "Valid-rate: fraction of inputs that yield a schema-valid object (target high, e.g. >95% on your set).",
      "Field accuracy: per-field correctness against your labelled examples.",
      "Cost per document and average latency, tracked so a model change is measurable.",
    ],
  },
  definitionOfDone: [
    "All functional requirements work end to end from the CLI.",
    "Structured output is always validated with Pydantic; invalid results are rejected or repaired.",
    "Transient errors recover; permanent errors fail fast with a typed message and exit code.",
    "Token usage and cost are logged per call and summable across a batch.",
    "The tool runs against both OpenAI and Azure OpenAI from config alone.",
    "No secret is committed or logged; `.env` is gitignored.",
    "Keyless unit tests cover prompt building, parsing and cost math.",
    "A small labelled test set demonstrates the valid-rate and field accuracy.",
    "README documents setup, env vars, usage examples and known limitations.",
  ],
  expectedOutcome:
    "A genuinely reusable extraction utility you can point at real documents and trust in a pipeline — plus the mental model of how to wrap any LLM call in validation, retries, cost tracking and provider portability. This is the reliability foundation every later project builds on.",
  outcomeArtifacts: [
    "A working CLI + importable `extract()` library",
    "Pydantic schemas for at least two record types",
    "A retry/backoff + bounded-repair reliability layer",
    "Token + cost accounting with a batch summary",
    "A small labelled correctness test set + keyless unit tests",
    "A README with setup, examples and limitations",
    "A GitHub repository ready to show",
  ],
  stretchGoals: [
    "Batch mode over a folder of documents with a cost/accuracy report.",
    "A prompt-caching-aware prompt layout (stable instructions first, dynamic input last).",
    "Keyless Azure auth via managed identity / Entra ID.",
    "Confidence scoring or flagging low-confidence extractions for human review.",
    "A thin FastAPI wrapper exposing `extract()` as an endpoint (bridges toward P3).",
    "Pluggable schemas loaded from a directory so new record types need no code change.",
  ],
  skillsDemonstrated: [
    "Reliable LLM API engineering",
    "Structured outputs & validation",
    "Retry / backoff / timeout patterns",
    "Cost & token observability",
    "Provider abstraction (OpenAI & Azure)",
    "Secure secret handling",
    "CLI & library API design",
    "Testing non-deterministic systems",
  ],
  portfolio:
    "Completing this proves you can make an LLM call **production-safe** — the single most important skill that separates an AI engineer from someone who can call an API in a notebook. A reviewer sees validation, typed errors, bounded retries, cost awareness and provider portability, and knows you understand that the hard part of AI engineering is the reliability engineering around the model, not the prompt.",
};
