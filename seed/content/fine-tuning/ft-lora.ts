import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Parameter-Efficient Fine-Tuning (LoRA/QLoRA)" (topic-ft-lora).
// 3 units: 01 learn (PEFT/LoRA/QLoRA, adapters, rank/alpha/target_modules, resources) ·
// 02 build (QLoRA run on a small model -> produce an adapter) · 03 review (adapter vs base).
// commonMistakes: Chasing full fine-tunes, Underestimating hardware. masteryCriteria: produce
// and use a LoRA adapter on a small model. Verified PEFT API (LoraConfig r/lora_alpha/
// target_modules/lora_dropout/task_type, get_peft_model, print_trainable_parameters, save_pretrained,
// PeftModel.from_pretrained, merge_and_unload; QLoRA = 4-bit base + LoRA). Deterministic keyless
// LoRA param estimator + full-vs-LoRA + reproducibility. Model ids hedged; runs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Hosted fine-tuning trains someone else's model on their hardware. To adapt an **open** model yourself, full fine-tuning (updating every weight) is usually off the table — a 7B model in fp16 needs far more memory to *train* than to run, plus a full copy of weights per task. **Parameter-efficient fine-tuning (PEFT)**, and specifically **LoRA/QLoRA**, is what makes open-model adaptation feasible on modest hardware: freeze the giant base model and train tiny add-on matrices instead. The judgment here is understanding *why* that works and what the knobs actually do — not memorizing `r=16`.",
  },
  {
    type: "prose",
    md: "**Mental model: LoRA freezes the pretrained weights and learns a small low-rank 'delta' bolted onto chosen layers — you train ~0.1% of the parameters and ship a few-MB adapter, not a new copy of the model.** Instead of updating a big weight matrix W, LoRA adds a low-rank update: two small matrices A and B whose product approximates the change. The base stays frozen (so its general ability is preserved and shared), and the adapter is a tiny, portable file. QLoRA goes further: it also *quantizes the frozen base to 4-bit*, so even the frozen copy barely uses memory — putting billion-parameter adaptation on a single consumer GPU.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "PEFT", definition: "Parameter-Efficient Fine-Tuning: adapt a model by training a small number of new parameters while freezing the base. LoRA is the most common PEFT method (Hugging Face `peft` library)." },
      { term: "LoRA (rank r)", definition: "Low-Rank Adaptation: for a targeted weight, learn two small matrices A (in×r) and B (r×out) whose product is the update. `r` (the rank) sets adapter capacity: higher r = more trainable params + more capacity, but more memory and overfitting risk." },
      { term: "alpha (scaling)", definition: "`lora_alpha` scales the adapter's contribution; the update is scaled by lora_alpha/r (or lora_alpha/sqrt(r) with rsLoRA). It controls how strongly the learned delta is applied — not the number of parameters." },
      { term: "target_modules", definition: "Which layers get adapters (e.g. q_proj/v_proj attention projections, or 'all-linear' as in QLoRA). More targets = more capacity + more params. Choosing them wrong (or omitting key ones) limits what the adapter can learn." },
      { term: "QLoRA", definition: "LoRA on a base model quantized to 4-bit (via bitsandbytes). The frozen base uses ~4x less memory, so adaptation fits on modest GPUs; the LoRA adapter itself trains in higher precision." },
      { term: "base vs adapter vs merged vs checkpoint", definition: "Base = frozen pretrained model. Adapter = the tiny trained LoRA weights (loaded ON the base). Merged = adapter folded into base weights (one standalone model, no separateness). Checkpoint = a saved snapshot during training." },
    ],
  },
  {
    type: "prose",
    md: "**Configuring LoRA (Hugging Face `peft`).** You wrap a base model with a `LoraConfig` and get a trainable model whose trainable parameters are a tiny fraction of the whole:",
  },
  {
    type: "code",
    language: "python",
    caption: "LoRA config + trainable-parameter report (model id illustrative)",
    code: `from transformers import AutoModelForCausalLM
from peft import LoraConfig, get_peft_model

base = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-1B")   # frozen base
config = LoraConfig(
    r=8,                            # rank: adapter capacity (and param count)
    lora_alpha=16,                  # scaling of the learned delta (alpha/r)
    target_modules=["q_proj", "v_proj"],   # which layers get adapters
    lora_dropout=0.05,
    task_type="CAUSAL_LM",
)
model = get_peft_model(base, config)
model.print_trainable_parameters()
# representative: "trainable params: 851,968 || all params: 1,236,... || trainable%: 0.069"`,
  },
  {
    type: "prose",
    md: "Two knobs, two different jobs: **`r` (rank) sets how much the adapter can learn** — capacity and parameter count — while **`lora_alpha` sets how strongly that learning is applied** (scaling, alpha/r). `target_modules` decides where it can learn. None of these is 'set to 16 and forget' — they trade capacity against memory and overfitting, and the right values depend on the task and model.",
  },
  {
    type: "code",
    language: "python",
    caption: "Estimate LoRA trainable parameters (deterministic, keyless)",
    code: `def lora_params(hidden, r, num_matrices):
    # For one square linear layer (in = out = hidden), a LoRA adapter adds r*(in + out) params.
    # Across num_matrices targeted layers: multiply.
    return r * (hidden + hidden) * num_matrices

print(lora_params(4096, 8, 1))     # one layer, rank 8
print(lora_params(4096, 16, 1))    # double the rank -> double the params
print(lora_params(4096, 8, 32))    # rank 8 across 32 targeted matrices`,
    output: `65536
131072
2097152`,
  },
  {
    type: "prose",
    md: "The formula **r × (in + out) per targeted matrix** makes the tradeoffs concrete: doubling rank doubles the adapter's parameters (65,536 → 131,072); targeting more matrices scales it up linearly (→ 2,097,152 across 32 layers). Even the largest here is a rounding error next to a 7B base — which is exactly why the adapter file is a few MB and full copies per task are unnecessary.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Chasing full fine-tunes — the wrong default for open models",
    md: "Reaching for full fine-tuning (updating all weights) when LoRA would do is the classic over-engineering trap here:\n\n- **Memory** — full fine-tuning needs memory for weights + gradients + optimizer state (often several × the inference footprint); LoRA trains ~0.1% of params, so gradients/optimizer state are tiny.\n- **Storage** — full fine-tuning produces a whole new model *per task* (gigabytes each); a LoRA adapter is a few MB, and many adapters share one frozen base.\n- **Forgetting** — updating all weights risks catastrophic forgetting; a frozen base preserves general ability.\n- **Iteration** — small adapters train faster and are cheaper to compare.\n\nLoRA/QLoRA matches full fine-tuning quality on many tasks at a fraction of the cost. Full fine-tuning is justified only for deep capability changes with the hardware and data to match — rarely the first move."
  },
  {
    type: "callout",
    variant: "warning",
    title: "Underestimating hardware — do the memory math before you start",
    md: "The other common mistake is assuming 'LoRA is cheap' means 'it fits.' The frozen base still has to *live in memory*, plus activations and the (small) adapter state:\n\n- **Plain LoRA** — the frozen base loads at its normal precision (a 7B model ≈ 14 GB in fp16) even though you only train the adapter. That base still has to fit.\n- **QLoRA** — quantizes the frozen base to 4-bit (7B ≈ 3.5 GB), which is what actually brings billion-parameter adaptation onto a single modest GPU. Add activation memory (grows with sequence length and batch size).\n- **Sequence length × batch size** drive activation memory and can OOM even when weights fit.\n\nUse the memory reasoning from the open-models category (weights + overhead, and here + optimizer/activation) BEFORE launching a run. 'It's LoRA so it'll fit' is how a training run OOMs at step 0."
  },
  {
    type: "quiz",
    question: "A LoRA adapter has very few trainable parameters. Is that automatically good? Why or why not?",
    choices: [
      "Yes — fewer parameters is always better",
      "Not automatically: very low rank (few params) may lack the CAPACITY to learn the target behavior (underfitting), while too-high rank wastes memory and can overfit. The parameter count is a capacity/efficiency tradeoff to tune against the task and evaluated on held-out data — not a metric to minimize blindly",
      "No — more parameters always means better quality",
      "Yes — because small adapters can't overfit",
    ],
    answerIndex: 1,
    explanation: "Adapter size is a capacity dial, not a virtue to minimize: too little capacity underfits the target behavior, too much wastes memory and risks overfitting. The right rank is the one that meets the task's needs as measured on a held-out set, so parameter count is a tradeoff you tune, not a number you drive to zero. Both 'fewer is always better' and 'more is always better' are wrong.",
  },
  {
    type: "quiz",
    question: "You want to adapt a 7B open model but only have a single consumer GPU. Which approach makes this feasible, and what's the key mechanism?",
    choices: [
      "Full fine-tuning — it's the only way to get quality",
      "QLoRA — quantize the frozen base to 4-bit (~3.5 GB for 7B) and train a small LoRA adapter on top. The 4-bit frozen base plus tiny trainable adapter (and small optimizer/gradient state) is what fits billion-parameter adaptation onto modest hardware, at quality often comparable to full fine-tuning",
      "Rent 8 datacenter GPUs — there's no other option",
      "Reduce the model to 100M parameters first",
    ],
    answerIndex: 1,
    explanation: "QLoRA is designed for exactly this: quantizing the frozen base to 4-bit slashes the dominant memory cost, and only the small LoRA adapter (plus minimal gradient/optimizer state) is trained, so a 7B adaptation fits on one consumer GPU. Full fine-tuning needs many times the memory, and shrinking the model or renting a cluster defeats the purpose. The key mechanism is the 4-bit frozen base plus a low-rank trainable adapter.",
  },
  {
    type: "takeaways",
    items: [
      "LoRA freezes the base and trains a small low-rank delta (matrices A,B) on targeted layers — ~0.1% of params, a few-MB adapter, base's general ability preserved and shared across adapters.",
      "Knobs do different jobs: r (rank) = adapter CAPACITY + param count; lora_alpha = SCALING of the delta (alpha/r); target_modules = WHERE it learns. Tune against the task, don't default to r=16.",
      "Trainable params ≈ r × (in + out) per targeted matrix — doubling rank doubles params; more target modules scale linearly. Tiny next to a 7B base.",
      "QLoRA = LoRA on a 4-bit-quantized frozen base — what makes billion-parameter adaptation fit on one modest GPU; still do the memory math (base + activations + optimizer/gradient).",
      "Know the artifacts: base (frozen) vs adapter (tiny trained weights) vs merged (folded into base) vs checkpoint (training snapshot); avoid chasing full fine-tunes when an adapter suffices.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Run a QLoRA fine-tune on a small open model and produce a usable LoRA adapter** — the completion criterion is *you produce a LoRA adapter.* This is the hands-on payoff of the topic: a tiny trained file you can load onto the frozen base and compare against it. Keep the model small and the run modest — the goal is the workflow and the artifact, not a state-of-the-art result.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *you produce a LoRA adapter* (and can load/use it). Quantize a SMALL open base to 4-bit, wrap it with a `LoraConfig`, train briefly on your dataset, and save the adapter (`save_pretrained` → `adapter_config.json` + `adapter_model.safetensors`, a few MB). **Roadmap fit:** this unites `topic-oss-huggingface` (loading open models, dtype/memory), `topic-oss-local-inference` (quantization, VRAM math), and `topic-ft-data` (your validated dataset). Training needs a GPU (Colab/free tier is enough for a small model); the config, param math, and adapter/merge reasoning are keyless. Record base model + revision + adapter + seed so the run is reproducible."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — QLoRA run producing an adapter",
    intro: "Small model, 4-bit base, tiny adapter. Acceptance defines done.",
    steps: [
      { order: 1, action: "Load a SMALL open base quantized to 4-bit (bitsandbytes). Do the memory math first (4-bit base + activations for your sequence length/batch). Wrap with a LoraConfig (sensible r, target_modules) and confirm trainable params are a tiny fraction.", decision: "Which small base fits your GPU at 4-bit, and what r / target_modules give enough capacity without OOM?" },
      { order: 2, action: "Train briefly on your validated dataset (from ft-data) — enough to change behavior, watching for overfitting on a small set. Save the adapter with save_pretrained; note its size (a few MB).", expected: "A saved LoRA adapter (adapter_config.json + adapter_model.safetensors); base weights untouched." },
      { order: 3, action: "Load the adapter onto the frozen base (PeftModel.from_pretrained) and run inference to confirm it applies. Record base model + revision + adapter + seed. Keep the adapter SEPARATE from the base (don't merge yet — you'll want to compare).", verify: "You produced a small LoRA adapter, loaded it onto the base, ran inference through it, and recorded a reproducible run (base+revision+adapter+seed)." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a usable LoRA adapter",
    items: [
      "Small open base loaded 4-bit (QLoRA); memory math done; trainable params a tiny fraction.",
      "Trained on the validated dataset; adapter saved (few-MB adapter files; base untouched).",
      "Adapter loaded onto the frozen base and used for inference (PeftModel.from_pretrained).",
      "Reproducibility recorded (base model + revision + adapter + seed); adapter kept separate from base.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — QLoRA setup, train, save, load an adapter (structure; needs a GPU)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, PeftModel, prepare_model_for_kbit_training

MODEL, REV = "meta-llama/Llama-3.2-1B", "main"        # small base; pin the revision
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                         bnb_4bit_compute_dtype=torch.bfloat16)   # QLoRA: 4-bit frozen base

base = AutoModelForCausalLM.from_pretrained(MODEL, revision=REV, quantization_config=bnb,
                                            device_map="auto")
base = prepare_model_for_kbit_training(base)
model = get_peft_model(base, LoraConfig(
    r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05, task_type="CAUSAL_LM"))
model.print_trainable_parameters()                     # tiny fraction trainable

# ... train briefly with Trainer/SFTTrainer on your validated dataset (fixed seed) ...

model.save_pretrained("adapter-v1")                    # saves ONLY the few-MB adapter

# Later: load the adapter onto the frozen base and use it
tok = AutoTokenizer.from_pretrained(MODEL, revision=REV)
reloaded_base = AutoModelForCausalLM.from_pretrained(MODEL, revision=REV, quantization_config=bnb,
                                                     device_map="auto")
tuned = PeftModel.from_pretrained(reloaded_base, "adapter-v1")   # base + adapter, kept separate
out = tuned.generate(**tok("Reset my password?", return_tensors="pt").to(tuned.device))
print(tok.decode(out[0], skip_special_tokens=True))    # representative; small-model output is fallible`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "An adapter you can't quantify is a hobby, not an engineering result. This unit compares the adapter against the frozen base — the completion criterion is 'you quantify the adapter's effect.' Same evaluation discipline as hosted fine-tuning: measure both on a sealed set, report the delta, check for regressions.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Comparing adapter vs base — and the merge decision",
    md: "**Quantify the effect** by running the *same* eval through the base and through base+adapter:\n\n- **Same sealed test set + same scoring** for base and base+adapter; report absolute/relative gain on the target task.\n- **Regression check** on general prompts — a frozen base helps here, but the adapter can still shift behavior.\n- **Toggle cost** — because the adapter is separate, you can enable/disable it, keep multiple task adapters on one base, and roll back instantly. That flexibility is a feature.\n\n**Merge or keep separate?** `merge_and_unload()` folds the adapter into the base to make one standalone model (removes the small inference overhead of separate adapters). But once merged you **lose** the ability to toggle, swap, or cheaply store many adapters, and you produce a full-size model copy. Merge only when you've settled on one adapter and want the simplest deployment; otherwise keep them separate."
  },
  {
    type: "code",
    language: "python",
    caption: "Quantify the adapter + check reproducibility of artifacts (deterministic, keyless)",
    code: `def compare_eval(base, tuned, min_gain=0.05):
    return {"absolute": round(tuned - base, 3),
            "relative": round((tuned - base) / base, 3),
            "regression": tuned < base, "promote": round(tuned - base, 3) >= min_gain}

print(compare_eval(0.62, 0.74))    # adapter helps on the target task

# Which recorded runs can actually be reproduced/redeployed reliably?
def reproducible(a):
    return a["revision"] != "main" and a["seed"] is not None   # pinned base + fixed seed

runs = [
    {"base": "llama-3.2-1B", "revision": "a1b2c3", "adapter": "v1", "seed": 42},
    {"base": "llama-3.2-1B", "revision": "main",   "adapter": "v1", "seed": 42},
    {"base": "llama-3.2-1B", "revision": "a1b2c3", "adapter": "v1", "seed": None},
]
print([reproducible(a) for a in runs])`,
    output: `{'absolute': 0.12, 'relative': 0.194, 'regression': False, 'promote': True}
[True, False, False]`,
  },
  {
    type: "prose",
    md: "The adapter earns a **+0.12** (19.4% relative) gain with no regression → worth keeping. And the reproducibility check is the sting in the tail: only the **first** run is reproducible — the second pinned the base to `main` (which moves under you), the third fixed no seed. An adapter is only meaningful *relative to a specific base revision*; change the base and you must re-validate the adapter. Reproducibility = pinned base revision + fixed seed + recorded adapter/dataset version.",
  },
  {
    type: "quiz",
    question: "An adapter performs well with one base-model revision but poorly after the base model is updated. What compatibility assumption was violated?",
    choices: [
      "None — adapters work with any base model",
      "A LoRA adapter is trained as a delta against a SPECIFIC base model (and revision); it assumes that exact frozen base. Updating the base changes the weights the adapter was fitted to, so the delta no longer aligns — you must pin the base revision and re-validate (or retrain) the adapter when the base changes",
      "The adapter file was corrupted",
      "The tokenizer is irrelevant to adapters",
    ],
    answerIndex: 1,
    explanation: "An adapter encodes a low-rank update relative to one frozen base at a specific revision; it only makes sense on that base. When the base is updated, the weights the adapter was fitted against shift, so the learned delta no longer applies correctly and quality drops. The fix is to pin the base revision, treat a base change as requiring re-validation or retraining, and record base+revision+adapter together.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design a LoRA adaptation for a toy architecture.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design and justify a LoRA adapter, then quantify its advantage",
    intro: "Choose targets and rank, estimate params/memory/storage, and evaluate.",
    steps: [
      { order: 1, action: "For a toy transformer (given hidden size and layer count), choose target_modules and a rank r. Estimate trainable parameters (r × (in+out) × matrices), approximate adapter storage (MB), and the memory advantage over full fine-tuning.", expected: "A concrete trainable-param count, adapter size in MB, and a full-vs-LoRA memory/storage comparison." },
      { order: 2, action: "Justify the choices: why those target modules, why that rank (capacity vs overfitting/memory), and QLoRA vs plain LoRA for the hardware budget.", decision: "What's the smallest adapter that gives enough capacity for the task on your hardware — and would you merge or keep it separate for deployment?" },
      { order: 3, action: "State how you'd quantify the adapter's effect (sealed eval, base vs base+adapter, regression check) and how you'd keep the run reproducible (pinned base revision, seed, dataset/adapter version).", verify: "You designed a justified LoRA config with estimated params/memory/storage, an eval plan proving the effect, and a reproducibility record — the full engineering picture, not just r=16." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — LoRA design + quantified effect",
    items: [
      "target_modules + rank chosen and justified (capacity vs memory/overfitting).",
      "Trainable params, adapter storage (MB), and full-vs-LoRA memory/storage advantage estimated.",
      "Effect quantified plan: sealed eval, base vs base+adapter, regression check.",
      "Reproducibility: pinned base revision + seed + dataset/adapter version; merge-vs-separate decided.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Quantify the adapter like any fine-tune: base vs base+adapter on a sealed set, report the delta, check regressions — an unmeasured adapter proves nothing.",
      "An adapter is a delta against a SPECIFIC base revision; changing the base breaks the assumption — pin the base revision and re-validate/retrain when it changes.",
      "Reproducibility = pinned base revision (not 'main') + fixed seed + recorded adapter/dataset version; 'main' moves under you.",
      "Merge (merge_and_unload) for a single standalone deployment (removes adapter overhead) but you LOSE toggle/swap/multi-adapter flexibility and produce a full-size copy — keep separate while iterating.",
      "You've now crossed the full adaptation ladder: prompt → RAG → hosted fine-tune → open-model LoRA/QLoRA — with the judgment to pick the cheapest rung and prove it worked.",
    ],
  },
];

export const content: TopicContent = {
  "unit-ft-lora-01": learn,
  "unit-ft-lora-02": build,
  "unit-ft-lora-03": review,
};
