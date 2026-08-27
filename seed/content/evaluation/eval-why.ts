import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Why Evaluation Is Hard" (topic-eval-why).
// 2 units: 01 learn (non-determinism, reference-free eval, offline/online, failure layers) ·
// 02 review (critique naive eval plans). commonMistakes: Expecting a single accuracy number.
// masteryCriteria: design an evaluation strategy for a fuzzy task.
// Deterministic keyless: exact-match-fails + naive-plan critique lookup. Model outputs marked
// representative. Reuses RAG eval framing (Batch 6) + fine-tune eval discipline (Batch 11).

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Every prior category ended with 'prove it works.' This category is that discipline made rigorous. But generative systems break the evaluation you learned in school: there's no single correct answer, the same input gives different outputs, and 'accuracy' is often undefinable. Before you can measure anything, you have to *frame* the evaluation correctly — and framing is where most teams go wrong, long before they pick a metric. Getting the frame right is the whole job of this first topic.",
  },
  {
    type: "prose",
    md: "**Mental model: evaluating a generative system is measuring a fuzzy, multi-dimensional target with imperfect instruments — so you design an evaluation strategy, not compute a single accuracy number.** A classification model has one right label and a clean accuracy score. A summary, a chatbot reply, or a RAG answer has *many* acceptable forms, several quality dimensions (correct? grounded? complete? safe? on-tone?), and non-deterministic output. 'What's the accuracy?' is the wrong question; 'which qualities matter, how do I measure each, and how much do I trust that measurement?' is the right one.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Non-determinism", definition: "The same input can produce different outputs (sampling, temperature, model updates). So a single run proves little; you evaluate over a set and expect a distribution, not one answer." },
      { term: "No single ground truth", definition: "For open-ended tasks there are many acceptable answers. Exact-match against one reference punishes correct paraphrases. You need reference-free or rubric-based judgement, or multiple references." },
      { term: "Reference-based vs reference-free", definition: "Reference-based compares output to a known gold answer (exact match, similarity). Reference-free judges the output on its own merits (is it grounded? coherent?) using rules or an LLM judge — needed when there's no single gold." },
      { term: "Offline vs online evaluation", definition: "Offline = run a fixed test set before deploy (repeatable, gated). Online = measure real production traffic (user feedback, A/B, live metrics). Offline predicts; online confirms — you need both." },
      { term: "Deterministic vs model-based eval", definition: "Deterministic checks are exact/rule-based (JSON valid? contains X? number in range?) — cheap, reliable, reproducible. Model-based (LLM-as-judge) handles fuzzy quality but is itself fallible and must be validated." },
      { term: "Evaluation strategy", definition: "The plan: what qualities to measure, which method per quality (deterministic where possible, judged where necessary), on what dataset, offline and online, and how much to trust each signal." },
    ],
  },
  {
    type: "prose",
    md: "**Why the single-number instinct fails.** People want one accuracy score, so they reach for exact match against a reference. On generative output that immediately breaks: correct answers in a different wording score zero.",
  },
  {
    type: "code",
    language: "python",
    caption: "Exact match punishes correct paraphrases (deterministic, keyless)",
    code: `gold = "Paris is the capital of France."
answers = [
    "The capital of France is Paris.",   # correct, different wording
    "Paris.",                            # correct, terser
]

def exact_match(a, g):
    return a.strip() == g.strip()

print([exact_match(a, gold) for a in answers])   # both correct, both scored wrong`,
    output: `[False, False]`,
  },
  {
    type: "prose",
    md: "Two clearly-correct answers, scored `[False, False]` — a single exact-match 'accuracy' would report 0% on a system that's actually right. This is why you can't collapse generative quality into one reference-based number. You either use **multiple references / fuzzy matching**, judge **reference-free** against a rubric, or decompose into deterministic checks per quality — usually a mix.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Expecting a single accuracy number — the framing mistake",
    md: "The instinct to summarize quality as one number causes concrete failures:\n\n- **It hides dimensions.** A RAG answer can be fluent but ungrounded, or correct but incomplete. One number can't tell you *which* — and you fix what you can't see.\n- **It punishes valid variety.** Exact match against one gold answer scores correct paraphrases as wrong.\n- **It invites metric gaming.** Optimize the single number and you optimize its blind spots (e.g. verbosity or keyword stuffing that the metric rewards).\n- **It ignores non-determinism.** One run's score isn't the system's score; you need a distribution over a set.\n\nThe fix is a **strategy**, not a number: enumerate the qualities that matter for *this* task, measure each with the most reliable method available, and keep them as separate signals. Report a small dashboard of measures, not a single headline accuracy."
  },
  {
    type: "prose",
    md: "**Framing also means knowing which layer you're evaluating.** An AI system is a pipeline, and a bad final answer can originate at any stage. Evaluation exists to *localize* the failure, not just declare 'the answer was bad.' The layers to distinguish (you've built most of them across prior categories):",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Failure layers (attribute, don't guess)", definition: "input/data → retrieval → prompt/context assembly → model generation → tool call → orchestration → evaluation/judge → production (latency/cost/errors). A wrong output could come from ANY of these." },
      { term: "'Just improve the prompt' anti-pattern", definition: "Defaulting every quality problem to prompt tweaks. If the gold document was never retrieved, no prompt fixes it; if the judge is biased, no prompt change is even being measured correctly. Localize first." },
    ],
  },
  {
    type: "callout",
    variant: "note",
    title: "Offline predicts, online confirms",
    md: "Two evaluation regimes, both required:\n\n- **Offline** — a fixed, curated test set run before deploy. Repeatable and gate-able (you'll wire it into CI later). It *predicts* production quality but can't capture the real input distribution.\n- **Online** — measurement on live traffic: user feedback (thumbs, edits, escalations), A/B tests, and production metrics (latency, cost, error/refusal rates). It's the ground truth of whether users are helped, but it's noisy and slow to attribute.\n\nThe trap is trusting one alone: a great offline score can still regress in production (distribution shift, new inputs), and online-only means you learn about regressions *after* users hit them. Offline gates what ships; online tells you whether the gate was calibrated to reality. A strong evaluation strategy connects the two."
  },
  {
    type: "quiz",
    question: "A teammate proposes measuring your RAG chatbot's quality with a single exact-match accuracy against one reference answer per question. What's the core problem?",
    choices: [
      "Nothing — exact match is the gold standard for chatbots",
      "Generative answers have no single ground truth: many correct answers differ in wording, so exact match scores correct paraphrases as wrong and collapses several quality dimensions (grounded? complete? on-tone?) into one misleading number. Use multiple references / reference-free rubric judging, and keep quality dimensions as separate signals",
      "Exact match is too slow to compute",
      "The only fix is to add more reference answers",
    ],
    answerIndex: 1,
    explanation: "Open-ended generation has many acceptable answers and multiple quality dimensions, so a single exact-match number both punishes correct paraphrases and hides which quality actually failed. The fix is a strategy: judge reference-free against a rubric (or use multiple references) and report per-dimension signals rather than one headline accuracy. More references helps a little but doesn't address the multi-dimensional framing problem.",
  },
  {
    type: "quiz",
    question: "Your offline eval set shows 92% quality, but production users report the assistant is noticeably worse. What's the most likely explanation and the lesson?",
    choices: [
      "The offline number is the truth; users are wrong",
      "Distribution shift / non-representative offline set: real traffic contains inputs your test set doesn't cover, so a strong offline score didn't predict production. Offline predicts and gates, but online (feedback, A/B, live metrics) confirms — you need both, and the offline set must track the real input distribution",
      "The model got worse on its own with no cause",
      "Offline evaluation is useless and should be dropped",
    ],
    answerIndex: 1,
    explanation: "A high offline score with poor production quality is the classic sign that the offline set doesn't represent real traffic — offline evaluation predicts and gates but can't capture the live input distribution. The lesson is to run both regimes and keep the offline set aligned with production inputs, not to trust one over the other or abandon offline evaluation. The model didn't spontaneously degrade; the measurement missed real inputs.",
  },
  {
    type: "takeaways",
    items: [
      "Generative evaluation measures a fuzzy, multi-dimensional target with imperfect instruments — you design an evaluation STRATEGY, not a single accuracy number.",
      "No single ground truth: exact match punishes correct paraphrases (`[False, False]` on right answers) — use multiple references, reference-free rubric judging, or per-quality deterministic checks.",
      "Non-determinism means one run isn't the system's score; evaluate over a set and expect a distribution.",
      "Distinguish the failure LAYER (input/retrieval/prompt/generation/tool/orchestration/judge/production) so evaluation localizes the fault — avoid the 'just improve the prompt' default.",
      "Offline predicts and gates; online (feedback, A/B, live metrics) confirms — you need both, and the offline set must track the real input distribution.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The certifying skill of this topic is spotting a *broken evaluation plan* before it wastes weeks. The completion criterion is 'you identify each plan's flaw.' Naive eval plans fail in recognizable ways; this unit drills the diagnosis until it's reflexive.",
  },
  {
    type: "code",
    language: "python",
    caption: "Critique of common naive eval plans (deterministic, keyless)",
    code: `def critique(plan):
    flaws = {
        "eyeball_10_outputs":       "not reproducible, not representative, no defined pass criteria",
        "single_accuracy_number":   "fuzzy task has no single truth; hides dimensions, punishes paraphrases",
        "test_on_training_examples": "leakage/contamination — measures memorization, not generalization",
        "judge_without_validation":  "unvalidated LLM judge; must check agreement with human labels first",
        "one_happy_path_case":       "not representative; missing edge/adversarial/failure cases",
        "offline_only_ship":         "no online signal; distribution shift can regress prod silently",
    }
    return flaws[plan]

print(critique("single_accuracy_number"))
print(critique("test_on_training_examples"))
print(critique("judge_without_validation"))`,
    output: `fuzzy task has no single truth; hides dimensions, punishes paraphrases
leakage/contamination — measures memorization, not generalization
unvalidated LLM judge; must check agreement with human labels first`,
  },
  {
    type: "prose",
    md: "Each naive plan maps to a specific, nameable flaw — reproducibility, ground-truth, leakage, judge-validity, representativeness, or offline/online coverage. Naming the flaw is what turns 'this eval feels off' into 'this eval measures memorization because the test cases are in the training data.'",
  },
  {
    type: "quiz",
    question: "A plan: 'We'll evaluate the new prompt by having an LLM judge score 200 outputs, and ship if the average score beats the old prompt.' What's the missing step that could invalidate the whole result?",
    choices: [
      "Nothing — LLM judges are always reliable",
      "The judge itself is unvalidated: you haven't checked whether its scores agree with human judgement (or that it's free of bias/instability). An unvalidated judge can rank the worse prompt higher. Validate the judge against human labels first; only then trust its comparison",
      "200 outputs is too few to ever be meaningful",
      "You should never compare two prompts",
    ],
    answerIndex: 1,
    explanation: "Averaging an LLM judge's scores only means something if the judge tracks real quality, and that requires validating it against human labels before trusting it to rank prompts. An unvalidated or biased judge can systematically prefer the worse option, invalidating the comparison. The sample size and the act of comparing prompts aren't the problem — the missing judge-validation step is.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — design an evaluation strategy for a fuzzy task.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Frame the evaluation for one of your generative apps",
    intro: "Turn 'is it good?' into a concrete, defensible measurement plan.",
    steps: [
      { order: 1, action: "Pick a fuzzy task (e.g. your RAG assistant's answers). Enumerate the quality DIMENSIONS that matter (correctness, groundedness, completeness, tone, safety, format). For each, choose a method: deterministic check where possible, rubric/judge where necessary.", expected: "A list of dimensions, each paired with the most reliable measurement method for it." },
      { order: 2, action: "Define the dataset (representative + edge/adversarial cases, no leakage) and both regimes: an offline set to gate on, and the online signals (feedback, metrics) you'll watch. Note which failure LAYER each measure targets.", decision: "Which dimensions can be measured deterministically (cheap, trustworthy) versus needing a validated judge — and how will you know the judge is trustworthy?" },
      { order: 3, action: "State how much you trust each signal and what would make you distrust it (small n, unvalidated judge, non-representative set). Write the strategy as a short spec.", verify: "You have a per-dimension measurement plan (deterministic where possible), a representative leakage-free dataset, offline+online coverage, failure-layer mapping, and an honest trust assessment — an evaluation strategy, not a single number." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a defensible evaluation strategy",
    items: [
      "Quality dimensions enumerated, each with the most reliable measurement method (deterministic preferred).",
      "Representative, leakage-free dataset with edge/adversarial cases; offline gate + online signals defined.",
      "Each measure mapped to the failure layer it targets (retrieval/generation/judge/etc.).",
      "Trust level per signal stated, with what would invalidate it — no single-number claim.",
    ],
  },
];

export const content: TopicContent = {
  "unit-eval-why-01": learn,
  "unit-eval-why-02": review,
};
