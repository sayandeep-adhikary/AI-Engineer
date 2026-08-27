import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Evaluation in CI / Regression Testing" (topic-eval-ci).
// 3 units: 01 learn (eval-in-CI, thresholds, regression suites, drift) · 02 build (CI eval gate
// for a repo) · 03 review (regress and confirm the gate fails).
// commonMistakes: Manual eval only, Shipping silent regressions. masteryCriteria: CI job that
// fails on quality regressions. Feeds P6 milestone p6-04 (CI/CD + eval gate). Reuses eval suite
// (eval-methods) + GitHub Actions (Batch 1 env-tooling). Deterministic keyless eval-gate + significance.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You have an eval suite and observability. The last gap is *automation*: quality regressions ship silently because nobody remembers to run the eval before merging. **Evaluation in CI** closes that gap — the eval suite runs automatically on every change and *fails the build* when quality drops below a bar. It's unit tests for a non-deterministic system: the same discipline that stops code regressions, applied to answer quality.",
  },
  {
    type: "prose",
    md: "**Mental model: an eval gate is an automated, thresholded quality test in your pipeline — it turns your golden-set eval into a pass/fail that blocks a regression from merging.** Where a unit test asserts `f(x) == y`, an eval gate asserts `quality(system) >= baseline - tolerance` over a golden set. The hard parts are *non-determinism* (so the threshold must tolerate noise) and *attribution* (a failing gate should point at what regressed). Get those right and quality stops silently rotting between releases.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Eval gate", definition: "A CI step that runs the eval suite on the change and passes/fails against a threshold. A fail blocks the merge/deploy, the same way a failing test does — automated protection against quality regressions." },
      { term: "Threshold / tolerance", definition: "The pass bar: a minimum absolute score AND a maximum allowed drop from the baseline. Tolerance must exceed eval noise (from non-determinism and small sets) so the gate doesn't flap on random variation." },
      { term: "Regression suite", definition: "The golden set (+ known past-failure cases) the gate runs on. Every real bug you fix should add a case, so it can never silently return. It grows into the system's institutional memory." },
      { term: "Baseline", definition: "The current production/main quality scores the change is compared against. A gate is meaningful only relative to a baseline — 'better or no-worse-than' is the question, not an absolute in a vacuum." },
      { term: "Drift", definition: "Slow quality change over time from shifting inputs (distribution drift) or a moving model/provider. Gates catch per-change regressions; drift needs periodic re-baselining and online monitoring to catch." },
      { term: "Statistical significance", definition: "Whether a score difference is real or noise. On a small golden set, a one-example flip is at the noise floor — a tiny 'drop' may be meaningless. Bigger sets give finer resolution and more trustworthy gates." },
    ],
  },
  {
    type: "prose",
    md: "**The gate is a threshold policy.** Compare the change's score to the baseline; fail if it drops too far or falls below an absolute floor. Deterministic and simple — the judgement is in setting the bar:",
  },
  {
    type: "code",
    language: "python",
    caption: "An eval gate: pass/fail against baseline + floor (deterministic, keyless)",
    code: `def eval_gate(baseline, current, min_score=0.8, max_drop=0.03):
    drop = round(baseline - current, 3)
    passed = current >= min_score and drop <= max_drop
    return {"baseline": baseline, "current": current, "drop": drop, "pass": passed}

print(eval_gate(0.86, 0.84))   # small drop within tolerance
print(eval_gate(0.86, 0.80))   # drop exceeds tolerance -> regression blocked
print(eval_gate(0.86, 0.79))   # below the absolute floor -> blocked`,
    output: `{'baseline': 0.86, 'current': 0.84, 'drop': 0.02, 'pass': True}
{'baseline': 0.86, 'current': 0.8, 'drop': 0.06, 'pass': False}
{'baseline': 0.86, 'current': 0.79, 'drop': 0.07, 'pass': False}`,
  },
  {
    type: "prose",
    md: "A 0.02 drop passes (within tolerance); a 0.06 drop fails (a real regression); 0.79 fails the absolute floor even though the drop alone might have been borderline. Two conditions — **stay above a floor AND don't drop more than tolerance** — because a change can regress from a high baseline or push an already-marginal system below the usable line.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Manual eval only, and shipping silent regressions",
    md: "The two failure modes this topic exists to prevent:\n\n- **Manual eval only** — 'we run the eval before big releases.' In practice that means someone forgets, or a small PR skips it, and quality erodes one un-evaluated merge at a time. If the eval isn't automated in CI, it effectively doesn't run.\n- **Shipping silent regressions** — a prompt tweak or dependency bump quietly lowers answer quality; with no gate, it merges green and users feel it before you do. The whole point of the gate is to make a quality drop *loud* — a red build — at merge time, not a support ticket weeks later.\n\nAnd the calibration trap in between: **a gate with too-tight tolerance flaps** on non-deterministic noise (developers learn to ignore/rerun it, and it stops protecting anything), while **too-loose tolerance lets real regressions through**. Set tolerance above the eval's noise floor (which depends on set size and non-determinism), and grow the regression suite so every fixed bug stays fixed."
  },
  {
    type: "quiz",
    question: "Your team runs the eval suite manually before major releases. Between releases, answer quality slowly degrades and users complain. What's the fix?",
    choices: [
      "Run the manual eval more often and hope people remember",
      "Automate the eval as a CI gate that runs on every change and fails the build on a quality regression (below a floor or dropping more than tolerance). Manual-only eval inevitably gets skipped; an automated gate makes regressions a red build at merge time instead of a production surprise",
      "Remove the eval — it's clearly not helping",
      "Only evaluate once a quarter to save time",
    ],
    answerIndex: 1,
    explanation: "Manual evaluation depends on people remembering and inevitably gets skipped on small changes, letting quality erode merge by merge. Automating it as a CI gate that fails on a regression makes every change prove it didn't lower quality, surfacing drops at merge time rather than in production. Running the manual process more often or less often doesn't fix the reliance on human diligence.",
  },
  {
    type: "takeaways",
    items: [
      "An eval gate is an automated, thresholded quality test in CI: assert quality(system) >= baseline - tolerance over a golden set, and fail the build on a regression.",
      "Two pass conditions: stay above an absolute floor AND don't drop more than tolerance — a change can regress from a high baseline or push a marginal system below usable.",
      "Manual-only eval gets skipped (silent regressions ship); automate it so a quality drop is a red build at merge time, not a support ticket later.",
      "Tolerance must exceed the eval's noise floor (non-determinism + small sets) or the gate flaps and gets ignored; too loose and real regressions slip through.",
      "Grow a regression suite (every fixed bug adds a case) so failures can't silently return; gates catch per-change regressions, drift needs periodic re-baselining + online monitoring.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Add an eval gate to a repo's CI** — the completion criterion is 'CI runs the eval on each change.' You already have the pieces: the eval suite (from eval-methods) and GitHub Actions (from the environment/tooling topic). This unit wires them together so every push runs the eval and the gate decides pass/fail. It's the CI/CD + eval-gate milestone of the production service (Project P6).",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *CI runs the eval on each change.* Wire your eval suite into a CI workflow (e.g. GitHub Actions) that runs on push/PR, computes the score over the golden set, and fails the job when the gate fails. **Roadmap fit:** the eval suite is from `topic-eval-methods`; the CI mechanics are from `topic-py-env-tooling` (GitHub Actions, secrets); this is Project P6's `p6-04` (CI/CD + eval gate), delivered fully in the production category. Keep API keys in CI **secrets**, and make model-dependent evals affordable/cacheable (or use a small fixed sample) so the gate is fast and cheap enough to run every change. The gate logic is deterministic; the eval run may need a key from CI secrets."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a CI eval gate",
    intro: "Run the suite on every change; fail on regression. Acceptance defines done.",
    steps: [
      { order: 1, action: "Add a CI workflow that runs on push/PR: install deps, run the eval suite over the golden set, and produce a score. Store the baseline (from main) and any API key in CI secrets.", decision: "What's the baseline source (last main score / committed baseline file), and how do you keep the eval fast and cheap enough to run every change?" },
      { order: 2, action: "Apply the gate: compare the score to the baseline with your floor + tolerance; exit non-zero (fail the job) on a regression. Print WHICH cases/dimensions regressed so the failure is actionable, not just red.", expected: "A CI run that passes on no-regression changes and fails, with attribution, on a real quality drop." },
      { order: 3, action: "Make it maintainable: update the baseline when quality legitimately improves, and add a regression case for every bug you fix. Keep tolerance above the eval's noise floor so it doesn't flap.", verify: "CI runs the eval on each change, the gate fails on regressions with per-case attribution, keys are in secrets, and the regression suite/baseline are maintained." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — an automated eval gate",
    items: [
      "CI workflow runs the eval suite over the golden set on every push/PR; keys in CI secrets.",
      "Gate compares to a baseline (floor + tolerance) and fails the job on a regression.",
      "Failure output attributes WHICH cases/dimensions regressed (actionable, not just red).",
      "Baseline updated on legitimate gains; regression cases added; tolerance above the noise floor.",
    ],
  },
  {
    type: "code",
    language: "yaml",
    caption: "Reference — GitHub Actions eval gate (workflow; action versions churn — check current)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `name: eval-gate
on: [push, pull_request]           # run the eval on every change
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - name: Run eval suite + gate
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}   # key from CI secrets, never in code
        run: python eval/run_gate.py                       # exits non-zero on regression -> red build`,
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — run_gate.py: score, compare to baseline, exit non-zero on regression",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import json, sys

def run_gate(current_score, baseline_path="eval/baseline.json",
             min_score=0.8, max_drop=0.03):
    baseline = json.load(open(baseline_path))["score"]
    drop = round(baseline - current_score, 3)
    passed = current_score >= min_score and drop <= max_drop
    print(f"baseline={baseline} current={current_score} drop={drop} pass={passed}")
    if not passed:
        print("REGRESSION: quality gate failed", file=sys.stderr)
        sys.exit(1)                 # non-zero exit -> CI job fails -> merge blocked
    sys.exit(0)

# current_score = run_eval_suite(golden_set)   # your suite from topic-eval-methods
# run_gate(current_score)`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A gate you've never seen *fail* is a gate you can't trust. The completion criterion is 'the gate blocks the regression' — you deliberately introduce a quality regression and confirm the CI job goes red. Fire drills for your safety net; and along the way, learn to tell a real regression from noise.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How to test the gate (and avoid false alarms)",
    md: "Prove the gate works both ways:\n\n- **Inject a real regression** — a prompt that drops context, a worse model, a broken retrieval step — and confirm CI fails, with attribution to the regressed cases.\n- **Confirm no false alarm** — re-run an unchanged system a few times; a well-set tolerance should pass consistently despite non-deterministic wiggle. If it flaps, your tolerance is below the noise floor or your set is too small.\n- **Check significance** — before trusting a 'regression', ask whether the drop exceeds what the eval set can even resolve. On a 20-example set, one flipped example is a 0.05 change — a 0.01 'drop' is noise. Bigger sets resolve smaller real effects.\n\nA good gate fails loudly on real regressions and stays quiet on noise. If it does the opposite, fix the tolerance and grow the golden set before trusting it to guard your releases."
  },
  {
    type: "code",
    language: "python",
    caption: "Is the drop a real regression or noise? (deterministic, keyless)",
    code: `def is_real_regression(n, baseline_acc, current_acc, min_effect=0.05):
    drop = round(baseline_acc - current_acc, 3)
    resolution = round(1 / n, 3)                 # one example = 1/n on the score scale
    return {"drop": drop, "resolution": resolution,
            "trustworthy": drop >= max(resolution, min_effect)}

print(is_real_regression(20, 0.85, 0.80))    # a 0.05 drop on 20 examples
print(is_real_regression(20, 0.85, 0.84))    # a 0.01 drop on 20 examples`,
    output: `{'drop': 0.05, 'resolution': 0.05, 'trustworthy': True}
{'drop': 0.01, 'resolution': 0.05, 'trustworthy': False}`,
  },
  {
    type: "prose",
    md: "On a 20-example set the resolution is `1/20 = 0.05` — a single example flipping *is* a 0.05 change. So the 0.05 drop is right at the trustworthy edge, while the 0.01 drop is **below the noise floor** and shouldn't fail the gate. The lesson: a regression must exceed what your eval set can resolve. If you need to detect a 0.01 real drop, you need a much larger golden set — small sets can only catch big regressions.",
  },
  {
    type: "quiz",
    question: "Your CI eval on a 20-example golden set shows quality dropped from 0.85 to 0.84 after a change, and the gate fails. Is that a trustworthy block?",
    choices: [
      "Yes — any drop is a regression that must be blocked",
      "No — on 20 examples the resolution is 1/20 = 0.05, so a 0.01 drop is within noise (less than one example's worth) and shouldn't fail the gate. Either widen the tolerance above the noise floor or grow the golden set to resolve smaller real effects; blocking on sub-noise drops makes the gate flap and get ignored",
      "Yes — smaller sets are more sensitive and more trustworthy",
      "No — you should never gate on quality at all",
    ],
    answerIndex: 1,
    explanation: "A 20-example set can only resolve changes down to 1/20 = 0.05, so a 0.01 drop is below the noise floor and likely random variation rather than a real regression. Failing on sub-noise drops causes false alarms that train the team to ignore the gate. The fix is tolerance above the noise floor or a larger golden set for finer resolution — not blocking on statistically meaningless drops or abandoning gating.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — a quality/cost/latency deployment policy.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Design and fire-test a release gate policy",
    intro: "Codify what may ship, then prove the gate enforces it.",
    steps: [
      { order: 1, action: "Write the gate policy: the quality floor + tolerance (above the noise floor for your set size), plus cost and latency (p95) budgets a change must not exceed. State the baseline source and how it's updated.", expected: "A written policy with quality/cost/latency thresholds, justified against eval noise and UX budgets." },
      { order: 2, action: "Inject a regression of each kind (lower quality, higher cost, worse p95) and confirm CI blocks each, with attribution. Then confirm an unchanged system passes repeatedly (no false alarms).", decision: "Is each threshold above the noise floor yet tight enough to catch a regression users would notice?" },
      { order: 3, action: "State the drift plan: how often you re-baseline, and which online signals (from the observability dashboard) would trigger a re-evaluation between releases.", verify: "You have a written, noise-aware quality/cost/latency gate policy; you fire-tested that it blocks real regressions and doesn't flap; and you have a drift/re-baseline plan." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a defended release gate",
    items: [
      "Written policy: quality floor+tolerance (above noise floor), cost budget, p95 latency budget, baseline source.",
      "Gate fire-tested to block quality, cost, AND latency regressions with attribution.",
      "Confirmed no false alarms on an unchanged system across repeated runs.",
      "Drift plan: re-baseline cadence + online signals that trigger re-evaluation.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Fire-test the gate: inject a real regression and confirm a red build with attribution — an untested gate is not a safety net.",
      "Distinguish regression from noise: a drop must exceed the eval set's resolution (1/n) and the noise floor; small sets only catch big regressions.",
      "Tune tolerance above the noise floor so the gate fails loudly on real drops and stays quiet on non-deterministic wiggle (or teams learn to ignore it).",
      "A release policy gates quality AND cost AND p95 latency against baselines — a change that's cheaper-but-worse or same-quality-but-slower is still a regression.",
      "You've now closed the loop: frame eval → validated methods → observability → automated CI gates — the difference between a demo and a product you can trust and keep trustworthy.",
    ],
  },
];

export const content: TopicContent = {
  "unit-eval-ci-01": learn,
  "unit-eval-ci-02": build,
  "unit-eval-ci-03": review,
};
