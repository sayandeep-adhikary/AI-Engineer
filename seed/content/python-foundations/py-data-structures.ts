import type { ContentBlock, TopicContent } from "../../types";

// Rich learning content for "Data Handling & JSON" (topic-py-data-structures).
// Follows the Python Essentials quality bar. Every Python example is runnable and
// its stated output matches CPython behaviour. Units:
//   01 learn     — JSON & nested data (teach)
//   02 practice  — Transform API payloads (guided → independent)
//   03 build     — Normalize a nested JSON file (independent build)
//   04 review    — Debug a broken parser (troubleshoot) + retrieval + mastery

// ── 1.2.1 · Learn — JSON & nested data ───────────────────────────────────────
const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Every LLM and web API you will touch speaks **JSON**. You send JSON, you get JSON back, and that JSON is almost always **nested** — objects inside arrays inside objects. The single most common task in AI engineering is not calling the model; it is *reshaping the messy nested response into the clean structure your code needs*. This unit makes that reflexive.",
  },
  {
    type: "prose",
    md: "**Mental model: JSON is a tree; Python holds it as nested dicts and lists.** There is a hard boundary between *text* (the JSON string that travels over the network) and *objects* (the Python values you work with). You cross that boundary deliberately: `json.loads` turns text into objects, `json.dumps` turns objects back into text. Everything between those two calls is ordinary dict/list manipulation — no JSON magic.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Serialize / `json.dumps`", definition: "Turn Python objects into a JSON **string** (for sending/saving). `dumps` = dump-string." },
      { term: "Deserialize / `json.loads`", definition: "Parse a JSON **string** into Python objects (for reading). `loads` = load-string." },
      { term: "`json.load` / `json.dump`", definition: "The file versions: read from / write to an open file object, no `s`." },
      { term: "Object → dict, array → list", definition: "A JSON object becomes a Python `dict`; a JSON array becomes a `list`. This mapping is the whole game." },
      { term: "JSONDecodeError", definition: "Raised by `json.loads` when the text is not valid JSON. It is a subclass of `ValueError`." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "The type mapping, and the parse/serialize boundary",
    code: `import json

raw = '{"model": "gpt-4o", "stream": true, "stop": null, "n": 2}'
data = json.loads(raw)          # text  -> Python objects
print(data)
print(type(data["stream"]), type(data["stop"]))

back = json.dumps(data)          # objects -> text
print(back)`,
    output: `{'model': 'gpt-4o', 'stream': True, 'stop': None, 'n': 2}
<class 'bool'> <class 'NoneType'>
{"model": "gpt-4o", "stream": true, "stop": null, "n": 2}`,
  },
  {
    type: "prose",
    md: "Note the translations across the boundary: JSON `true`/`false`/`null` become Python `True`/`False`/`None`, and back again. Also note the quotes — **JSON requires double quotes**; Python's `print` of a dict shows single quotes, but that repr is *not* JSON. Confusing the two is a real source of bugs (covered below).",
  },
  {
    type: "code",
    language: "python",
    caption: "Navigating a realistic (nested) API response",
    code: `resp = {
    "choices": [
        {"index": 0, "message": {"role": "assistant", "content": "Hello!"}}
    ],
    "usage": {"prompt_tokens": 9, "completion_tokens": 3},
}

# Walk the tree: key into dicts, index into lists.
text = resp["choices"][0]["message"]["content"]
print(text)
print(resp["usage"]["completion_tokens"])`,
    output: `Hello!
3`,
  },
  {
    type: "prose",
    md: "Reading `resp[\"choices\"][0][\"message\"][\"content\"]` left to right: key into the `choices` list, take element `0`, key into its `message` dict, then its `content`. **Dicts are keyed with `[\"...\"]`; lists are indexed with `[0]`.** Mixing them up (`resp[\"choices\"][\"0\"]`, or `resp[0]`) is the classic nested-access error.",
  },
  {
    type: "code",
    language: "python",
    caption: "Safe access when a key might be missing",
    code: `config = {"model": "gpt-4o"}

print(config.get("temperature"))          # missing -> None, no crash
print(config.get("temperature", 0.7))     # supply a default
# print(config["temperature"])            # KeyError: 'temperature'

# Safe NESTED access when an intermediate object may be absent:
resp = {"choices": []}
usage = resp.get("usage", {}).get("total_tokens")
print(usage)                              # None, still no crash`,
    output: `None
0.7
None`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "`.get()` only protects ONE level — nested access still explodes",
    md: "People learn `.get()` and assume it makes access safe everywhere. It doesn't. `data.get(\"user\")[\"email\"]` still raises if `user` is missing, because `.get(\"user\")` returns `None` and `None[\"email\"]` is a `TypeError`. To protect a nested path, default each level to an empty dict:\n\n```\nemail = data.get(\"user\", {}).get(\"email\")\n```\n\nThe `{}` gives the next `.get` something safe to call. This exact pattern reappears in the troubleshooting exercise — learn it now.",
  },
  {
    type: "code",
    language: "python",
    caption: "Serializing: the options you will actually use",
    code: `import json
record = {"name": "José", "roles": ["admin", "beta"], "active": True}

print(json.dumps(record))                              # compact, ASCII-escaped
print(json.dumps(record, indent=2, sort_keys=True))    # pretty + stable order
print(json.dumps(record, ensure_ascii=False))          # keep real Unicode`,
    output: `{"name": "Jos\\u00e9", "roles": ["admin", "beta"], "active": true}
{
  "active": true,
  "name": "Jos\\u00e9",
  "roles": [
    "admin",
    "beta"
  ]
}
{"name": "José", "roles": ["admin", "beta"], "active": true}`,
  },
  {
    type: "prose",
    md: "`indent=2` pretty-prints (great for files and debugging); `sort_keys=True` gives deterministic output (great for diffs and caching keys); `ensure_ascii=False` stops non-ASCII characters being escaped to `\\uXXXX`. By default `ensure_ascii=True`, which is why `José` serializes as `Jos\\u00e9` — valid JSON, just noisy.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "JSON keys are ALWAYS strings — your int keys silently change",
    md: "JSON has no concept of a non-string key. If you `dumps` a dict with integer keys, Python **converts them to strings**, and after a round-trip they come back as strings — so a lookup by the original `int` fails.\n\nAssumed: `{1: \"a\"}` round-trips unchanged. Actually: it becomes `{\"1\": \"a\"}`, and `result[1]` then raises `KeyError`. Recognise it when a dict that 'worked' before saving/loading suddenly misses keys. Correct approach: key by strings deliberately, or convert with `int(k)` after loading.",
  },
  {
    type: "code",
    language: "python",
    caption: "Round-trips are lossy: int keys → strings, tuples → lists",
    code: `import json

original = {1: "a", 2: "b"}
restored = json.loads(json.dumps(original))
print(restored)                 # keys are now strings
print(1 in restored)            # the int key is gone

print(json.loads(json.dumps((10, 20))))   # a tuple comes back as a list`,
    output: `{'1': 'a', '2': 'b'}
False
[10, 20]`,
  },
  {
    type: "callout",
    variant: "warning",
    title: "Not everything is serializable — datetime and set raise TypeError",
    md: "`json.dumps` only knows the basic JSON types. Hand it a `datetime`, `set`, `Decimal`, or a custom object and it raises `TypeError: Object of type datetime is not JSON serializable`. Fix it explicitly: convert first (`dt.isoformat()`, `list(my_set)`) or pass `default=str` to stringify unknown values. Silently `str()`-ing everything is convenient but lossy — prefer converting the specific fields you care about.",
  },
  {
    type: "code",
    language: "python",
    caption: "Pairing and counting: enumerate & zip",
    code: `models = ["gpt-4o", "claude", "llama"]
latency = [120, 95]              # note: one shorter than models

for i, name in enumerate(models, start=1):
    print(i, name)

paired = list(zip(models, latency))
print(paired)                    # 'llama' has no partner`,
    output: `1 gpt-4o
2 claude
3 llama
[('gpt-4o', 120), ('claude', 95)]`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "`zip` stops at the SHORTEST input — silently dropping data",
    md: "`zip` does not warn when its inputs have different lengths; it just stops at the end of the shortest one. Above, `llama` is dropped from `paired` with no error. If you expected three pairs and got two, this is why. When you genuinely need every item, use `itertools.zip_longest(..., fillvalue=...)`, or assert `len(a) == len(b)` first.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Never mutate a collection while iterating over it",
    md: "Deleting from a dict inside a `for k in d:` loop raises `RuntimeError: dictionary changed size during iteration`. Deleting from a **list** while looping is worse — it fails *silently*: removing an item shifts every later item left, so the loop's index skips the next one. The code below is supposed to remove all even numbers but leaves one behind. Iterate over a **copy** (`for n in nums[:]:`) or, better, build a new collection with a comprehension.",
  },
  {
    type: "code",
    language: "python",
    caption: "The silent list-mutation bug (and the fix)",
    code: `nums = [2, 4, 6]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)       # mutating while iterating
print(nums)                  # expected [] ...

# Correct: filter into a new list, never mutate the one you iterate.
nums = [2, 4, 6]
odds = [n for n in nums if n % 2 == 1]
print(odds)`,
    output: `[4]
[]`,
  },
  {
    type: "prose",
    md: "Trace the bug: at index 0 it removes `2`, so the list is now `[4, 6]`; the loop advances to index 1, which is now `6`, removes it → `[4]`; index 2 is out of range, loop ends. `4` was never examined because everything shifted under the iterator. The comprehension version can't have this bug because it reads the original and writes a *new* list.",
  },
  {
    type: "takeaways",
    items: [
      "`json.loads` (text → objects) and `json.dumps` (objects → text) are the only boundary; in between it's plain dicts and lists.",
      "JSON object ↔ dict, array ↔ list, true/false/null ↔ True/False/None. JSON uses double quotes only.",
      "Key dicts with [\"k\"], index lists with [0]; safe nested access chains `.get(\"a\", {}).get(\"b\")`.",
      "Round-trips are lossy: int keys become strings, tuples become lists.",
      "datetime/set/Decimal aren't serializable — convert them or use default=str.",
      "zip stops at the shortest input silently; never mutate a list/dict while iterating it.",
    ],
  },
];

// ── 1.2.2 · Practice — Transform API payloads (guided → independent) ──────────
const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Reshaping nested payloads into flat, usable records is the daily work this topic exists for. Run every exercise in a real Python process. Guidance decreases across the three levels: the first walks you through the shape decisions, the last hands you only a requirement and an acceptance check.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Extract a flat list from a nested response (guided)",
    intro: "Pull just the assistant message texts out of a chat-completion-shaped response.",
    steps: [
      {
        order: 1,
        action: "Look at the `response` in the next block. Identify the path from the root to a single message's text.",
        expected: "It is `response[\"choices\"][i][\"message\"][\"content\"]` — a list of choices, each with a message dict.",
      },
      {
        order: 2,
        action: "Decide how to iterate the choices and collect each content string.",
        decision: "A list comprehension (`[c[\"message\"][\"content\"] for c in response[\"choices\"]]`) or a for-loop both work. Which reads more clearly here? Commit before revealing.",
      },
      {
        order: 3,
        action: "Build `texts` and print it.",
        expected: "`['Hi there', 'How can I help?']` — one string per choice, in order.",
        verify: "len(texts) equals len(response[\"choices\"]).",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — input + expected output",
    code: `response = {
    "choices": [
        {"message": {"role": "assistant", "content": "Hi there"}},
        {"message": {"role": "assistant", "content": "How can I help?"}},
    ]
}
# build -> texts, then print(texts)
# Expected: ['Hi there', 'How can I help?']`,
    output: `['Hi there', 'How can I help?']`,
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `texts = [c["message"]["content"] for c in response["choices"]]
print(texts)`,
    output: `['Hi there', 'How can I help?']`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Flatten records with defaults (less guidance)",
    intro: "You get requirements and the expected output. Choose the implementation.",
    steps: [
      {
        order: 1,
        action: "Turn each nested `user` record into a flat dict `{\"id\": ..., \"city\": ..., \"plan\": ...}`.",
        decision: "`city` lives at `user[\"address\"][\"city\"]`, but `address` may be missing or null, and `plan` may be absent entirely. Which access pattern protects BOTH levels without crashing? (Recall the one-level `.get` gotcha.)",
      },
      {
        order: 2,
        action: "Missing city → None; missing plan → the string \"free\". Produce a list of flat dicts and print it.",
        expected: "See the expected output in the next block — three flat records, no exceptions.",
        verify: "The record with a null address yields city=None, not a crash.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 2 — input + expected output",
    code: `users = [
    {"id": 1, "address": {"city": "London"}, "plan": "pro"},
    {"id": 2, "address": None},                 # null address, no plan
    {"id": 3, "plan": "team"},                   # no address at all
]
# Expected:
# [{'id': 1, 'city': 'London', 'plan': 'pro'},
#  {'id': 2, 'city': None, 'plan': 'free'},
#  {'id': 3, 'city': None, 'plan': 'team'}]`,
    output: `[{'id': 1, 'city': 'London', 'plan': 'pro'}, {'id': 2, 'city': None, 'plan': 'free'}, {'id': 3, 'city': None, 'plan': 'team'}]`,
  },
  {
    type: "code",
    language: "python",
    caption: "Level 2 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `flat = []
for u in users:
    address = u.get("address") or {}     # guards both missing AND null
    flat.append({
        "id": u.get("id"),
        "city": address.get("city"),
        "plan": u.get("plan", "free"),
    })
print(flat)`,
    output: `[{'id': 1, 'city': 'London', 'plan': 'pro'}, {'id': 2, 'city': None, 'plan': 'free'}, {'id': 3, 'city': None, 'plan': 'team'}]`,
  },
  {
    type: "prose",
    md: "Why `u.get(\"address\") or {}` and not `u.get(\"address\", {})`? Because the second only helps when the key is *missing* — it returns `None` when the value is explicitly `null`. The `or {}` idiom covers both missing **and** null in one move, because both are falsy. That distinction is exactly what breaks real parsers.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 3 — Clean a messy feed (independent)",
    intro: "A realistic requirement and acceptance criteria. No implementation steps.",
    steps: [
      {
        order: 1,
        action: "Write `clean_messages(items)` that turns the raw feed (next block) into a list of `{\"role\": str, \"text\": str}` dicts.",
      },
      {
        order: 2,
        action: "Acceptance: skip any item whose `text` is missing, null, or empty; default a missing `role` to \"user\"; strip surrounding whitespace from text; preserve order.",
        decision: "Which items in the sample should survive, and what is the exact expected output? Work it out before you code, then verify against the acceptance line.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 3 — input + expected output",
    code: `items = [
    {"role": "user", "text": "  hello  "},
    {"text": "no role here"},
    {"role": "assistant", "text": ""},        # empty -> skip
    {"role": "assistant", "text": None},       # null  -> skip
    {"role": "user"},                          # missing text -> skip
    {"role": "assistant", "text": "done"},
]
# Expected:
# [{'role': 'user', 'text': 'hello'},
#  {'role': 'user', 'text': 'no role here'},
#  {'role': 'assistant', 'text': 'done'}]`,
    output: `[{'role': 'user', 'text': 'hello'}, {'role': 'user', 'text': 'no role here'}, {'role': 'assistant', 'text': 'done'}]`,
  },
  {
    type: "code",
    language: "python",
    caption: "Level 3 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def clean_messages(items):
    out = []
    for it in items:
        text = it.get("text")
        if not text or not text.strip():      # missing, None, "" or whitespace
            continue
        out.append({"role": it.get("role", "user"), "text": text.strip()})
    return out

print(clean_messages(items))`,
    output: `[{'role': 'user', 'text': 'hello'}, {'role': 'user', 'text': 'no role here'}, {'role': 'assistant', 'text': 'done'}]`,
  },
  {
    type: "checkpoint",
    title: "Verify before moving on",
    items: [
      "You ran all three exercises in a real Python process.",
      "Your Level 2 output has city=None for the null-address record, with no exception.",
      "Your Level 3 output skipped the empty, null, and missing-text items (3 survivors).",
      "You can explain why `.get(\"address\") or {}` beats `.get(\"address\", {})` for null values.",
    ],
  },
];

// ── 1.2.3 · Build — Normalize a nested JSON file (independent) ────────────────
const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build brief.** Nested JSON is great for transport but useless for tabular work — you can't put a dict-inside-a-dict into a CSV or a DataFrame column. Your job is a reusable **normalizer** that flattens nested user records into flat rows. This is the same operation `pandas.json_normalize` performs; building it by hand once makes that tool obvious later.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Loading the file",
    md: "In a real script you'd read the data with `with open(\"users.json\") as f: users = json.load(f)`. For this exercise, work against the in-memory `users` list below so you can focus on the transform — the part that actually contains the judgement calls.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — write normalize_users(users)",
    intro: "Return a list of flat dicts, one per user. No step-by-step; the acceptance criteria define 'done'.",
    steps: [
      {
        order: 1,
        action: "Flatten each user so `address.city` and `address.zip` become top-level `city` and `zip`.",
        decision: "`address` may be a dict, missing, or null. What single expression gives you a safe dict to read `city`/`zip` from in all three cases?",
      },
      {
        order: 2,
        action: "Join the `tags` list into a single comma-separated string; a missing or empty `tags` becomes \"\".",
        expected: "['admin', 'beta'] → \"admin,beta\"; [] or missing → \"\".",
      },
      {
        order: 3,
        action: "Keep `id` and `name` as-is. Do not mutate the input list or its dicts. Match the expected output exactly.",
        verify: "Compare your output to the expected block; then re-run — the input `users` must be unchanged.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Build — input + exact expected output",
    code: `users = [
    {"id": 1, "name": "Ada", "address": {"city": "London", "zip": "E1"}, "tags": ["admin", "beta"]},
    {"id": 2, "name": "Bo", "address": None, "tags": []},
    {"id": 3, "name": "Cy"},
]
# normalize_users(users) must return:
# [{'id': 1, 'name': 'Ada', 'city': 'London', 'zip': 'E1', 'tags': 'admin,beta'},
#  {'id': 2, 'name': 'Bo', 'city': None, 'zip': None, 'tags': ''},
#  {'id': 3, 'name': 'Cy', 'city': None, 'zip': None, 'tags': ''}]`,
    output: `[{'id': 1, 'name': 'Ada', 'city': 'London', 'zip': 'E1', 'tags': 'admin,beta'}, {'id': 2, 'name': 'Bo', 'city': None, 'zip': None, 'tags': ''}, {'id': 3, 'name': 'Cy', 'city': None, 'zip': None, 'tags': ''}]`,
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — all must hold",
    items: [
      "Output matches the expected list exactly for the sample.",
      "A null or missing address yields city=None and zip=None (no KeyError/TypeError).",
      "tags is always a string: joined with commas, or \"\" when empty/missing.",
      "The input `users` list is not mutated (re-print it and confirm).",
      "Reading an unknown field would return None, not raise — you used .get(), not [ ].",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def normalize_users(users):
    rows = []
    for u in users:
        address = u.get("address") or {}
        rows.append({
            "id": u.get("id"),
            "name": u.get("name"),
            "city": address.get("city"),
            "zip": address.get("zip"),
            "tags": ",".join(u.get("tags") or []),
        })
    return rows

print(normalize_users(users))`,
    output: `[{'id': 1, 'name': 'Ada', 'city': 'London', 'zip': 'E1', 'tags': 'admin,beta'}, {'id': 2, 'name': 'Bo', 'city': None, 'zip': None, 'tags': ''}, {'id': 3, 'name': 'Cy', 'city': None, 'zip': None, 'tags': ''}]`,
  },
];

// ── 1.2.4 · Review — Debug a broken parser + retrieval + mastery ──────────────
const review: ContentBlock[] = [
  {
    type: "prose",
    md: "First a real debugging session, then retrieval questions, then a mastery challenge. Work the debugging like an engineer: read the symptom, form hypotheses, and confirm the cause *before* editing code.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom",
    md: "`extract_emails(users)` passed every test locally, but in production it crashes with `TypeError: 'NoneType' object is not subscriptable`. The same code, different data. Nothing was deployed to `extract_emails` itself between the passing test and the crash.",
  },
  {
    type: "code",
    language: "python",
    caption: "The parser + the production record that triggers the crash",
    code: `def extract_emails(users):
    return [u["contact"]["email"] for u in users]

# Local test data (passes):
test = [{"name": "Ada", "contact": {"email": "ada@x.io"}}]
print(extract_emails(test))

# Production data (crashes):
prod = [
    {"name": "Ada", "contact": {"email": "ada@x.io"}},
    {"name": "Bo",  "contact": None},          # <- opted out of contact
]
print(extract_emails(prod))`,
    output: `['ada@x.io']
Traceback (most recent call last):
  ...
TypeError: 'NoneType' object is not subscriptable`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Diagnose it — symptom → root cause → fix → verification",
    intro: "Reason toward the cause; don't just rewrite the function.",
    steps: [
      {
        order: 1,
        action: "OBSERVE: read the error type. 'NoneType is not subscriptable' means something is `None` and you indexed it with `[...]`. Which subscript in the comprehension could hit a `None`?",
        expected: "Either `u` is None, or `u[\"contact\"]` is None (then `[\"email\"]` on None raises).",
      },
      {
        order: 2,
        action: "HYPOTHESES: list the plausible causes before touching data.",
        decision: "(a) a user is missing the `contact` key → that would be KeyError, not TypeError. (b) `contact` is present but `null`. (c) `email` missing → KeyError. The error is TypeError, so which hypothesis survives?",
      },
      {
        order: 3,
        action: "DIAGNOSE: confirm by printing the offending record — `for u in prod: print(u)` — and look at the one just before the crash.",
        expected: "You find `{\"name\": \"Bo\", \"contact\": None}`. In JSON that field was `\"contact\": null`.",
      },
      {
        order: 4,
        action: "ROOT CAUSE: state it in one sentence.",
        expected: "JSON `null` deserialized to Python `None`; `u[\"contact\"]` is `None`; `None[\"email\"]` raises TypeError. The comprehension assumed every user has a non-null contact dict — an assumption the test data never violated.",
      },
      {
        order: 5,
        action: "FIX: rewrite defensively so a missing or null contact is skipped, not fatal. Then VERIFY against the production sample.",
        verify: "Running the fixed version on `prod` returns `['ada@x.io']` with no exception, and Bo is simply absent.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "The fix (and verification)",
    collapsible: true,
    collapseLabel: "Show the fix",
    code: `def extract_emails(users):
    emails = []
    for u in users:
        contact = u.get("contact") or {}     # missing OR null -> {}
        email = contact.get("email")
        if email:
            emails.append(email)
    return emails

print(extract_emails(prod))`,
    output: `['ada@x.io']`,
  },
  {
    type: "prose",
    md: "The lesson generalises: **any field in an API response can be `null`, even when the docs show an object.** A comprehension that reaches through several levels is a landmine on real data. Reach through nullable levels with `.get(... ) or {}`, and decide deliberately whether a missing value should be skipped, defaulted, or reported.",
  },
  {
    type: "quiz",
    question: "What does `json.dumps({1: \"a\", 2: \"b\"})` produce, and why does it matter?",
    choices: [
      "'{1: \"a\", 2: \"b\"}' — keys stay integers",
      "'{\"1\": \"a\", \"2\": \"b\"}' — JSON has no non-string keys, so ints become strings",
      "It raises TypeError — int keys aren't allowed",
      "'{1: a, 2: b}' — quotes are dropped",
    ],
    answerIndex: 1,
    explanation: "JSON keys are always strings, so `dumps` converts the int keys to strings. After a round-trip, `result[1]` raises KeyError because the key is now \"1\". If you need int keys back, convert them after loading.",
  },
  {
    type: "quiz",
    question: "A response may or may not include a `usage` object. You need `total_tokens` or None if usage is absent. Which expression is correct AND crash-safe?",
    choices: [
      "resp[\"usage\"][\"total_tokens\"]",
      "resp.get(\"usage\")[\"total_tokens\"]",
      "resp.get(\"usage\", {}).get(\"total_tokens\")",
      "resp.get(\"usage.total_tokens\")",
    ],
    answerIndex: 2,
    explanation: "`.get(\"usage\", {})` yields an empty dict when usage is absent, and the second `.get` then safely returns None. Option 2 crashes when usage is missing (None[\"total_tokens\"]). Dict `.get` doesn't understand dotted paths, so option 4 just looks up a literal key that doesn't exist.",
  },
  {
    type: "quiz",
    question: "An engineer loops over a list removing items that match a condition, but a few matches survive untouched. What is happening?",
    choices: [
      "Python caches the list, so edits are ignored",
      "Removing during iteration shifts later items left, so the loop's index skips the element after each removal",
      "list.remove() only removes the first occurrence, so duplicates remain",
      "The condition is evaluated once before the loop starts",
    ],
    answerIndex: 1,
    explanation: "The iterator walks by index while the list shrinks underneath it. After removing index i, everything shifts left, so the next element slides into position i and is skipped when the index advances to i+1. Iterate over a copy (`for x in items[:]:`) or build a new list with a comprehension.",
  },
  {
    type: "quiz",
    question: "`json.loads(\"{'name': 'Ada'}\")` raises JSONDecodeError. Why?",
    choices: [
      "'name' is a reserved JSON word",
      "JSON strings and keys must use double quotes; single quotes are invalid JSON",
      "The dict is missing a trailing comma",
      "loads only accepts arrays at the top level",
    ],
    answerIndex: 1,
    explanation: "That text is a Python dict repr, not JSON. JSON requires double quotes for all strings and keys. A frequent cause is trying to parse a printed Python dict — print()/repr use single quotes, which are not valid JSON.",
  },
  {
    type: "quiz",
    question: "You must serialize `{\"created\": datetime.now()}` to JSON for logging. `json.dumps` raises TypeError. What's the best fix?",
    choices: [
      "Wrap the call in try/except and skip the field",
      "Convert the datetime first (e.g. `dt.isoformat()`), or pass `default=str` to dumps",
      "Switch to `json.dump` instead of `json.dumps`",
      "Set `ensure_ascii=False`",
    ],
    answerIndex: 1,
    explanation: "datetime isn't a JSON type. Convert it to a string yourself (isoformat is unambiguous) or give dumps a `default` handler. `json.dump` vs `dumps` only changes file-vs-string output, and ensure_ascii only affects Unicode escaping — neither makes a datetime serializable.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — combine everything, independently.** Write it in a real file. You'll parse a messy event feed with missing fields and null values, count and aggregate it, and handle nested/nullable access safely — the exact judgement this whole topic trains.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build summarize_events(events)",
    intro: "A realistic analytics task. Requirements and acceptance below; no implementation steps.",
    steps: [
      {
        order: 1,
        action: "Return `{\"total_events\": int, \"events_by_type\": dict, \"total_value\": int, \"known_users\": int}`.",
      },
      {
        order: 2,
        action: "total_events = number of events. events_by_type = count of events per `type` value. total_value = sum of `value`, treating a missing value as 0.",
        decision: "How will you count by type without a KeyError on the first sighting of each type? (Recall setdefault / .get / Counter from the earlier topics.)",
      },
      {
        order: 3,
        action: "known_users = number of DISTINCT non-null user ids. A user may be null or missing, and the id lives at `user[\"id\"]`.",
        decision: "Which structure guarantees distinctness, and how do you reach `id` when `user` might be null? (The `... or {}` pattern applies again.)",
      },
      {
        order: 4,
        action: "Do not mutate `events`. Verify against the exact expected output in the next block.",
        verify: "All four fields match; run twice to confirm the input is untouched.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Mastery — input + the exact output you must produce",
    code: `events = [
    {"type": "click",    "user": {"id": "u1"}, "value": 3},
    {"type": "view",     "user": {"id": "u2"}, "value": 1},
    {"type": "click",    "user": None,          "value": 5},   # anonymous
    {"type": "click",    "user": {"id": "u1"}},                 # value missing
    {"type": "purchase", "user": {"id": "u2"}, "value": 10},
]
# summarize_events(events) must return:
# {'total_events': 5,
#  'events_by_type': {'click': 3, 'view': 1, 'purchase': 1},
#  'total_value': 19,
#  'known_users': 2}`,
    output: `{'total_events': 5, 'events_by_type': {'click': 3, 'view': 1, 'purchase': 1}, 'total_value': 19, 'known_users': 2}`,
  },
  {
    type: "callout",
    variant: "tip",
    title: "Optional hints",
    md: "- Use a `set` for `known_users` — adding a duplicate id is a no-op, so `len(set)` is your distinct count.\n- `event.get(\"value\", 0)` makes a missing value contribute 0.\n- `user = event.get(\"user\") or {}` before `user.get(\"id\")` handles both null and missing users.\n- For the type counts, `counts[t] = counts.get(t, 0) + 1` avoids a KeyError on first sighting.",
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "Returns exactly the expected dict for the sample.",
      "total_value treats the value-missing click as 0 (sum is 19, not an error).",
      "known_users is 2 — the anonymous (null user) event is excluded, and u1/u2 are counted once each.",
      "No KeyError/TypeError on the null user or the missing value.",
      "events is not mutated.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `def summarize_events(events):
    by_type = {}
    total_value = 0
    users = set()
    for e in events:
        etype = e.get("type", "unknown")
        by_type[etype] = by_type.get(etype, 0) + 1
        total_value += e.get("value", 0)
        user = e.get("user") or {}
        uid = user.get("id")
        if uid:
            users.add(uid)
    return {
        "total_events": len(events),
        "events_by_type": by_type,
        "total_value": total_value,
        "known_users": len(users),
    }

print(summarize_events(events))`,
    output: `{'total_events': 5, 'events_by_type': {'click': 3, 'view': 1, 'purchase': 1}, 'total_value': 19, 'known_users': 2}`,
  },
  {
    type: "takeaways",
    items: [
      "Any API field can be null even when documented as an object — reach through nullable levels with `.get(...) or {}`.",
      "TypeError 'NoneType not subscriptable' almost always means a JSON null reached code that expected a dict/list.",
      "Aggregate safely: `.get(key, 0)` for sums, a set for distinct counts, `.get(k, 0)+1` for tallies.",
      "You can now parse, navigate, reshape, and debug messy nested JSON — the bar for this topic.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-data-structures-01": learn,
  "unit-py-data-structures-02": practice,
  "unit-py-data-structures-03": build,
  "unit-py-data-structures-04": review,
};
