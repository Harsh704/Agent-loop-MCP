import {
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";
import { grepTool } from "../src/tools/grep.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

const context = {
  repositoryRoot,
};

describe("grep", () => {
  it("finds text in repository files", async () => {
    const result = await grepTool.execute(
      {
        pattern: "Task 3",
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "DESIGN.md",
    );
  });

  it("supports searching within a subdirectory", async () => {
    const result = await grepTool.execute(
      {
        pattern: "validateRepositoryPath",
        path: "packages/agent/src",
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "path-policy.ts",
    );
  });

  it("returns no matches when the pattern is absent", async () => {
    const result = await grepTool.execute(
      {
        pattern: "ZZZ_NO_MATCH_7F4K9P2Q",
        path: "packages/agent/src",
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      "No matches found.",
    );
  });

  it("rejects path traversal", async () => {
    const result = await grepTool.execute(
      {
        pattern: "password",
        path: "../../../",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "outside the repository boundary",
    );
  });

  it("rejects node_modules", async () => {
    const result = await grepTool.execute(
      {
        pattern: "export",
        path: "node_modules",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects an empty pattern", async () => {
    const result = await grepTool.execute(
      {
        pattern: "",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "pattern cannot be empty",
    );
  });
});