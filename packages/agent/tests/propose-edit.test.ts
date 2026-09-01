import {
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";
import { proposeEditTool } from "../src/tools/propose-edit.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

const context = {
  repositoryRoot,
};

describe("propose_edit", () => {
  it("generates a diff for a valid edit", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "packages/agent/src/types/index.ts",
        oldText: '  | "run_test";',
        newText: '  | "run_test_v2";',
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "--- a/packages/agent/src/types/index.ts",
    );
    expect(result.output).toContain(
      '+   | "run_test_v2";',
    );
  });

  it("does not modify the file", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "packages/agent/src/types/index.ts",
        oldText: '  | "run_test";',
        newText: '  | "run_test_v2";',
      },
      context,
    );

    expect(result.ok).toBe(true);

    const secondResult =
      await proposeEditTool.execute(
        {
          path: "packages/agent/src/types/index.ts",
          oldText: '  | "run_test_v2";',
          newText: '  | "something_else";',
        },
        context,
      );

    expect(secondResult.ok).toBe(false);
  });

  it("rejects missing oldText", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "packages/agent/src/types/index.ts",
        oldText: "THIS_TEXT_DOES_NOT_EXIST",
        newText: "replacement",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "oldText was not found",
    );
  });

  it("rejects ambiguous edits", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "packages/agent/src/types/index.ts",
        oldText: "string",
        newText: "text",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "occurs multiple times",
    );
  });

  it("rejects path traversal", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "../../../secret.txt",
        oldText: "old",
        newText: "new",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "outside the repository boundary",
    );
  });

  it("rejects node_modules", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "node_modules/foo/index.js",
        oldText: "old",
        newText: "new",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects evals", async () => {
    const result = await proposeEditTool.execute(
      {
        path: "evals/test.ts",
        oldText: "old",
        newText: "new",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });
});