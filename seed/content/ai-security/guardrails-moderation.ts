import type { ContentBlock, TopicContent } from "../../types";

// Rich content for "Guardrails, Moderation & Safe Output Handling" (topic-sec-guardrails).
// 4 units: 01 learn (guardrail layers, defense in depth, moderation, least privilege, HITL) ·
// 02 practice (output validation; classifier != authorization) · 03 build (guardrail layer for
// your agent) · 04 review (red-team the guardrails). commonMistakes: Executing model output
// directly, Over-privileged tools. masteryCriteria: an agent that can't be coerced into unsafe
// actions. Feeds P4 p4-03 + P6 p6-06. Builds on Batch 3 tools + Batch 8 agents. Deterministic
// keyless tool-permission matrix / output-policy / guardrail pipeline / allow-list red-team.

const learn: ContentBlock[] = [
  {
    type: "prose",
    md: "Threat modeling named the risks; injection defenses handled the input side. **Guardrails are the output and action side: the layers that stand between the model's response and the real world.** A model can produce unsafe content, propose a dangerous action, or leak PII — and none of that matters if a guardrail catches it before it reaches a user or a sink. This topic is about building those layers, and about the one principle they all serve: the model proposes; the application disposes.",
  },
  {
    type: "prose",
    md: "**Mental model: guardrails are defense in depth around an untrusted component — no single layer is trusted to be perfect, so you stack independent checks.** Input moderation, content isolation, output validation, least-privilege tools, human approval for high-impact actions, and rate/cost limits each catch a different failure. Crucially, none of them — not even a safety classifier — grants authorization. A layer can say 'this looks unsafe, block it'; only your application policy says 'this action is permitted for this user.' Safe-looking is not the same as authorized.",
  },
  {
    type: "keyTerm",
    terms: [
      { term: "Defense in depth", definition: "Stacking independent controls so that one failing does not breach the system. No guardrail is perfect against a stochastic model and an adaptive attacker, so you layer input checks, output validation, least-privilege tools and human approval — an attack must defeat all of them, not one." },
      { term: "Moderation", definition: "Classifying input or output for harmful content (harassment, hate, sexual, violence, self-harm, illicit). Providers offer moderation endpoints (e.g. OpenAI's omni-moderation-latest, free, text+images). Official guidance: treat moderation scores as signals for your policy, not as an automatic blocking decision." },
      { term: "Output validation", definition: "Checking model output against a schema and a policy before using it — required fields present, values in range, proposed action on an allow-list. Structured output (from the LLM-APIs category) is a security control here: it turns 'trust the text' into 'validate the object.'" },
      { term: "Least privilege", definition: "Give each tool and each role the minimum capability the task needs — a read-only tool cannot delete, an agent role cannot touch admin actions. It bounds the blast radius of any successful injection or model error: the model can only ever misuse the small capability it was granted." },
      { term: "Human in the loop (HITL)", definition: "Requiring explicit human approval before a high-impact or irreversible action (refunds, deletes, emails, money movement) executes. The model may propose it; a person confirms it. The essential control for actions whose cost of being wrong is high." },
      { term: "Classifier is not authorization", definition: "A safety classifier scoring an action 'safe' does not make it permitted. Authorization is a separate, policy-based decision on the real user's identity. A destructive action still needs approval even if a classifier likes it; a permitted read is fine even if a classifier is unsure. Keep the two decisions independent." },
    ],
  },
  {
    type: "prose",
    md: "**Least privilege in code: a tool-permission gate.** Every tool call passes through a check of what the tool needs versus what the role has, plus whether the action is destructive enough to need approval:",
  },
  {
    type: "code",
    language: "python",
    caption: "A least-privilege tool gate with approval for destructive actions (deterministic, keyless)",
    code: `TOOLS = {
    "search_docs":    {"privilege": "read",  "destructive": False},
    "issue_refund":   {"privilege": "write", "destructive": True},
    "delete_account": {"privilege": "admin", "destructive": True},
}
ROLE_PRIVS = {"viewer": {"read"}, "agent": {"read", "write"}}

def gate(tool, role):
    meta = TOOLS[tool]
    allowed = meta["privilege"] in ROLE_PRIVS.get(role, set())
    return {"allowed": allowed, "needs_approval": allowed and meta["destructive"]}

print("search_docs ", gate("search_docs", "agent"))
print("issue_refund", gate("issue_refund", "agent"))
print("delete_acct ", gate("delete_account", "agent"))`,
    output: `search_docs  {'allowed': True, 'needs_approval': False}
issue_refund {'allowed': True, 'needs_approval': True}
delete_acct  {'allowed': False, 'needs_approval': False}`,
  },
  {
    type: "prose",
    md: "Three outcomes, three lessons. The read-only `search_docs` runs freely. The `issue_refund` write is allowed for the agent role but flagged `needs_approval` because it is destructive — a human confirms before money moves. The `delete_account` admin action is simply not allowed for the agent role at all: least privilege denies it before approval is even considered. Notice what decides each outcome — the tool's declared privilege and the role's granted privileges, both in your code. The model's opinion never enters the gate.",
  },
  {
    type: "callout",
    variant: "gotcha",
    title: "Executing model output directly, and over-privileged tools",
    md: "The two commonMistakes this topic exists to kill:\n\n- **Executing model output directly** — piping the model's text into `eval`, a shell, a SQL string, an HTML page or a downstream API without validation. This is LLM05 (improper output handling): model output is untrusted data, so it needs the same escaping/validation you give user input. `os.system(model_says)` is the canonical LLM footgun.\n- **Over-privileged tools** — handing the model a tool that can do far more than the task needs (a raw database connection when it needs one lookup; delete when it needs read). This is LLM06 (excessive agency): it turns any injection or model slip into maximum damage. Every extra permission a tool holds is blast radius you have pre-authorized for an attacker.\n\nBoth reduce to the same rule: **the model deciding something is not permission to do it.** Validate output before a sink; scope tools to the minimum; authorize actions on the real user, not the model's say-so."
  },
  {
    type: "quiz",
    question: "Your agent has a moderation classifier on its output, and it scores a proposed 'delete all records older than 2024' action as safe (0.01 harmful). Should the action execute?",
    choices: [
      "Yes — the classifier scored it safe, so it is authorized",
      "No — a moderation classifier judges harmful content, not authorization: a low harmful score does not make a destructive action permitted. The action is irreversible and high-impact, so it must pass a separate authorization/HITL check (least privilege + human approval) regardless of the classifier score. Classifier-safe and authorized are independent decisions",
      "Yes — as long as the harmful score is below 0.05",
      "No — but only because 'delete all records' contains the word delete",
    ],
    answerIndex: 1,
    explanation: "A moderation classifier estimates whether content is harmful (hate, violence, etc.); it says nothing about whether a given user is permitted to perform a destructive database action. Authorization is a separate policy decision, and an irreversible high-impact action should require least-privilege permission plus human approval no matter how a classifier scores it. Treating a low harmful score as authorization conflates two independent checks — the exact mistake this topic warns against.",
  },
  {
    type: "takeaways",
    items: [
      "Guardrails are defense in depth around an untrusted component: input moderation, output validation, least-privilege tools, HITL, rate/cost limits — no single layer is trusted to be perfect.",
      "The model proposes; the application disposes. A safety classifier can flag content but never authorizes an action — classifier-safe and authorized are independent decisions.",
      "Least privilege bounds blast radius: scope every tool and role to the minimum capability, and require human approval for destructive/irreversible actions.",
      "Never execute model output directly (LLM05): it is untrusted data — validate against a schema/policy and escape before any sink (shell, SQL, HTML, API).",
      "Over-privileged tools are excessive agency (LLM06): every extra permission is blast radius you've pre-authorized for an attacker.",
    ],
  },
];

const practice: ContentBlock[] = [
  {
    type: "prose",
    md: "The completion criterion is 'invalid outputs are rejected.' **Output validation turns the model's word into a checked object.** Instead of trusting the text, you require the output to match a schema and pass a policy — and you reject (or repair) anything that does not. This is where the structured-output skill from the LLM-APIs category becomes a security control, not just a convenience.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Two independent checks: is it valid, and is it authorized?",
    md: "Output validation and authorization are separate steps, and both must pass:\n\n- **Valid** — the output parses, has the required fields, values are in range, and any proposed action is on the allow-list. This catches malformed or nonsensical output before it reaches a sink.\n- **Authorized** — even a perfectly valid proposed action must be checked against the real user's permissions and the destructive/approval policy. Valid does not imply permitted.\n\nKeeping them independent is the point: a classifier or schema can say 'well-formed and looks safe,' but only your policy says 'this user may do this.' The next code block makes that independence explicit."
  },
  {
    type: "prose",
    md: "**A safety signal never overrides the action policy.** Here, even a classifier-approved output cannot push a destructive action through without approval, and a classifier-flagged output is rejected — two independent gates:",
  },
  {
    type: "code",
    language: "python",
    caption: "Output policy: classifier signal AND action policy, independently (deterministic, keyless)",
    code: `def execute(action, classifier_safe, destructive, approved):
    if destructive and not approved:
        return "BLOCKED: destructive action needs human approval"   # independent of classifier
    if not classifier_safe:
        return "BLOCKED: classifier flagged the content"
    return "executed: " + action

print(execute("delete_prod_db", classifier_safe=True,  destructive=True,  approved=False))
print(execute("post_reply",     classifier_safe=False, destructive=False, approved=False))
print(execute("read_doc",       classifier_safe=True,  destructive=False, approved=False))`,
    output: `BLOCKED: destructive action needs human approval
BLOCKED: classifier flagged the content
executed: read_doc`,
  },
  {
    type: "prose",
    md: "The destructive `delete_prod_db` is blocked *before* the classifier is even consulted — a safe score cannot authorize it without approval. The `post_reply` is non-destructive but the classifier flagged its content, so it is blocked on the safety layer. Only `read_doc` — non-destructive and classifier-clean — executes. Two independent gates, checked in the order that fails safe: authorization/impact first, content safety second. Neither gate trusts the model; both run in your code.",
  },
  {
    type: "steps",
    guidance: "guided",
    title: "Add output validation to an app",
    intro: "Reject invalid and unauthorized output before it reaches any sink.",
    steps: [
      { order: 1, action: "Define the output contract: a schema (required fields, types, ranges) and an allow-list of permitted actions. Parse model output into that schema; reject or repair anything that fails to parse or validate.", expected: "Malformed or out-of-schema output is rejected before use — no raw text reaches a sink." },
      { order: 2, action: "Add the policy gate: for any proposed action, check destructive/approval status and authorize against the real user — independently of any safety classifier. Add moderation as a separate signal for content, not as an authorization.", decision: "Which order fails safe? (Check impact/authorization before content safety, so a destructive action can't slip through on a clean classifier score.)" },
      { order: 3, action: "Escape/encode before the sink: even valid output must be escaped for its destination (SQL parameters, HTML encoding, no shell interpolation). Log rejections for detection.", verify: "Invalid outputs are rejected, proposed actions are validated and authorized independently of the classifier, and output is escaped before any sink." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — validated output",
    items: [
      "Model output parsed into a schema; malformed/out-of-range output rejected or repaired.",
      "Proposed actions restricted to an allow-list and authorized on the real user, independent of any classifier.",
      "Moderation used as a content signal, not as an authorization decision.",
      "Output escaped/encoded for its sink (SQL/HTML/shell); rejections logged.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Output validation makes the model's word a checked object: schema + allow-list + policy, reject or repair anything that fails.",
      "Validation and authorization are independent: valid-and-safe-looking does not imply permitted — check the real user's permissions separately.",
      "Order the gates to fail safe: authorization/impact first, content safety second, so a destructive action can't ride through on a clean classifier score.",
      "Structured output from the LLM-APIs category is a security control here: validate the object, don't trust the text.",
      "Escape output for its sink (SQL params, HTML encoding, no shell interpolation) — model output is untrusted data (LLM05).",
    ],
  },
];

const build: ContentBlock[] = [
  {
    type: "prose",
    md: "Now assemble the layers into a single **guardrail layer around your agent** — the completion criterion is 'agent can't take unsafe actions,' and the topic masteryCriteria is exactly an agent that cannot be coerced into unsafe actions. Every tool call the agent makes passes through one gate that applies moderation, least privilege and human approval in order. This is the guardrails half of Project P4's `p4-03` and feeds P6's `p6-06` security hardening.",
  },
  {
    type: "callout",
    variant: "note",
    title: "Contract to honour + roadmap fit",
    md: "Completion: *agent can't take unsafe actions.* Wrap the agent's tool-calling loop with a guardrail function that, for every proposed action: (1) checks input/content moderation, (2) enforces the tool allow-list and least privilege for the role, (3) requires human approval for destructive/irreversible actions, and (4) authorizes on the real user — all in your code, none delegated to the model. **Roadmap fit:** this is the guardrails half of Project P4's `p4-03` (the injection half came from the previous topic) and a direct input to Project P6's `p6-06` (security hardening). The agent stays useful — it just cannot be talked into an action outside its granted, approved capability."
  },
  {
    type: "prose",
    md: "**One gate, several independent checks, evaluated in fail-safe order.** Input moderation, then permission, then approval — any one can refuse or hold the action:",
  },
  {
    type: "code",
    language: "python",
    caption: "A guardrail layer wrapping the agent's tool calls (deterministic, keyless)",
    code: `TOOLS = {"search": {"destructive": False, "priv": "read"},
         "refund": {"destructive": True,  "priv": "write"}}

def guard(role, tool, input_flagged, approved,
          role_privs={"support": {"read", "write"}}):
    if input_flagged:
        return "refused: input flagged by moderation"
    meta = TOOLS.get(tool)
    if meta is None or meta["priv"] not in role_privs.get(role, set()):
        return "refused: tool not permitted for role"
    if meta["destructive"] and not approved:
        return "held: awaiting human approval"
    return "allowed: " + tool

print(guard("support", "search", input_flagged=False, approved=False))
print(guard("support", "refund", input_flagged=False, approved=False))
print(guard("support", "refund", input_flagged=False, approved=True))
print(guard("support", "refund", input_flagged=True,  approved=True))`,
    output: `allowed: search
held: awaiting human approval
allowed: refund
refused: input flagged by moderation`,
  },
  {
    type: "prose",
    md: "Read the four outcomes as the guardrail's contract. A read-only `search` runs. A `refund` (destructive) is *held* for approval — not refused, but paused for a human. With approval it proceeds. And when the input is moderation-flagged, the refund is refused outright, before permission or approval are even checked — the earliest gate wins, failing safe. The agent is still fully functional for legitimate work; it simply cannot execute a destructive action without approval, or act on flagged input, or reach a tool its role does not have. That is 'cannot be coerced into unsafe actions' expressed as code.",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Requirements — a guardrail layer for your agent",
    intro: "Every tool call passes one gate. Acceptance defines done.",
    steps: [
      { order: 1, action: "Route every agent tool call through a single guardrail function — no tool is ever invoked directly by the model's decision. Declare each tool's privilege and destructive flag, and each role's granted privileges.", decision: "What is the minimum privilege each tool truly needs, and which actions are destructive/irreversible enough to require approval?" },
      { order: 2, action: "In the gate, apply in fail-safe order: input/content moderation, tool allow-list + least-privilege role check, and human approval for destructive actions. Authorize on the real user, not the model.", expected: "Non-destructive permitted tools run; destructive ones are held for approval; disallowed tools and flagged inputs are refused." },
      { order: 3, action: "Add rate/cost limits (LLM10) so an injected loop can't drain the wallet, and log every refusal/hold with enough context to investigate. Confirm legitimate tasks still complete.", verify: "The agent cannot take an unsafe action: destructive actions need approval, tools are least-privileged, flagged inputs are refused, cost is bounded, and legitimate work still succeeds." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — a guarded agent",
    items: [
      "Every tool call routed through one guardrail gate; the model never invokes a tool directly.",
      "Fail-safe order: moderation, then least-privilege allow-list, then human approval for destructive actions.",
      "Authorization on the real user; rate/cost limits (LLM10) bound runaway loops.",
      "Refusals/holds logged with context; legitimate tasks still complete (no over-blocking).",
    ],
  },
  {
    type: "code",
    language: "python",
    caption: "Reference — guardrail gate with logging and cost cap (deterministic, keyless)",
    collapsible: true,
    collapseLabel: "Show reference solution",
    code: `TOOLS = {"search": {"priv": "read", "destructive": False},
         "refund": {"priv": "write", "destructive": True}}
ROLE_PRIVS = {"support": {"read", "write"}}

def guardrail(role, tool, flagged, approved, calls_so_far, max_calls=25):
    if calls_so_far >= max_calls:
        return "refused: rate/cost limit reached"          # LLM10
    if flagged:
        return "refused: moderation"                       # content safety
    meta = TOOLS.get(tool)
    if meta is None or meta["priv"] not in ROLE_PRIVS.get(role, set()):
        return "refused: least privilege"                  # LLM06
    if meta["destructive"] and not approved:
        return "held: human approval"                      # HITL
    return "allowed: " + tool

for scenario in [("support","search",False,False,0),
                 ("support","refund",False,False,0),
                 ("support","refund",True, True, 0),
                 ("support","search",False,False,25)]:
    print(guardrail(*scenario))`,
  },
  {
    type: "takeaways",
    items: [
      "One guardrail gate wraps every tool call; the model's decision never directly invokes a tool.",
      "Apply checks in fail-safe order: moderation, least-privilege allow-list, human approval for destructive actions — the earliest gate wins.",
      "Destructive actions are held for approval (not silently run); disallowed tools and flagged inputs are refused; all decided in your code on the real user.",
      "Add rate/cost limits (LLM10) so an injected loop can't drain the wallet, and log every refusal/hold for investigation.",
      "This is 'an agent that can't be coerced into unsafe actions' as code — the guardrails half of P4 p4-03 and input to P6 p6-06.",
    ],
  },
];

const review: ContentBlock[] = [
  {
    type: "prose",
    md: "A guardrail you have not attacked is decoration. The completion criterion is 'guardrails withstand the attempts' — so **red-team your own guardrails**: try to reach a dangerous capability by a path the gate did not anticipate. The most common bypass is not defeating a check but finding a capability the allow-list left too broad.",
  },
  {
    type: "callout",
    variant: "tip",
    title: "How guardrails actually get bypassed",
    md: "You rarely break a guardrail head-on. You go around it:\n\n- **An over-broad allow-list** — a dangerous tool (a shell, a raw query, a broad admin action) was left in the permitted set 'for convenience,' so no check even fires. This is the most common real bypass, and it is a configuration bug, not a clever attack.\n- **An alternate path to the same effect** — the delete tool is gated, but an 'update status to archived-then-purged' path is not; the write is blocked, but a tool that writes as a side effect is not.\n- **Approval fatigue** — so many actions require approval that reviewers rubber-stamp them; the HITL control exists but no longer means anything.\n- **A missing sink check** — output is validated for the API path but not the one that renders it as HTML.\n\nRed-teaming is mostly enumerating capabilities and paths, then confirming every route to a high-impact effect hits a gate. A tight allow-list — deny by default, permit the minimum — closes most of these before they start."
  },
  {
    type: "code",
    language: "python",
    caption: "Red-team: an over-broad allow-list leaks a dangerous tool (deterministic, keyless)",
    code: `def is_allowed(tool, allow_list):
    return tool in allow_list

broad = {"search", "read_file", "run_shell"}     # run_shell should NOT be here
tight = {"search", "read_file"}                  # deny by default, permit the minimum

for tool in ["search", "run_shell"]:
    print(tool, "broad:", is_allowed(tool, broad), "tight:", is_allowed(tool, tight))`,
    output: `search broad: True tight: True
run_shell broad: True tight: False`,
  },
  {
    type: "prose",
    md: "`search` is legitimately allowed under both lists. But `run_shell` — a capability that can do nearly anything — is permitted by the broad list and denied by the tight one. No detector, no classifier, no approval flow was defeated: the gate simply never had a reason to fire, because the dangerous tool was on the allow-list. This is why guardrails start from **deny by default**: you cannot forget to block a capability you never permitted. Red-teaming your guardrails is largely the exercise of finding the capabilities and paths that a too-generous allow-list quietly left open.",
  },
  {
    type: "quiz",
    question: "Red-teaming your agent, you find that an injected instruction can trigger a 'run_shell' tool with no approval prompt — the guardrail's moderation, least-privilege and approval checks all look correctly implemented. What is the most likely root cause?",
    choices: [
      "The moderation classifier has too high a threshold and should be retrained",
      "The 'run_shell' tool was left on the agent's allow-list, so no gate had reason to fire — an over-broad allow-list (excessive agency, LLM06). The fix is deny-by-default: remove the dangerous capability entirely and permit only the minimal tools the task needs, so there is nothing for an injection to reach",
      "The approval flow needs a second reviewer",
      "The system prompt should more firmly tell the agent not to run shell commands",
    ],
    answerIndex: 1,
    explanation: "If the checks are implemented correctly but a dangerous action still executes, the capability was permitted in the first place — an over-broad allow-list is excessive agency (LLM06), and no downstream gate fires for a tool the agent was allowed to use. The fix is to deny by default and grant only the minimal tools required, removing the dangerous capability so an injection has nothing to reach. Tuning the classifier, adding reviewers, or strengthening the system prompt do not address a capability that should never have been available.",
  },
  {
    type: "prose",
    md: "**Mastery challenge — prove the agent cannot be coerced into an unsafe action.**",
  },
  {
    type: "steps",
    guidance: "independent",
    title: "Red-team your guarded agent",
    intro: "Enumerate every path to a high-impact effect and confirm each hits a gate. Not completion-gated — this is the proof the guardrails hold.",
    steps: [
      { order: 1, action: "List every tool the agent can reach and every high-impact effect (delete, pay, email, exfiltrate, spend). For each effect, enumerate ALL paths that could produce it — direct tool, side effect, alternate tool, a chain of allowed steps.", expected: "A capability/effect map: for each dangerous effect, every route to it." },
      { order: 2, action: "Attack each path via injection (from the previous topic): try to reach each effect. Confirm every route hits a gate — moderation, least privilege, or approval — and that dangerous capabilities are simply not on the allow-list (deny by default).", decision: "Did any effect have an ungated path? If so, was it an over-broad allow-list, a missing sink check, or an alternate tool? Close it by removing the capability, not by adding a detector." },
      { order: 3, action: "Check the non-technical bypasses: is approval meaningful (not rubber-stamped), are cost/rate limits enforced, are refusals logged? Confirm legitimate tasks still complete without over-blocking.", verify: "Every path to every high-impact effect hits an enforced gate or doesn't exist (deny by default); approval and limits are meaningful; refusals are logged; legitimate work still succeeds. The agent cannot be coerced into an unsafe action." },
    ],
  },
  {
    type: "checkpoint",
    title: "Acceptance criteria — guardrails that withstand red-teaming",
    items: [
      "Capability/effect map: every path to each high-impact effect enumerated.",
      "Every route hits a gate or the capability is denied by default (no over-broad allow-list).",
      "Approval is meaningful (not rubber-stamped); cost/rate limits enforced; refusals logged.",
      "Legitimate tasks complete without over-blocking; found gaps closed by removing capability, not adding detectors.",
    ],
  },
  {
    type: "takeaways",
    items: [
      "Guardrails get bypassed by going around them: over-broad allow-lists, alternate paths to the same effect, approval fatigue, missing sink checks.",
      "Deny by default is the strongest guardrail: you can't forget to block a capability you never permitted — the tight allow-list denies run_shell without any detector.",
      "Red-teaming is enumerating capabilities and paths, then confirming every route to a high-impact effect hits a gate — attack the goal, not the wording.",
      "Close gaps by removing capability (least privilege), not by bolting on another detector for the specific attack you happened to find.",
      "Prove the agent can't be coerced: every path to every dangerous effect is gated or doesn't exist, approval/limits are meaningful, and legitimate work still succeeds.",
    ],
  },
];

export const content: TopicContent = {
  "unit-sec-guardrails-01": learn,
  "unit-sec-guardrails-02": practice,
  "unit-sec-guardrails-03": build,
  "unit-sec-guardrails-04": review,
};
