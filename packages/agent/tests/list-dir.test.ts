import {
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";
import { listDirTool } from "../src/tools/list-dir.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

const context = {
  repositoryRoot,
};

describe("list_dir", () => {
  it("lists the repository root", async () => {
    const result = await listDirTool.execute(
      {},
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "packages/",
    );
    expect(result.output).toContain(
      "DESIGN.md",
    );
  });

  it("lists a valid subdirectory", async () => {
    const result = await listDirTool.execute(
      {
        path: "packages/agent/src",
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain(
      "tools/",
    );
  });

  it("rejects path traversal", async () => {
    const result = await listDirTool.execute(
      {
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
    const result = await listDirTool.execute(
      {
        path: "node_modules",
      },
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("returns an error for a missing directory", async () => {
    const result = await listDirTool.execute(
      {
        path: "does-not-exist",
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toContain(
      "Unable to list directory",
    );
  });
});