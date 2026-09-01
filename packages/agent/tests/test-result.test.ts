import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseTestResult,
} from "../src/agent/test-result.js";

describe("parseTestResult", () => {
  it("detects a passing test", () => {
    const result = parseTestResult(
      [
        "Test Files  1 passed (1)",
        "Tests       5 passed (5)",
      ].join("\n"),
    );

    expect(result.passed).toBe(true);
  });

  it("detects a failing test", () => {
    const result = parseTestResult(
      [
        "Test Files  1 failed (1)",
        "Tests       1 failed | 4 passed (5)",
      ].join("\n"),
    );

    expect(result.passed).toBe(false);
  });

  it("does not treat an error as a success", () => {
    const result = parseTestResult(
      "Error: test runner failed",
    );

    expect(result.passed).toBe(false);
  });

  it("preserves the original output", () => {
    const output =
      "Test Files 1 passed (1)";

    const result =
      parseTestResult(output);

    expect(result.output).toBe(output);
  });
});
