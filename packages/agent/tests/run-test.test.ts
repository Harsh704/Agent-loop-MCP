import {
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";
import { runTestTool } from "../src/tools/run-test.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

const context = {
  repositoryRoot,
};

describe("run_test", () => {
  it("runs a specific passing test file", async () => {
    const result = await runTestTool.execute(
      {
        testPath:
          "packages/agent/tests/path-policy.test.ts",
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "5 passed",
    );
  });

  it("reports a failing test", async () => {
    const result = await runTestTool.execute(
      {
        testPath:
          "packages/agent/tests/nonexistent.test.ts",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects path traversal", async () => {
    const result = await runTestTool.execute(
      {
        testPath: "../../../malicious.test.ts",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "outside the repository boundary",
    );
  });

  it("rejects node_modules", async () => {
    const result = await runTestTool.execute(
      {
        testPath:
          "node_modules/something/test.ts",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects evals", async () => {
    const result = await runTestTool.execute(
      {
        testPath: "evals/test.ts",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });
});