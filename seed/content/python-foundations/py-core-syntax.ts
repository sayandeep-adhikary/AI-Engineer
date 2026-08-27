import type { ContentBlock, TopicContent } from "../../types";

// Rich learning content for the "Python Essentials" topic (topic-py-core-syntax).
// Keyed by unit id so it can be merged onto the existing units without touching
// unit definitions or ids. All Python examples are runnable and their stated
// outputs match CPython behaviour. This file is the quality bar for future topics.

// ── 1.1.1 · Learn — Core syntax tour ─────────────────────────────────────────
const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Before you assemble AI systems you need to write small Python scripts **without thinking about syntax**. This unit builds the mental model that everything else in the roadmap depends on: how Python stores data, when things are copied versus shared, and which behaviours will silently bite you later when you are parsing API responses at 2am.",
  },
  {
    type: "prose",
    md: "**The one mental model that matters: names point at objects.** A variable in Python is not a box that holds a value — it is a *label* attached to an object that lives somewhere in memory. Assignment (`=`) never copies the object; it just points another label at the same object. This single idea explains most of the surprises below.",
  },
  {
    type: "code",
    language: "python",
    caption: "Assignment binds a name to an object — it does not copy",
    code: `a = [1, 2, 3]
b = a          # b is a SECOND label on the SAME list
b.append(4)

print(a)        # a sees the change too
print(a is b)   # same object in memory?`,
    output: `[1, 2, 3, 4]
True`,
  },
  {
    type: "prose",
    md: "`a` changed even though you only touched `b`, because there is only **one** list with two names. `is` asks *“are these the same object?”* and the answer is `True`. If you actually want an independent copy, you have to ask for one: `b = a.copy()` (or `list(a)`).",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Object", definition: "The actual data in memory (a specific list, string, int). Every value in Python is an object." },
      { term: "Name / binding", definition: "A label pointing at an object. `x = 5` binds the name `x` to the int object `5`." },
      { term: "Mutable", definition: "Can be changed in place after creation: list, dict, set. Mutating through one name is visible through every name for that object." },
      { term: "Immutable", definition: "Cannot be changed in place: int, float, str, bool, tuple, None. 'Changing' one really creates a new object." },
      { term: "Identity vs equality", definition: "`is` compares identity (same object); `==` compares value. You almost always want `==`." },
    ],
  },
  {
    type: "prose",
    md: "**The core data types**, and when to reach for each:\n\n- `int` / `float` — numbers. Ints are *arbitrary precision* (no overflow); floats are IEEE-754 and therefore approximate.\n- `str` — text, **immutable**. Slicing and methods return new strings.\n- `bool` — `True` / `False`. Secretly a subclass of `int` (`True == 1`).\n- `None` — the *absence* of a value. Its own type; compared with `is`.\n- `list` — ordered, mutable, allows duplicates. Your default container.\n- `tuple` — ordered, **immutable**. Fixed-size records, safe dict keys.\n- `dict` — key → value map, insertion-ordered (since 3.7), mutable. The backbone of JSON/API work.\n- `set` — unordered collection of **unique** items. Fast membership tests and dedup.",
  },
  {
    type: "code",
    language: "python",
    caption: "Immutable strings: methods return NEW strings",
    code: `name = "ada"
# name[0] = "A"        # TypeError: 'str' object does not support item assignment
proper = name.capitalize()

print(proper)           # a new string
print(name)             # the original is untouched

tokens = 1280
print(f"Using {tokens} tokens (~{tokens / 4:.0f} words)")`,
    output: `Ada
ada
Using 1280 tokens (~320 words)`,
  },
  {
    type: "prose",
    md: "Because strings are immutable, `capitalize()` cannot edit `name` in place — it returns a brand-new string. Forgetting to *assign* the result (`name.capitalize()` on its own line, throwing the value away) is one of the most common beginner mistakes. The last line is an **f-string**: `{...}` embeds an expression, and `:.0f` is a format spec meaning “fixed-point, zero decimals”.",
  },
  {
    type: "code",
    language: "python",
    caption: "dict access: [] raises, .get() is forgiving",
    code: `config = {"model": "gpt-4o", "max_tokens": 512}

print(config["model"])              # direct access
print(config.get("temperature"))    # missing key -> None, no crash
print(config.get("temperature", 0.7))  # supply a default
# config["temperature"]             # KeyError: 'temperature'`,
    output: `gpt-4o
None
0.7`,
  },
  {
    type: "prose",
    md: "`config[\"temperature\"]` would raise `KeyError` because the key is absent. `.get()` returns `None` (or a default you provide) instead. When you are reading provider responses whose shape you do not fully control, `.get()` with a sensible default is usually the safer call.",
  },
  {
    type: "code",
    language: "python",
    caption: "Comprehensions: build a container from an expression + loop",
    code: `nums = [1, 2, 3, 4, 5, 6]

evens = [n for n in nums if n % 2 == 0]      # list comprehension
squares = {n: n * n for n in range(1, 4)}    # dict comprehension
letters = {c for c in "banana"}              # set comprehension (dedups)

print(evens)
print(squares)
print(sorted(letters))`,
    output: `[2, 4, 6]
{1: 1, 2: 4, 3: 9}
['a', 'b', 'n']`,
  },
  {
    type: "prose",
    md: "Comprehensions are the Pythonic replacement for the `result = []; for ...: result.append(...)` pattern. Read them left-to-right: *“give me `n` for each `n` in `nums` where `n` is even.”* The set comprehension over `\"banana\"` keeps only the three unique letters — sets discard duplicates and have **no order**, which is why the example calls `sorted()` before printing (printing the raw set would show the letters in an arbitrary order).",
  },
  {
    type: "prose",
    md: "**Truthiness** is Python's most useful — and most dangerous — convenience. Any object can be tested in an `if`, and these are all **falsy**: `False`, `None`, `0`, `0.0`, `\"\"` (empty string), `[]`, `{}`, `set()`, and any other empty container. **Everything else is truthy**, including the string `\"0\"` and the string `\"False\"`.",
  },
  {
    type: "code",
    language: "python",
    caption: "Truthiness lets you test containers directly",
    code: `def first_or_default(items, default):
    if items:              # empty list is falsy
        return items[0]
    return default

print(first_or_default([], "none"))
print(first_or_default([10, 20], "none"))

# But watch the trap:
print(bool("0"))     # a non-empty string...
print(bool(0))       # ...is very different from the number zero`,
    output: `none
10
True
False`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "`if not value:` can swallow legitimate zeros and empty strings",
    md: "Writing `if not response:` to mean *“no response”* also fires when `response` is `0`, `0.0`, or `\"\"` — all of which may be **valid** data (a token count of `0`, an empty-but-present message). When you specifically mean *“this field is missing”*, test for it explicitly: `if response is None:`. Reserve truthiness for when you genuinely mean *“empty or absent, treat them the same.”*",
  },
  {
    type: "code",
    language: "python",
    caption: "is vs == — the difference that causes real bugs",
    code: `nums = [1, 2, 3]
same_values = [1, 2, 3]

print(nums == same_values)   # equal contents?
print(nums is same_values)   # the same object?

result = None
print(result is None)        # the idiomatic None check`,
    output: `True
False
True`,
  },
  {
    type: "prose",
    md: "`nums` and `same_values` hold equal contents (`==` is `True`) but are two **different** list objects (`is` is `False`). Rule of thumb: use `==` for values, and reserve `is` for `None`, `True`, `False`. Never use `is` to compare numbers or strings — whether it *happens* to work depends on interning, an implementation detail you must not rely on.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Floats are approximate — never compare them with ==",
    md: "`0.1 + 0.2` is **not** `0.3`; it is `0.30000000000000004`, because these values cannot be represented exactly in binary floating point. So `0.1 + 0.2 == 0.3` is `False`. For AI work this shows up when comparing similarity scores or probabilities. Use `math.isclose(a, b)` instead of `==` for floats.",
  },
  {
    type: "code",
    language: "python",
    caption: "bool is a kind of int — occasionally useful, occasionally surprising",
    code: `print(True + True)                  # booleans are ints
print(isinstance(True, int))        # True really is an int
print(sum([True, False, True, True]))  # counting Trues`,
    output: `2
True
3`,
  },
  {
    type: "prose",
    md: "Because `True` is `1` and `False` is `0`, `sum()` over a list of booleans **counts how many are true** — a genuinely handy idiom (e.g. counting how many records passed a filter). The surprise only bites when a function returns a bool where you expected a number and it silently participates in arithmetic.",
  },
  {
    type: "prose",
    md: "**Control flow** is ordinary, with two Pythonic touches. Comparisons can be *chained* (`0 <= x < 10` means `0 <= x and x < 10`), and `for` loops iterate over items directly rather than indices. Use `enumerate()` when you need the index too, and `range()` when you need counting.",
  },
  {
    type: "code",
    language: "python",
    caption: "Idiomatic iteration with enumerate + chained comparison",
    code: `models = ["gpt-4o", "claude", "llama"]

for i, name in enumerate(models, start=1):
    print(i, name)

score = 7
if 0 <= score < 5:
    tier = "low"
elif 5 <= score < 9:
    tier = "mid"
else:
    tier = "high"
print(tier)`,
    output: `1 gpt-4o
2 claude
3 llama
mid`,
  },
  {
    type: "prose",
    md: "**Functions** are defined with `def`, return `None` implicitly if you never `return`, and support default arguments. Defaults look innocent but hide the single most infamous Python gotcha, shown next.",
  },
  {
    type: "code",
    language: "python",
    caption: "The mutable default argument trap",
    code: `def add_item(item, basket=[]):     # default list created ONCE
    basket.append(item)
    return basket

print(add_item("a"))   # expected ['a']
print(add_item("b"))   # expected ['b'] ... ?`,
    output: `['a']
['a', 'b']`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Default arguments are evaluated once, at definition time",
    md: "The `basket=[]` list is created a **single time** when the function is defined, not on each call. Every call that relies on the default mutates that *same* shared list, so state leaks between calls. The fix is a sentinel: default to `None` and build a fresh list inside.\n\n```\ndef add_item(item, basket=None):\n    if basket is None:\n        basket = []\n    basket.append(item)\n    return basket\n```\n\nWith the fix, `add_item(\"a\")` → `['a']` and `add_item(\"b\")` → `['b']`.",
  },
  {
    type: "code",
    language: "python",
    caption: "Exceptions: catch specific errors, not everything",
    code: `def parse_ratio(text):
    try:
        a, b = text.split("/")
        return int(a) / int(b)
    except ValueError:            # bad format OR non-integer
        return None
    except ZeroDivisionError:
        return float("inf")

print(parse_ratio("3/4"))
print(parse_ratio("3/0"))
print(parse_ratio("abc"))`,
    output: `0.75
inf
None`,
  },
  {
    type: "prose",
    md: "`\"abc\".split(\"/\")` returns `[\"abc\"]`, and unpacking one item into two names (`a, b`) raises `ValueError` — caught, returning `None`. `\"3/0\"` divides by zero — a different exception, handled separately. The lesson: **catch the specific exceptions you expect**. A bare `except:` (or `except Exception:`) hides the bugs you actually needed to see, like a typo turning into a silent `None`.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Tuples are immutable — but only one level deep",
    md: "A tuple's *structure* is fixed (`point[0] = 9` raises `TypeError`), yet a mutable object stored inside it can still change: `row = (1, [2, 3]); row[1].append(4)` gives `(1, [2, 3, 4])`. Immutability protects the tuple's own slots, not the objects those slots point at.",
  },
  {
    type: "takeaways",
    items: [
      "Names point at objects; `=` never copies. Two names on one mutable object see each other's changes.",
      "Mutable: list, dict, set. Immutable: int, float, str, bool, tuple, None.",
      "Use `==` for value comparison; reserve `is` for `None`/`True`/`False`.",
      "Falsy values: False, None, 0, 0.0, '', [], {}, set(). Use `is None` when you specifically mean 'missing'.",
      "Floats are approximate — compare with `math.isclose`, never `==`.",
      "Default arguments are evaluated once; never use a mutable default — use `None` + a sentinel check.",
      "Catch specific exceptions; a bare `except` hides real bugs.",
      "`.get()` reads dicts without crashing on missing keys; comprehensions replace build-a-list loops.",
    ],
  },
];

// ── 1.1.2 · Practice — micro-exercises (guided → independent + debugging) ─────
const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "You learn Python by *running* it. Open a Python REPL or a scratch file and actually execute every exercise below — reading them is not enough. Each exercise states the task, an **expected result** you can check against, and how to verify. Guidance decreases as you go: the first is walked step by step, the last two hand you a goal and a bug.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Exercise 1 — Word frequency counter (fully guided)",
    intro: "Count how many times each word appears in a sentence. This exercises dict access, `.get()`, iteration, and string methods.",
    steps: [
      {
        order: 1,
        action: "Start from the input `text = \"red green red blue green red\"` and split it into a list of words with `text.split()`.",
        expected: "`text.split()` returns `['red', 'green', 'red', 'blue', 'green', 'red']` (split with no argument breaks on any whitespace).",
        verify: "`print(text.split())` shows six words.",
      },
      {
        order: 2,
        action: "Create an empty dict `counts = {}`. Decide how you will add to a count for a word you have never seen before.",
        decision: "Direct access `counts[word] += 1` fails the first time (KeyError, because the key does not exist yet). Will you pre-check with `if word in counts`, or use `counts.get(word, 0) + 1`? Pick one before continuing.",
      },
      {
        order: 3,
        action: "Loop over the words and update the dict using `counts[word] = counts.get(word, 0) + 1`.",
        expected: "`.get(word, 0)` returns the current count or `0` for a first sighting, so the `+= 1` logic works uniformly.",
      },
      {
        order: 4,
        action: "Print `counts`.",
        expected: "`{'red': 3, 'green': 2, 'blue': 1}` — insertion order reflects first appearance of each word.",
        verify: "Totals add up to six, matching the number of words in the input.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Exercise 1 — reference solution (compare only after you write your own)",
    code: `text = "red green red blue green red"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print(counts)`,
    output: `{'red': 3, 'green': 2, 'blue': 1}`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Exercise 2 — Reshape API-shaped records (less guidance)",
    intro: "You are given a list of message dicts. Produce a clean summary. You get the goal and the expected output — the approach is yours.",
    steps: [
      {
        order: 1,
        action: "Given the input below, write `titles = ...` (a single list comprehension) containing the `content` of every message whose `role` is `\"user\"`, uppercased.",
        decision: "Should you index with `m[\"role\"]` or read with `m.get(\"role\")`? The sample is well-formed, but which is safer if a record were missing `role`?",
      },
      {
        order: 2,
        action: "Build `titles` and print it.",
        expected: "`['HELLO', 'ARE YOU THERE']` — only the two user messages, uppercased, assistant messages excluded.",
        verify: "The result has exactly as many items as there are user-role messages.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Exercise 2 — input + expected output",
    code: `messages = [
    {"role": "user", "content": "hello"},
    {"role": "assistant", "content": "hi"},
    {"role": "user", "content": "are you there"},
]

# your one-line comprehension here -> titles
# print(titles)

# Expected:
# ['HELLO', 'ARE YOU THERE']`,
    output: `['HELLO', 'ARE YOU THERE']`,
  },
  {
    type: "callout",
    variant: "tip",
    title: "One idiomatic solution",
    md: "`titles = [m[\"content\"].upper() for m in messages if m.get(\"role\") == \"user\"]`. Using `.get(\"role\")` means a record missing `role` is simply skipped rather than crashing the whole comprehension.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Exercise 3 — Debug this function (diagnose, don't guess)",
    intro: "The function below is supposed to group words by their first letter, but it crashes. Run it, read the traceback, form a hypothesis, then fix it. Do not just rewrite it from scratch — practise *diagnosing*.",
    steps: [
      {
        order: 1,
        action: "Run the buggy code in the next block and read the full traceback carefully.",
        expected: "It raises `KeyError: 'a'` on the line `groups[letter].append(word)`.",
      },
      {
        order: 2,
        action: "Explain the cause in one sentence before touching the code.",
        decision: "Why 'a' and why a KeyError? On the first word, `groups[letter]` is read *before* that key exists — there is no empty list to append to yet. What single change guarantees an empty list is present first?",
      },
      {
        order: 3,
        action: "Fix it so the output is `{'a': ['apple', 'avocado'], 'b': ['banana']}`. Prefer `groups.setdefault(letter, []).append(word)`.",
        expected: "`setdefault(letter, [])` returns the existing list, or inserts and returns a new empty list — so the `.append` always has a target.",
        verify: "Every input word appears exactly once in the output, grouped under its first letter.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Exercise 3 — the broken function (run it, then fix it)",
    code: `def group_by_first_letter(words):
    groups = {}
    for word in words:
        letter = word[0]
        groups[letter].append(word)   # <-- crashes here
    return groups

print(group_by_first_letter(["apple", "avocado", "banana"]))`,
    output: `Traceback (most recent call last):
  ...
KeyError: 'a'`,
  },
  {
    type: "code",
    language: "python",
    caption: "Exercise 3 — one correct fix",
    code: `def group_by_first_letter(words):
    groups = {}
    for word in words:
        letter = word[0]
        groups.setdefault(letter, []).append(word)
    return groups

print(group_by_first_letter(["apple", "avocado", "banana"]))`,
    output: `{'a': ['apple', 'avocado'], 'b': ['banana']}`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "A subtler bug: truthiness hiding valid zeros",
    md: "This function returns the first *valid* value, skipping missing ones:\n\n```\ndef first_valid(values):\n    for v in values:\n        if v:              # BUG\n            return v\n    return None\n```\n\nCalled as `first_valid([0, 5])` it returns `5`, not `0` — because `if v` treats `0` as invalid. If `0` is a legitimate value (a token count, a temperature), the test you actually want is `if v is not None:`. Reason about *what counts as missing* for your data before reaching for truthiness.",
  },
  {
    type: "checkpoint",
    title: "Verify you can actually do this — before moving on",
    items: [
      "You ran every exercise in a real Python process (REPL or file), not just read them.",
      "Your word counter output matches {'red': 3, 'green': 2, 'blue': 1} exactly.",
      "You can explain, out loud, why Exercise 3 raised KeyError before you fixed it.",
      "You used .get() (not direct indexing) where a key might be missing.",
      "You can state one case where `if value:` would wrongly reject valid data.",
    ],
  },
];

// ── 1.1.3 · Review — retrieval quiz + mastery challenge ───────────────────────
const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Close the lesson and answer from memory. Retrieval — recalling an answer before checking it — is what moves knowledge into long-term memory, so **commit to an answer before you reveal it**. These questions test whether you understand *why*, not whether you memorised vocabulary.",
  },
  {
    type: "quiz",
    question: "After `a = [1, 2, 3]; b = a; b.append(4)`, what does `print(len(a))` show?",
    choices: ["3", "4", "It raises an error", "None"],
    answerIndex: 1,
    explanation: "`b = a` creates a second name for the SAME list, not a copy. Appending through `b` is visible through `a`, so the list now has 4 items. To get an independent copy you would need `b = a.copy()`.",
  },
  {
    type: "quiz",
    question: "What does the second call print?\n\n```\ndef collect(x, into=[]):\n    into.append(x)\n    return into\n\ncollect(1)\nprint(collect(2))\n```",
    choices: ["[2]", "[1, 2]", "[1]", "It raises TypeError"],
    answerIndex: 1,
    explanation: "The default list is created once when the function is defined and reused across calls. The first call leaves `[1]` in it; the second appends `2`, giving `[1, 2]`. Fix by defaulting to `None` and creating a fresh list inside.",
  },
  {
    type: "quiz",
    question: "Which of these values is TRUTHY?",
    choices: ["[] (empty list)", "0", "\"0\" (the string zero)", "{} (empty dict)"],
    answerIndex: 2,
    explanation: "`\"0\"` is a NON-empty string, so it is truthy — only the empty string `\"\"` is falsy. `[]`, `0`, and `{}` are all falsy. This is exactly why parsing a field as text and testing `if field:` can behave differently from testing the number.",
  },
  {
    type: "quiz",
    question: "You need to read `data[\"count\"]` where the key might be absent, without crashing. Which is correct?",
    choices: ["data[\"count\"] with a try/except KeyError only", "data.get(\"count\", 0)", "data.fetch(\"count\", 0)", "data.count or 0"],
    answerIndex: 1,
    explanation: "`.get(\"count\", 0)` returns the value or the default `0` when the key is missing — no exception, no ceremony. `.fetch()` is not a dict method; `data.count` is attribute access (wrong for dict keys); try/except works but is heavier for a simple missing-key default.",
  },
  {
    type: "quiz",
    question: "Why should you avoid `if score == 0.3:` after computing `score = 0.1 + 0.2`?",
    choices: [
      "Because == does not work on floats at all",
      "Because 0.1 + 0.2 is 0.30000000000000004, so the comparison is False",
      "Because floats can only be compared with is",
      "Because Python rounds 0.3 up to 0.4",
    ],
    answerIndex: 1,
    explanation: "Binary floating point cannot represent 0.1, 0.2, or 0.3 exactly, so their sum is very slightly off and `== 0.3` is False. Use `math.isclose(score, 0.3)` for float comparisons.",
  },
  {
    type: "quiz",
    question: "Scenario: a colleague uses `if user is not None` in one place and `if user != None` in another, and asks which is right. What do you tell them?",
    choices: [
      "They are identical; use whichever reads better",
      "Use `is not None` — None is a singleton, and identity is the correct, idiomatic check",
      "Use `!= None` — `is` only works for numbers",
      "Neither; you must use `not user`",
    ],
    answerIndex: 1,
    explanation: "`None` is a single shared object, so identity (`is` / `is not`) is both correct and idiomatic, and it cannot be fooled by a custom `__eq__`. `not user` is wrong here because it is also true for empty strings, empty lists, and 0 — values that are not None.",
  },
  {
    type: "quiz",
    question: "What does `sum([True, True, False, True])` evaluate to, and why?",
    choices: [
      "Raises TypeError — you cannot sum booleans",
      "1 — sum returns whether any are True",
      "3 — booleans are ints, so True counts as 1",
      "True — the result stays a boolean",
    ],
    answerIndex: 2,
    explanation: "`bool` is a subclass of `int`: `True == 1`, `False == 0`. Summing booleans therefore counts how many are True — here, 3. This is a genuinely useful idiom for counting how many records passed a test.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — apply everything, independently.** Write it yourself in a real Python file. This one task exercises `.get()` with defaults, the truthiness-vs-`is None` distinction, boolean counting, and not mutating your input — the exact judgement calls you will make constantly when processing model responses.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Build token_report(messages)",
    intro: "Given a list of message dicts (some fields missing or None), return a summary dict. Handle real-world messiness correctly.",
    steps: [
      {
        order: 1,
        action: "Write `token_report(messages)` returning `{\"total_tokens\": int, \"user_messages\": int, \"empty_messages\": int}`.",
        decision: "How will you treat a message whose `tokens` key is absent? (It must count as 0, not crash.) And what counts as 'empty' content — missing, None, and \"\" should all count, but \"hi\" should not.",
      },
      {
        order: 2,
        action: "total_tokens = sum of each message's tokens, treating a missing `tokens` as 0. Use `.get(\"tokens\", 0)`.",
        expected: "Missing tokens contribute 0 rather than raising KeyError.",
      },
      {
        order: 3,
        action: "user_messages = count of messages where `role` equals \"user\".",
        verify: "A boolean sum or a running counter both work; make sure assistant/system messages are excluded.",
      },
      {
        order: 4,
        action: "empty_messages = count where content is missing, None, or the empty string. Decide whether `not m.get(\"content\")` expresses that correctly.",
        decision: "`.get(\"content\")` returns None for a missing key; None and \"\" are both falsy; a real message like \"hi\" is truthy. Does `if not m.get(\"content\")` capture exactly 'missing, None, or empty'? (It does — reason through why.)",
      },
      {
        order: 5,
        action: "Do not mutate `messages`. Return a new dict.",
        verify: "Run it against the sample below and confirm the exact expected output.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Mastery challenge — sample input + the exact output you must produce",
    code: `messages = [
    {"role": "user", "content": "Hello", "tokens": 3},
    {"role": "assistant", "content": "Hi there", "tokens": 5},
    {"role": "user", "content": ""},           # empty content, tokens missing
    {"role": "user", "content": None, "tokens": 2},
]

# token_report(messages) must return:
# {'total_tokens': 10, 'user_messages': 3, 'empty_messages': 2}`,
    output: `{'total_tokens': 10, 'user_messages': 3, 'empty_messages': 2}`,
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — your solution passes only if ALL hold",
    items: [
      "Returns exactly {'total_tokens': 10, 'user_messages': 3, 'empty_messages': 2} for the sample.",
      "Uses .get() with defaults for tokens and content — no KeyError on missing keys.",
      "Treats missing, None, and '' content as empty, but counts 'Hello'/'Hi there' as non-empty.",
      "Does not mutate the input list or its dicts.",
      "You can explain why `if not m.get('content')` correctly captures 'missing, None, or empty'.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution — check against yours after you have attempted it",
    code: `def token_report(messages):
    total, users, empty = 0, 0, 0
    for m in messages:
        total += m.get("tokens", 0)
        if m.get("role") == "user":
            users += 1
        if not m.get("content"):     # None or "" are both falsy
            empty += 1
    return {"total_tokens": total, "user_messages": users, "empty_messages": empty}

print(token_report(messages))`,
    output: `{'total_tokens': 10, 'user_messages': 3, 'empty_messages': 2}`,
  },
  {
    type: "takeaways",
    items: [
      "Retrieval before revealing is what builds durable memory — always commit to an answer first.",
      "The bugs that survive to production are aliasing, mutable defaults, truthiness swallowing 0/'', and float ==.",
      "`.get()` with a default and `is None` for 'missing' are your everyday tools for messy API data.",
      "You can now read, write, and debug small Python scripts without looking up syntax — the bar for this topic.",
    ],
  },
];

// Standardized export consumed by the content registry via dynamic import.
export const content: TopicContent = {
  "unit-py-core-syntax-01": learn,
  "unit-py-core-syntax-02": practice,
  "unit-py-core-syntax-03": review,
};
