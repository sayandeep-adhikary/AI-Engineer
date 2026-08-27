import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Chunking & Text Preparation" (topic-emb-chunking).
// 4 units: 01 learn (strategies + tradeoffs) · 02 practice (chunk 3 ways) · 03 build
// (configurable pipeline w/ metadata + IDs) · 04 review (retrieval quality + mastery).
// Chunker demos are LOCAL and deterministic (word/char slicing) -> exact outputs, no
// fabricated model behaviour.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You can embed and compare text — but *which* text? You rarely embed whole documents: a 30-page manual as one vector blurs everything together, and a search for one detail retrieves the entire book. **Chunking** — splitting documents into retrieval-sized pieces before embedding — is the quiet lever that most determines whether search returns the right passage. Poorly chosen chunks are the single most common reason a system 'has the answer somewhere' but never retrieves it.",
  },
  {
    type: "prose",
    md: "**Mental model: a chunk is the *unit of retrieval*. You get back whatever you chunked — so chunk the way you want to retrieve.** Each chunk becomes one vector and one possible search hit. If chunks are too big, a hit drags in paragraphs of irrelevant text and the meaning is diluted (lower precision). If too small, the relevant idea is split across pieces and no single chunk carries enough context to match or to answer (lower recall / fragmented context). Chunking is the art of picking pieces that are *self-contained enough to be meaningful* and *focused enough to be precise*.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Chunk", definition: "A piece of a document that gets embedded and stored as one searchable unit. What you retrieve is a chunk (or several)." },
      { term: "Chunk size", definition: "How much text per chunk (chars, words, or tokens). Trades precision (small) against context/recall (large). No universal correct value." },
      { term: "Overlap", definition: "Repeating some text between adjacent chunks so an idea spanning a boundary isn't lost. Costs storage/duplication; helps continuity." },
      { term: "Boundary", definition: "Where you cut. Cutting on sentence/paragraph/semantic boundaries keeps chunks coherent; cutting mid-sentence produces fragments." },
      { term: "Chunk metadata", definition: "Fields stored with each chunk: source document id, chunk position/index, title, section — needed to trace a hit back to its origin and to filter later." },
    ],
  },
  {
    type: "prose",
    md: "**Strategies, from crude to careful:**\n\n- **Fixed-size** (every N chars/words/tokens): simple and predictable, but blind — it happily slices through the middle of a sentence, producing fragments like `...the dosage should never` | `exceed 20mg...`.\n- **Fixed-size + overlap**: repeat a little text across boundaries so an idea straddling a cut survives in at least one chunk. Reduces boundary loss at the cost of duplication.\n- **Boundary-aware (sentence / paragraph)**: split on natural separators so each chunk is a whole thought. Coherent, variable-sized.\n- **Recursive**: try to split on large separators (paragraphs) first, fall back to smaller ones (sentences, then words) only when a piece is still too big. A good general-purpose default — coherent *and* size-bounded.\n- **Semantic / structural**: split by meaning shifts or document structure (headings, sections, table rows, code blocks). Best quality, most work.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "There is NO universally correct chunk size or strategy",
    md: "Anyone who tells you '512 tokens with 50 overlap is correct' is quoting a *starting point*, not a law. The right choice depends on: the **document type** (dense legal prose vs chatty FAQ vs code), the **query style** (looking up a single fact vs synthesising across a section), the **embedding model** (its effective context and how it handles length), your **context budget** downstream, and how **granular** the answers need to be. Chunking is *empirical*: pick a reasonable default, measure retrieval quality on real queries, and adjust. Treat any specific number as a hypothesis to test, not an answer.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Don't destroy structure while 'cleaning', and never chunk without metadata",
    md: "Two chunking sins that surface as bad retrieval:\n\n- **Over-cleaning**: stripping newlines, headings, list markers, or table layout can *destroy* the very boundaries and context that make a chunk meaningful — collapsing a table into a wall of numbers, or merging unrelated sections. Clean to remove *noise* (boilerplate, nav chrome), not *structure*.\n- **No metadata / no IDs**: if a chunk carries no source document id and position, a search hit is an orphan — you can't cite it, show its origin, filter by source, or reassemble neighbouring chunks. Always attach `{doc_id, chunk_index, source, ...}` to every chunk. It's also what lets a later project add metadata filtering without re-embedding.",
  },
  {
    type: "prose",
    md: "**Special cases** that generic splitters mangle: **tables** (row/column meaning is lost if you cut arbitrarily — keep rows or whole small tables together), **code** (splitting mid-function destroys it — prefer function/class boundaries), and **lists** (a chunk that starts mid-list loses the intro that gives items meaning). When a document has structure, respect it rather than applying blind fixed-size cuts.",
  },
  {
    type: "quiz",
    question: "A support bot 'has the answer in the docs' but retrieval keeps returning irrelevant passages. The embeddings and similarity metric are fine. What's the most likely culprit and why?",
    choices: [
      "The embedding model is too small",
      "Chunking — e.g. chunks so large the relevant sentence is diluted among unrelated text, or so small/mid-sentence that no chunk carries the full idea, so the right passage never forms a matchable unit",
      "The similarity threshold is too high",
      "You need more documents",
    ],
    answerIndex: 1,
    explanation: "When embeddings and metric are sound but the right passage never surfaces, the retrieval UNIT is wrong. Oversized chunks dilute the signal; undersized or mid-sentence chunks fragment the idea so no single chunk matches well. Fixing chunk size/boundaries usually fixes it.",
  },
  {
    type: "quiz",
    question: "Which statement about chunk size is correct?",
    choices: [
      "512 tokens with 50 overlap is the correct size for all documents",
      "Bigger chunks are always better because they hold more context",
      "There's no universal size; it depends on document type, query style, embedding model, and context budget — you choose a starting point and tune it empirically",
      "Smaller chunks are always better because they're precise",
    ],
    answerIndex: 2,
    explanation: "Chunk size is a tunable trade-off, not a constant. Bigger helps context/recall but hurts precision; smaller helps precision but fragments ideas. The right value depends on your documents, queries, model, and budget, and is found by measuring, not by a fixed rule.",
  },
  {
    type: "takeaways",
    items: [
      "A chunk is the unit of retrieval — you get back what you chunked; chunk the way you want to retrieve.",
      "Too big → diluted, low precision; too small / mid-sentence → fragmented, low recall. Boundary-aware and recursive splitting keep chunks coherent.",
      "Overlap preserves ideas spanning a boundary at the cost of duplication.",
      "No universal chunk size/strategy — it depends on doc type, query, model, and budget; tune empirically.",
      "Preserve structure (don't over-clean), respect special cases (tables/code/lists), and always attach doc_id + position metadata to every chunk.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Chunk a real document three ways and *see* the difference. These chunkers are fully local and deterministic — no API needed — so you can verify every boundary.",
  },
  {
    type: "code",
    language: "python",
    caption: "Three chunkers (local, deterministic)",
    code: `def chunk_words(text, size, overlap=0):
    words = text.split()
    step = size - overlap
    return [" ".join(words[i:i+size]) for i in range(0, len(words), step)]

sample = "one two three four five six seven eight nine ten"

print(chunk_words(sample, 4, 0))    # fixed, no overlap
print(chunk_words(sample, 4, 2))    # fixed, overlap=2`,
    output: `['one two three four', 'five six seven eight', 'nine ten']
['one two three four', 'three four five six', 'five six seven eight', 'seven eight nine ten', 'nine ten']`,
  },
  {
    type: "prose",
    md: "Notice: no overlap → 3 clean, non-repeating chunks; overlap 2 → 5 chunks where each shares two words with its neighbour (that's the duplication overlap costs, and the continuity it buys). Now compare *fixed* vs *boundary-aware* on real sentences:",
  },
  {
    type: "code",
    language: "python",
    caption: "Fixed-size vs sentence boundaries",
    code: `doc = "Cats are small. Dogs are loyal. Birds can fly."

# Fixed by words: ignores sentence boundaries -> fragments
print(chunk_words(doc, 4, 0))

# Boundary-aware: one chunk per sentence -> coherent
sentences = [s.strip() + "." for s in doc.split(".") if s.strip()]
print(sentences)`,
    output: `['Cats are small. Dogs', 'are loyal. Birds can', 'fly.']
['Cats are small.', 'Dogs are loyal.', 'Birds can fly.']`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Chunk 3 ways and inspect (guided)",
    intro: "Run the chunkers on your own paragraph.",
    steps: [
      { order: 1, action: "Take a short multi-sentence paragraph. Chunk it (a) fixed-size no overlap, (b) fixed-size with overlap, (c) by sentence. Count chunks in each.", expected: "Overlap increases chunk count and repeats words; sentence chunks align with sentence ends; fixed chunks cut mid-sentence." },
      { order: 2, action: "Find a chunk from the fixed-size method that splits a sentence in half. Explain why that fragment would embed/retrieve poorly.", decision: "For YOUR paragraph, which method would you pick, and what property of the text drove the choice?" },
      { order: 3, action: "Note the duplication overlap introduced. When is that duplication worth it, and when is it waste?", verify: "You can point to a mid-sentence fragment, quantify overlap's duplication, and justify a strategy for your text." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You produced fixed, overlapping, and sentence-based chunks and counted them.",
      "You identified a mid-sentence fragment and why it's poor.",
      "You can state the duplication cost of overlap and when it's worthwhile.",
      "You chose a strategy for your document and justified it.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a configurable chunking pipeline that attaches metadata and stable IDs** — the deliverable. It turns raw documents into chunk records ready to embed (topic 2) and search (topic 3), and it's the ingestion piece the capstone will reuse.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — documents → chunk records",
    intro: "Acceptance defines done; design the interface yourself.",
    steps: [
      { order: 1, action: "Accept documents as {doc_id, text, metadata} and a configurable strategy/size/overlap. Emit chunk records each with a STABLE chunk_id (e.g. f'{doc_id}::{index}'), the chunk text, its position, and inherited doc metadata.", decision: "Why derive chunk_id from doc_id + index rather than a random UUID? (Reproducibility/dedup and re-running without duplicating.)" },
      { order: 2, action: "Prefer boundary-aware splitting (don't cut mid-sentence when avoidable) but keep chunks within the size bound; support overlap. Preserve source structure — clean noise, not structure.", expected: "Chunks are coherent and size-bounded; each carries doc_id, chunk_index, and source metadata." },
      { order: 3, action: "Handle edge cases: empty/whitespace documents produce no chunks (not one empty chunk); a document shorter than the chunk size yields a single chunk; re-running on unchanged input yields identical chunk_ids.", verify: "Given a few documents, you get well-formed chunk records with stable IDs and full metadata, coherent boundaries, and clean edge-case behaviour." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Configurable strategy/size/overlap; boundary-aware where possible; size-bounded chunks.",
      "Every chunk has a stable chunk_id (doc_id + index), position, and inherited metadata.",
      "Empty docs → no chunks; short docs → one chunk; re-runs are stable/idempotent.",
      "Structure preserved (clean noise, not boundaries).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — configurable chunking pipeline",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import re

def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\\s+", text.strip())
    return [p for p in parts if p]

def chunk_document(doc: dict, size: int = 60, overlap: int = 10) -> list[dict]:
    # doc: {"doc_id", "text", "metadata"}; size/overlap counted in WORDS here.
    text = doc["text"].strip()
    if not text:
        return []
    # Boundary-aware: pack whole sentences up to the size bound.
    chunks, cur, cur_len = [], [], 0
    for sent in split_sentences(text):
        n = len(sent.split())
        if cur and cur_len + n > size:
            chunks.append(" ".join(cur))
            # start next chunk with overlap words from the tail of this one
            tail = " ".join(cur).split()[-overlap:] if overlap else []
            cur, cur_len = tail[:], len(tail)
        cur.append(sent); cur_len += n
    if cur:
        chunks.append(" ".join(cur))

    return [{
        "chunk_id": f'{doc["doc_id"]}::{i}',      # stable, reproducible
        "doc_id": doc["doc_id"],
        "chunk_index": i,
        "text": c,
        "metadata": {**doc.get("metadata", {}), "chunk_index": i},
    } for i, c in enumerate(chunks)]`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "The only real test of chunking is downstream retrieval quality. Learn to read the symptoms and redesign.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom — 'the correct information exists, but search retrieves irrelevant chunks'",
    md: "The answer is provably in the corpus, yet the top results miss it. Embeddings and metric check out. **Evidence to gather:** pull the chunk that *should* have matched and read it — is the key sentence split across two chunks (too small / bad boundary)? Is it buried in a huge chunk full of other topics (too big, diluted)? Did cleaning merge it into unrelated text or strip the heading that gave it context? **Diagnosis:** the retrieval *unit* doesn't isolate the answer. **Fixes to try, then measure:** reduce chunk size or switch to boundary-aware/recursive splitting so the idea forms one coherent chunk; add modest overlap if answers straddle boundaries; stop over-cleaning; re-chunk and re-embed. Chunking is empirical — change one thing, re-measure retrieval on the same test queries.",
  },
  {
    type: "quiz",
    question: "Retrieval quality is poor. You re-chunk with smaller chunks and it improves on fact-lookup queries but WORSENS on questions needing a whole section of context. What does this reveal?",
    choices: [
      "Smaller is always better; the second result is a fluke",
      "It reveals the core precision/recall trade of chunk size: small chunks isolate facts (better precision) but fragment multi-part context (worse recall for synthesis) — so the right size depends on your query mix, and you may need overlap or a mid-size compromise",
      "The embedding model changed",
      "You should never change chunk size",
    ],
    answerIndex: 1,
    explanation: "This is exactly the trade-off in action: small chunks help pinpoint queries and hurt context-spanning ones. There's no size that wins both — you tune to your dominant query type, add overlap, or use a compromise size. It confirms chunking must be tuned empirically to the workload.",
  },
  {
    type: "quiz",
    question: "Which chunk record is properly prepared for a searchable system?",
    choices: [
      "Just the chunk text, embedded",
      "The chunk text plus a stable chunk_id, its source doc_id, position, and source metadata — so a hit can be traced, cited, and later filtered",
      "The chunk text plus a random UUID and nothing else",
      "The whole document as one chunk with metadata",
    ],
    answerIndex: 1,
    explanation: "A usable chunk record carries a stable id, source doc id, position, and metadata alongside the text, so retrieval can trace origin, cite it, reassemble neighbours, and filter later. Bare text or an id-only record is an orphan hit; one giant chunk defeats retrieval.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — diagnose and redesign a broken chunking scheme.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Redesign chunking for a difficult document",
    intro: "Given a symptom, propose a concrete, measurable fix.",
    steps: [
      { order: 1, action: "A 40-page API manual is chunked as fixed 2000-word blocks with no overlap and headings stripped. Users searching for specific parameters get whole-section dumps that rarely contain the exact parameter. Name every chunking flaw at play.", expected: "Chunks far too large (dilution), no boundary awareness, no overlap, structure/headings destroyed, likely missing per-section metadata." },
      { order: 2, action: "Propose a redesigned scheme: strategy, rough size, overlap, boundary handling, structure preservation, and metadata — and say WHY each choice fits an API reference.", decision: "How will you MEASURE whether the redesign actually improved retrieval, rather than assuming it did?" },
      { order: 3, action: "Describe the re-ingest consequence of your change (re-chunk AND re-embed) and one risk of over-correcting (e.g. chunks so small parameter descriptions get separated from their examples).", verify: "You identified the flaws, proposed a justified boundary-aware + smaller + metadata-rich scheme, defined a measurement, and acknowledged the re-embed cost and the opposite failure mode." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "You named the flaws (oversized, no boundaries/overlap, destroyed structure, missing metadata).",
      "You proposed a concrete, justified redesign fitting the document type.",
      "You defined how to MEASURE improvement (test queries, before/after).",
      "You noted the re-chunk+re-embed cost and the risk of over-correcting to tiny chunks.",
    ],
  },
];

export const content: TopicContent = {
  "unit-emb-chunking-01": learn,
  "unit-emb-chunking-02": practice,
  "unit-emb-chunking-03": build,
  "unit-emb-chunking-04": review,
};
