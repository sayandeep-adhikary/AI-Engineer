import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Hosted Fine-Tuning (OpenAI / Azure OpenAI)" (topic-ft-hosted).
// 3 units: 01 learn (managed workflow, deployment, eval, cost) · 02 build (fine-tune + deploy on
// Azure) · 03 review (eval vs base model). commonMistakes: No baseline/eval, Overfitting to tiny data.
// masteryCriteria: demonstrate a fine-tune beats the base on your eval.
// Verified OpenAI/Azure fine_tuning.jobs API, JSONL, checkpoints, results.csv, deploy, cost.
// Deterministic keyless economics, failure-diagnosis, eval-comparison. Model ids hedged.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You've decided fine-tuning is the right rung and you have a clean dataset. **Hosted (managed) fine-tuning** — OpenAI's and Azure OpenAI's fine-tuning services — is the pragmatic path for most teams: you provide data, they run the training on their GPUs, and you get a deployable model. No hardware to manage. But the API call is the easy 10%; the engineering is the **lifecycle** around it, and above all the discipline that a *finished training job proves nothing about whether the model is better*.",
  },
  {
    type: "prose",
    md: "**Mental model: hosted fine-tuning is a managed pipeline — prepare → upload → train → monitor → checkpoint → evaluate → deploy — and 'the job succeeded' is a status, not a quality verdict.** The provider guarantees the mechanics (it trained, it produced a model id); it guarantees nothing about your task. The only thing that tells you the fine-tune is worth deploying is a comparison against the base model on a held-out set you control. Everything valuable in this topic hangs on that gap between 'job succeeded' and 'model is better.'",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Fine-tuning job", definition: "A managed training run: client.fine_tuning.jobs.create(training_file, validation_file, model, suffix, seed, ...). Returns a job id you poll; produces a new model id on success." },
      { term: "Training file (JSONL)", definition: "Your chat-format dataset uploaded via client.files.create(purpose='fine-tune') → a file id passed to the job. A separate validation_file is used to monitor overfitting." },
      { term: "Checkpoint", definition: "A deployable model snapshot saved each epoch. Recent checkpoints (often the last few) can be deployed — useful to grab a snapshot from BEFORE overfitting set in." },
      { term: "Resulting model id", definition: "The fine-tuned model's identifier (e.g. base-model.ft-<jobid>). You deploy it and call it like any model; on Azure, deploying is a separate step with its own hosting cost." },
      { term: "Baseline evaluation", definition: "Measuring the BASE model on your held-out test set BEFORE tuning, so you have a number to beat. No baseline = no way to prove the fine-tune helped." },
      { term: "Training vs hosting cost", definition: "Training is billed by tokens × epochs; a deployed fine-tuned model (esp. Azure) also incurs an ongoing hourly HOSTING cost whether or not it's called. Idle deployments waste money." },
    ],
  },
  {
    type: "prose",
    md: "**The workflow in code (OpenAI / Azure OpenAI share this API surface).** Upload the file, create the job, poll status, then deploy the resulting model. Model ids and exact params churn — check current docs:",
  },
  {
    type: "code",
    language: "python",
    caption: "Managed fine-tuning lifecycle (model id illustrative; needs a key to run)",
    code: `from openai import OpenAI
client = OpenAI()   # or AzureOpenAI(...); key from env

train = client.files.create(file=open("train.jsonl", "rb"), purpose="fine-tune")   # upload
val   = client.files.create(file=open("val.jsonl", "rb"),   purpose="fine-tune")

job = client.fine_tuning.jobs.create(
    training_file=train.id,
    validation_file=val.id,
    model="gpt-4.1-mini-2025-04-14",     # a CURRENT fine-tunable base model
    suffix="support-tone",               # names the resulting model
    seed=105,                            # reproducibility (same seed+data+params -> same result)
    method={"type": "supervised", "supervised": {"hyperparameters": {"n_epochs": 3}}},
)

status = client.fine_tuning.jobs.retrieve(job.id).status   # 'queued'|'running'|'succeeded'|'failed'
# on success: retrieve(job.id).fine_tuned_model -> the new model id to deploy/use`,
  },
  {
    type: "prose",
    md: "Monitoring gives you `train_loss` and validation metrics (and a `results.csv`). The signal you want: **training loss decreasing AND validation loss/accuracy improving together.** When training keeps improving but validation stalls or worsens, that's overfitting — and this is where checkpoints matter: you can deploy an earlier epoch's snapshot from before the divergence.",
  },
  {
    type: "code",
    language: "python",
    caption: "Is the fine-tune actually better? A finished job is not a yes (deterministic, keyless)",
    code: `# A fine-tune 'succeeded'. Check boundaries IN ORDER; the earliest failing one is the real issue.
checks = [
    ("data_format_valid",      True),
    ("job_status_succeeded",   True),
    ("train_loss_decreased",   True),
    ("beats_base_on_holdout",  False),   # <- the meaningful failure
    ("no_general_regression",  False),
]

def earliest_failure(checks):
    for name, ok in checks:
        if not ok:
            return name
    return "all_passed"

print(earliest_failure(checks))`,
    output: `beats_base_on_holdout`,
  },
  {
    type: "prose",
    md: "The job succeeded and the loss went down — yet the earliest *meaningful* failure is `beats_base_on_holdout`: the tuned model doesn't actually outperform the base on held-out data. Debugging from the earliest failing boundary (as in every prior category) says the problem is upstream of 'the model is bad' — it's that training success was mistaken for quality. Fix the dataset/eval, don't blame the base model.",
  },
  {
    type: "code",
    language: "python",
    caption: "Estimate training cost before you run (deterministic, keyless)",
    code: `def training_cost(n_examples, avg_tokens, epochs, price_per_1k):
    total_tokens = n_examples * avg_tokens * epochs     # every example seen once per epoch
    return round(total_tokens / 1000 * price_per_1k, 2)

print(training_cost(500,  400, 3, 0.008))    # a small dataset, 3 epochs
print(training_cost(5000, 400, 3, 0.008))    # 10x the data`,
    output: `4.8
48.0`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "No baseline / no eval — the mistake that ships worse models",
    md: "The single most common hosted-fine-tuning failure is deploying because the *job* succeeded, with no evaluation proving improvement:\n\n- **No baseline** — you never measured the BASE model on your test set, so you have no number to beat and can't claim improvement.\n- **No held-out eval** — you judge by eyeballing a few outputs or by training loss, both of which can look good while real performance is flat or worse.\n- **No regression check** — the tuned model may win on the target task but lose general ability (catastrophic forgetting); without a broader eval you won't see it.\n\nThe rule: **measure base on a sealed test set first, fine-tune, measure the tuned model on the SAME set, and only promote on a real, meaningful gain with no regressions.** 'The job finished' is a project status; 'it beats the base on our eval' is the deployment criterion."
  },
  {
    type: "callout",
    variant: "warning",
    title: "Overfitting to tiny data, and the ongoing hosting cost",
    md: "Two practical traps:\n\n- **Overfitting to tiny data** — a handful of examples plus several epochs makes the model memorize the training set: great train loss, poor generalization. Fixes: more (clean) data, fewer epochs, a smaller learning-rate multiplier, and watching validation loss for the point where it stops improving (deploy a checkpoint from there).\n- **Hosting cost, not just training cost** — training is a one-time token cost, but a *deployed* fine-tuned model (especially on Azure) incurs an **hourly hosting charge whether or not anyone calls it**, and idle deployments are auto-cleaned after a period. Budget for the deployment lifetime and delete deployments you're not using.\n\nBoth are why 'run a fine-tune' is a managed *project* with a cost and an eval gate, not a one-shot API call."
  },
  {
    type: "quiz",
    question: "A hosted fine-tuning job completes with status 'succeeded'. Does that prove the model should be deployed? Why or why not?",
    choices: [
      "Yes — a successful job means the model improved",
      "No — 'succeeded' only means training ran and produced a model; it says nothing about task quality. You must evaluate the tuned model against the base on a held-out test set and check for regressions. Deploy only on a real, meaningful gain with no general-capability loss",
      "Yes — as long as training loss decreased",
      "No — you must always run at least 10 epochs first",
    ],
    answerIndex: 1,
    explanation: "Job success is a pipeline status, not a quality verdict — the model trained and got an id, nothing more. Whether to deploy depends on beating the base model on a sealed held-out set and passing a regression check for general ability. Decreasing training loss can accompany overfitting or flat real-world performance, so it isn't proof either.",
  },
  {
    type: "quiz",
    question: "Training loss falls dramatically, but held-out performance gets worse. What most likely happened, and what do you do?",
    choices: [
      "The base model is broken; switch providers",
      "Overfitting — the model memorized the (likely too small) training set instead of generalizing, so train loss drops while holdout worsens. Use more/cleaner data, fewer epochs, or a smaller learning rate, and deploy an earlier checkpoint from before validation diverged",
      "The evaluation is wrong; trust the training loss",
      "Nothing — lower training loss is always better",
    ],
    answerIndex: 1,
    explanation: "A widening gap between falling training loss and worsening holdout performance is the textbook overfitting signature, typically from too little data trained for too many epochs. Remedies are more/cleaner data, fewer epochs, a smaller learning-rate multiplier, and selecting a checkpoint from before the validation curve turned. Trusting training loss over holdout is exactly the mistake that ships a worse model.",
  },
  {
    type: "takeaways",
    items: [
      "Hosted fine-tuning (OpenAI/Azure) is a managed pipeline: upload JSONL → create job → monitor → checkpoint → evaluate → deploy. Same client.fine_tuning.jobs API surface; model ids/params churn (hedge).",
      "'Job succeeded' is a STATUS, not a quality verdict — the only deployment criterion is beating the BASE model on a sealed held-out set with no regressions.",
      "No baseline / no eval is the signature mistake: measure base first, tuned on the SAME set, promote only on a real gain; watch for catastrophic forgetting.",
      "Overfitting on tiny data shows as train-loss-down / holdout-worse — more clean data, fewer epochs, smaller learning rate, or an earlier checkpoint; deploy from before validation diverged.",
      "Budget training cost (tokens × epochs) AND ongoing hosting cost (a deployed fine-tune bills hourly even when idle); delete unused deployments.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Run and deploy a hosted fine-tune** end to end — the completion criterion is *a fine-tuned model is deployed.* The point isn't the API calls (those are a handful of lines); it's executing the full lifecycle with the discipline that makes the result trustworthy: baseline first, monitor for overfitting, deploy a good checkpoint, and keep the run reproducible.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *a fine-tuned model is deployed* (Azure OpenAI in the seed, but the OpenAI API is nearly identical). Upload your validated dataset (from `topic-ft-data`), create the job with a fixed seed, monitor train/validation curves, then deploy the resulting model. **Roadmap fit:** this reuses your data (ft-data), your provider-configurable client (LLM APIs category — the deployed fine-tune is called exactly like any model), and Azure AI skills. On Azure, deployment is a SEPARATE control-plane step with an hourly hosting cost. Requires a key/subscription to actually run; the workflow, cost math, and eval logic are keyless-reasonable. Record model id + job id + seed + dataset version for reproducibility."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — fine-tune and deploy end to end",
    intro: "Baseline first, deploy a good checkpoint. Acceptance defines done.",
    steps: [
      { order: 1, action: "Measure the BASE model on your sealed test set (record the baseline number). Upload train + validation JSONL and create a fine-tuning job with a fixed seed and a suffix. Estimate the cost first.", decision: "What's your baseline score, and what gain would justify deploying (and paying to host) the fine-tune?" },
      { order: 2, action: "Monitor train and validation curves. If validation diverges (overfitting), plan to deploy an earlier checkpoint. On success, retrieve the resulting model id.", expected: "A finished job with a resulting model id; you know which checkpoint to deploy based on the validation curve." },
      { order: 3, action: "Deploy the resulting model (on Azure, the separate control-plane deployment step) and call it like any provider through your existing client. Record model id + job id + seed + dataset version; note the hosting cost and plan to delete the deployment when idle.", verify: "A fine-tuned model is deployed and callable via your normal client; you have a baseline to compare against, a reproducibility record, and a cost/cleanup plan." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a deployed, accountable fine-tune",
    items: [
      "Base model measured on a sealed test set (baseline recorded) BEFORE tuning.",
      "Job created with fixed seed + suffix; cost estimated; overfitting monitored via validation curve.",
      "Resulting model deployed and callable through the normal client interface.",
      "Reproducibility record (model id, job id, seed, dataset version) + hosting-cost/cleanup plan.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — lifecycle with baseline-first discipline (structure; needs a key)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from openai import OpenAI
client = OpenAI()   # or AzureOpenAI; key from env

def evaluate(model_id, test_set) -> float:
    # Score the model on YOUR sealed test set (exact-match / rubric / judge). Same set for base & tuned.
    correct = sum(scores_for(model_id, test_set))
    return round(correct / len(test_set), 3)

baseline = evaluate("gpt-4.1-mini-2025-04-14", test_set)   # STEP 0: measure base first

train = client.files.create(file=open("train.jsonl", "rb"), purpose="fine-tune")
val   = client.files.create(file=open("val.jsonl", "rb"),   purpose="fine-tune")
job = client.fine_tuning.jobs.create(
    training_file=train.id, validation_file=val.id,
    model="gpt-4.1-mini-2025-04-14", suffix="support-tone", seed=105,
    method={"type": "supervised", "supervised": {"hyperparameters": {"n_epochs": 3}}})

# ... poll client.fine_tuning.jobs.retrieve(job.id).status until 'succeeded' or 'failed' ...
tuned_id = client.fine_tuning.jobs.retrieve(job.id).fine_tuned_model
tuned = evaluate(tuned_id, test_set)                       # SAME sealed set

record = {"base": baseline, "tuned": tuned, "job_id": job.id,
          "model": tuned_id, "seed": 105, "dataset_version": "v1"}
# Deploy tuned_id (on Azure: separate control-plane deployment) ONLY if 'tuned' beats 'baseline'
# by a meaningful margin with no regression. Track hosting cost; delete the deployment when idle.`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "This unit is the payoff of the whole topic: prove the fine-tune actually beats the base model on your evaluation — the completion criterion. Not 'it feels better,' but a number, on a sealed set, with regressions checked. Without this, you're deploying on faith.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How to prove improvement (and catch regressions)",
    md: "Run a controlled comparison:\n\n- **Same sealed test set** for base and tuned — never touched during training/selection.\n- **Same scoring** (exact match, rubric, or LLM-as-judge with a fixed rubric) applied to both.\n- **Report the delta** — absolute and relative improvement on the target task.\n- **Regression check** — also evaluate general/off-task prompts; a target-task win with a general-ability loss (catastrophic forgetting) may be a net negative.\n- **Acceptance threshold** — decide the minimum gain (and zero regressions) that justifies deploying and paying to host BEFORE you look at the number, so you don't rationalize a weak result.\n\nThe deliverable is a promote/don't-promote decision backed by evidence, not vibes."
  },
  {
    type: "code",
    language: "python",
    caption: "Compare base vs tuned and decide to promote (deterministic, keyless)",
    code: `def compare_eval(base, tuned, min_gain=0.05):
    absolute = round(tuned - base, 3)
    relative = round((tuned - base) / base, 3) if base else None
    return {"absolute": absolute, "relative": relative,
            "regression": tuned < base, "promote": absolute >= min_gain}

print(compare_eval(0.70, 0.82))    # a real improvement
print(compare_eval(0.70, 0.68))    # a regression`,
    output: `{'absolute': 0.12, 'relative': 0.171, 'regression': False, 'promote': True}
{'absolute': -0.02, 'relative': -0.029, 'regression': True, 'promote': False}`,
  },
  {
    type: "prose",
    md: "The gate is explicit: `+0.12` (17.1% relative) clears the `min_gain` threshold with no regression → **promote**; `-0.02` is a regression → **don't**. Deciding `min_gain` before seeing the result is what keeps you honest. A tuned model that only ties the base — after all the data and training cost — is not worth deploying and hosting.",
  },
  {
    type: "quiz",
    question: "A fine-tuned model scores higher on your target-task benchmark but users report worse behavior on ordinary requests. What should you investigate?",
    choices: [
      "Nothing — the benchmark is what matters",
      "Catastrophic forgetting / a regression on general ability: the fine-tune improved the narrow task but degraded off-task behavior. Add a general/off-task eval alongside the target benchmark; if the general regression outweighs the task gain, don't promote (or use a smaller learning rate / less aggressive tuning / an adapter)",
      "The users are wrong; trust the benchmark",
      "Re-run training with more epochs",
    ],
    answerIndex: 1,
    explanation: "A benchmark gain with real-world degradation is the signature of catastrophic forgetting — narrow tuning eroding general capability. The fix is to measure general/off-task behavior too, weigh it against the target gain, and only promote if the net is positive; gentler tuning or a parameter-efficient adapter can preserve general ability. Trusting the benchmark alone or adding epochs would make the regression worse.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — a promote/don't-promote decision from evidence.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Decide whether the fine-tune should be deployed",
    intro: "Beat the base on a sealed set, with no regressions, above a pre-set bar.",
    steps: [
      { order: 1, action: "Score the base and the tuned model on the SAME sealed test set with the same scoring. Compute absolute and relative improvement on the target task.", expected: "A base score, a tuned score, and the deltas." },
      { order: 2, action: "Run a regression eval on general/off-task prompts. Set (before looking) the minimum gain and zero-regression threshold that would justify deploying and paying to host.", decision: "Does the target-task gain exceed your threshold AND leave general ability intact?" },
      { order: 3, action: "Make the call: promote or not, with the evidence. If not, state what to change (more/cleaner data, fewer epochs, smaller LR, or don't fine-tune at all).", verify: "You have a base-vs-tuned comparison on a sealed set, a regression check, a pre-set acceptance bar, and a justified promote/don't-promote decision." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — evidence-based promotion",
    items: [
      "Base and tuned scored on the SAME sealed test set with identical scoring.",
      "Absolute + relative target-task improvement computed; regression eval run on general prompts.",
      "Acceptance threshold (min gain, zero regression) set BEFORE viewing results.",
      "A justified promote/don't-promote decision (and next step if not).",
    ],
  },
];

export const content: TopicContent = {
  "unit-ft-hosted-01": learn,
  "unit-ft-hosted-02": build,
  "unit-ft-hosted-03": review,
};
