import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Containerization with Docker" (topic-prod-docker).
// 4 units: 01 learn (Dockerfile, images/layers, cache, compose, env/secrets, image size) ·
// 02 practice (write a Dockerfile; secrets-not-in-image) · 03 build (containerize API + deps via
// compose — P6 m-02) · 04 review (optimize image size/startup — multi-stage). commonMistakes:
// Giant images, Baking secrets into images. masteryCriteria: lean, reproducible container.
// Deterministic keyless layer-cache / secret-leak / start-order / image-size experiments.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Your API runs on your machine. The next problem is the oldest one in software: **'it works on my machine' is not a deployment.** A container packages your app with its exact dependencies, Python version and system libraries into a reproducible image that runs identically on your laptop, a colleague's, and the cloud. **Docker** is how you build that image — and doing it well (lean, reproducible, secret-free) is what makes every later deploy step reliable.",
  },
  {
    type: "prose",
    md: "**Mental model: an image is a stack of cached layers built from a recipe (the Dockerfile), and the order of the recipe decides your build speed and your image size.** Each instruction adds a layer; Docker caches layers and rebuilds a layer (and everything after it) only when its inputs change. So you order instructions from least- to most-frequently-changing: base image, then dependencies, then your source. Get the order right and rebuilds are fast; get it wrong and every one-line code change reinstalls every dependency. Two things must never happen: the image must not be bloated, and it must not contain secrets.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Image vs container", definition: "An image is the built, immutable artifact (your app + dependencies + runtime). A container is a running instance of an image. You build an image once and run many containers from it. Images are versioned and pushed to a registry; containers are ephemeral." },
      { term: "Dockerfile", definition: "The recipe that builds an image: a base image (FROM), dependency installs (RUN pip install), copying source (COPY), and the start command (CMD). Each instruction is a cached layer. The order matters for both build speed (cache reuse) and correctness." },
      { term: "Layer cache", definition: "Docker caches each layer keyed on its instruction and inputs. If a layer's inputs are unchanged, it is reused; once a layer changes, it and every layer after it rebuild. Ordering rarely-changing steps (deps) before frequently-changing ones (source) keeps rebuilds fast." },
      { term: "Multi-stage build", definition: "A Dockerfile with multiple FROM stages: a heavy 'build' stage (compilers, build tools) produces artifacts that are copied into a slim 'runtime' stage. The final image ships only what runtime needs — no build tools — cutting size dramatically. The standard cure for giant images." },
      { term: "docker compose", definition: "A tool to define and run a multi-container stack (your API + a vector DB + a cache) from one YAML file, with a shared network, environment, and dependency ordering (depends_on + healthchecks). It is how you bring up the whole local stack with one command." },
      { term: "Build secrets vs runtime config", definition: "Secrets (API keys) must NOT be baked into image layers — an image is shareable and layers are inspectable, so a baked key is a leaked key. Provide secrets at RUN TIME via environment variables / a secrets manager, and exclude secret files with .dockerignore. Config that isn't secret can be env vars too." },
    ],
  },
  {
    type: "prose",
    md: "**Layer ordering is the highest-leverage Docker skill.** When a file changes, that layer and every later layer rebuild — so where you put `COPY` decides whether a code change reinstalls your dependencies:",
  },
  {
    type: "code",
    language: "python",
    caption: "Which layers rebuild when a step changes (deterministic, keyless)",
    code: `def layers_rebuilt(changed_step, steps):
    # Docker cache: the changed layer AND every later layer rebuild.
    idx = steps.index(changed_step)
    return steps[idx:]

steps = ["FROM", "COPY requirements", "RUN pip install", "COPY source", "CMD"]
print(layers_rebuilt("COPY source", steps))
print(layers_rebuilt("COPY requirements", steps))`,
    output: `['COPY source', 'CMD']
['COPY requirements', 'RUN pip install', 'COPY source', 'CMD']`,
  },
  {
    type: "prose",
    md: "Changing your source rebuilds only the last two layers — the expensive `pip install` is cached, so the rebuild is seconds. But changing `requirements` (or copying source before installing deps) rebuilds the install too. The lesson is a rule: **copy `requirements.txt` and `pip install` BEFORE copying your source code.** Then editing your code — which you do constantly — never triggers a dependency reinstall. Ordering the recipe least-to-most-volatile is the difference between a 3-second and a 3-minute rebuild loop.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Giant images and baking secrets into images",
    md: "The two commonMistakes this topic exists to prevent:\n\n- **Giant images** — starting from a full OS base, installing build toolchains into the final image, and copying everything (including `.git`, tests, data). Multi-gigabyte images are slow to build, push, pull and cold-start, and they carry a bigger attack surface. Cures: a slim base, a **multi-stage build** (build tools stay in the build stage), a `.dockerignore`, and `--no-cache-dir` on pip. Smaller images deploy faster and scale cheaper.\n- **Baking secrets into images** — `COPY .env` or `ENV OPENAI_API_KEY=sk-...` in the Dockerfile. An image is a shareable artifact and its layers are inspectable, so a secret in any layer is leaked to anyone who can pull the image — and it stays in the layer history even if a later layer deletes it. Secrets belong at **runtime** (environment variables, a mounted secret, a secrets manager), never in the build. Exclude secret files with `.dockerignore`.\n\nBoth reduce to the same discipline: ship only what runtime needs, and nothing sensitive."
  },
  {
    type: "quiz",
    question: "Your Docker build reinstalls all Python dependencies every time you change a single line of application code, making the dev loop painfully slow. What is the fix?",
    choices: [
      "Use a faster machine — this is unavoidable with Docker",
      "Reorder the Dockerfile so `COPY requirements.txt` + `RUN pip install` come BEFORE `COPY` of your source. Then a source change only invalidates the source layer onward; the cached dependency layer is reused. Layer-cache ordering (rarely-changing steps first) is what keeps rebuilds fast",
      "Delete the layer cache before every build to keep it clean",
      "Put the pip install in the same layer as the source copy",
    ],
    answerIndex: 1,
    explanation: "Docker rebuilds a changed layer and everything after it, so if source is copied before dependencies are installed, any code edit invalidates the install layer and forces a reinstall. Copying requirements and running the install first means a source change only rebuilds the source layer onward, reusing the cached dependencies. Clearing the cache or merging install and copy into one layer makes rebuilds slower, not faster.",
  },
  {
    type: "takeaways",
    items: [
      "A container makes your app reproducible: same dependencies, runtime and libraries on every machine — the end of 'works on my machine.'",
      "An image is a stack of cached layers; order the Dockerfile least-to-most-volatile (base → deps → source) so code edits don't reinstall dependencies.",
      "Copy requirements + pip install BEFORE copying source — the single most important ordering rule for a fast build loop.",
      "Keep images lean: slim base, multi-stage build (build tools stay in the build stage), .dockerignore, no build toolchain in the final image.",
      "Never bake secrets into an image (layers are shareable and inspectable) — provide them at runtime via env/secret manager, and exclude secret files with .dockerignore.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'image builds and runs.' A production Dockerfile is more than 'it built' — it is **lean, cache-friendly, and secret-free.** Here you write one for your API and, critically, verify that no secret ever enters a layer.",
  },
  {
    type: "callout",
    variant: "note",
    title: "A production-shaped Dockerfile checklist",
    md: "A good API Dockerfile:\n\n- starts from a **slim** base (e.g. a slim Python image), pinned to a version for reproducibility;\n- copies `requirements.txt` and installs deps (`--no-cache-dir`) **before** copying source;\n- copies only what runtime needs (a `.dockerignore` excludes `.git`, tests, data, and **secret files**);\n- runs as a **non-root** user;\n- exposes the port and sets a `CMD` that runs the ASGI server (uvicorn);\n- takes secrets at **runtime** (env vars), never via `COPY .env` or `ENV KEY=...`.\n\nThe secret rule is the one that bites hardest: a key baked into a layer is leaked permanently, even if a later instruction deletes the file."
  },
  {
    type: "prose",
    md: "**Before you build, check what you are copying — secret files must never enter the image:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Detect secrets that would be baked into an image (deterministic, keyless)",
    code: `def image_leaks(files_copied):
    # Files that must NEVER be baked into an image layer.
    forbidden = {".env", "id_rsa", ".aws", "secrets.json"}
    return sorted(f for f in files_copied if f in forbidden)

print(image_leaks(["app.py", ".env", "requirements.txt", "secrets.json"]))
print(image_leaks(["app.py", "requirements.txt"]))`,
    output: `['.env', 'secrets.json']
[]`,
  },
  {
    type: "prose",
    md: "The first copy would bake `.env` and `secrets.json` into the image — leaked to anyone who pulls it. The second is clean. A `.dockerignore` file enforces this automatically (it excludes those paths from the build context so they can't be copied), and runtime env vars supply the secrets instead. This is the containerization form of the secrets discipline from the security category: the control moves from 'don't hardcode in source' to 'don't bake into a layer.'",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Write a production Dockerfile for your API",
    intro: "Lean, cache-friendly, secret-free — then build and run it.",
    steps: [
      { order: 1, action: "Start from a slim, version-pinned base. Copy requirements.txt and `pip install --no-cache-dir -r requirements.txt`, THEN copy your source. Add a .dockerignore excluding .git, tests, data, and secret files.", expected: "A code edit rebuilds fast (deps layer cached); no secret file is in the build context." },
      { order: 2, action: "Run as a non-root user, EXPOSE the port, and set CMD to launch uvicorn against your FastAPI app. Provide secrets/config via runtime env vars — never COPY .env or ENV KEY=... in the Dockerfile.", decision: "Which values are secret (→ runtime env / secret manager) vs plain config (→ env, or a non-secret default)?" },
      { order: 3, action: "Build the image and run the container, passing env at runtime (e.g. --env-file locally, secrets manager in prod). Confirm the API responds and no secret is in any layer (inspect history).", verify: "The image builds and runs, the dev-loop rebuild is fast (cached deps), the container runs as non-root, and no secret is baked into any layer." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a production Dockerfile",
    items: [
      "Slim, version-pinned base; requirements + install before source (cache-friendly); .dockerignore excludes junk and secret files.",
      "Runs as non-root; EXPOSEs the port; CMD launches uvicorn.",
      "Secrets/config supplied at runtime via env — never COPY .env or ENV KEY=... in the image.",
      "Image builds and runs; a code edit rebuilds fast; no secret in any layer (verified via history).",
    ],
  },
  {
    type: "takeaways",
    items: [
      "A production Dockerfile is lean, cache-friendly, non-root, and secret-free — 'it built' is not the bar.",
      "Copy requirements + install before source; a .dockerignore keeps junk and secret files out of the build context.",
      "Never bake secrets into a layer (leaked permanently even if later deleted) — supply them at runtime via env / secrets manager.",
      "Run as a non-root user and launch uvicorn from CMD; pin the base image version for reproducibility.",
      "The security-category secrets rule becomes a containerization rule: don't hardcode in source → don't bake into a layer.",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "A real AI service is rarely one container — it is the API plus its dependencies (a vector DB, maybe a cache). The completion criterion is 'compose brings up the full stack,' and this feeds **Project P6's milestone `p6-02`** (containerize the service into a lean, reproducible image). Here you use **docker compose** to bring up the whole local stack with one command, wiring services together with a shared network and correct startup ordering.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *compose brings up the full stack.* Write a `docker-compose.yml` defining your API plus its dependencies (e.g. a vector DB, a cache), on a shared network, with env/secrets injected at runtime and startup ordering via `depends_on` + healthchecks. **Roadmap fit:** this is **P6 `p6-02`** ('a lean reproducible image builds and runs') — the container milestone of the production service. Reuse the VectorStore backend from your P2/P3 work as a compose service. The next unit (review) slims the image; this unit gets the whole stack running reproducibly with one `docker compose up`."
  },
  {
    type: "prose",
    md: "**Compose must start services in dependency order — the API should not start until its datastore is healthy:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Dependency-ordered startup (depends_on + healthchecks) (deterministic, keyless)",
    code: `def start_order(deps):
    # A service starts only after all its dependencies have started (and are healthy).
    started, pending = [], dict(deps)
    while pending:
        ready = [s for s, need in pending.items() if all(d in started for d in need)]
        if not ready:
            return started + ["CYCLE"]
        for s in sorted(ready):
            started.append(s)
            pending.pop(s)
    return started

print(start_order({"api": ["db", "vectordb"], "db": [], "vectordb": []}))
print(start_order({"a": ["b"], "b": ["a"]}))`,
    output: `['db', 'vectordb', 'api']
['CYCLE']`,
  },
  {
    type: "prose",
    md: "The datastore and vector DB (no dependencies) start first; the API starts only once both are up. A dependency cycle is detected and reported rather than hanging forever. In compose, `depends_on` with `condition: service_healthy` (backed by a healthcheck) enforces exactly this: the API container waits until its dependencies pass their health probe, so it never starts against a datastore that is not ready. That prevents the classic flaky-startup bug where the API crashes on boot because the DB was still initializing.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — compose the full stack",
    intro: "One command brings up API + dependencies, reproducibly. Acceptance defines done.",
    steps: [
      { order: 1, action: "Write docker-compose.yml with your API service (built from the Dockerfile) and its dependencies (vector DB, optional cache) on a shared network. Inject secrets/config as runtime env, not baked in.", decision: "Which dependencies are real services (their own container) vs managed externally? Keep the compose stack to what you run locally." },
      { order: 2, action: "Add healthchecks to dependencies and depends_on: { condition: service_healthy } on the API so it waits for them. Persist datastore state with a named volume so data survives restarts.", expected: "`docker compose up` brings up dependencies first, then the API once they are healthy — no boot-time crash from a not-ready datastore." },
      { order: 3, action: "Verify the whole stack: the API reaches its dependencies over the compose network, /health passes, and the app works end-to-end. Confirm a restart preserves data (volume) and re-establishes ordering.", verify: "One `docker compose up` brings up a healthy, reproducible full stack (API + deps) with correct ordering, runtime secrets, and persistent data — delivering P6 p6-02." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a composed stack (P6 p6-02)",
    items: [
      "docker-compose.yml defines API + dependencies on a shared network; secrets injected at runtime.",
      "Dependencies have healthchecks; API uses depends_on: service_healthy so it waits for them.",
      "Datastore state persisted with a named volume (survives restart).",
      "One `docker compose up` brings up the full stack; /health passes; app works end-to-end.",
    ],
  },
  {
    type: "code",
    language: "yaml",
    caption: "Reference — docker-compose.yml with health-gated startup (compose syntax; versions churn — check current)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      OPENAI_API_KEY: \${OPENAI_API_KEY}   # injected at runtime, not baked into the image
      VECTORDB_URL: http://vectordb:8000   # service name resolves on the compose network
    depends_on:
      vectordb:
        condition: service_healthy         # wait until the dependency is healthy
  vectordb:
    image: your/vectordb:pinned-tag
    volumes: ["vdbdata:/data"]             # named volume persists data across restarts
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 3s
      retries: 5
volumes:
  vdbdata:`,
  },
  {
    type: "takeaways",
    items: [
      "docker compose brings up the API + its dependencies as one stack on a shared network — delivering P6 p6-02.",
      "Use depends_on with service_healthy (backed by healthchecks) so the API waits for a ready datastore — preventing boot-time crashes.",
      "Persist datastore state with a named volume so data survives container restarts.",
      "Inject secrets/config at runtime through env; the compose network lets services reach each other by name (no hardcoded hosts).",
      "One `docker compose up` should reproduce the whole local stack — reproducibility is the point of containerizing.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A working image is not a finished image. The completion criterion is 'image is lean and starts fast' — so **optimize size and startup**, because in production, image size is push/pull time, cold-start time, and cost. This is the review side of the container milestone: the same app, in a far smaller image.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "Where image bloat and slow starts come from",
    md: "Common bloat sources and their cures:\n\n- **Build tools in the final image** — compilers and `-dev` packages needed only to build wheels. Cure: a **multi-stage build** that leaves them in the build stage.\n- **Fat base image** — a full OS when a slim runtime would do. Cure: a slim/distroless base.\n- **Copying everything** — `.git`, tests, datasets, caches. Cure: `.dockerignore`.\n- **pip caches / apt lists** — cure: `--no-cache-dir`, clean apt lists in the same layer.\n\nSlow starts add: heavy imports at module load, loading a model into memory before serving, or no warm pool (scale-to-zero cold start, covered next topic). A lean image with a fast, cheap `/health` and shared resources loaded once in `lifespan` starts and scales far better. Size is not vanity — it is deploy speed, cold-start latency, and the attack surface you ship."
  },
  {
    type: "prose",
    md: "**Multi-stage builds are the biggest single size win — the build tools never reach the final image:**",
  },
  {
    type: "code",
    language: "python",
    caption: "Image size: multi-stage vs single-stage (educational estimate, keyless)",
    code: `def image_mb(base, deps, build_tools, source, multistage):
    total = base + deps + source
    if not multistage:
        total += build_tools     # build toolchain shipped in the final image = bloat
    return total

print(image_mb(base=120, deps=300, build_tools=250, source=10, multistage=False))
print(image_mb(base=120, deps=300, build_tools=250, source=10, multistage=True))`,
    output: `680
430`,
  },
  {
    type: "prose",
    md: "Same app, same dependencies — but the single-stage image drags 250MB of build tools into production (680MB), while the multi-stage image ships only base + deps + source (430MB). That 37% cut is faster pushes, faster pulls, faster cold starts, and a smaller attack surface, for zero functional change. Stack the other cures (slim base, `.dockerignore`, `--no-cache-dir`) and the gap widens further. This is a rough estimate, but the mechanism is exact: what you don't copy into the final stage, you don't ship.",
  },
  {
    type: "quiz",
    question: "Your API image is 1.8GB and slow to deploy and cold-start. It installs gcc and build headers to compile a dependency, and copies the whole repo including tests and a sample dataset. What are the highest-impact fixes?",
    choices: [
      "Nothing — image size doesn't affect a running container",
      "Use a multi-stage build (compile in a build stage, copy only the artifacts into a slim runtime stage), add a .dockerignore to exclude tests/data/.git, and use a slim base + --no-cache-dir. This removes the build toolchain and junk from the final image, cutting size, deploy time, and cold-start latency",
      "Switch to a bigger base image so everything is included",
      "Only reduce the number of Python dependencies",
    ],
    answerIndex: 1,
    explanation: "The bloat comes from shipping build tools and unnecessary files in the final image. A multi-stage build keeps compilers in the build stage and copies only the runtime artifacts into a slim final stage, while a .dockerignore excludes tests, data, and .git, and --no-cache-dir avoids caches. Together they cut size, push/pull time, and cold-start latency. A bigger base makes it worse, and trimming dependencies alone doesn't remove the toolchain or junk.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — shrink the image and prove the app still works.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Optimize your API image",
    intro: "Cut size and startup without changing behaviour. Not completion-gated — this is the lean-container proof.",
    steps: [
      { order: 1, action: "Measure the baseline: image size and cold-start time. Identify bloat sources (build tools, fat base, copied junk, caches).", expected: "A baseline size and a list of what is inflating the image." },
      { order: 2, action: "Apply the cures: multi-stage build (build tools stay in the build stage), slim/pinned base, .dockerignore, --no-cache-dir. Keep the app identical.", decision: "Which cure gives the biggest cut for this app? (Usually multi-stage if you compile anything, else the base image + .dockerignore.)" },
      { order: 3, action: "Rebuild, re-measure size and cold start, and re-run the app + /health to confirm no behavior change. Note the before/after and which change mattered most.", verify: "The image is materially smaller and starts faster, the app and /health still work, and you can attribute the reduction to specific changes (multi-stage, slim base, .dockerignore)." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a lean, fast-starting image",
    items: [
      "Baseline size + cold start measured; bloat sources identified.",
      "Multi-stage build + slim pinned base + .dockerignore + --no-cache-dir applied.",
      "Rebuilt image is materially smaller and starts faster; app + /health unchanged.",
      "Before/after recorded with the highest-impact change attributed.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Image size is deploy speed, cold-start latency, and attack surface — not vanity; optimizing it is a production requirement.",
      "Multi-stage builds are the biggest single win: build tools stay in the build stage, so the runtime image ships only what it needs (680MB → 430MB here).",
      "Stack the cures: slim pinned base, .dockerignore (no .git/tests/data), --no-cache-dir, clean apt lists in-layer.",
      "Slow starts also come from heavy imports and per-request loading — load shared resources once in lifespan and keep /health cheap.",
      "Always re-verify the app + /health after slimming — a smaller image must be the same app, just leaner.",
    ],
  },
];

export const content: TopicContent = {
  "unit-prod-docker-01": learn,
  "unit-prod-docker-02": practice,
  "unit-prod-docker-03": build,
  "unit-prod-docker-04": review,
};
