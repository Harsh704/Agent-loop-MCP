import type { AgentAction } from "./action.js";

export interface AgentStep {
  step: number;
  action: AgentAction;
  observation?: string;
}

export interface AgentState {
  task: string;
  testPath?: string;
  testPassed: boolean;
  lastTestOutput?: string;
  steps: AgentStep[];
  status: "running" | "success" | "failed";
}