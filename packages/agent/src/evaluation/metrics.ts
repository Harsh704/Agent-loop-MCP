import type {
  EvaluationResult,
  EvaluationSummary,
} from "./types.js";

function percentile(
  values: number[],
  percentileValue: number,
): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const index =
    (percentileValue / 100) *
    (sorted.length - 1);

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;

  return (
    sorted[lower] +
    (sorted[upper] - sorted[lower]) *
      weight
  );
}

export function calculateEvaluationSummary(
  results: EvaluationResult[],
): EvaluationSummary {
  const totalCases = results.length;

  if (totalCases === 0) {
    return {
      totalCases: 0,
      successfulCases: 0,
      successAtBudget: 0,
      meanStepsToSuccess: null,
      wastedStepRatio: 0,
      toolCallErrorRate: 0,
      guardrailViolations: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
    };
  }

  const successfulResults =
    results.filter(
      (result) => result.success,
    );

  const successfulCases =
    successfulResults.length;

  const successAtBudget =
    successfulCases / totalCases;

  const meanStepsToSuccess =
    successfulCases === 0
      ? null
      : successfulResults.reduce(
          (sum, result) =>
            sum + result.steps,
          0,
        ) / successfulCases;

  const totalSteps = results.reduce(
    (sum, result) =>
      sum + result.steps,
    0,
  );

  const wastedSteps =
    results.reduce(
      (sum, result) => {
        if (!result.success) {
          return sum + result.steps;
        }

        return sum + Math.max(
          0,
          result.steps - 1,
        );
      },
      0,
    );

  const wastedStepRatio =
    totalSteps === 0
      ? 0
      : wastedSteps / totalSteps;

  const totalToolCalls =
    results.reduce(
      (sum, result) =>
        sum + result.toolCalls,
      0,
    );

  const totalToolCallErrors =
    results.reduce(
      (sum, result) =>
        sum + result.toolCallErrors,
      0,
    );

  const toolCallErrorRate =
    totalToolCalls === 0
      ? 0
      : totalToolCallErrors /
        totalToolCalls;

  const guardrailViolations =
    results.reduce(
      (sum, result) =>
        sum + result.guardrailViolations,
      0,
    );

  const latencies = results.map(
    (result) => result.latencyMs,
  );

  return {
    totalCases,
    successfulCases,
    successAtBudget,
    meanStepsToSuccess,
    wastedStepRatio,
    toolCallErrorRate,
    guardrailViolations,
    p50LatencyMs: percentile(
      latencies,
      50,
    ),
    p95LatencyMs: percentile(
      latencies,
      95,
    ),
  };
}
