export type EvaluationStatus =
  | "success"
  | "failed"
  | "safety_violation"
  | "budget_exceeded"
  | "stuck"
  | "error";

export interface EvaluationCase {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  testPath: string;
}

export interface EvaluationResult {
  caseId: string;
  difficulty: EvaluationCase["difficulty"];
  status: EvaluationStatus;
  success: boolean;
  steps: number;
  latencyMs: number;
  toolCalls: number;
  toolCallErrors: number;
  guardrailViolations: number;
}

export interface EvaluationSummary {
  totalCases: number;
  successfulCases: number;
  successAtBudget: number;
  meanStepsToSuccess: number | null;
  wastedStepRatio: number;
  toolCallErrorRate: number;
  guardrailViolations: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}