import type { AgentAction } from "./action.js";

export type AgentStatus =
  | "running"
  | "success"
  | "failed"
  | "budget_exceeded"
  | "stuck"
  | "safety_violation"
  | "error";

export interface AgentStep {
  step: number;
  timestamp: string;
  action: AgentAction;
  observation?: string;
  rationale: string;
}

export interface AgentState {
  task: string;
  testPath?: string;

  testPassed: boolean;
  lastTestOutput?: string;

  currentStep: number;
  maxSteps: number;

  startTime: number;
  maxDurationMs: number;

  seenFiles: string[];

  previousToolCall?: AgentAction;
  repeatedCallCount: number;

  steps: AgentStep[];

  toolCallErrors: number;
  guardrailViolations: number;

  status: AgentStatus;
}