import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  EvaluationRunner,
} from "../src/evaluation/runner.js";

import type {
  EvaluationCase,
} from "../src/evaluation/types.js";

describe("evaluation runner", () => {
  const testCase: EvaluationCase = {
    id: "easy-01",
    difficulty: "easy",
    description: "Fix the failing test.",
    testPath: "tests/example.test.ts",
  };

  it("records a successful agent run", async () => {
    const agent = {
      run: vi.fn().mockResolvedValue({
        status: "success",
        answer: "Fixed.",
        steps: 3,
        state: {
          task: testCase.description,
          steps: [
            {
              step: 1,
              action: {
                type: "tool",
                tool: "read_file",
                arguments: {
                  path: "src/example.ts",
                },
              },
              observation: "source",
            },
            {
              step: 2,
              action: {
                type: "tool",
                tool: "propose_edit",
                arguments: {},
              },
              observation: "diff",
            },
          ],
          status: "success",
        },
      }),
    };

    const runner =
      new EvaluationRunner({
        createAgent: () =>
          agent as never,
      });

    const result =
      await runner.runCase(testCase);

    expect(result.caseId).toBe(
      "easy-01",
    );

    expect(result.difficulty).toBe(
      "easy",
    );

    expect(result.status).toBe(
      "success",
    );

    expect(result.success).toBe(true);

    expect(result.steps).toBe(3);

    expect(result.toolCalls).toBe(2);

    expect(result.latencyMs).toBeGreaterThanOrEqual(
      0,
    );

    expect(agent.run).toHaveBeenCalledWith(
      "Fix the failing test.",
    );
  });

  it("classifies a budget-exceeded run", async () => {
    const agent = {
      run: vi.fn().mockResolvedValue({
        status: "failed",
        answer:
          "Maximum step budget exceeded.",
        steps: 10,
        state: {
          task: testCase.description,
          steps: [],
          status: "failed",
        },
      }),
    };

    const runner =
      new EvaluationRunner({
        createAgent: () =>
          agent as never,
      });

    const result =
      await runner.runCase(testCase);

    expect(result.status).toBe(
      "budget_exceeded",
    );

    expect(result.success).toBe(false);

    expect(result.steps).toBe(10);
  });

  it("classifies a stuck run", async () => {
    const agent = {
      run: vi.fn().mockResolvedValue({
        status: "failed",
        answer:
          "Agent stopped because it repeated the same action too many times.",
        steps: 3,
        state: {
          task: testCase.description,
          steps: [],
          status: "failed",
        },
      }),
    };

    const runner =
      new EvaluationRunner({
        createAgent: () =>
          agent as never,
      });

    const result =
      await runner.runCase(testCase);

    expect(result.status).toBe(
      "stuck",
    );

    expect(result.success).toBe(false);
  });

  it("records unexpected agent errors", async () => {
    const agent = {
      run: vi.fn().mockRejectedValue(
        new Error("model unavailable"),
      ),
    };

    const runner =
      new EvaluationRunner({
        createAgent: () =>
          agent as never,
      });

    const result =
      await runner.runCase(testCase);

    expect(result.status).toBe(
      "error",
    );

    expect(result.success).toBe(false);

    expect(result.steps).toBe(0);

    expect(
      result.toolCalls,
    ).toBe(0);
  });
});