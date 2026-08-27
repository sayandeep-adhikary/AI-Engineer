import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Environments, Packages, Secrets & Git/CI" (topic-py-env-tooling).
// 5 units: 01 learn envs/secrets · 02 practice venv+dotenv · 03 build starter template
// · 04 learn Git/CI · 05 practice branch→PR→Actions.
// Commands (venv/pip/git) and GitHub Actions YAML are canonical and current; action
// versions (checkout@v4, setup-python@v5) update over time — check the Marketplace.

// ── 1.4.1 · Learn — Environments & secrets hygiene ───────────────────────────
const learnEnv: ContentBlock[] = [
  {
    type: "prose",
    md: "\"It works on my machine\" is where reproducibility goes to die. A virtual environment makes your project's dependencies **explicit and isolated**, and disciplined secret handling keeps your API keys out of source control and off the internet. These are table stakes — every later topic assumes you can spin up a clean env and load a key safely.",
  },
  {
    type: "prose",
    md: "**Mental model: a venv is a private, disposable copy of Python for one project.** Without it, `pip install` dumps packages into your *global* interpreter, so two projects fight over versions. A venv gives each project its own `site-packages`; activating it just puts that project's Python first on your `PATH`. Delete the folder and it's gone — nothing global was touched. Reproducibility then comes from writing the exact packages into `requirements.txt` so anyone (including CI) can recreate the env.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Virtual environment (venv)", definition: "An isolated per-project Python with its own installed packages. Created with `python -m venv .venv`." },
      { term: "pip", definition: "Python's package installer. `pip install X` adds a package to the *active* environment." },
      { term: "requirements.txt", definition: "A pinned list of dependencies. `pip freeze > requirements.txt` writes it; `pip install -r requirements.txt` recreates it." },
      { term: "Environment variable", definition: "A key/value in the process environment, read via `os.environ` / `os.getenv`. Where secrets and config belong — not source code." },
      { term: ".env + python-dotenv", definition: "A local file of `KEY=value` lines that `load_dotenv()` reads into the environment for development. The file is git-ignored." },
    ],
  },
  {
    type: "code",
    language: "bash",
    caption: "Create, activate, install, freeze",
    code: `python -m venv .venv            # create an isolated env in ./.venv
source .venv/bin/activate       # macOS/Linux  (Windows: .venv\\Scripts\\activate)
pip install openai python-dotenv
pip freeze > requirements.txt   # pin exact versions for reproducibility
deactivate                      # leave the env`,
  },
  {
    type: "prose",
    md: "After `pip freeze > requirements.txt`, a teammate runs `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` and gets the **same** versions you have. That file is the contract; commit it. The `.venv/` folder itself is **not** committed (it's large and machine-specific) — it's rebuilt from `requirements.txt`.",
  },
  {
    type: "prose",
    md: "**Secrets live in the environment, never in code.** Read them with `os.environ` (raises `KeyError` if missing — good for required keys) or `os.getenv` (returns `None`/a default — good for optional config). In development, keep them in a git-ignored `.env` and load it with python-dotenv.",
  },
  {
    type: "code",
    language: "python",
    caption: "Loading a secret from .env — the right way",
    code: `import os
from dotenv import load_dotenv

load_dotenv()                          # reads .env into the environment

api_key = os.environ["OPENAI_API_KEY"]     # required: KeyError if absent
model = os.getenv("MODEL", "gpt-4o")       # optional: default if absent
print(model)`,
    output: `gpt-4o`,
  },
  {
    type: "code",
    language: "bash",
    caption: ".env (git-ignored) and .gitignore",
    code: `# .env  — never committed
OPENAI_API_KEY=sk-your-real-key
MODEL=gpt-4o

# .gitignore
.venv/
.env
__pycache__/`,
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Creating a `.env` does nothing on its own — you must call `load_dotenv()`",
    md: "Python does **not** read `.env` automatically. Beginners create the file, then `os.environ[\"OPENAI_API_KEY\"]` raises `KeyError` and they conclude the key is 'wrong'. The file is inert until `load_dotenv()` (from python-dotenv) parses it into the environment. Second subtlety: by default `load_dotenv()` does **not override** a variable already set in your shell (`override=False`) — so a stale `export OPENAI_API_KEY=old` in your terminal silently beats your `.env`. If a value seems ignored, check for a real env var shadowing it (`echo $OPENAI_API_KEY`).",
  },
  {
    type: "callout",
    variant: "warning",
    title: "A committed `.env` is a leaked key — deleting the file isn't enough",
    md: "Assumption: 'I removed `.env` in a follow-up commit, so the key is safe.' Reality: git keeps **history**. Anyone who clones can `git log`/`git show` the old commit and read the key. Once a secret touches a commit that's pushed, treat it as **compromised and rotate it immediately** (issue a new key, revoke the old). Prevent it up front: add `.env` to `.gitignore` *before* the first commit, and commit a `.env.example` with blank/placeholder values so collaborators know what to set.",
  },
  {
    type: "quiz",
    question: "Your code does `os.environ[\"OPENAI_API_KEY\"]` and raises KeyError, even though a `.env` file with that key sits in the project root. Most likely cause?",
    choices: [
      "The key is invalid",
      "You never called `load_dotenv()`, so the .env was never read into the environment",
      "os.environ can't read strings",
      "The .env must be named config.env",
    ],
    answerIndex: 1,
    explanation: "`.env` is not read automatically. Until `load_dotenv()` parses it into `os.environ`, the variable doesn't exist and `os.environ[...]` raises KeyError. (Validity of the key is a separate, later concern — you'd only find out on an API call.)",
  },
  {
    type: "quiz",
    question: "You accidentally committed and pushed a `.env` containing a real API key, then deleted the file in the next commit. What must you do?",
    choices: [
      "Nothing — the file is gone",
      "Add it to .gitignore and move on",
      "Rotate/revoke the key immediately; it remains readable in git history",
      "Force-push to rewrite the last commit only",
    ],
    answerIndex: 2,
    explanation: "The secret persists in history and in any clone/fork, so it's compromised — rotate it now. Adding .gitignore prevents *future* leaks but doesn't remove the past exposure; even history rewrites can't guarantee no one already pulled it. Assume it's public and issue a new key.",
  },
  {
    type: "takeaways",
    items: [
      "A venv isolates per-project packages; requirements.txt (via pip freeze) makes the env reproducible.",
      "Commit requirements.txt, .gitignore, and .env.example — never .venv/ or .env.",
      "Secrets come from the environment: os.environ (required) / os.getenv (optional). `.env` needs load_dotenv().",
      "load_dotenv() won't override a real shell variable by default — watch for shadowing.",
      "A pushed secret is compromised regardless of later deletion — rotate the key.",
    ],
  },
];

// ── 1.4.2 · Practice — Set up venv + dotenv (guided) ─────────────────────────
const practiceEnv: ContentBlock[] = [
  {
    type: "prose",
    md: "Do this for real in an empty folder — muscle memory here pays off every project.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Create an isolated env and load a secret",
    intro: "From zero to a script that reads a key from a git-ignored .env.",
    steps: [
      { order: 1, action: "Create and activate a venv: `python -m venv .venv` then activate it. Confirm you're inside it — `which python` (or `where python`) should point into `.venv`.", expected: "The interpreter path is inside your project's `.venv`, not the global Python." },
      { order: 2, action: "`pip install python-dotenv`, then `pip freeze > requirements.txt`. Open requirements.txt and confirm python-dotenv is pinned.", expected: "requirements.txt lists python-dotenv with an exact version." },
      { order: 3, action: "Create `.env` with `DEMO_SECRET=hello` and a `.gitignore` containing `.venv/` and `.env`. Decide: should `.gitignore` exist BEFORE or AFTER your first `git add`?", decision: "If you `git add .` before writing .gitignore, does .env get staged? Order matters — reason it through." },
      { order: 4, action: "Write `main.py` that calls `load_dotenv()` and prints `os.getenv(\"DEMO_SECRET\", \"<missing>\")`. Run it.", expected: "Prints `hello`. Delete the DEMO_SECRET line from .env and rerun → prints `<missing>` (not a crash), proving the default path works.", verify: "`git status` shows main.py, requirements.txt, .gitignore — but NOT .env or .venv/." },
    ],
  },
  {
    type: "checkpoint",
    title: "Verify",
    items: [
      "`which python` points inside .venv while activated.",
      "requirements.txt pins python-dotenv.",
      "main.py prints the secret via load_dotenv() + os.getenv, and the default when it's absent.",
      "git status never shows .env or .venv/.",
    ],
  },
];

// ── 1.4.3 · Build — Reproducible starter template ────────────────────────────
const buildEnv: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build a starter template** you can copy for every future AI project — the deliverable this unit asks for. A good template makes the *right* thing the *easy* thing: safe secrets, pinned deps, and a clean clone experience.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a reproducible project skeleton",
    intro: "Acceptance defines done; lay it out yourself.",
    steps: [
      { order: 1, action: "Produce a folder with: `.gitignore` (ignoring `.venv/`, `.env`, `__pycache__/`), `.env.example` (keys with blank/placeholder values, committed), `requirements.txt`, `README.md` (setup steps), and a `src/` package with a `main.py` that loads config from the environment.", decision: "What goes in `.env.example` vs `.env`? Which is committed and which is ignored — and why does committing the example help a new teammate?" },
      { order: 2, action: "`main.py` must fail with a clear message if a required variable is missing, rather than crashing deep in a library.", expected: "Running without the variable prints something like `Set OPENAI_API_KEY (see .env.example)`, not a raw KeyError traceback." },
      { order: 3, action: "Verify the clone experience: from a fresh checkout, following only the README, a new user can create the env, install deps, copy `.env.example` → `.env`, and run.", verify: "A teammate with only the README reaches a running program without asking you anything." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      ".gitignore excludes .venv/, .env, __pycache__/; .env.example IS committed with placeholders.",
      "requirements.txt recreates the environment exactly.",
      "Missing required config produces a clear, actionable message — not a raw traceback.",
      "A fresh clone is runnable from the README alone.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — src/main.py config loading",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `import os, sys
from dotenv import load_dotenv

def get_required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        sys.exit(f"Set {name} (copy .env.example to .env and fill it in).")
    return value

def main() -> None:
    load_dotenv()
    api_key = get_required("OPENAI_API_KEY")
    model = os.getenv("MODEL", "gpt-4o")
    print(f"Configured: model={model}, key set={'yes' if api_key else 'no'}")

if __name__ == "__main__":
    main()`,
  },
];

// ── 1.4.4 · Learn — Git workflow & CI basics ─────────────────────────────────
const learnGit: ContentBlock[] = [
  {
    type: "prose",
    md: "Version control and CI turn 'code on my laptop' into 'code a team can trust and ship'. Git records history and lets many people work in parallel; **Continuous Integration** runs your checks automatically on every change so broken code is caught *before* it merges. You don't need to be a Git wizard — you need the everyday loop and a working CI check.",
  },
  {
    type: "prose",
    md: "**Mental model: branch → commit → PR → CI → merge.** `main` is the shared, always-working branch. You do work on a **feature branch**, snapshot progress as **commits**, and open a **pull request** to propose merging it back. Opening/updating the PR triggers **CI** (a GitHub Actions workflow) that installs deps and runs tests; a green check means it's safe to merge. This loop is the heartbeat of professional development.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Commit", definition: "An immutable snapshot of your changes with a message. The unit of history." },
      { term: "Branch", definition: "A movable pointer to a line of commits. Feature branches isolate work from `main`." },
      { term: "Pull request (PR)", definition: "A proposal to merge one branch into another, with review + automated checks attached." },
      { term: "CI (Continuous Integration)", definition: "Automatically building/testing every change so integration problems surface early." },
      { term: "CD (Continuous Delivery/Deployment)", definition: "Automatically releasing passing changes — to a staging button (delivery) or straight to prod (deployment)." },
      { term: "GitHub Actions workflow", definition: "A YAML file in `.github/workflows/` describing what to run, when (`on:`), and where (`runs-on:`)." },
    ],
  },
  {
    type: "code",
    language: "bash",
    caption: "The everyday Git loop",
    code: `git switch -c feature/add-retry    # create + switch to a feature branch
# ...edit files...
git add .
git commit -m "Add retry with backoff to the API client"
git push -u origin feature/add-retry
# then open a Pull Request on GitHub -> CI runs -> review -> merge`,
  },
  {
    type: "code",
    language: "yaml",
    caption: ".github/workflows/ci.yml — a minimal CI check",
    code: `name: CI
on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest`,
  },
  {
    type: "prose",
    md: "*What:* on every push and PR, GitHub spins up a fresh Ubuntu runner, checks out your code, installs Python 3.12, installs your pinned deps, and runs `pytest`. *Why:* a clean machine proves the project works from nothing but your committed files. *What to verify:* the Actions tab shows a green run. *What could go wrong:* the runner has **only** what's in `requirements.txt` — a package you installed locally but forgot to pin will make CI fail (the troubleshooting scenario below).",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Secrets in CI come from GitHub Secrets — and forked PRs don't get them",
    md: "You cannot read your local `.env` in CI (it's git-ignored, and rightly so). Real keys go in **repo Settings → Secrets and variables → Actions**, referenced as `${{ secrets.OPENAI_API_KEY }}` and injected as env vars in the workflow — never hardcoded in YAML (the YAML is committed). A sharp edge: for security, workflows triggered by PRs **from forks** don't receive your secrets by default, so a fork's CI can behave differently from a branch's. Design tests that don't need live keys (mock the network) so CI is fast, free, and fork-safe.",
  },
  {
    type: "callout",
    variant: "warning",
    title: "Troubleshooting — 'passes locally, fails in CI with ModuleNotFoundError'",
    md: "**Symptom:** `pytest` is green on your laptop but the CI job fails with `ModuleNotFoundError: No module named 'httpx'`. **Evidence:** the failing step is `pytest`; the install step succeeded; the module clearly exists locally. **Hypotheses:** wrong Python version / missing dependency / test-only dependency not installed. **Diagnosis:** you `pip install httpx`-ed it locally weeks ago but never ran `pip freeze > requirements.txt`, so it's **not in the committed file** — and CI installs only what that file lists. Confirm with `pip freeze | grep httpx` locally (present) vs. `grep httpx requirements.txt` (absent). **Root cause:** local env and the committed dependency list have drifted. **Fix:** add the dependency (`pip install httpx && pip freeze > requirements.txt`), commit, push. **Verification:** the fresh CI runner installs httpx and `pytest` passes. **Lesson:** CI's clean room is a feature — it catches exactly this 'works on my machine' drift.",
  },
  {
    type: "quiz",
    question: "Tests pass locally but CI fails at the pytest step with ModuleNotFoundError for a package you use. What's the most likely root cause and fix?",
    choices: [
      "GitHub is down; re-run the job",
      "The dependency is installed in your local venv but missing from requirements.txt; add it and commit",
      "You must upgrade pip in CI",
      "pytest isn't compatible with Ubuntu",
    ],
    answerIndex: 1,
    explanation: "CI installs only what requirements.txt lists on a clean machine. A locally-installed-but-unpinned package is invisible to CI, so imports fail there. `pip freeze > requirements.txt`, commit, and CI's fresh env will have it. This drift is precisely what CI exists to catch.",
  },
  {
    type: "quiz",
    question: "Your workflow needs an API key to run an integration test. Where should the key come from?",
    choices: [
      "Hardcoded in the workflow YAML",
      "Committed in a .env the workflow reads",
      "GitHub Actions Secrets, referenced as ${{ secrets.NAME }} and injected as an env var",
      "Printed to the logs so you can copy it",
    ],
    answerIndex: 2,
    explanation: "The YAML is committed, so anything in it is public to anyone with repo read access — never hardcode secrets there. GitHub Secrets are encrypted and injected at runtime without appearing in the file or logs. (Also remember fork PRs won't receive them, so prefer mocked tests where possible.)",
  },
  {
    type: "takeaways",
    items: [
      "The loop: feature branch → commits → PR → CI runs → review → merge into an always-working main.",
      "A GitHub Actions workflow is YAML in .github/workflows/: `on:` (when), `runs-on:` (where), `steps:` (what).",
      "CI runs on a clean machine with only your committed files — it catches 'works on my machine' dependency drift.",
      "CI = test every change; CD = release passing changes. Secrets come from GitHub Secrets, never committed YAML.",
    ],
  },
];

// ── 1.4.5 · Practice — Branch → PR → Actions ─────────────────────────────────
const practiceGit: ContentBlock[] = [
  {
    type: "prose",
    md: "Put the whole loop together on a throwaway GitHub repo: a change on a branch, a PR, and a passing CI run you can see green in the Actions tab.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Open a PR that triggers a passing CI run",
    intro: "Requirements + acceptance. You choose the exact commands.",
    steps: [
      { order: 1, action: "Init a repo with a tiny package, a trivial test (e.g. `test_smoke.py` asserting your `word_count(\"a b\") == 2`), a `requirements.txt` including `pytest`, and the `.github/workflows/ci.yml` from the previous unit. Push to a new GitHub repo.", decision: "Should the workflow trigger on `push`, `pull_request`, or both? What does each choice mean for when the green check appears?" },
      { order: 2, action: "Create a feature branch, make a small change, commit, push, and open a Pull Request.", expected: "The PR page shows a running, then passing, `CI` check." },
      { order: 3, action: "Deliberately break the test (assert the wrong value), push to the branch, and watch CI go red on the PR. Then fix it and watch it go green.", verify: "You can point to the failing log line in the Actions tab, and the green check returns after the fix — proving CI gates the merge on real results." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A PR exists and shows a CI status check (not just a local pass).",
      "The workflow installs from requirements.txt and runs pytest on a clean runner.",
      "You saw CI fail on a broken test and pass after the fix.",
      "No secret is hardcoded in the workflow YAML.",
    ],
  },
];

export const content: TopicContent = {
  "unit-py-env-tooling-01": learnEnv,
  "unit-py-env-tooling-02": practiceEnv,
  "unit-py-env-tooling-03": buildEnv,
  "unit-py-env-tooling-04": learnGit,
  "unit-py-env-tooling-05": practiceGit,
};
