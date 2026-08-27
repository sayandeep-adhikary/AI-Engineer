import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "What Embeddings Represent" (topic-emb-concepts).
// 2 units: 01 learn (intuition + metrics) · 02 review (predict rankings + mastery).
// Concept-first. Real-embedding similarity numbers are labelled REPRESENTATIVE
// (they vary by model); the deterministic cosine math lives in the similarity topic.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Embeddings are the foundation of everything retrieval-shaped: semantic search, RAG, recommendations, clustering. Before you generate or compare them, you need an *accurate* mental model — one that survives contact with real systems. The wrong model ('an embedding stores the meaning of the sentence') will lead you to expect guarantees embeddings don't give. This unit builds the right one at an engineering level.",
  },
  {
    type: "prose",
    md: "**Mental model: an embedding is a *learned numerical representation* — a vector of numbers in which relationships the model found useful are reflected as *geometry*.** Text goes in; a fixed-length list of floats comes out. The key word is *learned*: nothing was hand-designed. During training the model arranged text so that patterns it needed (topic, usage, some notion of meaning) correspond to *directions and distances* in the space. So texts that the model 'treats similarly' land near each other. Avoid 'the vector contains the meaning' — it's more honest to say *certain useful relationships are encoded geometrically*, and you access them by measuring distances.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Embedding / vector", definition: "A fixed-length list of floats (e.g. 1536 numbers) representing a piece of text as a point in a high-dimensional space." },
      { term: "Dimensions", definition: "How many numbers are in the vector. Model-specific (some 384, some 1536, some 3072). More isn't automatically 'better' — it's a model property." },
      { term: "Embedding space", definition: "The learned coordinate system the vectors live in. 'Near' is defined by a distance/similarity metric, and is specific to the model that produced it." },
      { term: "Semantic similarity", definition: "Closeness of MEANING as captured by the model — which can differ from keyword overlap (lexical similarity)." },
      { term: "Semantic vs lexical", definition: "Semantic = about meaning; lexical = about shared words/characters. Embeddings target the former; naïve keyword matching the latter." },
    ],
  },
  {
    type: "prose",
    md: "**Why can different wording land nearby, and same wording land far apart?** Because the model learned from how language is *used*, not from surface characters. 'How do I reset my password?' and 'I forgot my login credentials, help' share almost no words yet describe the same intent — a good embedding model places them close. Conversely 'the bank raised rates' and 'the river bank was steep' share the word *bank* but mean unrelated things — they can sit far apart. **Similar wording ≠ similar meaning; different wording ≠ different meaning.** That decoupling is the entire value of embeddings over keyword search.",
  },
  {
    type: "code",
    language: "text",
    caption: "Representative similarity (real embeddings; exact numbers vary by model)",
    code: `Query: "how do I reset my password?"

  "I forgot my login credentials, help"     cosine ~ 0.72   (diff words, SAME meaning)  -> high
  "reset the water heater's password dial"  cosine ~ 0.55   (shared words, other topic) -> lower
  "what's the capital of France?"           cosine ~ 0.08   (unrelated)                 -> low`,
  },
  {
    type: "prose",
    md: "Those numbers are **illustrative** — real values depend on the embedding model — but the *pattern* is the point and it's reproducible: the meaning-match outranks the word-match, and the unrelated sentence is near zero. You'll compute real numbers in the generating/similarity topics; here, internalise that **meaning-closeness, not word-overlap, is what the geometry reflects.**",
  },
  {
    type: "callout",
    variant: "note",
    title: "Optional experiment (embedding API) — or reason it through",
    md: "If you have an embedding API key, embed the four sentences above, compute pairwise cosine similarity, and confirm the *ordering*: the same-meaning pair scores highest, the shared-word/different-topic pair lower, the unrelated one near zero. **No key?** Predict the ranking first from meaning alone, then check it against the illustrative table — the exercise is training your intuition that the model ranks by meaning, so *your* meaning-based prediction should match the ordering. (You'll do the real computation with live vectors in the next two topics.)",
  },
  {
    type: "prose",
    md: "**What an embedding does NOT give you:**\n\n- **Not a human-readable feature list.** Dimension 431 isn't 'formality' and dimension 900 isn't 'topic'. The axes are entangled and mostly uninterpretable — you use *distances*, not individual numbers.\n- **Not a guarantee of correctness or truth.** Two false statements about the same topic can be close; closeness is about relatedness, not accuracy.\n- **Not universal.** 'Nearby' is defined by the *model* and the *task*. Two models produce **different, incompatible spaces** — a vector from model A is meaningless to model B (more in the next topic).\n- **Not magic understanding.** It's a learned statistical representation, powerful but bounded by the model's training and the same limits you met in the fundamentals topics.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "'Nearby' is model- and task-relative — vectors from different models don't mix",
    md: "A frequent early mistake: treating embedding space as one universal map. It isn't. Each model *learns its own space*, so a vector produced by `model-A` and a vector produced by `model-B` live in different coordinate systems — comparing them yields nonsense, even if they happen to have the same number of dimensions. And 'similar' is *task-relative*: for a support bot, two tickets about billing are 'similar'; for a language-detection task, 'similar' might mean 'same language, different topic'. So there's no absolute notion of closeness — it's whatever the chosen model encoded, measured by whatever metric you pick. This is why the next topics stress: **embed documents and queries with the *same* model.**",
  },
  {
    type: "quiz",
    question: "Two documents share almost no words but describe the same concept, and an embedding model rates them highly similar. Why can that happen — and what does it tell you about embeddings vs keyword search?",
    choices: [
      "The model is broken; low word overlap should mean low similarity",
      "Embeddings encode meaning/usage learned from data, so same-meaning texts land nearby regardless of shared words — which is exactly the advantage over keyword matching",
      "They must actually share hidden keywords",
      "High similarity always means the documents are identical",
    ],
    answerIndex: 1,
    explanation: "Embeddings reflect learned relationships of meaning/usage, not surface word overlap, so paraphrases sit close. That decoupling of meaning from wording is the core reason semantic search beats keyword search on 'different words, same intent' queries.",
  },
  {
    type: "quiz",
    question: "A developer computes cosine similarity between a vector from embedding-model-A and a vector from embedding-model-B (both 1536-dim) and gets confusing results. What's wrong?",
    choices: [
      "Nothing; same dimension means comparable",
      "Each model learns its OWN space, so vectors from different models aren't comparable — same dimensionality doesn't make two spaces the same; you must embed everything you compare with one consistent model",
      "1536 dimensions is too many to compare",
      "They should have used Euclidean distance",
    ],
    answerIndex: 1,
    explanation: "Embedding spaces are model-specific coordinate systems; a vector only has meaning relative to the model that produced it. Matching dimensionality is coincidental, not compatibility. Everything you intend to compare must be embedded by the same model.",
  },
  {
    type: "takeaways",
    items: [
      "An embedding is a learned vector where useful relationships (esp. meaning/usage) are encoded as geometry — you read it via distances, not individual numbers.",
      "Embeddings capture semantic similarity, decoupling meaning from wording: similar words ≠ similar meaning, and vice-versa.",
      "Dimensions are model-specific; more isn't automatically better; axes aren't human-readable features.",
      "'Nearby' is model- and task-relative; vectors from different models are incompatible even at equal dimensionality.",
      "Embeddings don't guarantee truth or understanding — closeness means relatedness, not correctness.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Test whether you can *predict* embedding behaviour from meaning, then explain the mechanism in your own words.",
  },
  {
    type: "quiz",
    question: "Rank these by expected similarity to the query 'affordable laptops for students': (a) 'budget notebooks for college', (b) 'expensive gaming desktops', (c) 'cheap airline tickets'. Which ordering reflects semantic similarity?",
    choices: [
      "b > a > c (shared word 'desktops')",
      "a > b > c — (a) is a paraphrase of the same intent; (b) is the same domain but opposite on price/type; (c) shares 'cheap/affordable' sense but a different domain",
      "c > a > b (both mention money)",
      "All equal — they're all about products",
    ],
    answerIndex: 1,
    explanation: "Semantic similarity tracks meaning: 'budget notebooks for college' restates 'affordable laptops for students' almost exactly, so it ranks first. Gaming desktops share the computing domain but differ on price and product type. Cheap airline tickets share only a vague 'low cost' sense in an unrelated domain. Meaning, not shared words, drives the ranking.",
  },
  {
    type: "quiz",
    question: "Which statement is the most accurate description of an embedding?",
    choices: [
      "A compressed dictionary that stores the sentence's meaning in readable fields",
      "A learned numerical vector in which relationships useful to the model (notably meaning/usage) are reflected geometrically, compared via a distance metric",
      "A hash of the text that's identical for similar texts",
      "A list of the keywords in the text",
    ],
    answerIndex: 1,
    explanation: "Embeddings are learned vectors whose geometry reflects useful relationships; you access those relationships through distances/similarity, not by reading fields. They're not readable meaning-stores, not hashes, and not keyword lists.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — explain the mechanism.** No step-by-step; write it as if teaching a peer.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Explain why different-wording sentences can occupy nearby regions",
    intro: "Combine the unit into a clear, non-hand-wavy explanation.",
    steps: [
      { order: 1, action: "In 3–5 sentences, explain WHY 'reset my password' and 'I forgot my login' can be near each other in embedding space, grounded in 'learned from usage' and 'geometry reflects relationships' — without saying the vector 'contains the meaning'.", decision: "What is the single sentence most people get wrong about embeddings, and how does your explanation correct it?" },
      { order: 2, action: "Give one example of same-wording/different-meaning (e.g. 'bank') and explain why those can be FAR apart despite shared words.", expected: "Your explanation ties distance to learned meaning/usage, not to shared characters or a readable feature list." },
      { order: 3, action: "State one engineering consequence of 'each model has its own space' for someone building search.", verify: "Your answer names the same-model rule (embed documents and queries with one consistent model) as the consequence, and avoids the 'stores the meaning' framing." },
    ],
  },
  {
    type: "checkpoint",
    title: "Self-check",
    items: [
      "You can explain nearness via 'learned from usage / geometry reflects relationships', not 'stores the meaning'.",
      "You can give a same-word/different-meaning example and why it's far apart.",
      "You can state why vectors from different models aren't comparable.",
      "You can name the same-model rule as an engineering consequence.",
    ],
  },
];

export const content: TopicContent = {
  "unit-emb-concepts-01": learn,
  "unit-emb-concepts-02": review,
};
