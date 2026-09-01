import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateEvaluationSummary,
} from "../src/evaluation/metrics.js";

import type {
  EvaluationResult,
} from "../src/evaluation/types.js";

describe("evaluation metrics", () => {
  it("calculates success and step metrics", () => {
    const results: EvaluationResult[] = [
      {
        caseId: "easy-01",
        difficulty: "easy",
        status: "success",
        success: true,
        steps: 4,
        latencyMs: 1000,
        toolCalls: 3,
        toolCallErrors: 0,
        guardrailViolations: 0,
      },
      {
        caseId: "easy-02",
        difficulty: "easy",
        status: "success",
        success: true,
        steps: 6,
        latencyMs: 2000,
        toolCalls: 5,
        toolCallErrors: 1,
        guardrailViolations: 0,
      },
      {
        caseId: "medium-01",
        difficulty: "medium",
        status: "failed",
        success: false,
        steps: 10,
        latencyMs: 4000,
        toolCalls: 8,
        toolCallErrors: 2,
        guardrailViolations: 1,
      },
    ];

    const summary =
      calculateEvaluationSummary(
        results,
      );

    expect(summary.totalCases).toBe(3);

    expect(summary.successfulCases).toBe(
      2,
    );

    expect(summary.successAtBudget).toBeCloseTo(
      2 / 3,
    );

    expect(
      summary.meanStepsToSuccess,
    ).toBe(5);

    expect(
      summary.toolCallErrorRate,
    ).toBeCloseTo(3 / 16);

    expect(
      summary.guardrailViolations,
    ).toBe(1);
  });

  it("calculates latency percentiles", () => {
    const results: EvaluationResult[] =
      [100, 200, 300, 400, 500].map(
        (latencyMs, index) => ({
          caseId: `case-${index}`,
          difficulty: "easy",
          status: "success",
          success: true,
          steps: 2,
          latencyMs,
          toolCalls: 1,
          toolCallErrors: 0,
          guardrailViolations: 0,
        }),
      );

    const summary =
      calculateEvaluationSummary(
        results,
      );

    expect(summary.p50LatencyMs).toBe(300);

    expect(summary.p95LatencyMs).toBe(480);
  });

  it("handles an empty evaluation set", () => {
    const summary =
      calculateEvaluationSummary([]);

    expect(summary.totalCases).toBe(0);

    expect(summary.successfulCases).toBe(0);

    expect(summary.successAtBudget).toBe(0);

    expect(
      summary.meanStepsToSuccess,
    ).toBeNull();

    expect(summary.p50LatencyMs).toBe(0);

    expect(summary.p95LatencyMs).toBe(0);
  });
});