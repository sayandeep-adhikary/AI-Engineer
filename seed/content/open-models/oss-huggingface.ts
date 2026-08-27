import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Hugging Face Ecosystem" (topic-oss-huggingface).
// 3 units: 01 learn (Hub, transformers, pipelines, tokenizers, model cards/licenses) ·
// 02 practice (run a text pipeline) · 03 build (classifier/summarizer on an open model locally).
// Verified against HF Transformers docs (current): pipeline(task, model); Auto* API
// AutoModelForCausalLM/AutoTokenizer.from_pretrained(dtype="auto", device_map="auto");
// dtype (renamed from torch_dtype); fp32 default doubles memory; revision= pinning; hf auth login.
// Deterministic keyless experiments: dtype memory estimator + toy tokenizer round-trip/mismatch.
// Model ids hedged; model outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Until now every model you used lived behind someone else's API. This category flips that: you run the model yourself. The gateway is **Hugging Face** — a hub of hundreds of thousands of open models plus the `transformers` library to run them. But the real skill here isn't 'call `pipeline()`'; it's the *engineering judgment* around open models: what you're actually allowed to use, what will fit on your hardware, and how to make a run reproducible. Those three questions — license, memory, reproducibility — recur through the whole category.",
  },
  {
    type: "prose",
    md: "**Mental model: an open model is weights plus a card plus a license — not necessarily open-source software.** A model repository on the Hub is mostly a bag of files: the trained **weights** (the numbers), a **tokenizer** (text↔token-id mapping), a **config** (architecture shape), and a **model card** (docs + license + intended use). 'Open weights' means you can download and run those numbers; it does **not** guarantee the training data, training code, or a permissive license came with them. Conflating 'open weights' with 'open source' is the first and most expensive mistake — it drives license, reproducibility, and trust decisions.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Hugging Face Hub", definition: "A platform hosting model, dataset, and Space repositories. Each model repo is version-controlled (git) with weights, tokenizer, config, and a model card." },
      { term: "Open weights vs open source", definition: "Open weights = downloadable, runnable model parameters. Open source (strict) = weights AND training code AND data AND a license permitting reuse. Many 'open' models are open-weight only." },
      { term: "Model card", definition: "The repo's README: intended use, training data summary, evaluation, limitations, and — critically — the LICENSE and any usage restrictions. Read it before deploying, don't trust claims blindly." },
      { term: "Gated / access-controlled model", definition: "A model that requires accepting terms (or requesting access) before download. Needs authentication (hf auth login / a token); un-authenticated pulls fail." },
      { term: "Revision", definition: "A specific git commit / tag / branch of a model repo. Pinning revision='<commit>' makes a run reproducible; 'main' can silently change under you." },
      { term: "transformers", definition: "The HF Python library to load and run models. High-level pipeline() for quick tasks; low-level Auto classes (AutoModel, AutoTokenizer) for control." },
    ],
  },
  {
    type: "prose",
    md: "**The two APIs — pick your level of control.** `pipeline()` is the fast path: name a task and (optionally) a model, get a callable that handles tokenize → model → decode for you.",
  },
  {
    type: "code",
    language: "python",
    caption: "High-level pipeline (model id illustrative — check the Hub for a current small model)",
    code: `from transformers import pipeline

clf = pipeline(task="text-classification",
               model="distilbert/distilbert-base-uncased-finetuned-sst-2-english")
print(clf("I loved this movie."))   # representative; label depends on the model
# [{'label': 'POSITIVE', 'score': 0.9998}]`,
    output: `[{'label': 'POSITIVE', 'score': 0.9998}]`,
  },
  {
    type: "prose",
    md: "The **low-level Auto API** — the `AutoModel` and `AutoTokenizer` classes — gives you the pieces (tokenizer, model) so you control device, dtype, and generation. These classes read the repo's config and pick the right architecture for you:",
  },
  {
    type: "code",
    language: "python",
    caption: "Low-level loading — note dtype and device_map (model id illustrative)",
    code: `from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "Qwen/Qwen2.5-0.5B-Instruct"    # use a CURRENT small model from the Hub
tok = AutoTokenizer.from_pretrained(model_id, revision="main")   # pin a commit for reproducibility
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype="auto",        # load in the stored dtype (often bf16/fp16); NOTE: older code used torch_dtype=
    device_map="auto",   # place on GPU/MPS/CPU automatically (needs accelerate)
)
inputs = tok("The capital of France is", return_tensors="pt").to(model.device)
out = model.generate(**inputs, max_new_tokens=8)
print(tok.decode(out[0], skip_special_tokens=True))   # representative, non-deterministic`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Loading huge models without checking resources — the fp32 memory trap",
    md: "Two things silently blow up memory:\n\n- **Model size.** Weights dominate memory. A rough rule of thumb: **memory(GB) ≈ params(billions) × bytes-per-parameter.** A 7B model is ~14 GB in fp16, ~28 GB in fp32.\n- **The dtype default.** PyTorch loads weights in **fp32 (4 bytes) by default**, which *doubles* memory versus the fp16/bf16 the model was probably trained/stored in. Pass `dtype=\"auto\"` (or an explicit `torch.bfloat16`) to avoid loading a 14 GB model as 28 GB.\n\nSo before you `from_pretrained` a model, do the arithmetic (next experiment). 'It downloaded fine' says nothing about whether it will *load* into your RAM/VRAM. And `device_map=\"auto\"` doesn't make a model fit — it just spreads it across whatever devices exist, spilling to slow CPU/disk when it doesn't."
  },
  {
    type: "code",
    language: "python",
    caption: "Estimate weight memory by dtype (deterministic, keyless) — do this BEFORE loading",
    code: `DTYPE_BYTES = {"fp32": 4, "fp16": 2, "bf16": 2, "int8": 1, "int4": 0.5}

def weights_gb(params_billions, dtype):
    # Rule of thumb for WEIGHTS only (activations + KV cache are extra, see local-inference).
    return params_billions * DTYPE_BYTES[dtype]

print(weights_gb(7, "fp32"))   # loading a 7B model as fp32...
print(weights_gb(7, "fp16"))   # ...vs the dtype it was stored in
print(weights_gb(7, "int4"))   # ...vs a 4-bit quantized copy`,
    output: `28.0
14.0
3.5`,
  },
  {
    type: "prose",
    md: "Same model, **28 GB vs 14 GB vs 3.5 GB** depending purely on dtype. That one number decides whether a model loads on your machine at all — and it's why `dtype` and quantization (next topic) are the levers that matter, not the model name.",
  },
  {
    type: "prose",
    md: "**Tokenizer and model are a matched pair.** The tokenizer maps text to the exact integer ids the model was trained on. Load a tokenizer from a *different* model family and the ids mean something else — the model produces garbage. Always load both from the same repo/revision.",
  },
  {
    type: "code",
    language: "python",
    caption: "Toy tokenizer round-trip + pairing check (deterministic, keyless stand-in)",
    code: `# A real HF tokenizer downloads a learned vocabulary; this toy stands in to show the idea:
# text -> token ids -> text, and what an out-of-vocabulary token does.
vocab = {"<unk>": 0, "open": 1, "weights": 2, "run": 3, "local": 4}
inv = {i: t for t, i in vocab.items()}

def encode(text): return [vocab.get(w, 0) for w in text.lower().split()]
def decode(ids):  return " ".join(inv[i] for i in ids)

ids = encode("Open weights run local")
print(ids)                       # every word in-vocab
print(decode(ids))               # round-trips back
print(encode("Open frontier weights"))   # 'frontier' is out-of-vocab -> <unk> (id 0)

def paired(tokenizer_vocab_size, model_vocab_size):
    return "ok" if tokenizer_vocab_size == model_vocab_size else "MISMATCH: wrong tokenizer"
print(paired(32000, 32000))      # same family
print(paired(32000, 128256))     # tokenizer from a different model family`,
    output: `[1, 2, 3, 4]
open weights run local
[1, 0, 2]
ok
MISMATCH: wrong tokenizer`,
  },
  {
    type: "callout",
    variant: "warning",
    title: "Ignoring licenses — 'open' does not mean 'free to use however you want'",
    md: "Open-weight models ship under a range of licenses: permissive (Apache-2.0, MIT), custom community licenses with **usage restrictions** (acceptable-use policies, size/revenue clauses, no-competing-model clauses), or **non-commercial / research-only**. Using a research-only model in a commercial product is a legal problem, not a technical one. Before you build on a model:\n\n- **Read the license in the model card** (and any linked acceptable-use policy).\n- **Check for gating** — accepting terms to download *is* agreeing to those terms.\n- **Confirm your use case is allowed** (commercial? redistribution? fine-tuning and re-hosting?).\n- **Don't trust card claims blindly** — benchmark numbers and 'safety' claims are marketing until you verify them for your task.\n\nLicense is a deployment gate, the same way memory is a loading gate."
  },
  {
    type: "quiz",
    question: "A model card says 'open' and you download the weights successfully. Your company wants to use it in a paid product. What must you check before shipping?",
    choices: [
      "Nothing — if it downloaded, it's free to use commercially",
      "The actual LICENSE and any acceptable-use policy in the model card: 'open weights' can still carry non-commercial, research-only, or usage-restricted licenses. Confirm commercial use (and redistribution/fine-tuning if relevant) is permitted before shipping — this is a legal gate, not a technical one",
      "Only whether it fits in memory",
      "Only the benchmark scores on the model card",
    ],
    answerIndex: 1,
    explanation: "Downloadability says nothing about permitted use. Open-weight models range from permissive (Apache/MIT) to research-only or usage-restricted community licenses, and a paid product needs the license (and any acceptable-use policy) to actually allow commercial use. Verify it before shipping; memory and benchmarks are separate concerns.",
  },
  {
    type: "quiz",
    question: "Your generation script downloads a 7B model fine but crashes with an out-of-memory error while loading on a 16 GB GPU. What's the most likely cause and first fix?",
    choices: [
      "The download was corrupted; re-download",
      "It's loading in fp32 (PyTorch's default) — ~28 GB for a 7B model, which exceeds 16 GB. Load in the stored dtype (dtype='auto' / bf16 ≈ 14 GB) or use a quantized copy (int8 ≈ 7 GB, int4 ≈ 3.5 GB). Do the memory arithmetic before loading",
      "The GPU is broken",
      "7B models can never run on a 16 GB GPU under any settings",
    ],
    answerIndex: 1,
    explanation: "A 7B model is ~28 GB in fp32 (PyTorch's default) but ~14 GB in fp16/bf16 and far less quantized — so the crash is a dtype/precision problem, not a download or hardware defect. Setting dtype='auto' or using a quantized build brings it under 16 GB. The fix comes from doing the params×bytes arithmetic up front.",
  },
  {
    type: "takeaways",
    items: [
      "An open model = weights + tokenizer + config + card + license; 'open weights' is NOT the same as 'open source' (code+data+permissive license).",
      "Two APIs: pipeline() (fast, task-based) and the Auto classes (AutoModel / AutoTokenizer, full control over device/dtype/generation), which infer the architecture from the repo config.",
      "Memory ≈ params(B) × bytes/param; PyTorch defaults to fp32 which DOUBLES memory — pass dtype='auto' (note: older code used torch_dtype=). Do the arithmetic before loading.",
      "Tokenizer and model are a matched pair from the same repo/revision; a mismatched tokenizer yields garbage. Pin revision='<commit>' for reproducibility.",
      "License is a deployment gate: read the card, check gating/usage restrictions, confirm commercial use — don't trust card claims blindly.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Run inference with a `transformers` pipeline and, just as importantly, learn to size a model and read a card before you download it. If you have a machine with `transformers` installed, run a small model; if not, do the sizing/licensing reasoning — that judgment is the transferable skill.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Run a pipeline and reason about resources (guided)",
    intro: "Small models first; measure before you scale up.",
    steps: [
      { order: 1, action: "Pick a SMALL open model for a text task (sentiment or summarization). Before loading, estimate its weight memory with the dtype estimator for fp32 vs fp16. Then run pipeline(task=..., model=...) on 3 inputs.", expected: "Pipeline returns labels/summaries; you predicted the memory footprint before loading." },
      { order: 2, action: "Open the model's card on the Hub. Find: the license, the intended use, and the listed limitations. Decide whether your intended use is permitted.", decision: "For YOUR use case, is this model's license compatible — and does the card disclose limitations that matter to you?" },
      { order: 3, action: "Try the same task with a slightly larger model and compare quality vs the (estimated) memory/latency cost. Note where bigger stops being worth it.", verify: "You ran a pipeline, sized models before loading, read a real license, and made a size-vs-quality judgment." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You ran a transformers pipeline on a small open model.",
      "You estimated weight memory (fp32 vs fp16) before loading.",
      "You read a model card's license + limitations and judged fitness for your use case.",
      "You compared a larger model's quality against its memory/latency cost.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a small app on an open model running locally** — a text classifier or a summarizer. The completion criterion is exactly that: *the app runs on an open model locally* (no hosted API). This proves you can own the full inference path, and it sets up local runtimes (next topic) and a fully local retrieval stack (later in this category).",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + where this fits the roadmap",
    md: "Completion: *a small classifier or summarizer runs on an open model locally.* You've been calling hosted LLMs since the API category; this is the same kind of feature, but the model runs on your machine. **Roadmap fit:** this is the foundation of Category 10 — running models yourself. Later units make it efficient (quantization/local runtimes), portable (serve behind an OpenAI-compatible API), and applied (swap your RAG retrieval fully local). Pin the model revision, right-size for your hardware, and confirm the license permits your use."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — classifier/summarizer on a local open model",
    intro: "Right-size, pin, and validate. Acceptance defines done.",
    steps: [
      { order: 1, action: "Choose a task (classification or summarization) and a SMALL open model whose license permits your use. Size it (params × bytes) against your hardware and pick a dtype/quant that fits. Pin the revision.", decision: "Which model is the smallest that meets your quality bar, and what dtype makes it fit your RAM/VRAM?" },
      { order: 2, action: "Run inference locally (pipeline for speed, or the Auto classes for control). Handle inputs longer than the model's context and empty/garbled input without crashing.", expected: "The app produces classifications/summaries locally; long/empty inputs are handled, not crashed on." },
      { order: 3, action: "Make it reproducible and honest: record model id + revision + dtype; note the license; treat model output as fallible (it's a small open model, not a frontier API).", verify: "The app runs entirely on a local open model, fits your hardware, pins its revision, respects the license, and handles edge-case inputs." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A classifier or summarizer runs on an open model entirely locally (no hosted API).",
      "Model right-sized for hardware (params×bytes + dtype/quant); revision pinned.",
      "License confirmed to permit the use; model id + revision + dtype recorded.",
      "Long/empty inputs handled gracefully; output treated as fallible.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — local summarizer with a size guard (structure; model id illustrative)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from transformers import pipeline

DTYPE_BYTES = {"fp32": 4, "fp16": 2, "bf16": 2, "int8": 1, "int4": 0.5}

def assert_fits(params_b, dtype, budget_gb):
    need = params_b * DTYPE_BYTES[dtype]          # weights only; leave headroom for the rest
    if need > budget_gb:
        raise RuntimeError(f"{need} GB weights > {budget_gb} GB budget — pick a smaller model or lower dtype")

MODEL = "sshleifer/distilbart-cnn-12-6"           # ~0.3B summarizer; use a CURRENT model
REVISION = "main"                                 # pin a commit hash in real projects
assert_fits(0.3, "fp16", budget_gb=8)

summarizer = pipeline("summarization", model=MODEL, revision=REVISION)

def summarize(text: str) -> str:
    if not text or not text.strip():
        return "(no input to summarize)"
    text = text[:3000]                            # keep within the model's context window
    out = summarizer(text, max_length=60, min_length=10, truncation=True)
    return out[0]["summary_text"]                 # representative; a small model's summary is fallible

print(summarize("Open-weight models let you run inference locally ..."))`,
  },
];

export const content: TopicContent = {
  "unit-oss-huggingface-01": learn,
  "unit-oss-huggingface-02": practice,
  "unit-oss-huggingface-03": build,
};
