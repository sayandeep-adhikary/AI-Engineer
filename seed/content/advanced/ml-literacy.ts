import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Just-Enough ML Literacy" (topic-adv-ml-literacy).
// 2 units: 01 learn (train/val/test, features/labels, classification vs regression, precision/
// recall/F1, calibration, class imbalance, overfitting/underfitting, embeddings origins,
// distribution shift, baselines, leakage, error analysis, metric-matches-decision) · 02 review
// (explain-back without derivations). commonMistakes: Diving into heavy math not needed for the role.
// masteryCriteria: explain-back the key ideas without derivations. Deterministic keyless prf1/overfit/metric.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "As an AI engineer you don't need to derive backpropagation — but a little classical ML literacy sharpens every decision you make. When you read a model card, choose a metric, debug a fine-tune, or explain why a benchmark doesn't match production, you're using ML concepts whether you name them or not. This topic gives you **just enough** to reason well: the vocabulary and intuitions behind training, evaluation, and generalization — no math derivations, no researcher path. It's the conceptual bedrock under everything you've built.",
  },
  {
    type: "prose",
    md: "**Mental model: machine learning fits a function to data, and almost every ML pitfall is really a question about whether your evaluation reflects reality.** A model learns patterns from training data; the only thing that matters is whether those patterns generalize to new, unseen data — which is why you split data, watch for overfitting, guard against leakage, and pick metrics that match the real decision. You already met the applied versions (fine-tuning overfit, RAG eval, distribution shift in production); this topic names the underlying ideas so your intuition is grounded, not cargo-culted.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Train / validation / test", definition: "Three disjoint data splits: train (fit the model), validation (tune choices like hyperparameters), test (a held-out final check of generalization, touched once). Reusing test data for tuning contaminates it and inflates your estimate. The whole point is an honest measure of performance on data the model never learned from." },
      { term: "Features / labels; classification vs regression", definition: "Features are the inputs a model learns from; labels are the target it predicts. Classification predicts a category (spam / not spam); regression predicts a number (a price). The task type determines the right metrics — accuracy/precision/recall for classification, error magnitude for regression." },
      { term: "Precision / recall / F1", definition: "For classification: precision = of the items you flagged positive, what fraction truly are (cost of false positives); recall = of the truly positive items, what fraction you caught (cost of false negatives); F1 = their harmonic mean. Which matters depends on the decision — a cancer screen weights recall, a spam filter weights precision." },
      { term: "Overfitting / underfitting", definition: "Overfitting: the model memorizes training data (high train accuracy, low validation accuracy — a large gap). Underfitting: the model is too simple to capture the pattern (low accuracy on both). You met overfitting in fine-tuning; the signal is the train-vs-validation gap." },
      { term: "Calibration; class imbalance", definition: "Calibration: whether a model's confidence matches reality (of things it says are 90% likely, are ~90% actually so?). Class imbalance: when one class dominates (99% negatives), so accuracy is misleading — a model that always says 'negative' is 99% accurate and useless. Imbalance is why you use precision/recall, not accuracy." },
      { term: "Leakage; distribution shift; baseline", definition: "Leakage: information from the test set (or the future) sneaks into training, inflating scores that collapse in production (you met this in fine-tuning: dedup before split). Distribution shift: production data drifts from training data, so quality decays (you met this in evaluation). Baseline: the simplest reasonable model (majority class, keyword match) — always compare against it, or you can't tell if your fancy model earns its complexity." },
    ],
  },
  {
    type: "prose",
    md: "**Precision, recall and F1 make 'accuracy' honest — a model can be very precise and nearly useless:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Precision / recall / F1 from a confusion matrix (deterministic, keyless)",
    code: `def prf1(tp, fp, fn):
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return {"precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3)}

print(prf1(tp=80, fp=20, fn=40))
print(prf1(tp=10, fp=0, fn=90))   # perfect precision, terrible recall`,
    output: `{'precision': 0.8, 'recall': 0.667, 'f1': 0.727}
{'precision': 1.0, 'recall': 0.1, 'f1': 0.182}`,
  },
  {
    type: "prose",
    md: "The second classifier has **perfect precision** (everything it flagged was correct) but catches only 10% of the real positives — its F1 is a dismal 0.182. If you'd reported precision alone, it would look flawless; F1 exposes it. This is why a single number lies (the evaluation category's lesson, now with the ML vocabulary): the right metric depends on which error is costly. A related trap is train-vs-validation gap — the overfitting signal you met in fine-tuning:",
  },
  {
    type: "code",
    language: "python",
    caption: "Overfitting vs underfitting from the train/validation gap (deterministic, keyless)",
    code: `def diagnose(train_acc, val_acc, gap_threshold=0.1):
    gap = round(train_acc - val_acc, 3)
    if gap > gap_threshold and train_acc > val_acc:
        return {"gap": gap, "diagnosis": "overfitting"}
    if train_acc < 0.7 and val_acc < 0.7:
        return {"gap": gap, "diagnosis": "underfitting"}
    return {"gap": gap, "diagnosis": "ok"}

print(diagnose(0.98, 0.72))
print(diagnose(0.62, 0.60))
print(diagnose(0.88, 0.85))`,
    output: `{'gap': 0.26, 'diagnosis': 'overfitting'}
{'gap': 0.02, 'diagnosis': 'underfitting'}
{'gap': 0.03, 'diagnosis': 'ok'}`,
  },
  {
    type: "prose",
    md: "A big train-minus-validation gap (0.26) with high train accuracy means the model memorized rather than generalized — overfitting. Low accuracy on both (0.62/0.60) means it never learned the pattern — underfitting. A small gap with good scores is healthy. You don't need the math to use this: it's the same diagnostic you applied to a fine-tune, now recognizable anywhere. That's what 'literacy' buys — you can read the situation and know what to try (more/cleaner data for overfitting, a more capable model or better features for underfitting).",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Diving into heavy math not needed for the role",
    md: "The commonMistake this topic explicitly avoids: deciding that 'real' understanding requires deriving gradients, coding backprop, or studying optimization theory. For an AI engineer, that's usually a detour. What actually improves your decisions is **conceptual** literacy:\n\n- knowing that models generalize only as well as your evaluation is honest (splits, leakage, distribution shift);\n- knowing which metric matches which decision (precision vs recall vs F1; why accuracy lies under imbalance);\n- knowing the failure signals (overfitting = train/val gap; underfitting = low on both; miscalibration = confidence doesn't match reality);\n- knowing that embeddings are *learned representations* (why same-model matters, from the embeddings category).\n\nGo deeper into the math only when a specific problem demands it (you're training models, not just using them). The literacy bar is: can you explain the idea, and its engineering consequence, without a derivation? That's the mastery criterion — and it's enough to make good calls without becoming a researcher."
  },
  {
    type: "quiz",
    question: "A fraud classifier reports 99.2% accuracy and the team wants to ship it. Fraud is 0.8% of transactions. What ML-literacy red flag should stop you, and what should you check instead?",
    choices: [
      "No red flag — 99.2% accuracy is excellent, ship it",
      "Class imbalance makes accuracy misleading: a model that predicts 'not fraud' for everything is 99.2% accurate and catches zero fraud. Check precision and recall (and F1) on the fraud class, compare against the majority-class baseline, and pick the metric that matches the decision (usually recall — missing fraud is costly). Accuracy on an imbalanced problem tells you almost nothing",
      "The problem is the model is too small — use a bigger one",
      "Retrain on more data and accuracy will fix itself",
    ],
    answerIndex: 1,
    explanation: "With fraud at 0.8%, a trivial 'always not-fraud' model scores 99.2% accuracy while catching no fraud, so accuracy is meaningless under this imbalance. ML literacy says to evaluate precision and recall (and F1) on the minority class, compare to the majority-class baseline, and choose the metric matching the decision — here recall, since missed fraud is expensive. Model size or more data don't address the fact that the chosen metric doesn't reflect the real objective.",
  },
  {
    type: "takeaways",
    items: [
      "ML fits a function to data; almost every ML pitfall is really 'does my evaluation reflect reality?' — splits, leakage, distribution shift, and the right metric.",
      "Precision (false-positive cost) vs recall (false-negative cost) vs F1 make accuracy honest — a perfectly precise model can catch only 10% of positives (F1 0.182).",
      "Overfitting shows as a train-vs-validation gap; underfitting as low accuracy on both — the same diagnostic you used on a fine-tune, generalized.",
      "Under class imbalance, accuracy lies: always compare against a baseline (majority class) and pick the metric that matches the decision.",
      "Literacy, not derivations: embeddings are learned representations, calibration is confidence matching reality — go deeper into math only when a specific problem demands it.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'you can teach the ideas without math.' The best test of literacy is explaining a concept — and its engineering consequence — plainly. So this unit is explain-back: for each idea, could you tell a teammate what it means and why it changes a decision, in a sentence, no equations? The synthesis payoff is that these concepts explain things you already do across the roadmap.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "The explain-back test",
    md: "For each concept, aim for a one-breath explanation plus its consequence:\n\n- **Train/val/test** — 'separate data to fit, tune, and honestly test; reusing test data fakes your score.'\n- **Overfitting** — 'memorized the training data; great on it, bad on new data — the train/val gap gives it away.'\n- **Precision vs recall** — 'precision = don't cry wolf; recall = don't miss the wolf; the costly error decides which you optimize.'\n- **Calibration** — 'when it says 90%, is it right 90% of the time? matters when you act on the confidence.'\n- **Distribution shift** — 'the world moved away from your training data, so quality decays — re-evaluate and re-baseline.'\n- **Leakage** — 'test info leaked into training; the score is a lie that collapses in production.'\n- **Baseline** — 'the dumb model (majority class / keyword); if you can't beat it, your complexity isn't earning its keep.'\n\nIf you can say each of these and name a place in the roadmap it applied (fine-tuning, RAG eval, embeddings, production monitoring), you have the literacy this category targets — no derivations required."
  },
  {
    type: "prose",
    md: "**The unifying idea to explain-back: the metric must match the decision — literacy is knowing which one, and why:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Metric must match the decision (deterministic, keyless)",
    code: `def right_metric(problem, metric):
    # The metric must match the real cost of each kind of error.
    good = {
        "cancer_screening": "recall",     # missing a positive is very costly
        "spam_filter": "precision",       # flagging a real email is very costly
        "balanced_classes": "accuracy",
    }
    want = good.get(problem, "?")
    return "ok" if want == metric else "mismatch: use " + want

print(right_metric("cancer_screening", "accuracy"))
print(right_metric("cancer_screening", "recall"))
print(right_metric("spam_filter", "precision"))`,
    output: `mismatch: use recall
ok
ok`,
  },
  {
    type: "prose",
    md: "Cancer screening measured by accuracy is a mismatch — a missed cancer (false negative) is catastrophic, so you optimize **recall**. A spam filter optimizes **precision** — flagging a real, important email (false positive) is the costly error. Balanced classes can use accuracy. There's no universally 'best' metric; there's the one that matches the cost of each error for *this* decision. Being able to explain that — and having done it for real in the RAG-eval and fine-tuning topics — is exactly the literacy the mastery criterion asks for: enough to choose well, without a single derivation.",
  },
  {
    type: "quiz",
    question: "A teammate says 'our model has 0.91 AUC, so it's production-ready.' Using ML literacy, what's the most useful pushback?",
    choices: [
      "None — a high AUC means the model is ready",
      "A single aggregate metric isn't readiness: ask whether it matches the decision (is the operating threshold's precision/recall acceptable for the actual costs?), whether it's measured on a leak-free, representative test set (or will distribution shift erode it?), how it compares to a simple baseline, and whether the confidence is calibrated if you act on it. Literacy means interrogating the evaluation, not accepting one number",
      "Switch to accuracy instead of AUC and re-measure",
      "Add more training data until AUC reaches 0.95",
    ],
    answerIndex: 1,
    explanation: "A good aggregate score doesn't establish readiness: you need the precision/recall at the chosen threshold to match the real error costs, a leak-free and representative test set, a comparison to a simple baseline, and calibration if decisions use the confidence. ML literacy is interrogating whether the evaluation reflects the production decision, not trusting a single number. Swapping metrics or chasing a higher score without checking these misses the point.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — teach the ideas back and tie them to the roadmap.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Explain-back the core ML concepts",
    intro: "Prove literacy by teaching, not reciting. Not completion-gated — this is the mastery criterion.",
    steps: [
      { order: 1, action: "For each concept (train/val/test, overfitting/underfitting, precision/recall/F1, calibration, class imbalance, leakage, distribution shift, baseline, embeddings-as-representations), write a one-sentence plain explanation AND its engineering consequence.", expected: "A concept glossary in your own words — no equations — each with a 'so what.'" },
      { order: 2, action: "Tie each concept to where it already appeared in the roadmap (fine-tuning overfit/leakage, RAG/eval metrics, embeddings, production distribution shift/monitoring). Confirm you can name a concrete instance.", decision: "For any concept you can't tie to a real decision, is your understanding actually applied — or just memorized? Revisit it." },
      { order: 3, action: "Do a live explain-back: teach two or three of the ideas to someone (or write them as if for a teammate), including the metric-matches-the-decision principle. Note any you couldn't explain cleanly and fix them.", verify: "You can teach the key ML ideas plainly, each with an engineering consequence and a roadmap instance, and articulate that the metric must match the decision — literacy without derivations, per the mastery criterion." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — demonstrated ML literacy",
    items: [
      "Each core concept explained in one plain sentence plus its engineering consequence (no math).",
      "Each concept tied to a concrete roadmap instance (fine-tuning, RAG/eval, embeddings, production monitoring).",
      "The metric-matches-the-decision principle articulated with examples (recall for screening, precision for spam).",
      "Any concept you couldn't explain cleanly identified and shored up.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Literacy is teachability: if you can explain a concept and its consequence in a sentence without math, you understand it well enough for the role.",
      "The unifying principle: the metric must match the decision (recall for cancer screening, precision for spam) — there is no universally best metric.",
      "A single aggregate number is never readiness — interrogate the evaluation (threshold, leakage, representativeness, baseline, calibration).",
      "Tie every concept to a real roadmap instance (fine-tuning, RAG eval, embeddings, production shift) — applied understanding, not recitation.",
      "This grounds the intuition under everything you built; go deeper into the math only when a specific problem (training models) demands it.",
    ],
  },
];

export const content: TopicContent = {
  "unit-adv-ml-literacy-01": learn,
  "unit-adv-ml-literacy-02": review,
};
