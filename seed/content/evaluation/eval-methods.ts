import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Evaluation Methods & Metrics" (topic-eval-methods).
// 4 units: 01 learn (LLM-as-judge, rubrics, pairwise, golden sets, judge bias) · 02 practice
// (judge prompt + rubric) · 03 build (eval suite for an app) · 04 review (validate judge vs humans).
// commonMistakes: Trusting an unvalidated LLM judge blindly. masteryCriteria: build an eval whose
// scores you trust and can defend. Deterministic keyless: position-bias detection + Cohen's kappa.
// Reuses Ragas/retrieval metrics (Batch 6) + structured output (Batch 3). Judge outputs representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You've framed the evaluation; now you pick methods. There's a spectrum from cheap-and-certain to flexible-and-fallible: deterministic checks → task metrics → LLM-as-judge → human eval. The engineering skill is choosing the *most reliable method that can actually measure a given quality*, and — when you must use an LLM judge — treating that judge as a fallible instrument you have to calibrate, not an oracle. That single discipline (validate the judge) separates trustworthy evals from vibes.",
  },
  {
    type: "prose",
    md: "**Mental model: prefer the most deterministic method a quality allows; escalate to a judge only for genuinely fuzzy qualities, and then validate the judge like any measuring instrument.** JSON-validity, 'contains the order id', 'number in range', 'cites a real source' — these are deterministic assertions: cheap, reproducible, un-gameable. Only qualities that truly need judgement (helpfulness, tone, groundedness of prose) should go to an LLM judge, and a judge's score is worthless until you've shown it agrees with humans. Reach for the judge last, not first.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Deterministic check / assertion", definition: "A rule-based pass/fail: valid JSON, contains substring, regex match, number in range, exact field equals. Cheap, perfectly reproducible, un-gameable — use wherever the quality allows it." },
      { term: "Task metric", definition: "A quantitative measure for a defined task: exact/fuzzy match, F1, retrieval Recall@k / Precision@k / MRR (from the RAG category). Reference-based; needs labeled data." },
      { term: "LLM-as-judge", definition: "Use an LLM to score/critique an output against a rubric or reference. Handles fuzzy qualities, but is itself fallible (biased, unstable) — must be validated against humans before trust." },
      { term: "Rubric", definition: "The explicit scoring criteria given to a judge (or human): what each score level means, per dimension. A vague rubric yields noisy, un-defendable scores; a sharp rubric is most of a judge's reliability." },
      { term: "Pairwise (A/B) judging", definition: "Ask the judge which of two outputs is better, rather than an absolute score. Often more reliable than absolute grading — but exposes position/order bias (the judge may prefer whichever is shown first)." },
      { term: "Golden set", definition: "A curated, versioned dataset of representative + edge/adversarial cases with agreed expected outcomes. The stable yardstick you evaluate against and gate on; its quality bounds your eval's quality." },
    ],
  },
  {
    type: "prose",
    md: "**You already have half the toolbox.** In the RAG category you used **Ragas-style** metrics (Faithfulness, Response Relevancy, Context Precision, Context Recall) and retrieval metrics (Recall@k, Precision@k, Hit Rate, MRR); in fine-tuning you built base-vs-tuned comparisons on a sealed set. This topic *generalizes* those: the same 'measure against a golden set, report per-dimension' pattern, now for any LLM app, plus the judge-validation rigor that makes fuzzy scores defensible. Don't re-derive retrieval metrics — reuse them; here we add judges, rubrics, and calibration.",
  },
  {
    type: "prose",
    md: "**LLM-as-judge with structured output.** A judge returns a *structured* verdict (score + reasons per criterion) so you can aggregate it — reuse the structured-output discipline from the API category. But the judge's number is only as good as your validation of it:",
  },
  {
    type: "code",
    language: "python",
    caption: "Judge returns a structured verdict (schema shown; the score is representative)",
    code: `# The judge is an LLM given a rubric; use structured output so results are aggregatable.
# The SCHEMA is deterministic; the score is a MODEL judgement (representative, must be validated).
JUDGE_SCHEMA = {
    "grounded": "int 1-5: is every claim supported by the provided context?",
    "complete": "int 1-5: does it fully answer the question?",
    "reasons":  "str: brief justification citing the rubric",
}
# representative judge output for one answer:
verdict = {"grounded": 4, "complete": 3, "reasons": "claims match context; omits the refund window"}
print(verdict["grounded"], verdict["complete"])   # aggregate these ACROSS a golden set`,
    output: `4 3`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Trusting an unvalidated LLM judge blindly — the signature mistake",
    md: "An LLM judge feels authoritative and is fast, so teams wire it in and trust the average. But a judge is a fallible instrument with documented biases:\n\n- **No validation** — you never checked whether its scores agree with human judgement, so a high average may mean nothing (or rank the worse system higher).\n- **Position/order bias** — in pairwise judging it may prefer whichever answer is shown *first* (or second); swap the order and the winner flips.\n- **Verbosity/style bias** — it may reward longer or more confident-sounding answers regardless of correctness.\n- **Self-preference** — a judge may favor outputs from its own model family.\n- **Instability** — the same pair judged twice can disagree (non-determinism).\n- **Rubric leakage** — a vague rubric lets the judge substitute its own taste.\n\nThe rule: **a judge's score is not evidence until the judge is validated against human labels** (next-to-last unit) and its biases are controlled (randomize order, cap length influence, sharpen the rubric). High judge score ≠ correct answer."
  },
  {
    type: "callout",
    variant: "tip",
    title: "Choosing a method by the quality",
    md: "Match the method to what you're measuring:\n\n- **Structural / factual-exact** (valid JSON, contains the order id, number in range, cites a real doc) → **deterministic assertion**. Always prefer this.\n- **Retrieval quality** (did we fetch the right context?) → **retrieval metrics** (Recall@k / Precision@k / MRR) against labeled relevant docs.\n- **Fuzzy prose quality** (helpful, grounded, on-tone) → **LLM judge with a sharp rubric**, validated against humans; or **pairwise** for 'is A better than B'.\n- **High-stakes / final sign-off** → **human eval** on a sample (the ground truth judges are validated against).\n\nMost real suites are a *layered mix*: deterministic gates catch the cheap failures, retrieval metrics isolate the retrieval layer, and a validated judge handles the irreducibly fuzzy part. Reserve expensive human/judge effort for what deterministic checks can't cover."
  },
  {
    type: "quiz",
    question: "You need to measure whether your extractor's output is valid JSON with a non-empty order_id. Which evaluation method should you use, and why not an LLM judge?",
    choices: [
      "An LLM judge — it's the most flexible option",
      "A deterministic assertion (parse the JSON, check order_id is present and non-empty): the quality is structural and exactly checkable, so a rule is cheap, perfectly reproducible, and un-gameable. An LLM judge would add cost, non-determinism, and bias to a check that has a definite right answer",
      "Human evaluation only",
      "Pairwise judging of two extractions",
    ],
    answerIndex: 1,
    explanation: "Valid-JSON-with-a-non-empty-field is a structural property with a definite answer, so a deterministic assertion is cheaper, perfectly reproducible, and immune to the biases and instability an LLM judge would introduce. Reserve judges for genuinely fuzzy qualities that rules can't capture. Human eval and pairwise judging are overkill for an exactly checkable condition.",
  },
  {
    type: "takeaways",
    items: [
      "Prefer the most deterministic method a quality allows (assertions for structural/exact facts); escalate to a judge only for irreducibly fuzzy qualities.",
      "You already have retrieval metrics (Recall@k/Precision@k/MRR) and Ragas-style measures from RAG — reuse them; this topic adds judges, rubrics, and calibration on top.",
      "LLM-as-judge returns a STRUCTURED verdict (per-criterion scores + reasons) so it's aggregatable — but the number is worthless until the judge is validated against humans.",
      "Judges have documented biases: position/order, verbosity, self-preference, instability, rubric leakage — control them (randomize order, sharpen rubric) and validate.",
      "Golden set = curated, versioned, representative + edge/adversarial cases; its quality bounds your eval's quality. Real suites layer deterministic + retrieval + validated-judge methods.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Write a judge prompt and rubric, then stress-test it for bias. This is keyless — the deterministic part is detecting position bias by swapping order; the judge call itself is representative. The skill is building a rubric sharp enough that scores align with intent.",
  },
  {
    type: "code",
    language: "python",
    caption: "Detecting position bias by swapping order (deterministic, keyless)",
    code: `# A biased pairwise judge that always prefers whichever answer is shown FIRST.
# (Stands in for a real judge; the TEST is deterministic: swap order, see if the winner flips.)
def judge_first_wins(option_a, option_b):
    return option_a                      # position bias: always the first option

winner_fwd = judge_first_wins("resp1", "resp2")   # resp1 shown first
winner_rev = judge_first_wins("resp2", "resp1")   # resp2 shown first
print(winner_fwd, winner_rev)
print("position bias detected" if winner_fwd != winner_rev else "consistent")`,
    output: `resp1 resp2
position bias detected`,
  },
  {
    type: "prose",
    md: "Because the judge picks whichever is first, forward order crowns `resp1` and reversed order crowns `resp2` — the winner flips, revealing **position bias**. Running every pairwise comparison in *both* orders (and only trusting a verdict when it's order-consistent) is the standard control. A judge that can't survive an order swap can't be trusted to rank your systems.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Write a judge prompt + rubric that aligns with intent (guided)",
    intro: "Sharpen the rubric, then attack the judge's biases.",
    steps: [
      { order: 1, action: "Write a judge prompt for one fuzzy quality (e.g. groundedness). Give a SHARP rubric: define each score level concretely, require the judge to cite the rubric and the evidence, and return a structured verdict (score + reasons).", expected: "A judge that returns per-criterion scores with justifications, not a bare number." },
      { order: 2, action: "Attack the biases: run each pairwise comparison in both orders (detect position bias), test a verbose-but-wrong answer vs a terse-correct one (detect verbosity bias), and re-run the same input twice (detect instability).", decision: "Does the rubric leave room for the judge to substitute its own taste? Where does the score diverge from your intent?" },
      { order: 3, action: "Tighten the rubric and add controls (order randomization, length guidance) until scores track your intent on a handful of hand-labeled cases.", verify: "Your judge returns structured, rubric-cited verdicts, survives an order swap, isn't fooled by verbosity, and its scores match your intent on known cases." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "Judge prompt returns a structured, rubric-cited verdict (not a bare number).",
      "Pairwise comparisons run in both orders; position bias detected/controlled.",
      "Verbosity and instability probed; rubric tightened to remove judge discretion.",
      "Scores align with your intent on a few hand-labeled cases.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build an evaluation suite for one of your apps** — the RAG assistant (Project P3) is the natural subject. The completion criterion is 'the suite produces trustworthy scores.' This is the topic's mastery goal made concrete: a layered suite (deterministic + retrieval + validated judge) over a golden set, whose numbers you'd defend to a skeptical reviewer.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *the suite produces trustworthy scores.* Assemble a layered eval over a golden set: deterministic assertions for structural/exact facts, retrieval metrics (Recall@k/Precision@k/MRR — reused from RAG) for the retrieval layer, and a *validated* LLM judge for fuzzy prose quality. **Roadmap fit:** the subject is your RAG app (P3, Batch 6); the retrieval metrics are the ones you already built; the judge is validated in the next unit; and this suite becomes the thing you'll gate on in CI (topic-eval-ci) and watch in production (topic-eval-observability). The suite is keyless to design and run on canned outputs; the judge step needs a key. Version the golden set and the suite together."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a trustworthy eval suite",
    intro: "Layer the methods; make every score defensible. Acceptance defines done.",
    steps: [
      { order: 1, action: "Build a golden set for the app: representative + edge/adversarial cases, no leakage, with expected outcomes per quality dimension. Version it. Map each dimension to a measurement method (deterministic where possible).", decision: "Which qualities are deterministically checkable (do those with assertions) versus need a validated judge?" },
      { order: 2, action: "Implement the layers: deterministic assertions (format, must-contain, ranges), retrieval metrics (did the gold doc get retrieved?), and a rubric-based judge for fuzzy quality. Aggregate as SEPARATE per-dimension signals, not one number.", expected: "Running the suite yields a small dashboard of per-dimension scores over the golden set." },
      { order: 3, action: "Make the scores trustworthy: control judge biases (order randomization), record which failure LAYER each measure targets, and note trust level per signal. Keep the judge unvalidated-flagged until the next unit validates it.", verify: "The suite runs over a versioned golden set, reports per-dimension signals with method + layer + trust noted, uses deterministic checks wherever possible, and its numbers are defensible." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a defensible eval suite",
    items: [
      "Versioned golden set (representative + edge/adversarial, no leakage) with per-dimension expected outcomes.",
      "Layered methods: deterministic assertions + retrieval metrics + rubric judge; scores reported per dimension, not one number.",
      "Judge biases controlled (order randomization); each measure mapped to a failure layer.",
      "Trust level noted per signal; judge flagged pending validation (next unit).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — layered suite over a golden set (deterministic layers run keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `# Deterministic layers need NO model; the judge layer is optional/representative.
def assert_checks(answer, must_contain):
    return {"valid_nonempty": bool(answer.strip()),
            "contains_expected": all(t in answer.lower() for t in must_contain)}

def retrieval_recall(retrieved_ids, gold_ids):      # reused from the RAG category
    hit = len(set(retrieved_ids) & set(gold_ids))
    return round(hit / len(gold_ids), 3) if gold_ids else 0.0

def evaluate_case(case, judge=None):
    row = {"id": case["id"]}
    row.update(assert_checks(case["answer"], case["must_contain"]))            # layer 1: deterministic
    row["recall"] = retrieval_recall(case["retrieved_ids"], case["gold_ids"])  # layer 2: retrieval
    if judge:                                                                  # layer 3: validated judge
        row["grounded"] = judge(case["answer"], case["context"])   # representative; validate before trust
    return row

def run_suite(golden_set, judge=None):
    rows = [evaluate_case(c, judge) for c in golden_set]
    # Report per-dimension aggregates, NOT one number:
    n = len(rows)
    return {
        "n": n,
        "pct_valid":    round(sum(r["valid_nonempty"] for r in rows) / n, 3),
        "pct_contains": round(sum(r["contains_expected"] for r in rows) / n, 3),
        "avg_recall":   round(sum(r["recall"] for r in rows) / n, 3),
    }`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "This is the unit that makes an LLM judge trustworthy — or reveals it isn't. The completion criterion is 'judge agreement with humans is measured.' Until you've quantified how often the judge agrees with human labels *beyond chance*, its scores are decoration.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How to validate a judge against humans",
    md: "Quantify agreement, don't eyeball it:\n\n- **Get human labels** on a sample of outputs (the ground truth). Use clear rubric-based labels, ideally from more than one human.\n- **Run the judge** on the same sample and compare its labels to the humans'.\n- **Compute agreement beyond chance** — raw agreement is misleading (two labelers agreeing 'good' 90% of the time on a 90%-good dataset agree a lot by chance). Use **Cohen's kappa**: `kappa = (po - pe) / (1 - pe)`, where `po` is observed agreement and `pe` is chance agreement. Rough reading: <0.2 poor, 0.2–0.4 fair, 0.4–0.6 moderate, 0.6–0.8 substantial, >0.8 near-perfect.\n- **Also check human–human agreement** — if humans barely agree, the task is ill-defined and no judge can do better; fix the rubric first.\n\nOnly a judge with adequate agreement (for your stakes) earns the right to score at scale. A judge below the bar means you tighten the rubric, change the method, or fall back to human eval."
  },
  {
    type: "code",
    language: "python",
    caption: "Judge–human agreement: raw agreement vs Cohen's kappa (deterministic, keyless)",
    code: `def cohens_kappa(a, b):
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n          # observed agreement
    pa1, pb1 = sum(a) / n, sum(b) / n
    pe = pa1 * pb1 + (1 - pa1) * (1 - pb1)              # chance agreement from marginals
    return round((po - pe) / (1 - pe), 3)

judge = [1, 1, 0, 1, 0, 0, 1, 0]     # 1 = 'good', judge labels
human = [1, 0, 0, 1, 0, 1, 1, 0]     # human labels on the same items

print(round(sum(x == y for x, y in zip(judge, human)) / len(judge), 3))   # raw agreement
print(cohens_kappa(judge, human))                                          # beyond chance`,
    output: `0.75
0.5`,
  },
  {
    type: "prose",
    md: "Raw agreement is **0.75** — which *looks* fine and is exactly why people ship unvalidated judges. But Cohen's **kappa is 0.5**: only *moderate* agreement once you remove what they'd agree on by chance. That gap is the whole lesson — 75% raw can be 0.5 kappa, and a moderate judge may be fine for low-stakes triage but not for a deployment gate. Report kappa, not raw agreement, and set the bar by the stakes.",
  },
  {
    type: "quiz",
    question: "Your LLM judge agrees with human labels 75% of the time, so a teammate says 'ship it as our eval gate.' Why is that reasoning incomplete?",
    choices: [
      "It isn't — 75% agreement is always enough",
      "Raw agreement ignores chance: on a skewed dataset two labelers agree often just by both picking the majority label. Cohen's kappa (here 0.5, only moderate) measures agreement beyond chance. Judge the judge by kappa against the stakes — 0.5 may suffice for triage but is likely too weak for a deployment gate",
      "75% is too low for any use whatsoever",
      "You should never compare a judge to humans",
    ],
    answerIndex: 1,
    explanation: "Raw agreement is inflated by chance, especially on imbalanced data, so 75% can correspond to only moderate true agreement — here kappa 0.5. The trustworthiness bar depends on stakes: moderate agreement might be acceptable for low-stakes triage but not for gating deployments. Reporting kappa (not raw agreement) and comparing it to the stakes is exactly the validation that makes a judge defensible.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — validate your judge and decide if it's trustworthy enough.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Measure judge–human agreement and rule on the judge",
    intro: "Turn 'the judge seems good' into a defended trust decision.",
    steps: [
      { order: 1, action: "Collect human labels on a sample of your app's outputs (rubric-based, ideally 2+ humans). Run your judge on the same sample. Compute raw agreement AND Cohen's kappa (judge vs human, and human vs human).", expected: "Raw agreement + kappa for judge-vs-human and human-vs-human." },
      { order: 2, action: "Read the numbers against the stakes: is judge–human kappa adequate for how you'll use the judge (triage vs deployment gate)? Is human–human kappa high enough that the task is even well-defined?", decision: "Is the judge trustworthy enough for its intended use, or is the rubric/task the real problem (low human–human agreement)?" },
      { order: 3, action: "Rule on the judge: trust it (with its bias controls), tighten the rubric and re-validate, or fall back to human eval for this quality. Document the decision and the numbers.", verify: "You measured judge–human agreement beyond chance, checked human–human agreement, and made a documented, stakes-appropriate trust decision — a judge you can defend." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a validated (or rejected) judge",
    items: [
      "Human labels collected on a sample; judge run on the same items.",
      "Raw agreement AND Cohen's kappa computed (judge–human and human–human).",
      "Kappa read against the stakes; low human–human agreement flagged as a rubric/task problem.",
      "Documented trust decision: trust / re-rubric / fall back to human — with the numbers.",
    ],
  },
];

export const content: TopicContent = {
  "unit-eval-methods-01": learn,
  "unit-eval-methods-02": practice,
  "unit-eval-methods-03": build,
  "unit-eval-methods-04": review,
};
