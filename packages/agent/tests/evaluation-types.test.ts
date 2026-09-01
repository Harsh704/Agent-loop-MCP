import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  EvaluationCase,
  EvaluationResult,
  EvaluationSummary,
} from "../src/evaluation/types.js";

describe("evaluation types", () => {
  it("represents an evaluation case", () => {
    const testCase: EvaluationCase = {
      id: "easy-01",
      difficulty: "easy",
      description: "Fix a directly imported bug.",
      testPath: "tests/example.test.ts",
    };

    expect(testCase.id).toBe("easy-01");
    expect(testCase.difficulty).toBe("easy");
  });

  it("represents an evaluation result", () => {
    const result: EvaluationResult = {
      caseId: "easy-01",
      difficulty: "easy",
      status: "success",
      success: true,
      steps: 4,
      latencyMs: 1200,
      toolCalls: 3,
      toolCallErrors: 0,
      guardrailViolations: 0,
    };

    expect(result.success).toBe(true);
    expect(result.steps).toBe(4);
  });

  it("represents an evaluation summary", () => {
    const summary: EvaluationSummary = {
      totalCases: 15,
      successfulCases: 12,
      successAtBudget: 0.8,
      meanStepsToSuccess: 5.5,
      wastedStepRatio: 0.12,
      toolCallErrorRate: 0.03,
      guardrailViolations: 1,
      p50LatencyMs: 1200,
      p95LatencyMs: 4800,
    };

    expect(summary.totalCases).toBe(15);
    expect(summary.successAtBudget).toBe(0.8);
  });
});