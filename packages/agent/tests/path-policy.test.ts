import { describe, expect, it } from "vitest";
import path from "node:path";
import { validateRepositoryPath } from "../src/safety/path-policy.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

describe("validateRepositoryPath", () => {
  it("allows paths inside the repository", () => {
    const result = validateRepositoryPath(
      repositoryRoot,
      "packages/agent/src/index.ts",
    );

    expect(result.allowed).toBe(true);
  });

  it("rejects path traversal", () => {
    const result = validateRepositoryPath(
      repositoryRoot,
      "../../../secret.txt",
    );

    expect(result.allowed).toBe(false);
  });

  it("rejects node_modules", () => {
    const result = validateRepositoryPath(
      repositoryRoot,
      "node_modules/package/index.js",
    );

    expect(result.allowed).toBe(false);
  });

  it("rejects the evaluation harness", () => {
    const result = validateRepositoryPath(
      repositoryRoot,
      "evals/golden-agent.jsonl",
    );

    expect(result.allowed).toBe(false);
  });

  it("rejects an empty path", () => {
    const result = validateRepositoryPath(
      repositoryRoot,
      "",
    );

    expect(result.allowed).toBe(false);
  });
});