import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Agent Frameworks & Standards (MCP)" (topic-agent-frameworks-protocols).
// 3 units: 01 learn (agent frameworks + MCP architecture/primitives/transports) · 02 build
// (MCP-connected tool + agent) · 03 review (framework vs hand-rolled).
// MCP verified against modelcontextprotocol.io (protocol version 2026-07-28): host/client/
// server, JSON-RPC 2.0, primitives tools/resources/prompts (+ elicitation), tools/list +
// tools/call -> content array, stdio vs Streamable HTTP transports. create_agent verified
// (langchain.agents). Deterministic keyless MCP protocol simulation.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "You've hand-rolled the agent loop and understand every part. Now two ways to avoid rebuilding it forever: **agent frameworks** (which package the loop, memory, retries, and human-in-the-loop) and **the Model Context Protocol (MCP)** (a standard so tools are interoperable across agents and hosts). The theme is the same as the orchestration category — leverage without losing understanding, and avoid lock-in.",
  },
  {
    type: "prose",
    md: "**Mental model, part 1 — a framework agent is 'model + harness,' pre-assembled.** You already saw `create_agent(model, tools, system_prompt)`: it runs the reason→act→observe loop, feeds tool results back, and (with a checkpointer) persists memory — the exact machinery you built by hand. Frameworks add configurable **middleware** for the reliability concerns you learned: retries (`ModelRetryMiddleware`, `ToolRetryMiddleware`), human approval before risky tools (`HumanInTheLoopMiddleware(interrupt_on=...)`), and guardrails. The framework saves boilerplate; the *responsibilities* (validation, authorization, limits, security) stay yours.",
  },
  {
    type: "prose",
    md: "**Mental model, part 2 — MCP is a standard protocol for connecting agents to tools.** Without a standard, every agent framework invents its own tool interface, and every tool must be re-integrated for every framework — an **M×N integration problem** (M hosts × N tools). MCP replaces that with **one protocol**: a tool exposed as an **MCP server** can be used by *any* MCP-compatible **host** (Claude Desktop, VS Code, your agent) without custom glue. It's the USB-C of tool use — a universal connector.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Agent framework", definition: "A library that packages the agent loop + harness (create_agent): tool execution, memory/persistence, streaming, and middleware for retries, guardrails, and human-in-the-loop. Built (in LangChain's case) on LangGraph." },
      { term: "MCP (Model Context Protocol)", definition: "An open standard for connecting AI applications to tools/data over JSON-RPC 2.0. A host runs one client per server; servers expose capabilities the host's model can use." },
      { term: "MCP host / client / server", definition: "Host = the AI application (coordinates clients). Client = one connection to one server. Server = a program exposing tools/resources/prompts. Servers run locally (stdio) or remotely (HTTP)." },
      { term: "MCP primitives", definition: "Servers expose: TOOLS (executable functions, tools/call), RESOURCES (context data, resources/read), and PROMPTS (reusable templates). Clients can expose ELICITATION (request user input/confirmation)." },
      { term: "Transport", definition: "How client and server talk: STDIO (local process, no network) or Streamable HTTP (remote, optional streaming, standard auth like OAuth/bearer). Same JSON-RPC messages over either." },
    ],
  },
  {
    type: "prose",
    md: "**How MCP actually works** (the parts an AI engineer needs): it's **JSON-RPC 2.0** between a client and a server. The client **discovers** tools with `tools/list` (each tool has a `name`, `description`, and a JSON-Schema `inputSchema`), and **executes** one with `tools/call` (a `name` + `arguments`), receiving a **`content` array** back (text, etc.). The host combines tools from all connected servers into the unified registry its model can call — then it's the same tool-calling loop you already own, except the tools arrive via a standard protocol instead of being hard-coded.",
  },
  {
    type: "code",
    language: "python",
    caption: "The MCP protocol shape — discover (tools/list) then execute (tools/call), deterministic",
    code: `# An MCP SERVER exposes tools with JSON-Schema inputs and executes them.
server_tools = {
    "get_weather": {
        "description": "Current weather for a city.",
        "inputSchema": {"type": "object",
                        "properties": {"city": {"type": "string"}},
                        "required": ["city"]},
        "fn": lambda city: f"{city}: 20C, clear",
    },
}

def tools_list(server):                       # client discovery -> tools/list
    return [{"name": n, "description": t["description"], "inputSchema": t["inputSchema"]}
            for n, t in server.items()]

def tools_call(server, name, arguments):      # execution -> tools/call
    text = server[name]["fn"](**arguments)
    return {"content": [{"type": "text", "text": text}]}   # MCP returns a content array

print([t["name"] for t in tools_list(server_tools)])                # discover
print(tools_call(server_tools, "get_weather", {"city": "Paris"}))   # call`,
    output: `['get_weather']
{'content': [{'type': 'text', 'text': 'Paris: 20C, clear'}]}`,
  },
  {
    type: "prose",
    md: "That's the whole protocol shape: **list → call → content array**, over JSON-RPC. Real code uses an MCP SDK (e.g. the `mcp` Python package, or adapters that expose MCP tools to a framework agent) and a transport (stdio for a local server, Streamable HTTP for a remote one), but the *semantics* are exactly this. Once tools are discovered, your agent calls them through the same validated loop from the tool-calling topic — the trust boundaries don't change just because a protocol delivered the tool.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "MCP doesn't remove the security work — it can add to it",
    md: "A standard connector makes tools easy to add, which is exactly why it needs discipline:\n\n- **A third-party MCP server is untrusted code + untrusted output.** Connecting one means its tools can run and its results enter your model's context. Vet servers you don't control; a malicious or compromised server can expose harmful tools or return injected instructions (the untrusted-result boundary from the tool-calling topic applies identically).\n- **Least privilege still applies.** Just because a server offers 20 tools doesn't mean your agent should expose all of them. Connect only what the task needs.\n- **Remote servers need real auth.** Streamable HTTP servers use standard auth (OAuth/bearer) — don't hard-code credentials, and scope tokens narrowly.\n- **Authorization is still yours.** MCP standardises *how* tools are called, not *whether the current user is allowed* to call them. Authorize every call against the user's permissions, and gate destructive tools with confirmation.\n\nMCP solves interoperability, not trust. The validation/authorization/containment work from the tool-calling topic is unchanged."
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Two opposite mistakes: reinventing tool protocols, and framework lock-in",
    md: "- **Reinventing the protocol.** Hand-rolling a bespoke tool interface for every integration recreates the M×N problem MCP exists to solve. If you're wiring the same tools to multiple agents/hosts, a standard protocol (MCP) saves that duplication and makes tools portable.\n- **Framework/vendor lock-in.** Conversely, building everything on one framework's proprietary agent + tool abstractions couples you to its release cadence and concepts (you saw how fast these move). Favour standard interfaces (MCP for tools) and keep your core logic — tools, validation, limits — framework-agnostic so you can swap the harness. The middle path: use a framework for the loop's boilerplate, but expose/consume tools over a standard protocol and keep your business logic portable."
  },
  {
    type: "quiz",
    question: "You've built 6 tools and want them usable from your own agent, Claude Desktop, and a teammate's LangGraph agent without rewriting integration code each time. What does MCP give you?",
    choices: [
      "Nothing — you must re-integrate for each host",
      "A standard protocol: expose the tools once as an MCP server, and any MCP-compatible host/agent can discover (tools/list) and call (tools/call) them without custom glue — solving the M×N integration problem and keeping the tools portable",
      "It makes the tools run faster",
      "It replaces the need for the model",
    ],
    answerIndex: 1,
    explanation: "MCP standardises the tool interface, so a tool exposed once as an MCP server works with any MCP host/agent via the same discover/execute protocol. That eliminates writing bespoke integrations per host (the M×N problem) and makes tools portable across the ecosystem — the core value proposition of the protocol.",
  },
  {
    type: "quiz",
    question: "You connect your agent to a third-party MCP server you didn't write. Which concern is MOST important?",
    choices: [
      "MCP guarantees the server is safe, so no concern",
      "The server is untrusted code and output: its tools can execute and its results enter your context (possible injected instructions). Vet it, apply least privilege (expose only needed tools), authorize calls against the user, gate destructive actions, and use proper auth for remote servers",
      "Only that the network is fast enough",
      "That it uses the same programming language as your agent",
    ],
    answerIndex: 1,
    explanation: "MCP standardises connectivity, not trust. A third-party server can offer harmful tools or return malicious/injected output, so the untrusted-execution and untrusted-result boundaries fully apply: vet the server, least privilege, authorize per user, confirm destructive actions, and secure remote auth. Interoperability doesn't imply safety.",
  },
  {
    type: "takeaways",
    items: [
      "Agent frameworks (create_agent) pre-assemble the loop + harness + middleware (retries, guardrails, human-in-the-loop); your responsibilities (validation/authorization/limits) remain.",
      "MCP is a standard JSON-RPC protocol connecting hosts→clients→servers; servers expose tools/resources/prompts, solving the M×N tool-integration problem.",
      "The tool flow: tools/list to discover (name/description/inputSchema), tools/call to execute (name/arguments) → a content array; transports are stdio (local) or Streamable HTTP (remote).",
      "MCP solves interoperability, not trust: third-party servers are untrusted code+output — vet them, least privilege, authorize per user, gate destructive actions, secure remote auth.",
      "Avoid both reinventing tool protocols (use MCP) and framework lock-in (keep tools/logic portable, standard interfaces).",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "**Build an MCP-connected tool and agent** — the agent uses tools via a standard protocol. You expose a tool through MCP (or the protocol shape above) and connect an agent as the client that discovers and calls it. The point is *interoperability*: the same tool, consumable by any MCP host.",
  },
  {
    type: "callout",
    variant: "note",
    title: "What 'done' looks like (and the keyless path)",
    md: "Completion: *the agent uses tools via a standard protocol.* Real implementation: write a small **MCP server** (using an MCP SDK) that exposes one or two tools with JSON-Schema inputs, and connect an **agent as an MCP client** (directly, or via a framework adapter that surfaces MCP tools to `create_agent`). **Keyless path:** you can implement and test the *protocol* end (a server exposing `tools/list`/`tools/call`, a client that discovers and calls) with **no model and no API key** — the deterministic simulation above is exactly this shape; swap in a real SDK + transport (stdio) for the live version. The agent's *reasoning* over those tools needs a model; keep that optional. Never hard-code credentials — remote servers use standard auth."
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a tool behind a standard protocol",
    intro: "Acceptance defines done. Standardise the interface; keep trust boundaries.",
    steps: [
      { order: 1, action: "Expose a tool via MCP: define its name, description, and JSON-Schema input, and implement execution that returns a content result. Run a discovery (tools/list) and an execution (tools/call) against it — keyless is fine for the protocol layer.", decision: "Why does exposing the tool via a standard protocol make it reusable across different agents/hosts, versus wiring it directly into one agent?" },
      { order: 2, action: "Connect an agent as the client: discover the tool via the protocol, add it to the agent's tool set, and have the agent call it to complete a task (real model optional; the protocol round-trip must work regardless). Keep validation/authorization on the call.", expected: "The agent discovers and calls the tool through the protocol; the tool call is validated/authorized just like any tool." },
      { order: 3, action: "Apply the trust boundary for a connected server: least privilege (expose only needed tools), treat results as untrusted, and (for a remote server) use proper auth. Confirm the same tool could be consumed by another host unchanged.", verify: "A tool is exposed via a standard protocol and consumed by an agent through discover→call; trust boundaries hold; the tool is portable to other hosts." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A tool exposed via MCP (name/description/JSON-Schema input) with discover (tools/list) + execute (tools/call) working.",
      "An agent consumes the tool through the protocol (protocol round-trip keyless; model optional).",
      "Calls are validated/authorized; results treated as untrusted; least privilege applied.",
      "The tool is portable — another MCP host could consume it unchanged; remote auth via standard methods, no hard-coded secrets.",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — protocol layer (keyless) + where a real SDK/agent plugs in",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `# --- Protocol layer (keyless, testable): an MCP-shaped tool server + client calls ---
class ToolServer:                     # stands in for an MCP server (real one uses the mcp SDK)
    def __init__(self):
        self._tools = {}
    def register(self, name, description, input_schema, fn):
        self._tools[name] = {"description": description, "inputSchema": input_schema, "fn": fn}
    def list_tools(self):             # tools/list
        return [{"name": n, "description": t["description"], "inputSchema": t["inputSchema"]}
                for n, t in self._tools.items()]
    def call_tool(self, name, arguments):   # tools/call -> content array
        if name not in self._tools:
            return {"isError": True, "content": [{"type": "text", "text": "unknown tool"}]}
        text = self._tools[name]["fn"](**arguments)
        return {"content": [{"type": "text", "text": str(text)}]}

server = ToolServer()
server.register("word_count", "Count words in text.",
                {"type": "object", "properties": {"text": {"type": "string"}},
                 "required": ["text"]},
                lambda text: len(text.split()))

# Client side: discover, then the agent calls when the model requests it.
discovered = server.list_tools()
print([t["name"] for t in discovered])                       # ['word_count']
print(server.call_tool("word_count", {"text": "one two three"}))
# {'content': [{'type': 'text', 'text': '3'}]}

# --- Real version (needs the mcp SDK + a transport; model optional) ---
# A real MCP server uses the mcp Python SDK over stdio/HTTP; a framework adapter can surface
# MCP tools to create_agent so the agent calls them through the standard protocol:
#   from langchain.agents import create_agent
#   agent = create_agent(model="openai:gpt-4o-mini", tools=mcp_tools)  # mcp_tools from adapter`,
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "You've built agents both by hand and with a framework, and connected tools via a standard protocol. This unit is the honest comparison — when a framework earns its abstraction, and when hand-rolling wins.",
  },
  {
    type: "quiz",
    question: "Which is the most accurate summary of framework-agent vs hand-rolled-agent?",
    choices: [
      "Frameworks are always better; never hand-roll",
      "A framework removes loop/memory/retry/HITL boilerplate and gives you tested primitives + tracing, at the cost of a dependency, abstraction over the exact model/tool calls, and version churn; hand-rolled gives full control and a small surface but you maintain everything. The choice depends on complexity, control needs, and how fast you must move",
      "Hand-rolled is always better; never use a framework",
      "They are identical in every way",
    ],
    answerIndex: 1,
    explanation: "Same tradeoff shape as the orchestration category: frameworks trade transparency and dependencies for less plumbing, reliability middleware, and observability; hand-rolled trades maintenance for control and a small auditable surface. Neither wins universally — decide from the agent's complexity, the need for provider/framework portability, and version-risk tolerance.",
  },
  {
    type: "quiz",
    question: "A framework agent gives worse results than your hand-rolled one on the same tools. Where do you look FIRST?",
    choices: [
      "Abandon the framework immediately",
      "Trace the actual model calls and tool executions the framework performs — the system prompt, which tools it exposed, the arguments it sent, and the results fed back may differ from your hand-rolled version. Confirm WHAT the model/tools actually did before blaming the framework",
      "Switch to a bigger model",
      "Remove all the tools",
    ],
    answerIndex: 1,
    explanation: "Different behaviour on the same tools usually means the framework assembled the prompt, tool schemas, or message flow differently. Tracing (LangSmith or equivalent) shows the real calls and results, localising whether it's the prompt, tool schemas, or the loop — debugging through the abstraction rather than guessing, the same discipline as the orchestration topics.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — connect an agent to tools via a standard protocol and defend the choice.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Standardise tool access and justify framework vs hand-rolled",
    intro: "Show interoperability plus judgement.",
    steps: [
      { order: 1, action: "Expose at least one tool via the standard protocol and have an agent consume it through discover→call. Confirm the same tool would work with a different host/agent unchanged.", expected: "A tool consumed via a standard protocol; portability demonstrated or clearly argued." },
      { order: 2, action: "Decide whether YOUR agent's loop should be framework-driven or hand-rolled, and justify it against complexity, control, reliability middleware needs, tracing, and version risk. Note which parts you'd keep framework-agnostic regardless.", decision: "Which parts of an agent should stay portable (tools, validation, limits) even if you adopt a framework harness, and why?" },
      { order: 3, action: "State how you avoid BOTH failure modes: reinventing tool protocols (use MCP) and framework lock-in (portable core, standard interfaces).", verify: "A tool consumed via a standard protocol, a justified framework-vs-hand-rolled decision, and an explicit plan to avoid both reinventing protocols and lock-in." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria",
    items: [
      "A tool consumed by an agent via a standard protocol (discover→call), portable to other hosts.",
      "A justified framework-vs-hand-rolled decision grounded in complexity/control/reliability/tracing/version-risk.",
      "Core logic (tools, validation, limits) kept framework-agnostic.",
      "An explicit plan to avoid reinventing tool protocols AND framework lock-in.",
    ],
  },
];

export const content: TopicContent = {
  "unit-agent-frameworks-protocols-01": learn,
  "unit-agent-frameworks-protocols-02": build,
  "unit-agent-frameworks-protocols-03": review,
};
