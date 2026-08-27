import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Vision & Image Understanding" (topic-mm-vision).
// 4 units: 01 learn (vision models, image inputs, OCR, doc understanding) · 02 practice
// (analyze images) · 03 build (image→structured JSON extractor = P5 milestone p5-02)
// · 04 review (edge-case images = P5 milestone p5-04).
// Verified against OpenAI docs (developers.openai.com, current): Responses API input_image
// (URL / base64 data URL / file_id), detail low/high/original/auto, images count as tokens
// (patch/tile), vision limitations. Reuses structured-output (Batch 3). Deterministic keyless
// image-token + resize experiment. Model ids hedged; model outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Everything so far has been text in, text out. This category breaks that boundary — and **vision** is the highest-leverage place to start, because so many real features are 'read this document/screenshot and give me structured data.' The skill isn't 'send a picture to a model'; it's engineering a *reliable* extraction from an *unreliable* visual understanding, at a cost you control. That framing — reliability and cost around a fallible reader — runs through the whole topic.",
  },
  {
    type: "prose",
    md: "**Mental model: a vision-capable model reads an image the way it reads text — as tokens it predicts over — so it's a probabilistic reader, not an OCR engine or a database.** You pass an image alongside your text prompt; the model 'sees' it as image tokens and answers. That means it can describe scenes, read visible text, and answer questions about layout — but it can also misread small text, miscount objects, and confidently hallucinate a field that isn't there. Treat its output as a *draft that must be validated*, exactly like any model output.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Vision-capable model", definition: "A multimodal LLM that accepts image inputs alongside text (e.g. a GPT-4o/4.1-class or newer model). It reasons over image + text together — check your provider's current model list for vision support." },
      { term: "Image input", definition: "How you send an image: a public URL, a base64-encoded data URL (data:image/jpeg;base64,…), or an uploaded file id. Passed in the message content next to your text." },
      { term: "detail level", definition: "A parameter (low / high / original / auto) controlling how finely the image is processed. Higher detail = better small-text/OCR fidelity but more image tokens; low = cheaper, coarser." },
      { term: "Image tokens", definition: "Images are billed as tokens based on their size/detail (via patch or tile rules). Bigger images cost more and eat context — resize before sending unless you need the detail." },
      { term: "Document understanding", definition: "Using vision to read structured documents (invoices, forms, screenshots) and extract fields — the highest-value vision use case, and where structured output + validation matter most." },
    ],
  },
  {
    type: "prose",
    md: "**Sending an image (current Responses API shape).** You add an `input_image` part to the user message — via URL, base64 data URL, or an uploaded file id — next to your `input_text`:",
  },
  {
    type: "code",
    language: "python",
    caption: "Send an image for analysis (base64 data URL; model id is illustrative)",
    code: `import base64
from openai import OpenAI
client = OpenAI()   # key from env (OPENAI_API_KEY); never hard-code

def to_data_url(path: str) -> str:
    b64 = base64.b64encode(open(path, "rb").read()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

resp = client.responses.create(
    model="gpt-4o-mini",     # use your provider's CURRENT vision-capable model id
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "What store and total are on this receipt?"},
            {"type": "input_image", "image_url": to_data_url("receipt.jpg"),
             "detail": "high"},   # 'high'/'original' for small text/OCR; 'low' is cheaper
        ],
    }],
)
print(resp.output_text)   # representative; a vision model's text is non-deterministic`,
  },
  {
    type: "prose",
    md: "Notes that matter in production: images can be a **URL, a base64 data URL, or a file id**; the **`detail`** parameter trades OCR fidelity for cost (use `high`/`original` for small text, `low` for coarse understanding); supported types are PNG/JPEG/WEBP/non-animated GIF. And critically — **images are billed as tokens**, so a giant screenshot is expensive and can crowd your context. Resize before sending unless you truly need the resolution.",
  },
  {
    type: "code",
    language: "python",
    caption: "Why huge images cost more — patch-based token estimate (deterministic, keyless)",
    code: `import math

def image_tokens_estimate(width, height, max_dim=2048):
    # Vision models resize to fit a max dimension (preserving aspect, not enlarging),
    # then bill ~one token per 32x32 patch. Bigger image -> more patches -> more cost.
    scale = min(1.0, max_dim / max(width, height))
    w, h = int(width * scale), int(height * scale)
    return math.ceil(w / 32) * math.ceil(h / 32)

print(image_tokens_estimate(512, 512))     # small
print(image_tokens_estimate(1024, 1024))   # 4x the pixels -> 4x the patches
print(image_tokens_estimate(4096, 4096))   # resized to 2048x2048 first, then patched`,
    output: `256
1024
4096`,
  },
  {
    type: "prose",
    md: "A 512² image is ~256 patch-tokens; 1024² is ~1024; a 4096² image is resized to 2048² first and still costs ~4096. **Sending the original 12-megapixel photo when a 1024px crop would do is a silent 10–40× cost multiplier** — and it doesn't improve accuracy once the model has enough detail. Resize/crop to the smallest size that preserves the text you need.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Assuming perfect OCR — vision reading is fallible in specific, predictable ways",
    md: "A vision model is **not** a deterministic OCR engine. Its documented weak spots (design around them):\n\n- **Small / dense text** — enlarge or crop the region; use higher `detail`. Tiny fonts are misread.\n- **Non-Latin scripts** — accuracy drops on e.g. CJK; verify critical fields.\n- **Rotation / skew** — deskew before sending; rotated text is misread.\n- **Counting** — object/line counts are *approximate*, not exact.\n- **Spatial precision** — exact coordinates, table cell alignment, and 'which column' can be wrong.\n- **Graphs/styled lines** — dashed vs solid, overlapping series confuse it.\n- **Hallucinated fields** — it may 'fill in' a plausible value for a field that's blank or absent.\n\nThe engineering response: **never trust an extracted field without validation.** Constrain output to a schema, validate types/ranges/required fields, flag low-confidence or missing values for human review, and test on real edge-case documents (the review unit). 'The model read it, so it's right' is how extraction pipelines ship wrong data."
  },
  {
    type: "quiz",
    question: "Your invoice extractor works on clean test PDFs but produces wrong totals on real photographed receipts. Before changing the model, what should you check first?",
    choices: [
      "Nothing — the model is simply not good enough",
      "The INPUT: is the image high-resolution enough for the small total text (detail level / crop), is it deskewed/unrotated, and are you validating the extracted total against a schema/range rather than trusting it? Real-world image quality and missing validation cause most extraction errors, not the model choice",
      "Immediately switch to a larger model and retry",
      "Send the full 12-megapixel original at maximum detail every time",
    ],
    answerIndex: 1,
    explanation: "Most extraction failures on real media are input-quality and validation problems: low-res or skewed small text, wrong detail level, and no schema validation to catch a mis-read total. Fix the input (crop/deskew/appropriate detail) and validate outputs before assuming the model is the bottleneck. Blindly upsizing the model or sending huge images wastes cost without addressing the cause.",
  },
  {
    type: "quiz",
    question: "A teammate sends every document image at full original resolution with detail='original' to 'maximize accuracy.' What's the likely result?",
    choices: [
      "Strictly better accuracy at no downside",
      "Large, often unnecessary token cost (and context bloat) with little or no accuracy gain once the model already has enough detail — images are billed as tokens by size/detail. Right-size the image and detail to the text you actually need to read",
      "The API will reject all images",
      "Faster responses",
    ],
    answerIndex: 1,
    explanation: "Images are billed as tokens scaled by dimensions and detail, so full-resolution + original detail multiplies cost and can crowd context without improving accuracy beyond the point the model can already read the content. Match resolution and detail to the smallest that preserves the needed text — accuracy plateaus while cost keeps climbing.",
  },
  {
    type: "takeaways",
    items: [
      "A vision-capable model reads images as tokens — a probabilistic reader, not deterministic OCR; validate its output like any model output.",
      "Send images via URL, base64 data URL, or file id, alongside text; use the detail parameter (high/original for small text/OCR, low for coarse) to trade fidelity for cost.",
      "Images are billed as TOKENS by size/detail — resize/crop to the smallest that preserves needed text; full-res originals are a silent cost multiplier.",
      "Vision fails predictably: small/non-Latin/rotated text, counting, spatial precision, styled graphs, and hallucinated fields — design around these.",
      "Document understanding (image→fields) is the top use case; pair it with structured output + validation, never raw trust.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Analyze real images and learn what vision does well and badly. If you have an API key, run these; if not, reason precisely about detail level, cost, and where the model will struggle — the judgement transfers.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Extract useful info from images (guided)",
    intro: "Probe the model's strengths and failure modes deliberately.",
    steps: [
      { order: 1, action: "Send 3 different images (a clean document, a photographed receipt, a chart/graph) with a specific question each ('what is the total?', 'what does this chart show?'). Compare quality across image types.", expected: "Clean documents read well; photographed/small-text and charts are shakier — you can see the failure modes from the lesson." },
      { order: 2, action: "Take the hardest image and try it at detail='low' vs 'high'/'original'. Note both the answer quality AND the (estimated) token cost difference using the patch estimator.", decision: "For YOUR image, what's the smallest resolution + detail that still reads the field you need correctly? Where does more detail stop helping?" },
      { order: 3, action: "Deliberately ask for a field that ISN'T in the image. See whether the model refuses or hallucinates a plausible value — the core reason to validate.", verify: "You observed vision's strengths/failure modes, the detail-vs-cost tradeoff, and at least one hallucinated/absent field that validation must catch." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You extracted info from clean, photographed, and chart images and compared quality.",
      "You compared detail levels for quality vs (estimated) token cost.",
      "You provoked a hallucinated/absent field to see why validation is required.",
      "You can state the smallest resolution+detail that still reads your target field.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build an image-to-JSON document extractor** that returns *validated* structured data — Project **P5, milestone p5-02** ('Structured extraction'). This is where vision becomes a real feature: an invoice/receipt/form image in, a typed, validated record out. It combines vision with the structured-output + validation skills you already have.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P5 milestone p5-02) + P5 evolution",
    md: "p5-02 completion: *media is turned into validated structured data*. Combine a **vision model** with **structured output** (a schema the model fills) and **validation** (types, ranges, required fields) — reuse the structured-output topic's approach. **P5 evolution:** this extractor is the 'structured extraction' pillar of the multimodal app; the vision robustness pass (p5-04, next unit) hardens it, and it can feed the multimodal-RAG pillar (p5-03). Keep it a clean, swappable component. Generation needs a key — read it from the environment; keep the schema + validation logic keyless-testable."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — validated image→JSON extractor",
    intro: "Acceptance defines done. Extract, then VALIDATE — don't trust raw output.",
    steps: [
      { order: 1, action: "Define a schema for your document type (e.g. receipt: merchant, date, total, line_items[]). Send the image to a vision model with structured output so it returns JSON matching the schema. Right-size the image/detail for the small text you must read.", decision: "Which fields are critical (must be correct or flagged) vs optional, and what does the model return when a field is missing or unreadable?" },
      { order: 2, action: "VALIDATE the extracted data: required fields present, types correct, values in plausible ranges (e.g. total ≥ 0, date parseable). Flag low-confidence/missing/failed-validation fields for review instead of silently accepting them.", expected: "Output is a validated record; bad or missing fields are flagged, not silently wrong." },
      { order: 3, action: "Handle failure paths: an unreadable image, a non-document image, or a hallucinated field should produce a clear 'needs review' signal, not a confident wrong record. Read the API key from the environment.", verify: "The extractor turns document images into schema-validated JSON, flags anything uncertain/missing/invalid for review, and never emits a confident record it couldn't validate." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P5 milestone p5-02",
    items: [
      "Image → JSON matching a defined schema via a vision model + structured output.",
      "Extracted data is validated (required fields, types, ranges); failures flagged for review.",
      "Unreadable/non-document/hallucinated cases produce 'needs review', not a confident wrong record.",
      "Image/detail right-sized for the target text; API key from environment.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — vision extraction + validation (validation is keyless-testable)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from pydantic import BaseModel, Field, ValidationError
from datetime import date

class Receipt(BaseModel):
    merchant: str
    date: date
    total: float = Field(ge=0)                 # range check: total can't be negative
    line_items: list[str] = []

def validate_extraction(raw: dict) -> dict:
    # Runs with NO model — unit-test your validation on hand-made dicts.
    try:
        rec = Receipt(**raw)
    except ValidationError as e:
        return {"ok": False, "needs_review": True, "errors": e.errors()}
    flags = []
    if rec.total == 0:
        flags.append("total is 0 — verify")     # plausible-but-suspicious -> flag
    if not rec.line_items:
        flags.append("no line items extracted")
    return {"ok": True, "record": rec.model_dump(), "needs_review": bool(flags), "flags": flags}

# Deterministic checks (no API key):
print(validate_extraction({"merchant": "Cafe", "date": "2026-01-05", "total": 12.5}))
print(validate_extraction({"merchant": "Cafe", "date": "2026-01-05", "total": -3}))
# {'ok': True, 'record': {...}, 'needs_review': False, 'flags': []}
# {'ok': False, 'needs_review': True, 'errors': [...]}   # negative total rejected

def extract_receipt(client, image_data_url):   # the model half (needs a key)
    resp = client.responses.parse(
        model="gpt-4o-mini",                    # current vision model id
        input=[{"role": "user", "content": [
            {"type": "input_text", "text": "Extract the receipt fields."},
            {"type": "input_image", "image_url": image_data_url, "detail": "high"}]}],
        text_format=Receipt)                    # structured output -> typed object
    return validate_extraction(resp.output_parsed.model_dump())`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The difference between a demo and a product is behavior on *bad* inputs. This unit tests the extractor on edge-case images — the completion criterion is 'extractor degrades gracefully' (Project P5 milestone p5-04, the robustness pass).",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Edge-case checklist — throw hard images at your extractor",
    md: "For each, the correct behavior is a clear 'needs review' or partial result with flags — **never** a confident wrong record:\n\n- **Blurry / low-resolution** small text → fields unreadable → flagged, not guessed.\n- **Rotated / skewed** document → deskew or flag.\n- **Partial / cropped** document (missing fields) → return present fields, flag missing.\n- **Wrong document type** (a photo of a cat where a receipt was expected) → detect and refuse, don't fabricate a receipt.\n- **Glare / shadow / crumpled** paper → degraded fields flagged.\n- **Multiple documents** in one image → handle or flag ambiguity.\n- **Empty field** the schema expects → null + flag, not a hallucinated value.\n\nIf any of these yields a confident but wrong record, that's the bug to fix (better validation, confidence flags, or refusal) before shipping."
  },
  {
    type: "quiz",
    question: "On a blurry receipt where the total is unreadable, your extractor confidently returns total=42.00 (a hallucination). What's the correct fix?",
    choices: [
      "Accept it — the model is usually right",
      "Make the pipeline degrade gracefully: detect low readability / low confidence and return the total as 'needs review' (or null + flag) instead of a fabricated number. Combine validation (range/format checks) with a confidence/readability signal so uncertain fields are surfaced, not guessed",
      "Always trust the model and log nothing",
      "Send the image 10 times and average the numbers",
    ],
    answerIndex: 1,
    explanation: "A confident hallucination on an unreadable field is the exact failure the robustness pass must eliminate. The fix is graceful degradation: surface uncertainty (readability/confidence + validation) and flag the field for review rather than emitting a fabricated value. Averaging repeated hallucinations doesn't make them correct; the pipeline must know when it doesn't know.",
  },
  {
    type: "quiz",
    question: "You feed the receipt extractor a photo that isn't a receipt at all. It returns a plausible-looking receipt JSON. Is that acceptable?",
    choices: [
      "Yes — as long as the JSON is well-formed",
      "No — well-formed but fabricated data is worse than an error because it looks trustworthy. The extractor should detect that the image isn't the expected document type and refuse/flag, rather than hallucinate a schema-valid record. Schema-valid ≠ correct",
      "Yes — the schema validated, so it's fine",
      "No — but only if the JSON is malformed",
    ],
    answerIndex: 1,
    explanation: "Schema validity only proves shape, not truth — a fabricated receipt from a non-receipt image passes the schema yet is entirely wrong, and its plausibility makes it dangerous. Robust extraction includes a document-type/appropriateness check so out-of-domain inputs are refused or flagged, not silently turned into confident records.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — harden the extractor against edge cases.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Make the extractor degrade gracefully on hard inputs",
    intro: "Prove robustness across the edge-case checklist.",
    steps: [
      { order: 1, action: "Run the edge-case checklist (blurry, rotated, partial, wrong-type, glare, multi-doc, empty-field) against your extractor. Record what it does for each.", expected: "A table of input → behavior; ideally every hard case flags/refuses rather than emitting a confident wrong record." },
      { order: 2, action: "For any case where it confidently returns wrong data, add a defense (readability/confidence flag, document-type check, stricter validation, or refusal) and re-test.", decision: "What single signal best separates 'confidently correct' from 'confidently wrong' for your documents, and how do you surface it to a caller?" },
      { order: 3, action: "Write the extractor's 'graceful degradation' contract: what it returns for unreadable, wrong-type, partial, and empty-field inputs.", verify: "Every edge case flags/refuses instead of fabricating; you added defenses for any gaps; you can state the degradation contract explicitly." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Every edge-case input flags or refuses rather than emitting a confident wrong record.",
      "Defenses added for any case that produced confident-but-wrong output.",
      "A document-type/appropriateness check rejects out-of-domain images.",
      "You can state the extractor's graceful-degradation contract.",
    ],
  },
];

export const content: TopicContent = {
  "unit-mm-vision-01": learn,
  "unit-mm-vision-02": practice,
  "unit-mm-vision-03": build,
  "unit-mm-vision-04": review,
};
