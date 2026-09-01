export type ToolName =
  | "read_file"
  | "list_dir"
  | "grep"
  | "propose_edit"
  | "run_test";

export interface ToolCall {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  ok: boolean;
  output: string;
  truncated?: boolean;
}

export type AgentStatus =
  | "running"
  | "success"
  | "failed"
  | "budget_exhausted"
  | "stuck"
  | "safety_violation";

export interface TrajectoryEntry {
  step: number;
  timestamp: string;
  toolCall: ToolCall;
  result: ToolResult;
}

export interface AgentState {
  testPath: string;
  step: number;
  maxSteps: number;
  status: AgentStatus;

  seenFiles: Set<string>;

  lastToolCall?: ToolCall;
  repeatedToolCalls: number;

  trajectory: TrajectoryEntry[];

  startTime: number;
}