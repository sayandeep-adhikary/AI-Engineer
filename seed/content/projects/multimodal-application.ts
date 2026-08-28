import type { ProjectGuide } from "../../types";

// Project guide for P5 — Multimodal Application (project-p5-multimodal).

export const guide: ProjectGuide = {
  overview:
    "Build a **non-chat multimodal feature** that turns media (images, documents, or audio) into structured, useful output — with real robustness to messy inputs. Not a toy 'describe this image' demo, but something like: a document-understanding pipeline that extracts structured fields from scanned receipts/invoices (image in → validated JSON out), or a voice assistant that transcribes a spoken question, retrieves an answer from your docs, and speaks it back.\n\nThe engineering lesson is that a multimodal model is a **fallible reader/transducer, not magic**: vision models misread small or rotated text, transcription drops words on long or noisy audio, and image generators refuse or drift. A real feature validates the model's output, handles the edge cases (blurry scans, silence, unsupported formats), and degrades gracefully instead of confidently emitting garbage. You reuse RAG (P3) and structured outputs (P1) — the new part is engineering around non-text input.",
  scenario:
    "An operations team processes a stream of media — receipts photographed on phones, scanned forms, or recorded voicemails — and someone keys the important fields into a system by hand. You are asked to automate the understanding step: media in, structured/answer out, reliable enough to reduce manual work.\n\nPlain software can't parse a phone photo of a crumpled receipt or a noisy voicemail — that's where multimodal models help. But the business can't accept confident-but-wrong extractions (a misread total corrupts accounting) or a pipeline that crashes on a blurry image or a silent clip. A real system validates every extraction, flags low-confidence cases for human review, chunks long audio safely, rejects unsupported inputs cleanly, and never fabricates a field it couldn't read. That robustness is the project.",
  whatYouBuild:
    "A media-in → structured-or-answer-out pipeline for ONE modality path (document/vision extraction OR a voice assistant with retrieval), engineered for edge cases and validated output. Reuses structured outputs (P1) and, for the voice path, RAG (P3).",
  architecture: `Media input (image / document / audio)
        |
        v
  Ingest + validate        <- format, size, quality checks; reject unsupported
        |
        v
  Modality model
   - vision: read/extract   OR   - STT: transcribe (chunk long audio)
        |
        v
  Structure + validate      <- parse into schema; confidence; flag low-confidence
        |
   +----+----------------+
   v                     v
  (voice path)        Structured result
  Retrieve (RAG, P3)       |
   -> answer -> TTS        v
        |            Validated output / "couldn't read — review"
        v
   Spoken answer`,
  components: [
    "**Ingest + validation** — accepts a media file, checks format/size/quality, and rejects unsupported or unreadable inputs with a clear message.",
    "**Modality model** — vision (read/extract from image or document) or speech-to-text (transcribe), with long-audio chunking on the STT path.",
    "**Structuring + validation** — parses the model output into a schema (reusing P1), attaches confidence, and flags low-confidence results for human review.",
    "**Retrieval + answer (voice path)** — reuses P3's RAG to answer the transcribed question from your docs.",
    "**Text-to-speech (voice path)** — speaks the answer back, with a clear AI-voice disclosure.",
    "**Robustness layer** — graceful degradation: on a media it can't read, it flags/abstains rather than fabricating.",
  ],
  learningObjectives: [
    "Vision / document understanding",
    "Speech-to-text (+ long-audio chunking)",
    "Text-to-speech",
    "Structured extraction from media",
    "Output validation & confidence",
    "Graceful degradation on bad input",
    "Multimodal RAG (voice path)",
    "Content safety / moderation",
    "Edge-case engineering",
  ],
  prerequisites: {
    required: [
      "You completed the multimodal topics (vision and/or speech).",
      "You can produce validated structured output (P1).",
      "For the voice path: you have a RAG pipeline (P3) to answer from.",
    ],
    helpful: [
      "Familiarity with a vision or STT/TTS API (or local models like Whisper).",
      "Awareness of content-safety/moderation handling.",
      "Basic audio handling (formats, chunking) for the voice path.",
    ],
  },
  techStack: [
    { layer: "Language", choice: "Python 3.11+", why: "Media libraries and the AI SDKs live here." },
    { layer: "Vision", choice: "A vision-capable model (provider's current id) — or an open model", why: "Reads text/structure from images/documents; keep the id in config and expect fallibility." },
    { layer: "Speech-to-text", choice: "A hosted STT model or local Whisper / whisper.cpp", why: "Local is keyless for learning; hosted is easier for long audio. Chunk long audio on silence." },
    { layer: "Text-to-speech", choice: "A TTS model (optional, voice path)", why: "Speaks the answer; disclose that the voice is AI-generated." },
    { layer: "Structuring", choice: "Pydantic (reuse P1)", why: "Validates extracted fields; extraction from media is still untrusted output." },
    { layer: "Retrieval", choice: "Your P3 RAG (voice path)", why: "Answers the transcribed question from your documents." },
    { layer: "Media handling", choice: "Pillow / pdf tools / audio libs", why: "Resize/normalize images, split PDFs, chunk audio before the model." },
  ],
  functionalRequirements: [
    "The pipeline accepts a media input (image/document or audio) and validates format, size and basic quality before processing.",
    "Unsupported or unreadable inputs are rejected cleanly with an actionable message (never a crash).",
    "For the vision/document path: the system extracts the target fields into a validated schema and never fabricates a field it could not read.",
    "For the voice path: the system transcribes speech, chunking long audio safely, then answers from retrieval (P3) and speaks the answer back.",
    "Every extraction/transcription carries a confidence signal; low-confidence results are flagged for human review rather than trusted.",
    "The model's output is validated (schema for extraction; sanity checks for transcription) before use.",
    "Generated media (TTS/images, if used) passes content-safety handling and any AI-generated content is disclosed.",
    "The pipeline degrades gracefully: on a blurry image, silent audio, or unsupported format it flags/abstains instead of emitting garbage.",
    "Cost and latency per item are tracked (media calls are billed by size/tokens).",
  ],
  nonFunctionalRequirements: [
    "Robustness first — the pipeline must handle messy real-world media without crashing or fabricating.",
    "Output is validated; low-confidence results are surfaced, not silently accepted.",
    "Long/large media is chunked/resized before the model to respect limits and cost.",
    "Content safety is handled explicitly (moderation, AI-voice disclosure).",
    "Cost per item is bounded and observable; media is billed by size.",
    "No sensitive media or transcript is logged raw (privacy).",
  ],
  phases: [
    {
      name: "Pick the path & ingest",
      intro: "Choose ONE modality path; validate input first.",
      tasks: [
        "Choose the vision/document path OR the voice path (don't build both).",
        "Build ingest + validation: format, size, quality; reject unsupported cleanly.",
        "Normalize media (resize images / split PDFs / chunk audio on silence).",
      ],
    },
    {
      name: "Modality model",
      tasks: [
        "Vision: extract fields into a schema. OR Speech: transcribe (with long-audio chunking).",
        "Validate the output (schema for extraction; sanity checks for transcription).",
        "Attach a confidence signal and a low-confidence flag.",
      ],
    },
    {
      name: "Complete the feature",
      tasks: [
        "Vision path: assemble the validated structured record + review flagging.",
        "Voice path: retrieve an answer (P3) and speak it back (TTS + disclosure).",
        "Handle content safety on any generated media.",
      ],
    },
    {
      name: "Robustness & edge cases",
      tasks: [
        "Feed blurry/rotated images, silent/noisy audio, huge files, wrong formats.",
        "Confirm graceful degradation: flag/abstain, never fabricate.",
        "Track cost + latency per item.",
      ],
    },
    {
      name: "Evaluate & document",
      tasks: [
        "Build a small labelled media set; measure extraction/transcription accuracy.",
        "Measure the low-confidence flag rate and false-accept rate.",
        "Write the README + limitations (where the model is unreliable).",
      ],
    },
  ],
  checklist: [
    "Choose ONE modality path (vision/document or voice)",
    "Build ingest + format/size/quality validation",
    "Reject unsupported inputs cleanly",
    "Normalize media (resize / split / chunk)",
    "Run the modality model (extract or transcribe)",
    "Validate output (schema / sanity checks)",
    "Attach confidence + low-confidence flag",
    "Vision: assemble structured record + review flag",
    "Voice: retrieve answer (P3) + TTS with disclosure",
    "Handle content safety on generated media",
    "Test blurry/rotated/silent/oversized/wrong-format inputs",
    "Confirm graceful degradation (flag/abstain, never fabricate)",
    "Track cost + latency per item",
    "Build a labelled media set + measure accuracy",
    "Write README + limitations",
  ],
  projectStructure: `multimodal-application/
  src/
    ingest/
      validate.py     # format, size, quality
      normalize.py    # resize / split / chunk
    modality/
      vision.py       # extract fields   (OR)
      stt.py          # transcribe (+ chunking)
      tts.py          # speak answer (voice path)
    structure/
      schemas.py      # extraction schema (reuse P1)
      confidence.py   # confidence + low-confidence flag
    pipeline.py       # media in -> structured/answer out
    (voice) retrieve.py  # reuse P3 RAG
  eval/
    samples/          # labelled media
    measure.py
  README.md`,
  decisions: [
    {
      decision: "Which modality path to build",
      options: "Vision/document extraction · voice assistant with retrieval.",
      tradeoff: "Vision extraction is a tighter, more deterministic target (structured output + validation); the voice path integrates more pieces (STT + RAG + TTS) but is broader. Pick one and do it well — don't half-build both.",
    },
    {
      decision: "Hosted vs local models",
      options: "Hosted vision/STT/TTS APIs · local (Whisper, open vision models).",
      tradeoff: "Hosted is easier and often higher quality but costs per call and needs keys; local (esp. Whisper for STT) is keyless and private but heavier to run. Keep the model behind a seam so it's swappable.",
    },
    {
      decision: "How to handle long/large media",
      options: "Send as-is · resize/downsample images · chunk audio on silence.",
      tradeoff: "Sending as-is hits size limits, costs more (images bill by resolution), and can fail; resizing images and chunking audio on silence keeps you within limits and controls cost — required for real media.",
    },
    {
      decision: "Confidence & human review",
      options: "Trust every extraction · threshold + flag low-confidence for review.",
      tradeoff: "Trusting everything means silent errors corrupt downstream data; flagging low-confidence items for human review trades a little throughput for correctness where it matters. Essential for anything feeding a system of record.",
    },
    {
      decision: "Degrade vs fabricate on unreadable input",
      options: "Best-effort guess · abstain / flag when it can't read.",
      tradeoff: "A best-effort guess on a blurry scan produces confident garbage; abstaining or flagging is honest and safe. Always prefer graceful degradation for media you can't reliably read.",
    },
  ],
  gotchas: [
    "Assuming vision = perfect OCR — it misreads small, rotated, styled, or non-Latin text; validate the output.",
    "No error handling on long audio — a 30-minute clip exceeds limits; chunk on silence with per-chunk handling.",
    "Fabricating a field the model couldn't read — never invent; flag or abstain.",
    "Ignoring content safety — generated media can be blocked (moderation); handle it explicitly and disclose AI voices.",
    "Sending full-resolution images — they bill by size and may exceed limits; resize first.",
    "Silently dropping non-text content — decide and document what happens to an unsupported page/format.",
    "No confidence signal — you can't tell a solid extraction from a lucky guess.",
    "Logging raw media/transcripts with PII — redact; media is sensitive.",
    "Trusting transcription verbatim — sanity-check before acting on it.",
  ],
  testing: {
    functional: [
      "A clean image/document extracts the expected fields into a valid record.",
      "A clear spoken question is transcribed, answered from docs, and spoken back (voice path).",
      "Low-confidence results are flagged for review.",
      "Unsupported formats are rejected cleanly.",
    ],
    edgeCases: [
      "Blurry, rotated, low-contrast or partially-cropped images.",
      "Silent, very noisy, or very long audio.",
      "Oversized files and wrong formats.",
      "Media with no extractable target (empty receipt, no speech).",
    ],
    failureModes: [
      "Modality model fails/timeouts → surfaced cleanly, item flagged, pipeline continues.",
      "Content-safety block on generated media → handled with a clear message, no crash.",
      "Transcription returns garbage on noise → low confidence, flagged, not acted on.",
      "Extraction produces an invalid schema → rejected/repaired, never stored raw.",
    ],
    aiEvaluation: [
      "Extraction field accuracy / transcription word accuracy on the labelled set.",
      "Low-confidence flag rate and false-accept rate (confident wrong outputs).",
      "Cost and latency per item.",
      "Robustness score: fraction of edge-case inputs handled without fabrication.",
    ],
  },
  definitionOfDone: [
    "One modality path (vision or voice) works end to end: media in → validated structured/answer out.",
    "Inputs are validated; unsupported/unreadable media is rejected or flagged, never crashed on.",
    "Output is schema-validated (extraction) or sanity-checked (transcription); nothing is fabricated.",
    "Low-confidence results are flagged for human review.",
    "Long/large media is chunked/resized; content safety and AI-voice disclosure are handled.",
    "Edge cases (blurry/silent/oversized/wrong-format) degrade gracefully.",
    "Cost and latency per item are tracked.",
    "A labelled media set demonstrates accuracy and the false-accept rate.",
    "README documents the pipeline and where the model is unreliable.",
  ],
  expectedOutcome:
    "A robust multimodal feature that turns real, messy media into trustworthy structured output or spoken answers — with honest handling of the cases where the model can't read. You will have proof of breadth beyond text and, more importantly, of the edge-case engineering that makes media pipelines usable in production.",
  outcomeArtifacts: [
    "A media-in → structured/answer-out pipeline (one modality path)",
    "Input validation + graceful degradation on bad media",
    "Schema-validated extraction or retrieval-backed spoken answers",
    "A confidence + human-review flagging mechanism",
    "A labelled media set + accuracy/false-accept measurement",
    "README documenting reliability limits",
    "A demo-ready GitHub repository",
  ],
  stretchGoals: [
    "Support a second modality path.",
    "Multimodal RAG over documents with figures/tables.",
    "Batch processing of a media folder with a quality report.",
    "Streaming transcription for real-time voice.",
    "A review UI for low-confidence items.",
    "On-device / local models for privacy-sensitive media.",
  ],
  skillsDemonstrated: [
    "Multimodal AI engineering",
    "Document/vision understanding",
    "Speech (STT/TTS) pipelines",
    "Structured extraction from media",
    "Output validation & confidence",
    "Edge-case robustness",
    "Content safety handling",
  ],
  portfolio:
    "This proves breadth beyond text plus the harder skill: **engineering around fallible perception**. A reviewer sees input validation, output validation, confidence-based review, graceful degradation, and content-safety handling — the difference between a flashy 'describe this image' demo and a media pipeline someone could actually run on real, messy inputs.",
};
