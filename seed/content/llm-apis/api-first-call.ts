import type { ContentBlock, TopicContent } from "../../types";

// Rich learning content for "Your First LLM API Call" (topic-api-first-call).
// Technology-specific: OpenAI + Azure OpenAI chat completions. API surface and
// the deployment-name rule verified against the OpenAI Python SDK README and
// Microsoft Learn "switching endpoints" (updated 2025-09-30). Model completion
// text is non-deterministic, so example OUTPUT for network calls is labelled
// "representative"; deterministic Python (parsing, cost math) shows exact output.
// Units: 01 learn · 02 practice · 03 build (hands-on lab) · 04 review.

// ── 3.1.1 · Learn — Chat API + Azure setup ───────────────────────────────────
const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Almost every AI feature you will ever ship reduces to one network call: send some messages to a model, get a completion back. This unit teaches that call end to end on **two providers** — OpenAI and **Azure OpenAI** — because production AI engineering in most companies means one or both. Get this right and everything downstream (structured output, RAG, agents) is just a richer version of the same request.",
  },
  {
    type: "prose",
    md: "**Mental model: the chat API is a stateless function.** You send a *list of messages* and configuration; you get back *one completion*. The server keeps **no memory** between calls — there is no session on the other end. If you want the model to 'remember' earlier turns, **you** resend the whole conversation every time. Hold onto this: half of all beginner confusion (\"why did it forget what I just said?\") comes from expecting a stateful chat when the API is stateless.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Chat completion", definition: "One request → one model response. The core endpoint: `client.chat.completions.create(...)`." },
      { term: "Message", definition: "A `{\"role\": ..., \"content\": ...}` object. The request is an ordered **list** of these." },
      { term: "Role", definition: "`system` steers behaviour/persona, `user` is the human turn, `assistant` is a prior model turn you replay for context." },
      { term: "Endpoint", definition: "The base URL the SDK calls. OpenAI's is implicit; Azure's is your resource, e.g. `https://<resource>.openai.azure.com`." },
      { term: "Deployment (Azure)", definition: "A named instance of a model you create in your Azure resource. On Azure you call the **deployment name**, not the model id." },
      { term: "api_version (Azure)", definition: "A dated string pinning Azure's API behaviour, e.g. `2024-10-21`. Required by the `AzureOpenAI` client." },
      { term: "usage", definition: "Token accounting on every response: `prompt_tokens`, `completion_tokens`, `total_tokens` — your cost signal." },
      { term: "finish_reason", definition: "Why generation stopped: `stop` (done), `length` (hit the token cap), `content_filter`, or `tool_calls`." },
    ],
  },
  {
    type: "prose",
    md: "**Worked example — the minimal OpenAI call.** *What:* send a system + user message and read the answer. *Why:* this is the shape of every future call. *What happens:* the SDK authenticates with your key, POSTs the messages, and returns a typed object. *Verify:* `choices[0].message.content` is a non-empty string and `usage.total_tokens > 0`. *What could go wrong:* a missing/invalid key raises `AuthenticationError` (401).",
  },
  {
    type: "code",
    language: "python",
    caption: "Minimal OpenAI chat call (pip install openai)",
    code: `import os
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a terse assistant."},
        {"role": "user", "content": "Name the capital of France."},
    ],
)
print(resp.choices[0].message.content)
print(resp.usage.total_tokens)`,
    output: `Paris.
23`,
  },
  {
    type: "callout",
    variant: "note",
    title: "About the outputs in this lesson",
    md: "Model text is **non-deterministic** — the exact words vary run to run, and `total_tokens` shifts with them. Every output shown for a *network* call here is **representative**: trust the *shape* (`content` is a string, `usage` has three counts), not the exact characters. The deterministic Python examples (parsing, cost maths) show exact output you can reproduce.",
  },
  {
    type: "code",
    language: "python",
    caption: "Response anatomy — what you actually read back",
    code: `choice = resp.choices[0]
print(choice.message.role)      # who produced it
print(choice.finish_reason)     # why it stopped
u = resp.usage
print(u.prompt_tokens, u.completion_tokens, u.total_tokens)`,
    output: `assistant
stop
18 5 23`,
  },
  {
    type: "prose",
    md: "`choices` is a **list** because you can request more than one candidate (`n>1`); you almost always read `choices[0]`. `finish_reason == \"stop\"` means the model finished naturally; **`\"length\"` means it was cut off** at the token cap (a truncation bug in disguise — covered in the gotchas). `usage` is how you know what the call cost before any invoice arrives.",
  },
  {
    type: "prose",
    md: "**Now the same call on Azure OpenAI.** The request body (messages, roles, reading the response) is *identical* — only **client construction** changes. The `AzureOpenAI` client needs three things: your key, the **resource endpoint**, and an **`api_version`**. And the single most important difference on the whole platform: the `model` argument must be your **deployment name**.",
  },
  {
    type: "code",
    language: "python",
    caption: "The same call against Azure OpenAI",
    code: `import os
from openai import AzureOpenAI

client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["OPENAI_API_VERSION"],       # e.g. "2024-10-21"
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"], # https://<resource>.openai.azure.com
)

resp = client.chat.completions.create(
    model=os.environ["AZURE_OPENAI_DEPLOYMENT"],  # DEPLOYMENT name — NOT "gpt-4o"
    messages=[{"role": "user", "content": "Ping"}],
)
print(resp.choices[0].message.content)`,
    output: `Pong! How can I help?`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "On Azure, `model` is the DEPLOYMENT name — not the model id",
    md: "Docs and tutorials often name a deployment identically to its model (a deployment *called* `gpt-4o` running `gpt-4o`), so people assume `model=\"gpt-4o\"` is 'the model name'. It isn't — it's the **deployment** name that just happens to match. Deploy the same model as `chat-prod` and `model=\"gpt-4o\"` returns **404 `DeploymentNotFound`**, even though your key and endpoint are perfect. Microsoft's own docs are explicit: *\"Azure OpenAI always requires deployment name... even when using the model parameter.\"* Recognise it by a 404 whose body mentions *deployment* while the identical code works on OpenAI. This is the troubleshooting exercise in unit 4 — expect it.",
  },
  {
    type: "prose",
    md: "There is also a **newer, simpler Azure path**: point the *plain* `OpenAI` client at the resource's OpenAI-compatible `/openai/v1/` base URL. It needs no `api_version` pin. The `model` is still your deployment name.",
  },
  {
    type: "code",
    language: "python",
    caption: "Newer OpenAI-compatible Azure endpoint (no api_version pin)",
    code: `from openai import OpenAI

client = OpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    base_url="https://<resource>.openai.azure.com/openai/v1/",
)
# model is still the DEPLOYMENT name`,
  },
  {
    type: "prose",
    md: "**Authentication & secrets.** Both clients read the key from an environment variable by default (`OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`) — never hardcode it. In production, prefer **no key at all**: Azure supports **Microsoft Entra ID / managed identity**, where a token provider issues short-lived tokens and there is no static secret to leak. That's the difference between a demo and something you'd deploy.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Leaking a key is the fastest way to a surprise bill",
    md: "A committed `.env`, a key pasted into a notebook shared to GitHub, or request headers dumped into logs are all live credentials the moment they're public — and LLM keys bill real money. Rules: keys come from the environment (or Key Vault / managed identity), `.env` is git-ignored, and you never log auth headers. If a key is exposed, **rotate it immediately** — deleting the file isn't enough once it's in git history.",
  },
  {
    type: "prose",
    md: "**Cost is a first-class concern, and `usage` is how you measure it.** You are billed per token, and **input and output tokens are priced differently** (output is usually pricier). Never guess cost — compute it from the `usage` on each response.",
  },
  {
    type: "code",
    language: "python",
    caption: "Estimate call cost from usage (deterministic)",
    code: `prompt_tokens, completion_tokens = 1200, 350
in_rate, out_rate = 0.0025, 0.01     # example USD per 1K tokens — check current pricing

cost = prompt_tokens / 1000 * in_rate + completion_tokens / 1000 * out_rate
print(round(cost, 4))`,
    output: `0.0065`,
  },
  {
    type: "prose",
    md: "The rates above are placeholders — **pricing changes, so read the current price list** — but the method is stable: split input vs output tokens and multiply by their rates. Logging `total_tokens` per call is the cheapest observability you can add, and it's the foundation for the cost tracking you'll build in later topics.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Azure content filtering can block a prompt OpenAI happily answers",
    md: "Azure OpenAI applies **content filters by default**. The same prompt that returns normally from OpenAI can, on Azure, come back with `finish_reason == \"content_filter\"` (the completion was filtered) or raise a `BadRequestError` (400) whose code is `content_filter` (the prompt was blocked). Engineers assume 'same model, same behaviour' and are baffled when only Azure refuses. It's not a bug — it's policy differing between providers. Handle both finish reasons, and know filter severity is configurable on the Azure resource.",
  },
  {
    type: "prose",
    md: "**Failure modes you must expect.** `401 AuthenticationError` (bad/missing key). `404 NotFoundError` (on Azure: wrong deployment name / endpoint / api_version). `429 RateLimitError` (over your rate or quota). The SDK **auto-retries** 429 and 5xx twice with exponential backoff by default, so transient blips often self-heal — but sustained 429s mean you're genuinely over quota. Note the provider difference: OpenAI limits are account-level RPM/TPM, while **Azure quota is a per-deployment tokens-per-minute allocation you assign from a regional pool** — so an under-provisioned Azure deployment can 429 at volumes OpenAI handles fine.",
  },
  {
    type: "takeaways",
    items: [
      "The chat API is stateless: send a list of messages, get one completion; resend history yourself to maintain context.",
      "Roles: system steers, user asks, assistant replays prior model turns. Read choices[0].message.content, finish_reason, and usage.",
      "OpenAI vs Azure differ only in client construction — but on Azure `model` MUST be the deployment name (else 404).",
      "Azure client needs api_version + azure_endpoint (or use the newer /openai/v1/ base_url with the plain OpenAI client).",
      "Keys come from the environment / managed identity, never source; rotate on exposure.",
      "Measure cost from usage (input vs output priced differently); expect 401/404/429 and Azure content filtering.",
    ],
  },
];

// ── 3.1.2 · Practice — Send varied prompts (guided → independent) ─────────────
const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Now send real calls and *read what comes back*. If you have an API key (OpenAI or Azure), run these for real; if not, reason precisely about the expected response shape and `usage`. Guidance decreases each level. Set your key first: `export OPENAI_API_KEY=sk-...` (or the Azure trio), and `pip install openai`.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Steer behaviour with the system role (guided)",
    intro: "Send the SAME user question twice with different system prompts and observe how the system role changes the answer's style — not its facts.",
    steps: [
      {
        order: 1,
        action: "Build a helper `ask(system, user)` that calls `chat.completions.create` and returns `resp.choices[0].message.content`.",
        expected: "One function you can call repeatedly with different messages.",
      },
      {
        order: 2,
        action: "Call it twice with user=\"Explain what an API is\" and two systems: \"You are terse.\" vs \"You explain to a 10-year-old with an analogy.\"",
        decision: "Before running: will the two answers differ in FACTS or only in STYLE/length? Predict, then check against the outputs.",
      },
      {
        order: 3,
        action: "Print each answer and its `resp.usage.completion_tokens`.",
        expected: "The child-friendly answer is longer (more completion tokens); the terse one is short. Same underlying facts.",
        verify: "The system prompt visibly changed tone/length without you touching the user question.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os
from openai import OpenAI
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def ask(system, user):
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content, resp.usage.completion_tokens

for system in ["You are terse.", "You explain to a 10-year-old with an analogy."]:
    text, out_tokens = ask(system, "Explain what an API is")
    print(out_tokens, "->", text)`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Few-shot with the assistant role (less guidance)",
    intro: "Teach the model an output format by EXAMPLE, using assistant messages, without describing rules in prose.",
    steps: [
      {
        order: 1,
        action: "Build a messages list that includes one worked example: a user message \"berlin\" followed by an assistant message \"Berlin, Germany\", then a real user message \"osaka\".",
        decision: "Why put the example as a user+assistant PAIR rather than describing the format in the system prompt? Decide what the assistant example is teaching the model to imitate.",
      },
      {
        order: 2,
        action: "Send it and confirm the model answers the new input in the demonstrated 'City, Country' format.",
        expected: "Something like `Osaka, Japan` — the format was learned from the single example, not from an instruction.",
        verify: "Removing the example pair makes the format less reliable — that contrast is the point of few-shot.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 2 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `messages = [
    {"role": "system", "content": "Return the city's full location."},
    {"role": "user", "content": "berlin"},
    {"role": "assistant", "content": "Berlin, Germany"},   # the worked example
    {"role": "user", "content": "osaka"},
]
resp = client.chat.completions.create(model="gpt-4o", messages=messages)
print(resp.choices[0].message.content)   # -> "Osaka, Japan" (format learned by example)`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 3 — Read the whole response like an engineer (independent)",
    intro: "A realistic requirement and acceptance criteria. No implementation steps.",
    steps: [
      {
        order: 1,
        action: "Write `classify(text)` that asks the model to label `text` as exactly one of: positive, negative, neutral — and returns a dict `{\"label\": <str>, \"tokens\": <int>, \"finish\": <str>}`.",
      },
      {
        order: 2,
        action: "Acceptance: `label` is lowercased and stripped; `tokens` is `usage.total_tokens`; `finish` is the response's `finish_reason`. Steer the model with the system prompt so it returns ONLY the label word.",
        decision: "How will you make the label robust if the model replies \"Positive.\" with punctuation/capitalisation? (You control the parsing, not just the prompt.)",
      },
      {
        order: 3,
        action: "Run it on three sample texts and confirm each result dict is well-formed with finish == \"stop\".",
        verify: "A verbose model reply still yields a clean lowercase label because you normalised it.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 3 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def classify(text):
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Reply with exactly one word: positive, negative, or neutral."},
            {"role": "user", "content": text},
        ],
    )
    raw = resp.choices[0].message.content
    label = raw.strip().strip(".").lower()      # normalise: 'Positive.' -> 'positive'
    return {"label": label, "tokens": resp.usage.total_tokens, "finish": resp.choices[0].finish_reason}

for t in ["I love this!", "This is broken and slow.", "It arrived on Tuesday."]:
    print(classify(t))`,
  },
  {
    type: "checkpoint",
    title: "Verify before moving on",
    items: [
      "You sent real calls (or precisely described the expected response shape and usage).",
      "You saw the system prompt change tone/length while facts stayed the same.",
      "Your few-shot example made the model imitate a format you never described in words.",
      "Your classify() returns a normalised lowercase label even when the model adds punctuation.",
      "You can point to prompt_tokens, completion_tokens, total_tokens and finish_reason on a response.",
    ],
  },
];

// ── 3.1.3 · Build — Provider-configurable Q&A CLI (hands-on lab) ──────────────
const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Hands-on lab.** Build a tiny command-line Q&A tool that runs against **either** OpenAI **or** Azure OpenAI, chosen by an environment variable — the exact provider-portability the topic's mastery criteria demand. This is deliberately the same abstraction real teams use to avoid vendor lock-in.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Prerequisites · Objective · Starting state",
    md: "**Prerequisites:** Python 3.10+, `pip install openai`, and at least ONE working credential set — OpenAI (`OPENAI_API_KEY`) or Azure (`AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` + `OPENAI_API_VERSION` + a deployment name). **Objective:** a script `qa.py` you run as `python qa.py \"your question\"` that prints an answer and the token usage, switching provider via `LLM_PROVIDER`. **Starting state:** an empty file and your keys in the environment (never in the file).",
  },
  {
    type: "code",
    language: "bash",
    caption: "Set up (choose the provider you have access to)",
    code: `python -m venv .venv && source .venv/bin/activate
pip install openai

# OpenAI:
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...

# ...or Azure OpenAI:
export LLM_PROVIDER=azure
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
export OPENAI_API_VERSION=2024-10-21
export AZURE_OPENAI_DEPLOYMENT=<your-deployment-name>`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Guided implementation (with decisions to make)",
    intro: "Enough structure to start; the design choices are yours.",
    steps: [
      {
        order: 1,
        action: "Write `make_client()` that returns a `(client, model)` tuple. Read `LLM_PROVIDER`; construct `AzureOpenAI` (+ deployment name) or `OpenAI` (+ model id) accordingly.",
        decision: "For Azure, what do you pass as `model` — the deployment name or \"gpt-4o\"? (If you get this wrong the lab will 404. That's intentional — you'll fix it in unit 4.) Also: should an unknown LLM_PROVIDER default to OpenAI or fail loudly? Decide and justify.",
      },
      {
        order: 2,
        action: "Write `answer(question)` that calls `chat.completions.create` with a short system prompt + the user question, and returns the content plus the `usage`.",
        expected: "The downstream call is byte-for-byte identical across providers — only make_client() differs.",
      },
      {
        order: 3,
        action: "Read the question from `sys.argv`, print the answer, and print `total_tokens`. Handle a missing argument with a usage message.",
        decision: "Which specific exceptions will you catch — `AuthenticationError`, `RateLimitError`, `NotFoundError` — and what actionable message will each print? A raw traceback is not an acceptable UX.",
      },
      {
        order: 4,
        action: "VERIFY: run `python qa.py \"What is an API in one sentence?\"`. Then flip `LLM_PROVIDER` to the other provider (if you have both) and run the identical command.",
        verify: "Both providers print a sensible answer and a token count. The command line you typed did not change — only the env var did.",
      },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "`python qa.py \"...\"` prints an answer plus total_tokens.",
      "Switching LLM_PROVIDER between openai and azure needs NO code change.",
      "On Azure, the call uses the deployment name as `model` (not the model id).",
      "No secret is hardcoded — all credentials come from the environment.",
      "AuthenticationError / RateLimitError / NotFoundError print a clear, actionable message, not a raw traceback.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution — qa.py",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os, sys
import openai
from openai import OpenAI, AzureOpenAI

def make_client():
    provider = os.environ.get("LLM_PROVIDER", "openai").lower()
    if provider == "azure":
        client = AzureOpenAI(
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ["OPENAI_API_VERSION"],
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        )
        return client, os.environ["AZURE_OPENAI_DEPLOYMENT"]   # deployment name
    if provider == "openai":
        return OpenAI(api_key=os.environ["OPENAI_API_KEY"]), os.environ.get("OPENAI_MODEL", "gpt-4o")
    raise SystemExit(f"Unknown LLM_PROVIDER: {provider!r} (use 'openai' or 'azure')")

def answer(question):
    client, model = make_client()
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Answer in one clear sentence."},
            {"role": "user", "content": question},
        ],
    )
    return resp.choices[0].message.content, resp.usage.total_tokens

def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python qa.py "your question"')
    try:
        text, tokens = answer(sys.argv[1])
    except openai.AuthenticationError:
        raise SystemExit("Auth failed: check your API key / endpoint for this provider.")
    except openai.NotFoundError:
        raise SystemExit("404: on Azure, model must be your DEPLOYMENT name; check endpoint/api_version.")
    except openai.RateLimitError:
        raise SystemExit("Rate limited (429): slow down or raise your quota, then retry.")
    print(text)
    print(f"[tokens: {tokens}]")

if __name__ == "__main__":
    main()`,
  },
  {
    type: "callout",
    variant: "tip",
    title: "Cleanup",
    md: "Costs accrue while resources exist. When done: **revoke or rotate** any test key you exported; delete the local `.env`/shell history entries holding secrets; and on Azure, if you created a deployment only for this lab, **delete the deployment** (and the resource, if it was throwaway) so it stops consuming quota. Idle deployments don't cost per-hour like a VM, but leaving keys live is the real risk — treat rotation as part of 'done'.",
  },
];

// ── 3.1.4 · Review — Compare OpenAI vs Azure (troubleshoot + retrieve + master)
const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A real operational failure first, then scenario questions, then a mastery challenge. Work the failure as an engineer: gather evidence and rule causes out before changing anything.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom",
    md: "Your Q&A CLI from the lab works perfectly against OpenAI. You point it at a freshly provisioned **Azure OpenAI** resource with a valid key, and **every** call fails immediately with a **404**. No request reaches the model. Nothing about the message-building code changed between the two runs.",
  },
  {
    type: "code",
    language: "text",
    caption: "The error (Azure only)",
    code: `openai.NotFoundError: Error code: 404 - {
  "error": {
    "code": "DeploymentNotFound",
    "message": "The API deployment for this resource does not exist."
  }
}`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Diagnose it — evidence → root cause → fix → verification",
    intro: "Reason from the evidence; don't randomly change settings.",
    steps: [
      {
        order: 1,
        action: "OBSERVE: it's a 404, not a 401. What does that rule OUT immediately?",
        expected: "401 would mean bad/missing credentials. A 404 means you authenticated fine — the key and endpoint are reaching Azure — but the thing you asked for isn't found.",
      },
      {
        order: 2,
        action: "POSSIBLE CAUSES: list what a 404 'DeploymentNotFound' could mean.",
        decision: "(a) wrong `azure_endpoint` (usually a connection error, not this clean 404), (b) an `api_version` the resource rejects, (c) the `model` value isn't a real deployment on this resource, (d) the deployment exists but in a different region/resource. The error text names *deployment* — which hypothesis does that evidence most support?",
      },
      {
        order: 3,
        action: "DIAGNOSTIC PROCESS: in the Azure portal (or `az cognitiveservices account deployment list`), read the actual deployment name on this resource, and compare it to the exact string your code passes as `model`.",
        expected: "Your code passes `model=\"gpt-4o\"`, but the resource's deployment is named e.g. `gpt4o-chat`. They don't match.",
      },
      {
        order: 4,
        action: "ROOT CAUSE: state it in one sentence.",
        expected: "On Azure the `model` argument must be the **deployment name**; the code is sending the OpenAI *model id* (`gpt-4o`), which is not a deployment on this resource — hence 404 DeploymentNotFound. The OpenAI run worked because there, the model id *is* the correct value.",
      },
      {
        order: 5,
        action: "FIX & VERIFY: set `model` to the real deployment name (via `AZURE_OPENAI_DEPLOYMENT`), rerun the identical command.",
        verify: "The 404 is gone and a completion returns. Bonus check: temporarily set a bogus deployment name and confirm the 404 returns — proving you found the true cause, not a coincidence.",
      },
    ],
  },
  {
    type: "prose",
    md: "The transferable lesson: **read the status code before the message.** 401 vs 404 vs 429 each rule whole classes of cause in or out. A 404 that names a resource type ('deployment') is pointing you straight at a name mismatch — reach for the portal/CLI to compare reality against your config, rather than randomly changing keys or versions.",
  },
  {
    type: "quiz",
    question: "Identical code returns answers on OpenAI but fails with `404 DeploymentNotFound` on Azure OpenAI. The key is valid and the endpoint is reachable. Most likely cause?",
    choices: [
      "The Azure resource is in a region that doesn't offer the model",
      "`model` is set to the OpenAI model id instead of the Azure deployment name",
      "The api_version is missing",
      "Azure requires a different messages schema",
    ],
    answerIndex: 1,
    explanation: "A valid key + reachable endpoint rules out auth/networking; a 404 that says 'deployment' points at a name mismatch. On Azure, `model` must be the deployment name you created, not the underlying model id — the #1 OpenAI→Azure porting bug. A wrong region or missing api_version usually surfaces as a different error, and the messages schema is identical across providers.",
  },
  {
    type: "quiz",
    question: "You must call Azure OpenAI from a container running in production, with a security requirement that NO API key may be stored anywhere. Which approach fits?",
    choices: [
      "Bake the key into the image at build time",
      "Store the key in Azure Key Vault and read it at startup",
      "Use Microsoft Entra ID / managed identity with a bearer-token provider — no static key at all",
      "Pass the key as a command-line argument",
    ],
    answerIndex: 2,
    explanation: "The requirement is 'no API key stored anywhere'. Managed identity / Entra ID issues short-lived tokens at runtime, so there is no static secret to store or leak. Key Vault still stores a key (better than baking it in, but it violates the stated constraint). Baking into the image or passing on the CLI are both leaks.",
  },
  {
    type: "quiz",
    question: "A chat feature 'forgets' everything the user said one turn ago, even though a system prompt is set. The code sends only the newest user message each call. What's happening and the fix?",
    choices: [
      "The model's memory expired; increase the session timeout",
      "The API is stateless — you must resend the full prior message history on every call",
      "The system prompt overwrote the history; remove it",
      "You need to enable a 'memory' flag on the client",
    ],
    answerIndex: 1,
    explanation: "The chat API keeps no server-side session. 'Memory' is an illusion you create by resending the accumulated messages list (system + all prior user/assistant turns + the new user turn) on each request. There is no timeout or memory flag; sending only the latest message is exactly why context is lost.",
  },
  {
    type: "quiz",
    question: "Under load, your Azure deployment starts returning `429 RateLimitError` at request volumes that OpenAI handled without complaint. Why is Azure more likely to 429 here?",
    choices: [
      "Azure is slower, so requests pile up",
      "Azure quota is a per-deployment tokens-per-minute allocation from a regional pool; an under-provisioned deployment caps out sooner",
      "Azure disables the SDK's automatic retries",
      "OpenAI never rate limits",
    ],
    answerIndex: 1,
    explanation: "On Azure you allocate TPM (tokens-per-minute) to each deployment out of a regional quota; if that allocation is low, you hit 429 at modest volume regardless of the model's raw capability. Raise the deployment's TPM (or spread load) to fix it. The SDK still auto-retries 429 twice on both providers, and OpenAI absolutely rate limits too — just against different, account-level limits.",
  },
  {
    type: "quiz",
    question: "A response comes back with `finish_reason == \"length\"` and the answer is cut off mid-sentence. What does this mean and what's the correct response?",
    choices: [
      "The prompt was too long; there is nothing you can do",
      "Generation hit the max-token cap; raise max_tokens and/or shorten the input so the completion fits",
      "The model refused; rephrase the prompt",
      "A network error truncated the stream; retry the request",
    ],
    answerIndex: 1,
    explanation: "`\"length\"` means output generation stopped at the token limit (default or your `max_tokens`), not that the model finished. The completion is genuinely truncated. Fix by allowing more output tokens and/or reducing input so the response has room. It's not a refusal (`content_filter`) or a network error.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — combine everything, independently.** Build the reliable, provider-portable ask function you'd actually put in a shared library. It must run on both providers, surface cost, and fail like an adult. Write it in a real file; a reference is available once you've attempted it.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build ask(question, *, provider=None) for a shared library",
    intro: "Requirements, constraints, and acceptance — no implementation steps.",
    steps: [
      {
        order: 1,
        action: "Return a dict `{\"text\": str, \"total_tokens\": int, \"provider\": str}`. Select the provider from the `provider` argument, falling back to the `LLM_PROVIDER` env var, defaulting to \"openai\".",
      },
      {
        order: 2,
        action: "Constraint: the message-building and response-reading code must be shared across providers — only client construction may branch. On Azure, use the deployment name as `model`.",
        decision: "Where is the single branch point, and what exactly differs inside it? If you're duplicating the create() call per provider, refactor.",
      },
      {
        order: 3,
        action: "Reliability: raise a clear, provider-agnostic error for auth failure and for rate limiting; let the SDK's built-in retries handle transient 429/5xx. Never leak a key into the error message.",
        decision: "Which exceptions do you translate, and which do you let propagate? What belongs in the message so an on-call engineer can act — without printing secrets?",
      },
      {
        order: 4,
        action: "Verify against the acceptance criteria below on whichever provider(s) you can access.",
        verify: "Same function, same call site, correct result dict on each provider; a bad key yields your clean auth error, not a raw traceback.",
      },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Returns {'text': str, 'total_tokens': int, 'provider': str} on a successful call.",
      "Runs on OpenAI and Azure with NO change to the message-building or response-reading code.",
      "provider resolves as: explicit arg → LLM_PROVIDER env → 'openai' default.",
      "On Azure the deployment name is used as `model`.",
      "Auth failure and rate limiting raise clear, provider-agnostic errors; no API key ever appears in an error/log.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os
import openai
from openai import OpenAI, AzureOpenAI

class LLMError(RuntimeError):
    pass

def _client(provider):
    if provider == "azure":
        client = AzureOpenAI(
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ["OPENAI_API_VERSION"],
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        )
        return client, os.environ["AZURE_OPENAI_DEPLOYMENT"]  # deployment name
    if provider == "openai":
        return OpenAI(api_key=os.environ["OPENAI_API_KEY"]), os.environ.get("OPENAI_MODEL", "gpt-4o")
    raise LLMError(f"Unknown provider: {provider!r}")

def ask(question, *, provider=None):
    provider = (provider or os.environ.get("LLM_PROVIDER", "openai")).lower()
    client, model = _client(provider)
    try:
        resp = client.chat.completions.create(   # shared across providers
            model=model,
            messages=[
                {"role": "system", "content": "Answer in one clear sentence."},
                {"role": "user", "content": question},
            ],
        )
    except openai.AuthenticationError:
        raise LLMError(f"Authentication failed for provider '{provider}'.") from None
    except openai.RateLimitError:
        raise LLMError(f"Rate limited by provider '{provider}'; retry later.") from None
    return {
        "text": resp.choices[0].message.content,
        "total_tokens": resp.usage.total_tokens,
        "provider": provider,
    }

print(ask("What is an API in one sentence?"))`,
  },
  {
    type: "takeaways",
    items: [
      "Read the status code first: 401 (auth) vs 404 (wrong deployment/endpoint) vs 429 (quota) each rule out whole causes.",
      "The canonical OpenAI→Azure bug is passing the model id where Azure needs the deployment name.",
      "Provider portability = branch ONLY at client construction; keep message-building and response-reading shared.",
      "Production auth prefers managed identity over stored keys; always surface cost via usage and fail with actionable, secret-free errors.",
      "You can now call, read, price, port, and debug a chat completion across OpenAI and Azure — the bar for this topic.",
    ],
  },
];

export const content: TopicContent = {
  "unit-api-first-call-01": learn,
  "unit-api-first-call-02": practice,
  "unit-api-first-call-03": build,
  "unit-api-first-call-04": review,
};
