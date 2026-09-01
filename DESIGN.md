# Task 3 — Agent Loop, Tool Use, and MCP

## 1. Objective & Architecture

Build a local CLI coding agent that receives one failing test, investigates the repository, proposes an edit, safely applies it, re-runs the test, and repeats until the test passes or a termination condition is reached.

The core loop is:

```text
Failing Test
    ↓
Agent State → Model
    ↓
Exactly ONE Tool Call
    ↓
MCP Server → Tool Execution
    ↓
Tool Result / Observation
    ↓
Update State
    ↓
Repeat / Terminate
```

The model will not receive arbitrary shell access. All execution will occur through a fixed typed tool surface.

---

## 2. Public Interfaces & Tool Surface

```ts
interface ToolCall {
  id: string;
  name:
    | "read_file"
    | "list_dir"
    | "grep"
    | "propose_edit"
    | "run_test";
  arguments: Record<string, unknown>;
}

interface ToolResult {
  id: string;
  ok: boolean;
  output: string;
  truncated?: boolean;
}
```

The harness will also maintain agent state including the current test, step count, budget, status, files already seen, previous tool call, repeated-call count, trajectory, and start time.

Tools:

* `read_file` — read repository files.
* `list_dir` — inspect repository structure.
* `grep` — search repository contents.
* `propose_edit` — generate a diff without directly writing.
* `run_test` — execute the specified test through a controlled runner.

The tools will be exposed through an actual MCP server.

---

## 3. Agent Loop & Safety

Each iteration permits exactly one tool call followed by one observation.

The harness enforces:

* **Step budget:** default 12 steps.
* **Wall-clock budget:** configurable hard limit.
* **Stuck-loop detection:** abort after the same tool call with identical arguments occurs three consecutive times.
* **Explicit seen-file tracking:** avoid unnecessary re-reading.
* **Trajectory logging:** record each step, timestamp, tool call, result, and explicitly elicited action rationale.

`propose_edit` produces a diff. A separate deterministic approval gate validates the diff before application.

The gate rejects:

* path traversal,
* paths outside the repository,
* modifications to `node_modules`,
* modifications to the evaluation harness.

A safety violation immediately aborts the run and is recorded separately from normal failures.

---

## 4. Evaluation

The golden set will contain **15 broken tests**:

* 6 Easy — bug in the directly imported file.
* 6 Medium — requires investigating two files.
* 3 Hard — shared utility, incorrect expectation, or more complex investigation.

At least one hard case will have its real cause outside the available tool surface; the correct behavior is to report that it cannot be fixed rather than fabricate an edit.

Required metrics:

1. `success@budget`
2. Mean steps to success
3. Wasted-step ratio
4. Tool-call error rate
5. Guardrail violations
6. p50 latency
7. p95 latency

The evaluation will compare:

```text
Baseline
  → + read_file / grep
  → + step budget / stuck-loop detection
  → + approval gate
```

Results will be documented in `RESULTS.md`.

---

## 5. Three Likely Failure Modes

### 1. Stuck Loop

The model repeatedly retries the same failed action.

**Mitigation:** detect three consecutive identical tool calls and abort.

### 2. Unsafe Edit

The model proposes changes outside the permitted repository boundary.

**Mitigation:** validate every diff with a deterministic approval gate before application.

### 3. Invalid Tool Call

The model produces an invalid tool name, malformed arguments, or hallucinated path.

**Mitigation:** validate calls against the fixed tool schemas, return structured errors, and record failures in evaluation metrics.

---

## 6. Deliberate Non-Goals

We will not build:

* LangGraph, CrewAI, or AutoGen.
* Arbitrary shell/command execution.
* Unrestricted filesystem access.
* Multiple tool calls per model iteration.
* Remote infrastructure execution.
* A general-purpose production coding agent.

The implementation is limited to the local failing-test repair workflow.

---

## 7. Open Questions

* What wall-clock budget gives a fair evaluation?
* What output limits should apply to large files and grep results?
* How should test-file edits be treated by the approval gate?
* Which MCP SDK version should be pinned?
* What controlled command should `run_test` use?
* How will the evaluation harness verify that the approval gate cannot be bypassed?
* How should model/tool-call failures be represented consistently in trajectories?

## 8. Model Runtime

The local runtime will use Ollama with `qwen2.5:7b`, which is available locally and reports tool-calling capability. Tool-calling reliability will be measured and documented in `NOTES.md` rather than hidden.
