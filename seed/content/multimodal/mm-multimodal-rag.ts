import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Multimodal RAG" (topic-mm-multimodal-rag).
// 4 units: 01 learn (multimodal retrieval, figures/tables, multimodal embeddings) · 02 build
// (PDF-with-figures RAG = P5 milestone p5-03) · 03 review (compare vs text-only RAG) · 04
// project (Deliver Project P5 = capstone). Reuses Batch 6 RAG pipeline + Batch 9 vision.
// Deterministic keyless text-only-vs-multimodal retrievability experiment. All P5 milestones
// map to THIS category. Model/embedding outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You built a text RAG pipeline in the RAG category. It has a silent blind spot: real documents aren't just paragraphs. Invoices have tables, reports have charts, manuals have diagrams — and a naive text extractor either drops that content or reduces it to a useless stub like 'See Table 2.' **Multimodal RAG** is the fix: make the non-text content *retrievable and answerable* so the pipeline stops silently losing information.",
  },
  {
    type: "prose",
    md: "**Mental model: retrieval can only find what you turned into something searchable — so multimodal RAG is about not throwing figures and tables away during ingestion.** Your text RAG embeds text chunks and matches them to a query. A figure or table that never became searchable text (or a searchable embedding) simply can't be retrieved — the answer is in the document but invisible to the pipeline. The whole topic is ingestion strategy: how do you capture visual content so it can be found and cited?",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Multimodal RAG", definition: "RAG where the corpus includes non-text content (figures, tables, diagrams, scanned pages). Ingestion captures that content so it's retrievable and answers can cite it." },
      { term: "Extract-and-describe", definition: "During ingestion, use a vision model to convert each figure/table into descriptive text (and structured table text), then embed/index that text with your existing text pipeline. Simplest, reuses your text RAG." },
      { term: "Render-page-to-image", definition: "Render whole PDF pages as images and, at answer time, pass the relevant page image(s) to a vision model alongside the question — preserves layout, no lossy text extraction. Higher token cost." },
      { term: "Multimodal embeddings", definition: "Embed images and text into the SAME vector space so an image and a text query are directly comparable — enables image↔text retrieval without a describe step. Needs a multimodal embedding model." },
      { term: "Table/figure handling", definition: "Tables become structured text (rows/cells, not a flattened blob); figures become captions/descriptions. The goal: the numbers and relationships in them become searchable and citable." },
    ],
  },
  {
    type: "prose",
    md: "**Three ingestion strategies** (pick by cost, fidelity, and effort):\n\n1. **Extract-and-describe** — a vision model turns each figure/table into text; you embed that text with your *existing* text RAG. Cheapest to adopt, reuses everything you built, and works well when the answer is *in* the figure's content. (This is the recommended path for P5.)\n2. **Render-page-to-image** — keep pages as images; at answer time send the retrieved page image(s) to a vision model with the question. Highest fidelity (nothing is lost to extraction) but more tokens per query.\n3. **Multimodal embeddings** — embed images and text into one shared space so a text query can retrieve an image directly. Most elegant for image-heavy corpora, but needs a multimodal embedding model and infra.\n\nMost teams start with extract-and-describe because it turns a multimodal problem back into the text RAG they already trust.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Dropping non-text content silently — the failure that hides in plain sight",
    md: "The dangerous part of this failure is that it's *silent*: ingestion 'succeeds,' the index builds, queries return answers — but any question whose answer lives in a table or figure gets a confident 'I don't know' or a wrong answer, because that content was never made retrievable. The demo (text-heavy pages) looks fine; the first real question about a chart fails.\n\nDefenses:\n\n- **Detect** figures/tables during ingestion instead of letting a text extractor skip them.\n- **Convert** them (extract-and-describe, or keep the page image) so their content is searchable.\n- **Preserve table structure** — 'Q2 revenue: \\$1.5M' must survive as text/cells, not collapse to 'See Table 2.'\n- **Log** what was dropped so you can measure the blind spot (the review unit quantifies it).\n\n'The pipeline returned an answer' is not the same as 'the pipeline used the whole document.'"
  },
  {
    type: "code",
    language: "python",
    caption: "Why non-text content must be captured — retrievability (deterministic, keyless)",
    code: `# A tiny stand-in for retrieval: a chunk is 'retrievable' for a query if the query
# terms appear in the chunk's searchable text.
def retrievable(query_terms, chunk):
    return all(t in chunk.lower() for t in query_terms)

# Text-only ingestion left the table as a useless stub:
raw_text_chunk = "See Table 2 for quarterly revenue."
# Extract-and-describe turned the TABLE into searchable structured text:
table_as_text = "Table 2 | Q1 revenue: $1.2M | Q2 revenue: $1.5M | Q3 revenue: $1.8M"

q = ["revenue", "q2"]
print(retrievable(q, raw_text_chunk))   # text-only RAG: the answer is invisible
print(retrievable(q, table_as_text))    # multimodal RAG: the answer is retrievable`,
    output: `False
True`,
  },
  {
    type: "prose",
    md: "The query 'Q2 revenue' is **unretrievable** from the text-only stub ('See Table 2') and **retrievable** once the table is converted to searchable text — a concrete picture of the multimodal advantage. Same document, same query; the only difference is whether ingestion captured the table. That's the entire point of the topic.",
  },
  {
    type: "quiz",
    question: "Your text RAG over financial PDFs answers narrative questions well but says 'I don't know' whenever the answer is a number inside a table. What's happening and what's the fix?",
    choices: [
      "The LLM is too small; upgrade it",
      "Ingestion silently dropped the tables (or reduced them to stubs), so the numbers were never made retrievable. Add a multimodal ingestion step — extract-and-describe each table into structured searchable text (or keep the page image for a vision model at answer time) — so table content can be retrieved and cited",
      "Financial numbers can't be retrieved by any RAG system",
      "Re-embed the same text chunks with a bigger embedding model",
    ],
    answerIndex: 1,
    explanation: "The retriever can only find content that was made searchable; tables skipped or flattened during ingestion are invisible regardless of model size. The fix is a multimodal ingestion step — convert tables to structured text (extract-and-describe) or retain page images for a vision model — so the numbers become retrievable and citable. A bigger LLM or re-embedding the same lossy text changes nothing.",
  },
  {
    type: "quiz",
    question: "You want the fastest path to add figure/table support to an existing, trusted text RAG pipeline. Which strategy fits, and why?",
    choices: [
      "Multimodal embeddings — rebuild the whole vector store around a multimodal embedding model immediately",
      "Extract-and-describe — use a vision model at ingestion to convert each figure/table into descriptive/structured text, then embed it with the EXISTING text pipeline. It reuses everything you already trust and turns the multimodal problem back into text RAG",
      "Drop all figures and tables to keep the pipeline text-only",
      "Render every page to an image and send all pages to a vision model on every query",
    ],
    answerIndex: 1,
    explanation: "Extract-and-describe converts visual content to text at ingestion, so your existing embeddings, index, and retrieval keep working unchanged — the lowest-friction adoption path. Rebuilding around multimodal embeddings is heavier infra, dropping figures is the original bug, and sending all pages to a vision model per query is needlessly expensive. Start with the strategy that reuses what you trust.",
  },
  {
    type: "takeaways",
    items: [
      "Retrieval only finds what ingestion made searchable — multimodal RAG is fundamentally about not discarding figures/tables during ingestion.",
      "Three strategies: extract-and-describe (vision→text, reuses your text RAG — start here), render-page-to-image (high fidelity, more tokens), multimodal embeddings (shared image/text space).",
      "Dropping non-text content is a SILENT failure: ingestion 'succeeds' but table/figure questions fail — detect, convert, preserve table structure, and log what's dropped.",
      "Tables must become structured searchable text ('Q2 revenue: $1.5M'), not stubs ('See Table 2'); figures become captions/descriptions.",
      "Multimodal RAG reuses your text RAG pipeline (Batch 6) plus your vision skill (this category) — it's assembly, not a new paradigm.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a RAG app over a PDF that contains figures and tables**, answering questions grounded in that non-text content — Project **P5, milestone p5-03** ('Multimodal RAG'). This is where your text RAG pipeline and your new vision skill combine into one system.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P5 milestone p5-03) + P5 evolution",
    md: "p5-03 completion: *the app answers questions grounded in figures/tables*. Reuse your **Batch 6 RAG pipeline** (chunk → embed → retrieve → generate with citations) and add a **multimodal ingestion step** (extract-and-describe: a vision model converts figures/tables to searchable structured text; or keep page images for a vision model at answer time). Answers must **cite** the figure/table they came from. **P5 evolution:** p5-03 is the 'multimodal retrieval' pillar; it can consume the vision extractor (p5-02) and feeds the final P5 delivery (next unit). Keys from the environment; the ingestion/retrieval logic is testable on hand-made table text without a key."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — PDF-with-figures RAG",
    intro: "Reuse text RAG; add multimodal ingestion. Acceptance defines done.",
    steps: [
      { order: 1, action: "Ingestion: for each figure/table in the PDF, use a vision model to produce searchable text (describe figures; convert tables to structured row/cell text — preserve the numbers). Embed and index alongside the normal text chunks. Log anything you couldn't capture.", decision: "Which strategy fits your corpus — extract-and-describe (reuse text RAG) or keep page images for answer-time vision — and how do you preserve table structure?" },
      { order: 2, action: "Retrieval + generation: on a query, retrieve across both text and figure/table content, generate a grounded answer, and CITE the specific figure/table used. Reuse your Batch 6 retrieval + citation approach.", expected: "Questions whose answers live in a chart/table are answered correctly and cite the source figure/table." },
      { order: 3, action: "Handle the blind spot: if the needed content wasn't captured, the app should say so (or fall back to the page image) rather than confidently answering from nothing. Read keys from the environment.", verify: "The app answers figure/table questions grounded in the captured non-text content, cites the source, and doesn't silently drop or fabricate when content is missing." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P5 milestone p5-03",
    items: [
      "Figures/tables captured at ingestion (extract-and-describe or page-image) with table structure preserved.",
      "Queries retrieve across text + figure/table content; answers are grounded and CITE the figure/table.",
      "Uncaptured content is flagged/handled (say 'not available' or fall back to page image), not fabricated.",
      "Reuses Batch 6 RAG pipeline; keys from environment.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — extract-and-describe ingestion feeding your text RAG (structure)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `# Reuses your Batch 6 RAG: chunk -> embed -> index -> retrieve -> generate+cite.
# The ONLY new part is turning figures/tables into searchable text at ingestion.

def describe_visual(client, image_data_url, kind: str) -> str:
    # Vision model -> searchable text. For tables, ask for structured row/cell text.
    instruction = ("Transcribe this TABLE as 'col | col | ...' rows, preserving all numbers."
                   if kind == "table" else "Describe this figure and its key data points.")
    resp = client.responses.create(model="gpt-4o-mini", input=[{"role": "user", "content": [
        {"type": "input_text", "text": instruction},
        {"type": "input_image", "image_url": image_data_url, "detail": "high"}]}])
    return resp.output_text

def ingest_pdf(client, pages) -> list[dict]:
    chunks = []
    for p in pages:
        chunks += [{"text": t, "source": f"p{p.num}"} for t in p.text_chunks]   # normal text
        for fig in p.figures:                        # NEW: capture non-text content
            desc = describe_visual(client, fig.image_data_url, fig.kind)
            chunks.append({"text": desc, "source": f"p{p.num}:{fig.id}", "modality": fig.kind})
    return chunks   # -> embed + index with your existing text RAG, then retrieve+cite as usual`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Multimodal RAG is only worth its cost if it *measurably* beats text-only on the questions that matter. This unit quantifies the advantage — the completion criterion is 'you quantify the multimodal advantage,' not 'you assume it's better.'",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How to quantify the multimodal advantage",
    md: "Run the same evaluation against both pipelines and compare:\n\n- **Build a question set** where answers live in figures/tables (not just narrative text) — these are the questions text-only RAG should fail.\n- **Run text-only vs multimodal** on the identical set; score correctness (and citation accuracy).\n- **Report the delta** — e.g. 'text-only 30% correct on table questions, multimodal 85%.' A concrete number justifies the added cost.\n- **Note the cost** — multimodal ingestion (vision calls) and/or answer-time page images add tokens; the advantage must be worth it for *your* mix of questions.\n\nIf the advantage is small for your corpus (mostly text), that's a valid finding too — don't pay for multimodal you don't need."
  },
  {
    type: "code",
    language: "python",
    caption: "Text-only vs multimodal on figure/table questions (deterministic, keyless)",
    code: `def retrievable(query_terms, chunk):
    return all(t in chunk.lower() for t in query_terms)

# Same corpus, two ingestions:
text_only = ["Quarterly results are summarized below.", "See Table 2 for revenue."]
multimodal = text_only + ["Table 2 | Q1 revenue: $1.2M | Q2 revenue: $1.5M | Q3 revenue: $1.8M"]

questions = [["revenue", "q2"], ["revenue", "q3"]]   # answers live in the TABLE

def score(corpus):
    return sum(any(retrievable(q, c) for c in corpus) for q in questions)

print(score(text_only), "/", len(questions))     # text-only misses table questions
print(score(multimodal), "/", len(questions))    # multimodal retrieves them`,
    output: `0 / 2
2 / 2`,
  },
  {
    type: "prose",
    md: "Text-only scores **0/2** on the table questions; multimodal scores **2/2** — a quantified advantage on exactly the questions where non-text content matters. That's the evidence to bring to a design decision: not 'multimodal feels better,' but 'multimodal answers N% more of the figure/table questions, at X extra cost.'",
  },
  {
    type: "quiz",
    question: "You claim your multimodal RAG is 'better' than text-only but have no numbers. What's the rigorous way to justify (or reject) the added cost?",
    choices: [
      "Trust that multimodal is always better and ship it",
      "Build a question set whose answers live in figures/tables, run BOTH pipelines on the identical set, and report the correctness delta (and citation accuracy) plus the extra cost. If the advantage is large on those questions it justifies the cost; if small for your corpus, text-only may be the right call",
      "Compare only on narrative questions where both do well",
      "Measure latency only, not correctness",
    ],
    answerIndex: 1,
    explanation: "A defensible decision compares both pipelines on the questions where they should differ — figure/table answers — and reports the correctness delta against the extra cost. That number either justifies multimodal or reveals it's unnecessary for a mostly-text corpus. Testing only narrative questions (where both succeed) or measuring latency alone hides the very difference you're evaluating.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — measure your multimodal advantage.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Quantify text-only vs multimodal on your corpus",
    intro: "Produce a number, not a vibe.",
    steps: [
      { order: 1, action: "Assemble ~10–20 questions whose answers live in figures/tables in your PDF. Run them against your text-only pipeline and your multimodal pipeline.", expected: "A correctness (and citation) score for each pipeline on the figure/table question set." },
      { order: 2, action: "Compute the delta and the extra cost of multimodal (ingestion vision calls and/or answer-time page images).", decision: "For your corpus, is the multimodal advantage worth the cost — or is most of your content text where the advantage is small?" },
      { order: 3, action: "Write a one-paragraph conclusion: the measured advantage, the cost, and whether multimodal is justified for this app.", verify: "You have a concrete correctness delta on figure/table questions, the associated cost, and a justified keep/drop decision — the multimodal advantage is quantified, not assumed." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A figure/table question set run against both text-only and multimodal pipelines.",
      "A concrete correctness (and citation) delta between the two.",
      "The extra cost of multimodal quantified against that delta.",
      "A justified conclusion on whether multimodal is worth it for this corpus.",
    ],
  },
];

const project: ContentBlock[] = [
  {
    type: "prose",
    md: "**Deliver Project P5 — a multimodal application.** This is the capstone of the category: assemble the pillars you built into one **non-chatbot** multimodal app that takes media in and produces structured data or grounded answers out. Every P5 milestone lives in *this* category — there's no hand-off to a later one — so P5 is complete when this unit is.",
  },
  {
    type: "callout",
    variant: "note",
    title: "P5 definition of done — assemble the milestones",
    md: "P5 is a **non-chat multimodal feature**: a document/image understanding pipeline or a voice assistant with retrieval — media in → structured/answer out. Its milestones (all in this category):\n\n- **p5-01 — single-modality feature** (Speech & Audio build, or a vision feature): audio/vision in, useful result out.\n- **p5-02 — structured extraction from media** (Vision build): image → validated structured JSON.\n- **p5-03 — multimodal RAG** (this topic's build): answers grounded in figures/tables, with citations.\n- **p5-04 — robustness pass** (Vision review): graceful degradation on edge-case media.\n- **Delivery** (this unit): a coherent app assembling the above, evaluated on edge cases.\n\nYou don't need every modality — you need a real, robust, non-chatbot multimodal application built from these pieces. Keys from the environment; keep components swappable."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Deliver P5 — non-chatbot multimodal application",
    intro: "Assemble, harden, evaluate. This is the capstone.",
    steps: [
      { order: 1, action: "Choose your P5 shape (e.g. a document-understanding pipeline: image → validated extraction → multimodal RAG over the doc set; or a voice assistant with retrieval). Assemble the relevant pillars (p5-01/02/03) into one coherent, non-chatbot app.", decision: "What single real problem does your app solve end to end, and which modalities does it genuinely need (don't add modalities for their own sake)?" },
      { order: 2, action: "Apply the robustness pass (p5-04): run edge-case media (blurry/rotated/wrong-type images, long/empty audio, figure-only questions) and make every stage degrade gracefully — flag/refuse rather than fabricate.", expected: "The app handles bad media across stages without confident wrong outputs." },
      { order: 3, action: "Evaluate: run an edge-case evaluation (media in → structured/answer out) and record where it succeeds, degrades, and fails. Read all keys from the environment; disclose AI-generated voices if used.", verify: "P5 is a working, non-chatbot multimodal app (media in → structured/answer out) assembling the milestones, hardened against edge cases, with a documented evaluation." },
    ],
  },
  {
    type: "checkpoint",
    title: "P5 delivery — definition of done",
    items: [
      "A non-chatbot multimodal application: media in → structured data or grounded answer out.",
      "Assembles the P5 milestones (single-modality feature, structured extraction, multimodal RAG).",
      "Robustness pass applied: edge-case media degrade gracefully, never confidently wrong.",
      "Edge-case evaluation documented; keys from environment; AI voices disclosed if used.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "P5 is a non-chatbot multimodal app — media in, structured data or grounded answers out — assembled from the category's builds, not a new build from scratch.",
      "All P5 milestones (p5-01 single-modality, p5-02 structured extraction, p5-03 multimodal RAG, p5-04 robustness) live in this category; P5 is done here.",
      "Robustness is a first-class requirement: edge-case media must flag/refuse, never fabricate — the difference between a demo and a product.",
      "Add modalities only where the problem needs them; breadth beyond text is the goal, not modality for its own sake.",
      "You've now crossed from text-only to multimodal engineering — reading images, hearing/speaking, generating images, and grounding answers in figures/tables.",
    ],
  },
];

export const content: TopicContent = {
  "unit-mm-multimodal-rag-01": learn,
  "unit-mm-multimodal-rag-02": build,
  "unit-mm-multimodal-rag-03": review,
  "unit-mm-multimodal-rag-04": project,
};
