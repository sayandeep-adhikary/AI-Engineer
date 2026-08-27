import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Errors, Logging & Debugging" (topic-py-errors-logging).
// 3 units: 01 learn · 02 practice (harden a client) · 03 review (diagnose tracebacks + mastery).
// Standard-library Python (exceptions, logging, pdb); outputs match CPython 3.10+.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "AI apps fail in *messy* ways: a provider 500s, a JSON field is null, a rate limit hits at 2am. The difference between an app you can operate and one you can't is whether failures are **handled deliberately** and **logged usefully**. This unit is about failing on purpose, in the right place, with a trail you can follow later.",
  },
  {
    type: "prose",
    md: "**Mental model: an exception travels UP the call stack until something catches it.** When code raises, Python abandons the current line and unwinds outward, frame by frame, looking for a matching `except`. If none matches, it reaches the top and prints a **traceback**. So *where* you put `try/except` decides *where* a failure becomes recoverable — catch it at the layer that actually knows what to do, not everywhere in a panic.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Exception", definition: "An object raised to signal an error, e.g. `ValueError`, `KeyError`, `httpx.HTTPStatusError`. Caught by type." },
      { term: "Traceback", definition: "The stack of frames printed when an exception is uncaught. Read the LAST line first (type + message)." },
      { term: "`raise ... from e`", definition: "Chain a new exception to its cause, preserving the original for the traceback ('During handling...')." },
      { term: "Logging level", definition: "DEBUG < INFO < WARNING < ERROR < CRITICAL. A logger shows messages at or above its configured level." },
      { term: "logger.exception()", definition: "Log at ERROR *with the current traceback attached* — only meaningful inside an `except` block." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Catch SPECIFIC exceptions; chain the cause",
    code: `def parse_amount(raw: str) -> float:
    try:
        return float(raw)
    except ValueError as e:
        # Re-raise a clearer error, keeping the original cause for the traceback.
        raise ValueError(f"Bad amount: {raw!r}") from e

print(parse_amount("12.5"))
print(parse_amount("oops"))`,
    output: `12.5
Traceback (most recent call last):
  ...
ValueError: could not convert string to float: 'oops'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  ...
ValueError: Bad amount: 'oops'`,
  },
  {
    type: "prose",
    md: "Catching `ValueError` specifically means a *different* bug (say, a `TypeError` from passing `None`) still surfaces instead of being hidden. `raise ... from e` gives you both stories in the traceback: the low-level cause and your high-level message. That chain is gold when debugging — you see *what* broke and *where you noticed*.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "`except:` and `except Exception: pass` — the two ways to hide the bug you needed",
    md: "A **bare** `except:` catches *everything*, including `KeyboardInterrupt` (Ctrl-C) and `SystemExit` — so your program can't even be stopped cleanly. Worse, `except Exception: pass` **swallows** the error entirely: the code limps on in a broken state and the real failure vanishes, resurfacing later as a baffling symptom far from the cause. Assumption: 'catch-all makes my code robust.' Reality: it makes it *silent*, which is the opposite of operable. Catch the specific exceptions you expect; if you must catch broadly, at least `logger.exception(...)` before deciding what to do.",
  },
  {
    type: "prose",
    md: "**Logging beats print** for anything you'll run more than once. Logging has *levels* (filter noise vs. detail), *destinations* (console, file, aggregator), timestamps, and the module name — and you can dial it up in production without editing code. `print` has none of that. Configure it once at startup.",
  },
  {
    type: "code",
    language: "python",
    caption: "Structured logging setup + logging an exception with its traceback",
    code: `import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

logger.info("Fetching user %s", 42)     # lazy %-formatting, not f-strings
try:
    1 / 0
except ZeroDivisionError:
    logger.exception("computation failed")   # ERROR + full traceback`,
    output: `2026-01-01 09:00:00,000 INFO __main__: Fetching user 42
2026-01-01 09:00:00,001 ERROR __main__: computation failed
Traceback (most recent call last):
  ...
ZeroDivisionError: division by zero`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Your `logging.info(...)` prints nothing — because the default level is WARNING",
    md: "Add `logging.info(\"here\")` to a fresh script and... silence. Assumption: 'logging is broken.' Reality: the root logger's default level is **WARNING**, so `INFO` and `DEBUG` are filtered out until you call `logging.basicConfig(level=logging.INFO)` (or set the level). This trips up nearly everyone once. Also prefer `logger.info(\"user %s\", uid)` over an f-string: the `%s` args are only formatted **if** the message is actually emitted, saving work when that level is disabled.",
  },
  {
    type: "prose",
    md: "**Reading a traceback: bottom-up.** The **last** line is the exception type and message — start there. Then scan the frames upward; the deepest frame *in your own code* is usually the culprit line. Don't drown in library frames; find where your code called into the failure.",
  },
  {
    type: "code",
    language: "text",
    caption: "A real traceback — where's the bug?",
    code: `Traceback (most recent call last):
  File "app.py", line 20, in <module>
    main()
  File "app.py", line 16, in main
    total = summarize(records)
  File "app.py", line 9, in summarize
    return sum(r["amount"] for r in records)
KeyError: 'amount'`,
    output: `The last line: KeyError: 'amount'  -> a record is missing the "amount" key.
The culprit frame: app.py line 9, r["amount"].  Fix: r.get("amount", 0).`,
  },
  {
    type: "prose",
    md: "When a traceback isn't enough, drop a `breakpoint()` on the suspect line and run the program — Python opens the **pdb** debugger there, letting you inspect variables (`p records`), step (`n`), and continue (`c`). One well-placed `breakpoint()` usually beats ten `print()`s.",
  },
  {
    type: "quiz",
    question: "You add `logging.info(\"starting\")` at the top of a script and see no output at all. Why?",
    choices: [
      "info() is deprecated",
      "The root logger defaults to WARNING, so INFO is filtered until you configure the level",
      "You must use print for the first message",
      "Logging only works inside functions",
    ],
    answerIndex: 1,
    explanation: "By default the logging level is WARNING, so INFO/DEBUG are suppressed. Call `logging.basicConfig(level=logging.INFO)` (or set the logger's level) and the message appears. Nothing is broken — it's just filtered.",
  },
  {
    type: "quiz",
    question: "Inside an `except` block you want the log to include the stack trace. Which call does that?",
    choices: [
      "logger.error(e)",
      "logger.info('failed')",
      "logger.exception('failed')",
      "print(e)",
    ],
    answerIndex: 2,
    explanation: "`logger.exception(...)` logs at ERROR level AND attaches the active traceback — but only meaningfully inside an except block. `logger.error(e)` logs just the message/string and loses the stack, making the failure much harder to locate later.",
  },
  {
    type: "takeaways",
    items: [
      "Exceptions unwind up the stack; put try/except at the layer that knows how to recover.",
      "Catch specific exceptions; never bare `except:` and never `except Exception: pass` (silent failure).",
      "Use `raise ... from e` to keep the original cause in the traceback.",
      "Configure logging once; the default level is WARNING, so set INFO/DEBUG to see them. Use logger.exception() in except blocks.",
      "Read tracebacks bottom-up: type+message first, then the deepest frame in your code. breakpoint() opens pdb.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Harden a naive API client — the practice this unit asks for. Start from code that assumes the happy path and make it fail gracefully, loudly, and traceably. Reuse the resilient-client ideas from the HTTP topic, now with proper error handling and logging.",
  },
  {
    type: "code",
    language: "python",
    caption: "The fragile starting point",
    code: `import httpx

def get_user(user_id):
    resp = httpx.get(f"https://api.example.com/users/{user_id}")
    return resp.json()["name"]     # assumes 200 + a "name" field, always`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Make failures explicit and logged (guided)",
    intro: "Turn silent assumptions into handled, logged outcomes.",
    steps: [
      { order: 1, action: "Add a timeout and `raise_for_status()`. Wrap the call so a network/HTTP failure is caught specifically (`httpx.HTTPError`), logged with `logger.exception(...)`, and turned into a clear return or re-raised error — not a raw crash deep in `.json()`.", decision: "Should a 404 (user doesn't exist) be treated the same as a 503 (server down)? One is a normal 'not found', the other a transient failure — decide how each should surface to the caller." },
      { order: 2, action: "Guard the parse: the response might be 200 but missing `name`. Use `.get(\"name\")` and handle the missing case deliberately.", expected: "A missing `name` yields a defined result (e.g. None or a raised `ValueError`), never a `KeyError` from `[\"name\"]`.", verify: "Point it at a bad id and a good id; both produce sane, logged outcomes rather than tracebacks to the user." },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import logging, httpx

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

class UserNotFound(Exception):
    pass

def get_user(user_id: int) -> str | None:
    try:
        resp = httpx.get(f"https://api.example.com/users/{user_id}", timeout=10.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise UserNotFound(user_id) from e     # a normal, expected outcome
        logger.exception("HTTP error fetching user %s", user_id)  # transient/server
        raise
    except httpx.HTTPError:
        logger.exception("network error fetching user %s", user_id)
        raise
    name = resp.json().get("name")
    if name is None:
        logger.warning("user %s has no name field", user_id)
    return name`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Batch with per-item resilience (less guidance)",
    intro: "Requirements + acceptance; you design the control flow.",
    steps: [
      { order: 1, action: "Write `get_names(ids)` that fetches many users and returns a dict `{id: name_or_None}`. One user failing must NOT abort the batch.", decision: "Which exceptions do you catch per-item (so the batch continues) vs. let propagate (a programming bug you WANT to see)? Distinguish 'expected operational failure' from 'bug'." },
      { order: 2, action: "Log a WARNING for each per-item failure with the id and reason; log an INFO summary at the end (how many succeeded/failed).", verify: "Feeding a list with one bad id returns results for the rest, with exactly one WARNING logged and a correct summary count." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "No `[\"name\"]`/`.json()` crash reaches the caller — bad statuses and missing fields are handled.",
      "404 (expected) is distinguished from 5xx/network (transient) in how it surfaces.",
      "logger.exception() is used inside except blocks (traceback captured), not logger.error(e).",
      "In the batch, one failure doesn't abort the rest, and the summary counts are correct.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "Debugging is a *method*, not luck. Practise reading tracebacks to a root cause, then take a mastery challenge that instruments a function to production standards.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Symptom",
    md: "A nightly job that summarises API results crashes intermittently — some nights fine, some nights it dies. You're handed only the traceback from a failed run (below). No code changes shipped between good and bad nights.",
  },
  {
    type: "code",
    language: "text",
    caption: "The traceback from the failed run",
    code: `Traceback (most recent call last):
  File "summary.py", line 31, in <module>
    run()
  File "summary.py", line 27, in run
    avg = total / len(valid)
ZeroDivisionError: division by zero`,
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Diagnose — evidence → root cause → fix → verification",
    intro: "Let the traceback and the intermittency guide you.",
    steps: [
      { order: 1, action: "EVIDENCE: read the last line first. What exactly failed, and on which line?", expected: "`ZeroDivisionError: division by zero` at `summary.py:27`, `avg = total / len(valid)` — so `len(valid)` was 0." },
      { order: 2, action: "Why INTERMITTENT? Connect 'works some nights' to 'len(valid) == 0'.", decision: "What would make `valid` empty on some runs but not others? (Hint: `valid` is presumably records that passed a filter.) Is this a code bug or a DATA condition the code doesn't handle?" },
      { order: 3, action: "ROOT CAUSE: state it.", expected: "On nights when zero records pass the filter (e.g. an upstream outage produced no valid rows), `len(valid)` is 0 and the average divides by zero. The code assumes there's always at least one valid record — an assumption the data violates occasionally." },
      { order: 4, action: "FIX & VERIFY: handle the empty case explicitly (return None / 0 / log a warning) instead of dividing blindly. Reproduce by running with an empty `valid` list.", verify: "With `valid == []` the job now logs a warning and produces a defined result instead of crashing; with data it still computes the average." },
    ],
  },
  {
    type: "prose",
    md: "The transferable habits: (1) the exception type + message already told you the cause (`division by zero` → denominator was 0); (2) **intermittent** failures are almost always a *data/timing condition* the code doesn't handle, not random flakiness; (3) reproduce with the offending input before and after the fix, so you *know* you fixed the real thing.",
  },
  {
    type: "quiz",
    question: "A pipeline dies with `TypeError: 'NoneType' object is not iterable` at `for row in results:`. What is the most probable cause?",
    choices: [
      "results is a very large list",
      "A function that was expected to return a list returned None (e.g. a missing return, or a handled error path that returns None)",
      "The for loop syntax is wrong",
      "Python ran out of memory",
    ],
    answerIndex: 1,
    explanation: "'NoneType is not iterable' means `results` is None where a sequence was expected — typically an upstream function fell through without returning, or an error branch returned None. Trace who assigns `results` and ensure every path returns an iterable (or handle None before looping).",
  },
  {
    type: "quiz",
    question: "An error 'sometimes' happens in production but never in your tests. Which mindset is most productive?",
    choices: [
      "It's random; add a broad try/except and move on",
      "Treat it as an unhandled data/timing condition; capture the failing input (via logging) and reproduce it deterministically",
      "Restart the service whenever it happens",
      "Rewrite the module from scratch",
    ],
    answerIndex: 1,
    explanation: "Intermittent bugs are rarely random — they're triggered by specific inputs, orderings, or timing your tests don't cover. Log enough context to capture the triggering input, reproduce it in a test, fix, and keep the test. A broad try/except would just hide it again.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — instrument a function to production standards.** Take a plausibly-correct function and make it *operable*.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Make process_batch(records) production-ready",
    intro: "Requirements + acceptance. No step-by-step.",
    steps: [
      { order: 1, action: "Given `process_batch(records)` that transforms each record and returns results, add: specific exception handling per record so one bad record doesn't kill the batch; a custom `RecordError` carrying the offending record's id; and logging (INFO start/summary, WARNING per skipped record with reason, logger.exception for unexpected errors).", decision: "Which errors are 'expected' (skip + WARNING) versus 'bugs' (let propagate / logger.exception)? Draw the line and defend it." },
      { order: 2, action: "Return both the successful results and a list of failures `{id, reason}` so the caller can act — don't silently drop data.", expected: "A batch with 2 bad records out of 10 returns 8 results and 2 structured failures, with matching log lines." },
      { order: 3, action: "Verify: no bare except; no swallowed errors; the traceback is preserved for unexpected failures.", verify: "Injecting an unexpected error (e.g. a bug in the transform) produces a logged traceback, while expected bad-data records are skipped with warnings." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "One bad record never aborts the batch; results and structured failures are both returned.",
      "Expected failures are skipped with a WARNING; unexpected ones use logger.exception (traceback kept).",
      "No bare `except:` and no `except Exception: pass`.",
      "Logs include a start line and an end summary with success/failure counts.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import logging
logger = logging.getLogger(__name__)

class RecordError(Exception):
    def __init__(self, record_id, reason):
        super().__init__(f"record {record_id}: {reason}")
        self.record_id = record_id
        self.reason = reason

def _transform(record: dict) -> dict:
    if "id" not in record:
        raise RecordError(record.get("id", "?"), "missing id")
    if record.get("value") is None:
        raise RecordError(record["id"], "null value")
    return {"id": record["id"], "value": record["value"] * 2}

def process_batch(records: list[dict]):
    logger.info("processing %d records", len(records))
    results, failures = [], []
    for r in records:
        try:
            results.append(_transform(r))
        except RecordError as e:                      # expected bad data -> skip
            logger.warning("skipping %s", e)
            failures.append({"id": e.record_id, "reason": e.reason})
        except Exception:                             # unexpected -> keep trace, keep going
            logger.exception("unexpected error on record %r", r)
            failures.append({"id": r.get("id"), "reason": "unexpected error"})
    logger.info("done: %d ok, %d failed", len(results), len(failures))
    return results, failures`,
  },
  {
    type: "takeaways",
    items: [
      "Read tracebacks bottom-up; the type + message usually names the cause outright.",
      "Intermittent failures are unhandled data/timing conditions — capture the input and reproduce deterministically.",
      "Operable code: catch specific exceptions, distinguish expected failures from bugs, and never swallow errors silently.",
      "Return both results and structured failures so callers can act; log a start line and a summary.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-errors-logging-01": learn,
  "unit-py-errors-logging-02": practice,
  "unit-py-errors-logging-03": review,
};
