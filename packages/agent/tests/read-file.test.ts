import {
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";
import { readFileTool } from "../src/tools/read-file.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

const context = {
  repositoryRoot,
};

describe("read_file", () => {
  it("reads a file inside the repository", async () => {
    const result = await readFileTool.execute(
      {
        path: "DESIGN.md",
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "Task 3",
    );
  });

  it("rejects path traversal", async () => {
    const result = await readFileTool.execute(
      {
        path: "../../../secret.txt",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "outside the repository boundary",
    );
  });

  it("rejects node_modules", async () => {
    const result = await readFileTool.execute(
      {
        path: "node_modules/foo/package.json",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("returns an error for a missing file", async () => {
    const result = await readFileTool.execute(
      {
        path: "does-not-exist.ts",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "Unable to read file",
    );
  });
});