import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Image Generation" (topic-mm-image-gen).
// 3 units: 01 learn (text-to-image, editing, prompt control, safety) · 02 practice
// (generate/iterate) · 03 build (image-gen feature + content safety).
// Verified against OpenAI docs (current): images.generate(model="gpt-image-2", prompt, size,
// quality, n) -> b64_json; images.edit (image + mask); Responses API tools=[{"type":
// "image_generation"}]; moderation param auto/low; moderation_blocked error + moderation_details;
// cost by quality/size; latency; org verification. Deterministic keyless safety-gate experiment.
// Model ids hedged; generated-image outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Image generation flips the vision skill around: instead of reading an image, you *produce* one from a text prompt (and optionally edit an existing image). The API call is easy. The engineering — the reason this is a topic and not a one-liner — is **content safety** and **cost control**: generation is the most abuse-prone and one of the most expensive things you can put in a product, so a responsible feature is defined by its guardrails, not its prompt.",
  },
  {
    type: "prose",
    md: "**Mental model: an image model samples a plausible image from your prompt — it's a creative sampler, not a fact renderer.** It doesn't 'know' facts, spell reliably, or reproduce a specific real person/logo on demand; it generates *a* plausible image matching the description. So you steer it with descriptive prompts and iterate, rather than expecting one exact deterministic output. And because the same power that makes a nice illustration can make harmful content, every generation passes through content moderation — yours and the provider's.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Text-to-image", definition: "Generate an image from a text prompt: client.images.generate(model=..., prompt=..., size=..., quality=...) → base64 image (b64_json). The core operation." },
      { term: "Image editing / inpainting", definition: "Modify an existing image, optionally with a mask marking the region to change: client.images.edit(model=..., image=..., mask=..., prompt=...). Multi-turn edits refine iteratively." },
      { term: "Content moderation", definition: "Prompts AND generated images are checked against a content policy. A blocked request raises an error (e.g. code 'moderation_blocked') — handle it; don't auto-retry a policy violation." },
      { term: "Generation parameters", definition: "size (e.g. 1024x1024), quality (low/medium/high/auto), format (png/jpeg/webp), n (count), background (transparent/opaque). These drive both the output AND the cost." },
      { term: "Generation cost", definition: "Billed by output tokens scaled by quality × size (high-quality large images cost the most, and latency can reach ~minutes). Unbounded generation is a real budget risk." },
    ],
  },
  {
    type: "prose",
    md: "**Generate an image.** Pick a model, prompt, size, and quality; you get back a base64 image:",
  },
  {
    type: "code",
    language: "python",
    caption: "Text-to-image (model id illustrative — use your provider's current image model)",
    code: `import base64
from openai import OpenAI
client = OpenAI()   # key from env

result = client.images.generate(
    model="gpt-image-1",           # use your provider's CURRENT image model id
    prompt="A serene mountain lake at dawn, soft mist, photorealistic",
    size="1024x1024",
    quality="medium",              # low/medium/high/auto — drives cost AND latency
    n=1,
)
img_bytes = base64.b64decode(result.data[0].b64_json)   # representative image
open("lake.png", "wb").write(img_bytes)`,
  },
  {
    type: "prose",
    md: "**Editing** an existing image (optionally masking a region) uses `client.images.edit(image=..., mask=..., prompt=...)`; some providers also expose generation as a **tool in the Responses API** (`tools=[{\"type\": \"image_generation\"}]`), which supports multi-turn refinement and returns a `revised_prompt`. Either way, the *shape* is stable — a prompt plus parameters in, image bytes out — while model ids churn.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Ignoring content safety — the request WILL sometimes be blocked",
    md: "Both the **prompt and the generated image** are moderated. A violation raises an error (e.g. `code: \"moderation_blocked\"`, often with `moderation_details`: which stage — input/output — and which category — e.g. harassment, self-harm, sexual, violence). Building as if generation always succeeds is a bug. Do this instead:\n\n- **Handle `moderation_blocked` explicitly** — catch it, show the user a clear, generic message ('this request can't be generated'), and log the details for your own review. **Don't auto-retry** a policy violation; retrying the same blocked prompt just wastes calls.\n- **Add your own pre-filter** — a lightweight app-side check that rejects obviously disallowed prompts *before* you spend an API call. This is defense-in-depth, not a replacement for the provider's moderation.\n- **A `moderation` parameter** (auto/low) may tune strictness, but you still handle blocks.\n\nContent safety isn't an afterthought bolted on at the end — it's the feature's core requirement."
  },
  {
    type: "code",
    language: "python",
    caption: "App-side safety gate BEFORE spending an API call (deterministic, keyless)",
    code: `# Defense-in-depth: a cheap app-side pre-filter. The PROVIDER'S moderation is the real
# safety boundary; this just blocks obvious violations before you pay for a call.
BLOCKED = {"weapon", "gore", "explicit"}   # illustrative policy terms for YOUR app

def safety_gate(prompt: str) -> dict:
    hits = [w for w in BLOCKED if w in prompt.lower()]
    if hits:
        return {"allowed": False, "reason": f"blocked: {sorted(hits)}"}
    return {"allowed": True}

print(safety_gate("a serene mountain lake at dawn"))
print(safety_gate("a weapon on a table"))`,
    output: `{'allowed': True}
{'allowed': False, 'reason': "blocked: ['weapon']"}`,
  },
  {
    type: "prose",
    md: "The gate above is deliberately simple and deterministic — it runs with no key. In production it's the *first* line (cheap, catches obvious cases) and the provider's moderation is the *authoritative* line (catches what you miss, and moderates the output image too). Two layers, because either alone leaves a gap.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Unbounded generation cost — quality × size × volume",
    md: "Generation is billed by output tokens scaled by **quality and size**, so a high-quality large image costs far more than a small low-quality one, and latency can reach ~minutes for complex requests. Left unbounded, a generation feature is a budget hole (and an abuse vector — someone spamming your endpoint runs up your bill). Bound it:\n\n- **Rate-limit / quota** per user and globally.\n- **Cap size and quality** to what the feature actually needs (don't default to high/large).\n- **Cache / dedupe** identical prompts instead of regenerating.\n- **Confirm before expensive generations** and surface the cost.\n\nBudget control is part of shipping the feature, not an optimization for later."
  },
  {
    type: "quiz",
    question: "Your image-gen endpoint occasionally throws a 'moderation_blocked' error. Your current code retries the same request 3 times on any error. What's wrong and what's the fix?",
    choices: [
      "Nothing — retrying always eventually works",
      "A policy violation is not a transient error, so retrying the identical blocked prompt just wastes calls and never succeeds. Detect moderation_blocked specifically, show the user a clear generic message, log the details for review, and do NOT retry it (reserve retries for transient failures like timeouts)",
      "Increase the retry count to 10",
      "Disable moderation entirely",
    ],
    answerIndex: 1,
    explanation: "moderation_blocked is a deterministic policy rejection, not a transient fault — the same prompt will be blocked every time, so blanket retries burn quota for nothing. Handle it explicitly (generic user message + logged details, no retry) and reserve retry logic for genuinely transient errors. Disabling moderation isn't an option you control and would violate policy.",
  },
  {
    type: "quiz",
    question: "A generation feature ships defaulting every request to the largest size and highest quality. In production, what problem appears first?",
    choices: [
      "Images are too small",
      "Cost and latency balloon — high quality × large size is the most expensive/slow combination, and with no per-user quota it's also an abuse/budget risk. Default to the smallest size and quality that meets the need, cap/rate-limit usage, and cache identical prompts",
      "Moderation stops working",
      "Nothing — bigger is always better",
    ],
    answerIndex: 1,
    explanation: "Generation cost scales with quality and size and latency can reach minutes, so defaulting to max on both is the priciest, slowest choice — and without quotas it invites runaway spend and abuse. Right-size defaults to the feature's real need and bound usage with rate limits, caps, and caching. Larger isn't better when it multiplies cost for no user benefit.",
  },
  {
    type: "takeaways",
    items: [
      "An image model samples a plausible image from a prompt — a creative sampler, not a fact renderer; steer with descriptive prompts and iterate, don't expect exact deterministic output.",
      "images.generate(model, prompt, size, quality) → base64 image; images.edit for inpainting; some providers expose generation as a Responses API tool. Shapes are stable, model ids churn.",
      "Content safety is core: prompt AND image are moderated; handle moderation_blocked explicitly (generic message, log, no retry) and add an app-side pre-filter as defense-in-depth.",
      "Cost scales with quality × size × volume (and latency can be minutes) — cap size/quality, rate-limit per user, cache identical prompts, confirm expensive generations.",
      "A responsible image-gen feature is defined by its guardrails (safety + budget), not by its prompt.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Generate and iterate on images to learn prompt control — and to feel where cost and safety bite. With a key, generate real images; keyless, run the safety gate and cost reasoning and design your prompts/params on paper — the control skill transfers.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Control image output via prompts (guided)",
    intro: "Learn what moves the output, and what it costs.",
    steps: [
      { order: 1, action: "Generate an image from a vague prompt ('a house'), then progressively add control (style, lighting, composition, medium, mood). Watch how specificity changes the result.", expected: "More descriptive prompts yield more controlled, on-target images — you're steering a sampler." },
      { order: 2, action: "Generate the SAME prompt at low vs high quality and small vs large size. Compare the visual difference against the (large) cost/latency difference.", decision: "For your use case, what's the smallest size + lowest quality that still looks acceptable? Where does 'higher quality' stop being worth the cost?" },
      { order: 3, action: "Run several prompts through the safety gate (including an obviously disallowed one). Confirm the gate blocks before any API spend, and note that the provider would also moderate the output.", verify: "You controlled output via prompt specificity, mapped quality/size to cost, and saw the safety gate block a disallowed prompt pre-call." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You steered image output with progressively more specific prompts.",
      "You compared quality/size settings for visual gain vs cost/latency.",
      "You ran prompts through the safety gate and saw a disallowed one blocked pre-call.",
      "You can state the cheapest settings that still meet your quality bar.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build an image-generation feature that enforces content safety** (and bounds cost). The completion criterion for this unit is exactly that: *the feature enforces content safety*. A generation endpoint without guardrails isn't a smaller version of this feature — it's a liability.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + where this fits P5",
    md: "Completion: *the feature enforces content safety*. Two layers: an **app-side pre-filter** (cheap, blocks obvious violations before spending) and **provider moderation handling** (catch `moderation_blocked`, generic user message, log details, no retry). Plus **cost bounds** (size/quality caps, per-user rate limit, cache). This topic isn't a required P5 milestone by itself, but a generation feature can be part of your P5 multimodal app — and the safety+cost discipline here is expected of any media-producing feature you ship. Generation needs a key from the environment; the safety gate and cost logic are keyless-testable."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — safe, cost-bounded image-gen feature",
    intro: "Guardrails first. Acceptance defines done.",
    steps: [
      { order: 1, action: "Pre-filter: run every prompt through an app-side safety gate before calling the API. Reject obvious violations with a clear message and zero API spend.", decision: "What belongs in YOUR app's blocklist/policy, and how do you word a rejection so it's clear but not preachy?" },
      { order: 2, action: "Provider moderation: call generation, and catch moderation_blocked (and other errors) explicitly — show a generic user-facing message, log the details for review, and do NOT auto-retry a policy block.", expected: "Blocked prompts (yours or the provider's) never produce content and never loop on retries; the user gets a clear message." },
      { order: 3, action: "Cost bounds: cap size/quality to the feature's need, rate-limit per user, and cache/dedupe identical prompts. Read the key from the environment.", verify: "The feature enforces content safety at two layers, handles moderation_blocked without retry loops, and bounds cost via caps + rate limit + cache." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "App-side pre-filter rejects obvious violations before any API spend.",
      "moderation_blocked handled explicitly: generic message, logged details, no auto-retry.",
      "Cost bounded: size/quality caps, per-user rate limit, prompt cache/dedupe.",
      "Key from environment; safety gate + cost logic unit-testable without a key.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — two-layer safety + cost bounds (safety/cost logic is keyless-testable)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from openai import OpenAI, BadRequestError
client = OpenAI()   # key from env

BLOCKED = {"weapon", "gore", "explicit"}     # app-side policy
_seen: dict[str, bytes] = {}                 # simple prompt cache/dedupe

def pre_filter(prompt: str) -> None:
    hits = [w for w in BLOCKED if w in prompt.lower()]
    if hits:
        raise ValueError(f"This request can't be generated.")   # generic, pre-call

def generate_safe(prompt: str, size="1024x1024", quality="medium") -> bytes:
    pre_filter(prompt)                       # LAYER 1: app-side, before any spend
    if prompt in _seen:
        return _seen[prompt]                 # cost bound: don't regenerate identical prompts
    try:
        r = client.images.generate(model="gpt-image-1", prompt=prompt,
                                    size=size, quality=quality, n=1)   # capped size/quality
    except BadRequestError as e:
        if getattr(e, "code", "") == "moderation_blocked":   # LAYER 2: provider moderation
            # log e.body / moderation_details for review; generic message to user; NO retry
            raise ValueError("This request can't be generated.")
        raise
    import base64
    img = base64.b64decode(r.data[0].b64_json)
    _seen[prompt] = img
    return img`,
  },
];

export const content: TopicContent = {
  "unit-mm-image-gen-01": learn,
  "unit-mm-image-gen-02": practice,
  "unit-mm-image-gen-03": build,
};
