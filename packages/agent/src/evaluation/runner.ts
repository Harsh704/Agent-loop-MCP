import {
  AgentLoop,
  type AgentLoopResult,
} from "../agent/loop.js";

import type {
  EvaluationCase,
  EvaluationResult,
} from "./types.js";

export interface EvaluationRunnerOptions {
  createAgent: (
    testCase: EvaluationCase,
  ) => AgentLoop;
}

export class EvaluationRunner {
  private readonly createAgent: EvaluationRunnerOptions["createAgent"];

  constructor(
    options: EvaluationRunnerOptions,
  ) {
    this.createAgent = options.createAgent;
  }

  async runCase(
    testCase: EvaluationCase,
  ): Promise<EvaluationResult> {
    const agent = this.createAgent(testCase);

    const startedAt = Date.now();

    let result: AgentLoopResult;

    try {
      result = await agent.run(
        testCase.description,
      );
    } catch (error) {
      return {
        caseId: testCase.id,
        difficulty: testCase.difficulty,
        status: "error",
        success: false,
        steps: 0,
        latencyMs: Date.now() - startedAt,
        toolCalls: 0,
        toolCallErrors: 0,
        guardrailViolations: 0,
      };
    }

    const latencyMs =
      Date.now() - startedAt;

    const toolCalls =
      result.state.steps.length;

    return {
      caseId: testCase.id,
      difficulty: testCase.difficulty,
      status: getEvaluationStatus(result),
      success: result.status === "success",
      steps: result.steps,
      latencyMs,
      toolCalls,
      toolCallErrors: 0,
      guardrailViolations: 0,
    };
  }
}

function getEvaluationStatus(
  result: AgentLoopResult,
): EvaluationResult["status"] {
  if (result.status === "success") {
    return "success";
  }

  if (
    result.answer ===
    "Maximum step budget exceeded."
  ) {
    return "budget_exceeded";
  }

  if (
    result.answer?.includes(
      "repeated the same action",
    )
  ) {
    return "stuck";
  }

  return "failed";
}
