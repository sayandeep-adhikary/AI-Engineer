import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Running Models Locally" (topic-oss-local-inference).
// 4 units: 01 learn (local runtimes, GGUF, quantization, VRAM/RAM tradeoffs) · 02 practice
// (run a model in Ollama) · 03 build (swap app backend to a local model) · 04 review
// (quality/latency/cost vs hosted).
// Verified against Ollama docs (current): model:tag naming, GGUF, quant levels q4_K_M/q8_0,
// port 11434, /api/chat + OpenAI-compatible /v1, keep_alive, num_ctx. Deterministic keyless
// VRAM-fit checker. Model ids hedged; model outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "The Hugging Face path runs a model in *your* Python process. **Local runtimes** like Ollama and llama.cpp go further: they package a model as a self-contained artifact and serve it as a background process, so 'run a model' becomes as easy as `ollama run`. The reason to bother — and the reason this is engineering, not a download — is that a local model buys you **privacy, offline operation, cost control, and no rate limits**, but only if you can make it *fit and perform* on the hardware you actually have. This whole topic is about that fit-and-perform tradeoff, whose central lever is **quantization**.",
  },
  {
    type: "prose",
    md: "**Mental model: quantization trades numeric precision for memory — you shrink each weight from many bits to few, fitting a bigger model on smaller hardware at some quality cost.** A 7B model in fp16 is ~14 GB; quantized to 4-bit it's ~3.5 GB and runs on a laptop. The weights are 'rounded' to a coarser grid, so quality drops slightly (usually a little, sometimes a lot for aggressive quants). The engineering question is never 'quantize: yes/no' — it's 'which quant level is the best quality that still fits my RAM/VRAM and hits my latency target.'",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Local runtime", definition: "Software that loads and serves a model on your machine: Ollama (simplest, model:tag pulls + a local server), llama.cpp (the C++ engine underneath many of them), LM Studio (GUI). They hide device/dtype/loading details." },
      { term: "GGUF", definition: "A single-file model format used by llama.cpp/Ollama that bundles weights + metadata + tokenizer, usually already quantized. The common distribution format for local CPU/GPU inference." },
      { term: "Quantization", definition: "Storing weights in fewer bits (e.g. 4-bit / 8-bit) instead of 16/32. Shrinks memory and can speed inference, at some quality cost. Levels like Q4_K_M, Q5_K_M, Q8_0 trade size vs fidelity." },
      { term: "VRAM vs RAM", definition: "VRAM = fast GPU memory (where GPU inference needs the model to live); RAM = system memory (CPU inference, much slower). A model that fits in RAM but not VRAM falls back to slow CPU or spills across both." },
      { term: "KV cache", definition: "Memory holding attention keys/values for the tokens generated so far. It grows with context length and is ADDED to weight memory — long contexts can OOM even when the weights fit." },
      { term: "OOM (out of memory)", definition: "The run aborts because weights + KV cache + overhead exceed available VRAM/RAM. The fix is a smaller model, a lower quant, or a shorter context — not 'try again'." },
    ],
  },
  {
    type: "prose",
    md: "**Ollama in one breath.** You pull a model by `name:tag` (the tag encodes size/quant, e.g. `llama3.2:3b-instruct-q4_K_M`), and run it. It downloads a GGUF, loads it, and serves a local HTTP endpoint (default `http://localhost:11434`).",
  },
  {
    type: "code",
    language: "bash",
    caption: "Ollama basics (model ids/tags illustrative — check the current library)",
    code: `ollama pull llama3.2:3b        # download a GGUF (tag encodes size + quant)
ollama run llama3.2:3b         # interactive chat in the terminal
ollama list                    # local models: size, quant level, format=gguf
ollama ps                      # models currently loaded in memory
# The server also exposes an HTTP API at http://localhost:11434 (used from code next unit).`,
  },
  {
    type: "callout",
    variant: "warning",
    title: "Wrong quant for hardware — the fit-and-perform failure",
    md: "Picking a quant is a hardware decision, and getting it wrong shows up as OOM or crawling latency:\n\n- **Too big (high-precision / large model)** → doesn't fit VRAM → **OOM**, or Ollama offloads layers to CPU/RAM and inference **crawls** (10–100× slower).\n- **Too aggressive (very low-bit)** → fits easily but **quality degrades** noticeably (worse reasoning, more errors).\n- **CPU fallback surprise** → no GPU, or the model didn't fit VRAM, so it runs on CPU — 'it works' but at a fraction of the speed you expected.\n\nThe right move is to **compute the footprint first** (weights + KV cache + overhead) and pick the highest-quality quant that fits with headroom. `Q4_K_M` is a common balanced default; `Q8_0` is near-lossless but ~2× the size; sub-4-bit trades real quality for size."
  },
  {
    type: "code",
    language: "python",
    caption: "Will it fit? weights + KV cache + overhead vs VRAM (deterministic, keyless)",
    code: `DTYPE_BYTES = {"fp32": 4, "fp16": 2, "bf16": 2, "int8": 1, "int4": 0.5}

def fits(params_b, dtype, ctx_tokens, vram_gb, kv_gb_per_1k=0.5, overhead_gb=1.0):
    weights = params_b * DTYPE_BYTES[dtype]
    kv = (ctx_tokens / 1000) * kv_gb_per_1k     # KV cache grows with context length
    need = round(weights + kv + overhead_gb, 2)
    return need <= vram_gb, need

print(fits(7, "fp16", 4000, 16))    # 7B fp16, 4k context, 16 GB GPU
print(fits(7, "int4", 4000, 16))    # same, but 4-bit quantized
print(fits(7, "fp16", 32000, 16))   # same fp16 model, but 32k context`,
    output: `(False, 17.0)
(True, 6.5)
(False, 31.0)`,
  },
  {
    type: "prose",
    md: "Three lessons in three lines: the fp16 7B **doesn't fit** 16 GB (17 GB needed) → **quantize to 4-bit** and it fits easily (6.5 GB) → but push the *same* model to a **32k context** and the KV cache alone blows it past 31 GB. Memory is weights **plus** KV cache **plus** overhead, and context length is a memory knob, not just a capability. This is the arithmetic to do before `ollama run`, not after the OOM.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Expecting frontier quality from a small local model",
    md: "A 3B–8B model you can run on a laptop is **not** a frontier hosted model, and expecting parity leads to disappointment and bad architecture decisions. Local models are strong at: classification, extraction, summarization, simple chat, drafting, and privacy-sensitive or offline tasks. They're weaker at: complex multi-step reasoning, long-context synthesis, niche knowledge, and reliability under adversarial input. The right framing is **fit the model to the task**: use a small local model where it's good enough (and privacy/cost/offline matter), and route hard tasks to a bigger model (local or hosted). 'The local model got it wrong' is often 'this task needed a bigger model,' not 'local models don't work.'"
  },
  {
    type: "quiz",
    question: "You run a 13B model in fp16 on a 16 GB GPU. It loads but generation is extremely slow — far slower than a smaller model. What's happening?",
    choices: [
      "The GPU is defective",
      "A 13B fp16 model (~26 GB) exceeds 16 GB VRAM, so the runtime offloaded layers to CPU/RAM; inference now runs partly on the CPU, which is dramatically slower. Use a quantized build (e.g. 4-bit ≈ 6.5 GB) or a smaller model so it fits VRAM entirely",
      "Slowness is unrelated to memory",
      "13B models are always this slow on any hardware",
    ],
    answerIndex: 1,
    explanation: "A 13B model is ~26 GB in fp16, well over 16 GB VRAM, so the runtime spills layers to system RAM and executes them on the CPU — the classic CPU-fallback slowdown. Quantizing to 4-bit (~6.5 GB) or choosing a smaller model lets it fit entirely in VRAM and run at GPU speed. The hardware isn't broken; the footprint didn't fit.",
  },
  {
    type: "quiz",
    question: "The same quantized model works at a 4k context but OOMs when you raise the context to 32k. Why, and what's the tradeoff?",
    choices: [
      "The model file changed size",
      "The KV cache grows with context length and is added on top of weight memory — at 32k it can dwarf the weights and exceed VRAM. Longer context costs memory (and latency); reduce context, use a smaller model/quant, or accept the higher memory to keep the long context",
      "Quantization stops working above 4k context",
      "Context length has no effect on memory",
    ],
    answerIndex: 1,
    explanation: "Weights are fixed, but the KV cache scales with the number of tokens in context, so an 8× longer context adds a large, separate memory cost that can push total usage past VRAM. Context length is a memory (and latency) knob: shrink it, drop to a smaller model/quant, or provision more memory. It's a tradeoff, not a bug in quantization.",
  },
  {
    type: "takeaways",
    items: [
      "Local runtimes (Ollama/llama.cpp/LM Studio) package a model as an artifact and serve it locally — buying privacy, offline use, cost control, and no rate limits.",
      "Quantization trades precision for memory: 4-bit ≈ ¼ the size of fp16, at some quality cost. Pick the highest-quality quant that fits with headroom (Q4_K_M balanced, Q8_0 near-lossless/2×).",
      "Total memory = weights + KV cache + overhead; KV cache grows with context length, so long contexts can OOM even when weights fit. Compute the footprint before running.",
      "Wrong quant = OOM or CPU-fallback crawl; too-aggressive quant = quality drop. Ollama uses model:tag where the tag encodes size + quant.",
      "A small local model is not a frontier model — fit the model to the task; route hard tasks to a bigger/hosted model.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Run a quantized model locally and feel the fit-and-perform tradeoff directly. With Ollama installed, pull and run a small model; without it, use the fit checker and pick a quant on paper — the sizing judgment is what transfers.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Run a model in Ollama and size it (guided)",
    intro: "Measure the footprint, then run.",
    steps: [
      { order: 1, action: "Before pulling, use the fit checker to pick a model size + quant that fits your hardware with headroom (leave room for KV cache at your target context). Then `ollama pull` that model:tag and `ollama run` it.", expected: "The model responds locally; you predicted it would fit before pulling." },
      { order: 2, action: "Try a harder task (multi-step reasoning or niche knowledge) and compare against what you'd expect from a frontier hosted model. Note where the small local model is good enough and where it isn't.", decision: "For which of YOUR tasks is this local model good enough, and which should route to a bigger model?" },
      { order: 3, action: "Raise the context length (long input) and watch memory/latency. If you have a GPU, compare a model that fits VRAM vs one that spills to CPU.", verify: "You sized and ran a local model, mapped its quality to task difficulty, and observed the context-length memory/latency cost." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You picked a model size + quant with the fit checker and ran it locally.",
      "You identified tasks where the local model is good enough vs where it isn't.",
      "You observed context length affecting memory/latency (and CPU fallback if applicable).",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Swap an existing app's backend to a local model** — call the local runtime from your code instead of a hosted API. The completion criterion: *the app calls the local model from code.* Because Ollama (and the serving stacks next topic) speak an **OpenAI-compatible** dialect, this is often a one-line change to the client's base URL — which is exactly the payoff of the provider-configurable client you built back in the LLM APIs category.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *the app calls the local model from code.* Point your existing LLM client at the local runtime's endpoint (Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`) and keep the rest of the app unchanged. **Roadmap fit:** back in `topic-api-first-call` you built a provider-configurable client (swap providers via config); a local model is just another 'provider' behind the same interface. This is the bridge to the serving topic, where you put a *production* server behind that same interface. No API key needed for local — but keep the interface identical so you can switch back to hosted."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — swap backend to a local model",
    intro: "Same interface, local model behind it. Acceptance defines done.",
    steps: [
      { order: 1, action: "Start a local model (e.g. `ollama run <model>`), sized to fit. Point your existing LLM client at the local OpenAI-compatible endpoint (base_url = http://localhost:11434/v1) with a placeholder key.", decision: "Does your app talk to the model through ONE swappable interface, so hosted vs local is a config change — not a rewrite?" },
      { order: 2, action: "Run your app's real task against the local model. Handle local-specific failure modes: server not running / model not pulled (connection refused), and slower responses (longer timeouts).", expected: "The app works against the local model; a not-running server or missing model produces a clear error, not a crash." },
      { order: 3, action: "Confirm portability: flip the config back to the hosted provider and the app still works unchanged. Record the local model id/tag and its quant.", verify: "The app calls the local model from code through the same interface as hosted, handles local failure modes, and can switch back to hosted via config." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "App calls a local model from code (via the local OpenAI-compatible endpoint).",
      "Same swappable interface as hosted — local vs hosted is a config change.",
      "Local failure modes handled: server down / model not pulled / slower responses.",
      "Verified reversible: flipping config back to hosted still works; model id/tag recorded.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — one client, hosted or local via config (Ollama OpenAI-compatible)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os
from openai import OpenAI

# The SAME OpenAI client works against a local runtime — only base_url/key/model change.
def make_client():
    if os.getenv("LLM_BACKEND") == "local":
        # Ollama exposes an OpenAI-compatible API locally; no real key needed.
        return OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"), "llama3.2:3b"
    return OpenAI(), os.getenv("MODEL", "gpt-4o-mini")   # hosted provider (key from env)

def ask(question: str) -> str:
    client, model = make_client()
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": question}],
            timeout=60,                      # local models can be slower — allow more time
        )
    except Exception as e:                   # server not running / model not pulled / timeout
        return f"[backend unavailable: {type(e).__name__}] check the local model is running"
    return resp.choices[0].message.content   # representative; local model output is fallible

print(ask("Summarize what a KV cache is in one sentence."))`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Local vs hosted is a real engineering decision, not a preference. This unit makes it evidence-based — the completion criterion is 'you make an evidence-based choice' across **quality, latency, and cost** (plus privacy and operational burden).",
  },
  {
    type: "callout",
    variant: "tip",
    title: "The local-vs-hosted decision — what to actually measure",
    md: "Run the SAME representative tasks against a local model and a hosted model, and compare on the axes that matter:\n\n- **Quality** — accuracy on YOUR tasks (not a leaderboard). Small local models often suffice for classification/extraction/summarization and fall short on hard reasoning.\n- **Latency** — local depends on your hardware (GPU fast, CPU slow); hosted depends on network + provider load. Measure both under realistic input sizes.\n- **Cost** — hosted = per-token forever; local = hardware + electricity + ops time (a fixed/amortized cost that wins at high volume, loses at low volume).\n- **Privacy / control** — local keeps data in your environment (often the deciding factor for sensitive data); hosted sends it to a third party.\n- **Operational burden** — hosted is someone else's ops; local is YOURS (updates, scaling, uptime).\n\nThe answer is usually 'it depends on volume, sensitivity, and hardware' — and often 'both,' routing by task."
  },
  {
    type: "quiz",
    question: "A company must keep all customer data inside its own environment and runs a high, steady volume of a simple extraction task. Which deployment leans favorable, and why?",
    choices: [
      "Hosted API — always cheaper and simpler",
      "A local/self-hosted open model leans favorable here: privacy (data never leaves their environment) is a hard requirement, the task is simple enough for a small model, and high steady volume amortizes the fixed hardware cost — where per-token hosted pricing would keep growing. Still measure quality on their task",
      "It makes no difference which they choose",
      "Local — but only because local is always higher quality",
    ],
    answerIndex: 1,
    explanation: "A hard data-residency requirement plus a simple, high-volume task is the classic case for local/self-hosted: privacy is satisfied by keeping data in-environment, a small model handles the task, and steady high volume amortizes fixed hardware cost against ever-growing per-token hosted bills. Quality on the actual task still needs verifying; local isn't inherently higher quality.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — diagnose a local OOM from first principles.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Diagnose why a local model won't run, from the earliest failing boundary",
    intro: "Reason from model size, dtype, context, and concurrency — not trial and error.",
    steps: [
      { order: 1, action: "Given a model that OOMs (params, dtype/quant, target context length, VRAM budget, and how many concurrent requests), compute the footprint: weights + KV cache (× concurrency) + overhead. Identify which term blew the budget.", expected: "A number showing total need vs budget, and WHICH factor (size / dtype / context / concurrency) caused the overflow." },
      { order: 2, action: "Propose the cheapest fix that preserves the most quality: lower quant, smaller model, shorter context, fewer concurrent requests, or more VRAM. Quantify the new footprint.", decision: "Which single lever brings it under budget with the least quality/functionality loss for this workload?" },
      { order: 3, action: "State the general rule you'd apply before deploying any local model, so this OOM never ships.", verify: "You located the earliest failing boundary numerically, chose a justified fix, and can state a pre-deploy sizing rule." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Footprint computed as weights + KV cache (× concurrency) + overhead vs budget.",
      "The specific overflow factor (size/dtype/context/concurrency) identified.",
      "Cheapest quality-preserving fix chosen and re-quantified under budget.",
      "A reusable pre-deploy sizing rule stated.",
    ],
  },
];

export const content: TopicContent = {
  "unit-oss-local-inference-01": learn,
  "unit-oss-local-inference-02": practice,
  "unit-oss-local-inference-03": build,
  "unit-oss-local-inference-04": review,
};
