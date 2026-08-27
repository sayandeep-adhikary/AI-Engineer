import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Speech & Audio (STT/TTS)" (topic-mm-speech-audio).
// 3 units: 01 learn (STT, TTS, diarization light, streaming) · 02 practice (transcribe a clip)
// · 03 build (voice Q&A pipeline audio→text→LLM→speech = P5 milestone p5-01).
// Verified against OpenAI docs (current): audio.transcriptions.create(model="gpt-transcribe"),
// 25MB file limit + chunking, formats, diarization (gpt-4o-transcribe-diarize), timestamps
// (whisper-1 verbose_json); audio.speech.create(model="gpt-4o-mini-tts", voice, instructions,
// response_format), streaming, AI-voice disclosure. Deterministic keyless chunking math.
// Model ids hedged; transcript/audio outputs marked representative.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Voice interfaces are two boundaries around your existing text stack: **speech-to-text (STT)** turns audio into a transcript on the way in, and **text-to-speech (TTS)** turns a reply into audio on the way out. The LLM in the middle is the same one you've used all along. So a 'voice assistant' isn't a new kind of model — it's a *pipeline* (audio → STT → LLM → TTS → audio), and the engineering is in the seams: audio formats, latency, long-file limits, and error handling.",
  },
  {
    type: "prose",
    md: "**Mental model: STT and TTS are transducers, not intelligence.** STT converts sound waves to text (with predictable errors on accents, jargon, overlapping speakers, noise). TTS converts text to sound (choosing a voice and prosody). Neither 'understands' anything — the understanding is the LLM's job in the middle. Keep the three stages separate in your head and your code: each has its own failure modes, latency, and cost, and you debug them independently.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "STT (speech-to-text) / transcription", definition: "Audio in → text out. e.g. client.audio.transcriptions.create(model=..., file=…).text. Models like gpt-transcribe or whisper-1 — check your provider's current list." },
      { term: "TTS (text-to-speech)", definition: "Text in → audio out. e.g. client.audio.speech.create(model=..., voice=..., input=…) → audio bytes. A voice and (on steerable models) an instructions style is chosen." },
      { term: "Diarization", definition: "Labeling WHO spoke WHEN ('Speaker 1 / Speaker 2'). Needs a diarization-capable model/format (e.g. a *-diarize model with diarized_json) — plain transcription gives text without speaker turns." },
      { term: "Streaming audio", definition: "Sending/receiving audio incrementally so transcription or speech starts before the whole file is ready — key for low perceived latency in live/voice UX (vs batch on a finished file)." },
      { term: "Audio format & sample rate", definition: "Container/codec (mp3, wav, m4a, webm…) and samples/sec. Wrong or overly large formats cost latency and can hit size limits; match format to the task." },
    ],
  },
  {
    type: "prose",
    md: "**STT — transcribe a file.** The whole call is a model plus an audio file; you read `.text`:",
  },
  {
    type: "code",
    language: "python",
    caption: "Speech-to-text (model id illustrative — use your provider's current STT model)",
    code: `from openai import OpenAI
client = OpenAI()   # key from env

with open("clip.mp3", "rb") as f:
    tr = client.audio.transcriptions.create(
        model="gpt-transcribe",     # or whisper-1; use your provider's current STT model
        file=f,
        # prompt=/keywords=... optional: bias domain terms & spellings
    )
print(tr.text)   # representative; transcription is non-deterministic on hard audio`,
  },
  {
    type: "prose",
    md: "**TTS — speak a reply.** Pick a model, a `voice`, and (on steerable models) an `instructions` style; you get audio bytes back in your chosen `response_format`:",
  },
  {
    type: "code",
    language: "python",
    caption: "Text-to-speech, streamed to a file (model/voice ids illustrative)",
    code: `with client.audio.speech.with_streaming_response.create(
    model="gpt-4o-mini-tts",   # steerable TTS; or tts-1 (low latency) / tts-1-hd (quality)
    voice="coral",             # alloy, echo, nova, shimmer, coral, … (see provider list)
    input="Your appointment is confirmed for Tuesday at 3 PM.",
    instructions="Speak in a calm, friendly tone.",   # steerable models only
    response_format="mp3",     # mp3 (default) / opus / aac / flac / wav / pcm
) as response:
    response.stream_to_file("reply.mp3")`,
  },
  {
    type: "callout",
    variant: "warning",
    title: "Disclose AI-generated voices",
    md: "Provider usage policies (and increasingly the law in some places) require that you **disclose to users when a voice is AI-generated** and only synthesize voices you're authorized to use — don't clone a real person's voice without consent. Bake the disclosure into your UX. This is a compliance requirement, not a nice-to-have."
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "No error handling on long audio — the 25 MB wall",
    md: "Transcription endpoints cap the **upload size (commonly ~25 MB)** and accept specific formats (mp3, mp4, mpeg, mpga, m4a, wav, webm). A one-hour meeting recording *will* exceed the limit and the request will fail. The fix is not 'hope it fits' — it's:\n\n- **Chunk long audio** into sub-limit pieces (e.g. with `pydub`), transcribe each, and concatenate the transcripts.\n- **Don't split mid-sentence** — cut on silence where possible, or overlap slightly, so words aren't sliced in half at boundaries.\n- **Handle per-chunk failures** — one bad chunk shouldn't lose the whole transcript; retry or flag it.\n- **Watch format/latency** — a huge uncompressed WAV is slow to upload; compressed formats reduce latency.\n\nA pipeline with no long-audio handling works in the demo (short clip) and fails on the first real recording."
  },
  {
    type: "code",
    language: "python",
    caption: "Why long audio must be chunked — sizing math (deterministic, keyless)",
    code: `import math

def wav_bytes(seconds, sample_rate=16000, bits=16, channels=1):
    return seconds * sample_rate * (bits // 8) * channels   # raw PCM/WAV size

def plan_chunks(total_seconds, max_bytes=25 * 1024 * 1024, **kw):
    per_chunk_seconds = max_bytes // wav_bytes(1, **kw)      # seconds that fit under the cap
    n = math.ceil(total_seconds / per_chunk_seconds)
    return n, per_chunk_seconds

size_mb = wav_bytes(1800) / (1024 * 1024)   # a 30-minute 16kHz mono WAV
print(round(size_mb, 1))                    # exceeds the 25 MB cap
print(plan_chunks(1800))                    # (num_chunks, seconds_per_chunk)`,
    output: `54.9
(3, 819)`,
  },
  {
    type: "prose",
    md: "A 30-minute 16 kHz mono WAV is ~54.9 MB — **more than double the ~25 MB cap** — so it must be split into 3 chunks of ~819 s each (cut on silence, not mid-word). This is why 'just send the file' fails on real recordings: know your format's byte rate, compute chunk boundaries, and handle each chunk's success/failure independently.",
  },
  {
    type: "prose",
    md: "**Beyond the basics** (reach for these when needed): **diarization** (a diarize-capable model returns per-speaker segments — needed for meeting notes 'who said what'); **timestamps** (verbose formats give word/segment start–end times for captions/search); **streaming** (start transcribing/speaking before the audio is complete, for live/low-latency UX); and **post-processing** (run the transcript through a text model to fix domain-specific spellings). And there's a **fully keyless local path** — open STT/TTS models (e.g. `faster-whisper`/`whisper.cpp` for STT, local TTS engines) run on your machine, which is exactly the no-key alternative for this pipeline.",
  },
  {
    type: "quiz",
    question: "Your voice-notes app transcribes 20-second clips perfectly, then fails the first time a user records a 45-minute meeting. What's the root cause and fix?",
    choices: [
      "The model is broken; switch providers",
      "The audio exceeds the transcription size limit (~25 MB). Chunk the long recording into sub-limit pieces (splitting on silence, not mid-sentence), transcribe each with per-chunk error handling, and concatenate the transcripts — long-audio handling is required, not optional",
      "45-minute meetings can't be transcribed by any system",
      "Re-record the meeting in a smaller room",
    ],
    answerIndex: 1,
    explanation: "Short clips fit under the upload cap; a 45-minute recording blows past ~25 MB and the request fails. The engineering fix is chunking on silence into sub-limit pieces, transcribing each with independent error handling, and stitching the transcripts — the exact 'no error handling on long audio' gotcha. It's a pipeline responsibility, not a model or provider defect.",
  },
  {
    type: "quiz",
    question: "For a live voice assistant, users complain about a long pause before it 'starts talking.' Which change most directly reduces perceived latency?",
    choices: [
      "Use the highest-quality TTS model at maximum settings",
      "Stream both directions — begin transcribing as audio arrives and stream TTS audio out as text is generated (and pick low-latency audio formats), so speech begins before the full reply is synthesized, instead of processing each stage as a completed batch",
      "Send the audio as an uncompressed WAV every time",
      "Add more text to the LLM prompt",
    ],
    answerIndex: 1,
    explanation: "Perceived latency comes from waiting for each stage to fully complete before the next starts. Streaming STT in and TTS out (with low-latency formats) lets the assistant begin responding before the entire reply is synthesized, collapsing the pause. Maxing TTS quality or sending huge uncompressed audio increases latency; more prompt text doesn't help.",
  },
  {
    type: "takeaways",
    items: [
      "A voice assistant is a pipeline (audio→STT→LLM→TTS→audio), not a new model; STT/TTS are transducers, the LLM is the intelligence — keep the three stages separate.",
      "STT: audio.transcriptions.create(model, file).text; TTS: audio.speech.create(model, voice, input) → audio bytes in a chosen format. Model/voice ids churn — use your provider's current list.",
      "Transcription caps upload size (~25 MB) and formats — long audio MUST be chunked on silence with per-chunk error handling; know your format's byte rate.",
      "Reach for diarization (who spoke), timestamps (captions/search), and streaming (low latency) when the use case needs them.",
      "Disclose AI-generated voices; a keyless local path (faster-whisper/whisper.cpp + local TTS) runs the whole pipeline without an API key.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Transcribe real audio and see where STT is accurate and where it isn't. With a key, use a hosted model; keyless, run a local Whisper (faster-whisper/whisper.cpp) or reason precisely about chunking and formats — the pipeline judgement is the point.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Transcribe a clip and probe accuracy (guided)",
    intro: "Find STT's strengths and failure modes on your own audio.",
    steps: [
      { order: 1, action: "Transcribe a clean short clip (clear speech, no noise). Check accuracy — this is the easy case.", expected: "Near-perfect transcript on clean speech." },
      { order: 2, action: "Now transcribe something harder: background noise, an accent, overlapping speakers, or domain jargon (product names, acronyms). Note the specific errors.", decision: "Which errors would break your downstream feature, and could a prompt/keywords hint or a post-processing text pass fix the domain-term mistakes?" },
      { order: 3, action: "Take an audio file longer than the size limit (or reason about one): compute chunk boundaries with the sizing math, split on silence, transcribe each chunk, and concatenate.", verify: "You transcribed clean and hard audio, identified the failure modes, and produced (or precisely planned) a chunked transcript for a long file." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "You transcribed clean vs noisy/accented/jargon audio and compared accuracy.",
      "You identified which STT errors would break your downstream feature.",
      "You chunked (or precisely planned chunking for) a file over the size limit, splitting on silence.",
      "You considered a keywords hint or post-processing pass for domain terms.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a voice Q&A pipeline**: spoken question → STT → LLM answer → TTS → spoken reply. This is Project **P5, milestone p5-01** (a single-modality — here, audio — feature). It's the clearest demonstration that a voice assistant is your text stack wrapped in two audio transducers.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour (P5 milestone p5-01) + P5 evolution",
    md: "p5-01 completion: *the pipeline answers spoken questions aloud*. Assemble three swappable stages — **STT** (audio→text), **LLM** (text→answer, reuse your existing prompting), **TTS** (answer→audio) — with real error handling at each seam. **P5 evolution:** p5-01 is the 'single-modality feature' pillar of P5. (P5 accepts *either* a vision feature *or* this voice pipeline for p5-01; if your P5 centers on document understanding you may instead satisfy p5-01 with a vision feature. Build the one your app needs.) **Disclose the AI voice.** Hosted STT/TTS need a key from the environment; a local Whisper + local TTS path is the keyless alternative."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — voice Q&A pipeline",
    intro: "Three stages, real seams. Acceptance defines done.",
    steps: [
      { order: 1, action: "Stage 1 (STT): accept an audio question and transcribe it. Handle long audio (chunk if needed) and empty/unintelligible audio (ask to repeat, don't crash).", decision: "What does the pipeline do when the transcript is empty or garbled — pass junk to the LLM, or detect and re-prompt?" },
      { order: 2, action: "Stage 2 (LLM): send the transcript to your LLM (reuse your prompting/RAG). Stage 3 (TTS): synthesize the answer to audio and play/return it. Disclose that the voice is AI-generated.", expected: "Spoken question in → spoken answer out; the AI voice is disclosed." },
      { order: 3, action: "Handle errors at each seam (STT failure, LLM error/timeout, TTS failure) with clear fallbacks. Read keys from the environment; keep each stage swappable (hosted or local).", verify: "The pipeline answers spoken questions aloud, handles long/empty audio and per-stage failures gracefully, discloses the AI voice, and each stage can be swapped without touching the others." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — P5 milestone p5-01",
    items: [
      "Spoken question → STT → LLM → TTS → spoken answer, end to end.",
      "Long audio chunked; empty/garbled audio detected and re-prompted, not passed downstream.",
      "Per-seam error handling (STT/LLM/TTS) with clear fallbacks.",
      "AI voice disclosed; keys from environment; stages swappable (hosted or local).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — three-stage voice Q&A pipeline (structure; model ids illustrative)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `from openai import OpenAI
client = OpenAI()   # keys from env

def transcribe(path: str) -> str:                     # STAGE 1: STT
    with open(path, "rb") as f:
        text = client.audio.transcriptions.create(model="gpt-transcribe", file=f).text
    if not text or not text.strip():
        raise ValueError("empty transcript — ask the user to repeat")
    return text

def answer(question: str) -> str:                     # STAGE 2: LLM (reuse your stack)
    resp = client.responses.create(
        model="gpt-4o-mini",
        input=f"Answer concisely and clearly for text-to-speech:\\n{question}")
    return resp.output_text

def speak(text: str, path: str) -> str:               # STAGE 3: TTS
    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts", voice="coral", input=text,
        instructions="Calm, clear, conversational.") as r:
        r.stream_to_file(path)
    return path

def voice_qa(audio_in: str, audio_out: str) -> str:
    # Disclose to the user that the reply voice is AI-generated (UX/compliance).
    try:
        q = transcribe(audio_in)          # each seam handled independently
    except ValueError:
        return speak("Sorry, I didn't catch that. Please try again.", audio_out)
    try:
        a = answer(q)
    except Exception:
        a = "I'm having trouble answering right now. Please try again shortly."
    return speak(a, audio_out)            # -> path to spoken answer`,
  },
];

export const content: TopicContent = {
  "unit-mm-speech-audio-01": learn,
  "unit-mm-speech-audio-02": practice,
  "unit-mm-speech-audio-03": build,
};
