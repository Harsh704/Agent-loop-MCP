export interface ParsedTestResult {
  passed: boolean;
  output: string;
}

export function parseTestResult(
  output: string,
): ParsedTestResult {
  const normalized = output.toLowerCase();

  const hasFailure =
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("test failed");

  const hasSuccess =
    normalized.includes("passed") &&
    !hasFailure;

  return {
    passed: hasSuccess,
    output,
  };
}