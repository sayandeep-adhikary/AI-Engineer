import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Functions, Modules & Project Layout" (topic-py-functions-modules).
// 3 units: 01 learn · 02 practice (refactor) · 03 build (reusable package + troubleshoot).
// Standard-library Python; all outputs match CPython 3.10+.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "A one-file script is fine until it isn't. AI projects grow fast — a prompt helper, a client wrapper, a data loader, a CLI — and the moment two of those need the same function, you need **structure**. This unit is about turning a pile of functions into a small, importable project you (and your teammates) can navigate without fear.",
  },
  {
    type: "prose",
    md: "**Mental model: a module is a namespace, and `import` is how namespaces find each other.** Every `.py` file is a *module* — a container of names (functions, classes, constants). A folder of modules is a *package*. `import` doesn't 'paste code in'; it **runs the target module once**, caches it, and binds its namespace to a name you can reach through. Understanding that import = *run-once + namespace* explains imports, `__main__`, and circular-import errors all at once.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Module", definition: "A single `.py` file. Importing it runs its top-level code once and exposes its names." },
      { term: "Package", definition: "A directory of modules. An `__init__.py` (optional since 3.3) marks it and can define the package's public API." },
      { term: "Absolute import", definition: "`from mypkg.core import load` — the full path from a top-level package. Preferred for clarity." },
      { term: "Relative import", definition: "`from .core import load` — relative to the current package. Only works INSIDE a package, not a directly-run script." },
      { term: "`__name__`", definition: "A module's name when imported; the string `\"__main__\"` when the file is run directly. Powers the run-vs-import guard." },
      { term: "Type hint", definition: "Annotation like `name: str` / `-> int`. Documentation for humans and tools (mypy, your IDE) — NOT enforced at runtime." },
      { term: "Docstring", definition: "A triple-quoted string as a function/module's first statement; readable via `help()` and `.__doc__`." },
    ],
  },
  {
    type: "prose",
    md: "**Worked example — a real module.** *What:* a `textutils` module with typed, documented functions. *Why:* this is the unit of reuse. *What happens:* other modules `from textutils import word_count`. *Verify:* `help(textutils)` shows the docstrings. *What could go wrong:* putting runnable side-effects at module top level makes every import do work (and possibly print) — keep top level to definitions.",
  },
  {
    type: "code",
    language: "python",
    caption: "textutils.py — typed, documented, reusable",
    code: `# textutils.py
def word_count(text: str) -> int:
    """Return the number of whitespace-separated words."""
    return len(text.split())

def truncate(text: str, limit: int = 80) -> str:
    """Clip text to \`limit\` characters, adding an ellipsis if clipped."""
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "\\u2026"`,
  },
  {
    type: "code",
    language: "python",
    caption: "Using it from another module + the run/import guard",
    code: `# report.py
from textutils import word_count

def main() -> None:
    print(word_count("the quick brown fox"))

if __name__ == "__main__":   # runs ONLY when executed directly
    main()`,
    output: `4`,
  },
  {
    type: "prose",
    md: "`python report.py` prints `4`. But if another file does `import report`, `main()` does **not** run — because on import, `report.__name__` is `\"report\"`, not `\"__main__\"`. That guard is why you can both *run* a module as a script and *import* its functions without side effects. Put your entry point in `main()` behind the guard; keep importable logic out of it.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Type hints are NOT checked at runtime",
    md: "People assume `def double(n: int)` makes Python reject a string. It doesn't — hints are ignored by the interpreter and only matter to tools like mypy or your editor.\n\n```\ndef double(n: int) -> int:\n    return n * 2\n\nprint(double(3))     # 6\nprint(double(\"ab\"))  # 'abab' — no error, because str * int is valid\n```\n\n`double(\"ab\")` returns `'abab'` with no complaint. Hints are a *contract you document and a checker enforces*, not a runtime guard. Run `mypy` in CI if you want them enforced.",
  },
  {
    type: "prose",
    md: "**Project layout.** A small AI project usually wants a package (a folder) so related modules travel together and share one import root. A sane starter shape:\n\n- `myapp/` — the package (`__init__.py`, `core.py`, `cli.py`, `config.py`)\n- `tests/` — mirrors the package\n- `pyproject.toml` / `requirements.txt` — dependencies\n\nThe `__init__.py` can re-export the package's public names so callers write `from myapp import load` instead of reaching into `myapp.core`.",
  },
  {
    type: "code",
    language: "python",
    caption: "A package __init__.py that defines the public API",
    code: `# myapp/__init__.py
from .core import load, clean      # re-export the public surface

__all__ = ["load", "clean"]        # what \`from myapp import *\` exposes`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Circular imports: two modules importing each other at top level",
    md: "If `a.py` does `from b import x` while `b.py` does `from a import y`, importing either can fail with *'cannot import name ... from partially initialized module ... (most likely due to a circular import)'*. Why: importing `a` starts running it, hits `from b import x`, which starts running `b`, which hits `from a import y` — but `a` isn't finished defining `y` yet. Recognise it by that exact message. Fixes: move the shared piece into a third module both import; or import *inside the function* that needs it (deferring the import until call time), not at module top.",
  },
  {
    type: "prose",
    md: "**Retrieve before you practise.** Answer from memory.",
  },
  {
    type: "quiz",
    question: "You run `python report.py` and `main()` runs. A colleague does `import report` in another file and is surprised `main()` does NOT run. Why is that the correct, desirable behaviour?",
    choices: [
      "Because imported modules are cached and never execute",
      "Because on import `__name__` is 'report', not '__main__', so the guard is False",
      "Because `main()` is private",
      "Because Python only runs the last function defined",
    ],
    answerIndex: 1,
    explanation: "The `if __name__ == \"__main__\":` guard is True only when the file is executed directly. On import, `__name__` is the module's name, so the guard is False and the entry point is skipped — letting the same file be both a runnable script and an importable library. (Top-level code still runs on import; only the guarded block is skipped.)",
  },
  {
    type: "quiz",
    question: "`def scale(x: float) -> float: return x * 2` is called as `scale(\"hi\")`. What happens?",
    choices: [
      "TypeError — the hint rejects the string",
      "It returns 'hihi'; type hints aren't enforced at runtime",
      "It returns None",
      "A mypy error is raised at runtime",
    ],
    answerIndex: 1,
    explanation: "Hints are not runtime checks. `\"hi\" * 2` is valid Python, so the call returns `'hihi'`. A static checker like mypy would flag the call, but only if you run it — the interpreter itself ignores annotations.",
  },
  {
    type: "takeaways",
    items: [
      "A module is a namespace; import runs it once and binds its names — it doesn't paste code.",
      "Guard your entry point with `if __name__ == \"__main__\":` so a file can be both run and imported.",
      "Type hints and docstrings document intent; hints are enforced by mypy/your IDE, never at runtime.",
      "Prefer absolute imports; expose a package's public API from its `__init__.py`.",
      "Circular imports come from two modules importing each other at top level — break the cycle with a third module or a deferred import.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "Refactoring a working script into modules is a skill you'll use constantly. The rule: **behaviour must not change** — same inputs, same outputs, just better-organised. Do this in a real folder and run it after each step.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Level 1 — Split a monolith by responsibility (guided)",
    intro: "You have one file `app.py` doing three jobs: loading data, cleaning it, and printing a report. Separate them.",
    steps: [
      {
        order: 1,
        action: "Create a package folder `pipeline/` with an empty `__init__.py`. Move the load functions into `pipeline/io.py` and the cleaning functions into `pipeline/clean.py`.",
        decision: "Should `app.py` import with `from pipeline.io import load` (absolute) or `from .io import load` (relative)? Given `app.py` is the script you run directly, which one is safe?",
      },
      {
        order: 2,
        action: "Keep `app.py` at the top level as the entry point: it imports from the package and orchestrates load → clean → report inside a `main()` behind the `__name__` guard.",
        expected: "`python app.py` produces the exact same output it did before the split.",
        verify: "Diff the output against the original monolith — identical.",
      },
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Level 1 — reference (open only after your attempt)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `# pipeline/io.py
def load(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [line.rstrip("\\n") for line in f]

# pipeline/clean.py
def clean(rows: list[str]) -> list[str]:
    return [r.strip() for r in rows if r.strip()]

# app.py  (top level, run directly)
from pipeline.io import load
from pipeline.clean import clean

def main() -> None:
    rows = clean(load("data.txt"))
    print(f"{len(rows)} clean rows")

if __name__ == "__main__":
    main()`,
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Level 2 — Extract a reusable, typed helper (less guidance)",
    intro: "Requirements + acceptance; the design is yours.",
    steps: [
      {
        order: 1,
        action: "Both `clean.py` and a new `report.py` need to count words. Extract a single `word_count(text: str) -> int` so the logic exists in ONE place, imported by both.",
        decision: "Where does `word_count` belong so neither `clean` nor `report` imports the other (avoiding a cycle)? Name the module and justify it.",
      },
      {
        order: 2,
        action: "Add a one-line docstring and correct type hints. Acceptance: no duplication, no circular import, and `help(your_module.word_count)` shows the docstring.",
        verify: "Importing both `clean` and `report` in a REPL raises no ImportError.",
      },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify before moving on",
    items: [
      "The refactor produced byte-identical output to the original monolith.",
      "Shared logic (word_count) lives in exactly one module, imported by others.",
      "No module imports another that imports it back (no circular import).",
      "Your entry point runs under `if __name__ == \"__main__\":` and nothing runs on plain import.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a small reusable package** — the deliverable this unit asks for. You'll make an installable-shaped `textkit` package with a public API and a runnable CLI, then hit (and fix) the single most common packaging error along the way.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Objective · Starting state",
    md: "**Objective:** a package `textkit/` exposing `word_count` and `truncate`, importable as `from textkit import word_count`, plus a `python -m textkit \"some text\"` CLI that prints the word count. **Starting state:** an empty folder. **Prerequisite:** the concepts from unit 1 (modules, `__init__.py`, the `__main__` guard).",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — build textkit",
    intro: "Acceptance criteria define done; the implementation is yours.",
    steps: [
      {
        order: 1,
        action: "Create `textkit/__init__.py`, `textkit/core.py` (the typed functions), and `textkit/__main__.py` (the CLI entry). Re-export the public functions from `__init__.py`.",
        decision: "The CLI in `__main__.py` needs `core`'s functions. Absolute (`from textkit.core import word_count`) or relative (`from .core import word_count`)? Which works both when run as `python -m textkit` AND when imported? (Test your choice.)",
      },
      {
        order: 2,
        action: "`__main__.py` reads text from `sys.argv`, prints the word count, and guards the entry with `if __name__ == \"__main__\":`.",
        expected: "`python -m textkit \"the quick brown fox\"` prints `4`.",
      },
      {
        order: 3,
        action: "Verify import works from another file: `from textkit import word_count, truncate` with no errors, and `word_count(\"a b c\")` returns 3.",
        verify: "Both the CLI and the import path work; `help(textkit)` shows your functions.",
      },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "`from textkit import word_count, truncate` works from outside the package.",
      "`python -m textkit \"the quick brown fox\"` prints 4.",
      "core logic lives in core.py; __init__.py only re-exports; __main__.py only handles the CLI.",
      "Nothing runs on plain `import textkit` except definitions/re-exports.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference solution",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `# textkit/core.py
def word_count(text: str) -> int:
    """Number of whitespace-separated words."""
    return len(text.split())

def truncate(text: str, limit: int = 80) -> str:
    """Clip to \`limit\` chars, adding an ellipsis if clipped."""
    return text if len(text) <= limit else text[: limit - 1] + "\\u2026"

# textkit/__init__.py
from .core import word_count, truncate
__all__ = ["word_count", "truncate"]

# textkit/__main__.py
import sys
from textkit.core import word_count   # absolute: works via \`python -m textkit\`

def main() -> None:
    text = sys.argv[1] if len(sys.argv) > 1 else ""
    print(word_count(text))

if __name__ == "__main__":
    main()`,
  },
  {
    type: "callout",
    variant: "warning",
    title: "Troubleshooting — 'attempted relative import with no known parent package'",
    md: "**Symptom:** you run `python textkit/__main__.py \"hi\"` and it crashes with `ImportError: attempted relative import with no known parent package` (if `__main__.py` used `from .core import ...`), or `ModuleNotFoundError: No module named 'textkit'` (if it used the absolute import). **Evidence:** the *same* code works when you run `python -m textkit \"hi\"`. **Hypotheses:** wrong import style / wrong working directory / running the file as a script. **Diagnosis:** running a file *by path* makes Python treat it as a top-level script — `__package__` is empty and `sys.path` is the file's own folder, so it neither has a parent package (breaking relative imports) nor sees `textkit` on the path (breaking the absolute import). **Root cause:** `python path/to/file.py` ≠ `python -m package.module`. **Fix:** run it as a module from the project root: `python -m textkit \"hi\"`. **Verification:** the CLI prints `4`; and `from textkit import word_count` works from a REPL started in the same root.",
  },
  {
    type: "takeaways",
    items: [
      "Structure a package as core (logic) + __init__ (public API) + __main__ (CLI) — one responsibility each.",
      "Run packages with `python -m package`, not `python package/file.py`; the latter breaks both relative and package-absolute imports.",
      "Re-export a clean public surface from __init__.py so callers don't reach into internal modules.",
      "You can now split a script into a maintainable, importable, runnable package.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-functions-modules-01": learn,
  "unit-py-functions-modules-02": practice,
  "unit-py-functions-modules-03": build,
};
