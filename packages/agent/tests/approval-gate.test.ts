import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";
import {
  approveEdit,
  applyApprovedEdit,
} from "../src/safety/approval-gate.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

const testFile = "packages/agent/tests/temp-edit-target.txt";

const absoluteTestFile = path.resolve(
  repositoryRoot,
  testFile,
);

describe("approval gate", () => {
  afterEach(async () => {
    const { unlink } = await import(
      "node:fs/promises"
    );

    try {
      await unlink(absoluteTestFile);
    } catch {
      // File may not exist.
    }
  });

  it("approves a safe unambiguous edit", async () => {
    const { writeFile } = await import(
      "node:fs/promises"
    );

    await writeFile(
      absoluteTestFile,
      "hello world",
      "utf8",
    );

    const result = await approveEdit(
      {
        path: testFile,
        oldText: "hello",
        newText: "goodbye",
      },
      repositoryRoot,
    );

    expect(result.approved).toBe(true);
  });

  it("rejects path traversal", async () => {
    const result = await approveEdit(
      {
        path: "../../../secret.txt",
        oldText: "old",
        newText: "new",
      },
      repositoryRoot,
    );

    expect(result.approved).toBe(false);
  });

  it("rejects node_modules", async () => {
    const result = await approveEdit(
      {
        path: "node_modules/foo/index.js",
        oldText: "old",
        newText: "new",
      },
      repositoryRoot,
    );

    expect(result.approved).toBe(false);
  });

  it("rejects evals", async () => {
    const result = await approveEdit(
      {
        path: "evals/test.ts",
        oldText: "old",
        newText: "new",
      },
      repositoryRoot,
    );

    expect(result.approved).toBe(false);
  });

  it("rejects missing oldText", async () => {
    const { writeFile } = await import(
      "node:fs/promises"
    );

    await writeFile(
      absoluteTestFile,
      "hello world",
      "utf8",
    );

    const result = await approveEdit(
      {
        path: testFile,
        oldText: "missing",
        newText: "new",
      },
      repositoryRoot,
    );

    expect(result.approved).toBe(false);
  });

  it("rejects ambiguous edits", async () => {
    const { writeFile } = await import(
      "node:fs/promises"
    );

    await writeFile(
      absoluteTestFile,
      "hello hello",
      "utf8",
    );

    const result = await approveEdit(
      {
        path: testFile,
        oldText: "hello",
        newText: "goodbye",
      },
      repositoryRoot,
    );

    expect(result.approved).toBe(false);
  });

  it("applies an approved edit", async () => {
    const { readFile, writeFile } =
      await import("node:fs/promises");

    await writeFile(
      absoluteTestFile,
      "hello world",
      "utf8",
    );

    const result = await applyApprovedEdit(
      {
        path: testFile,
        oldText: "hello",
        newText: "goodbye",
      },
      repositoryRoot,
    );

    expect(result.applied).toBe(true);

    const content = await readFile(
      absoluteTestFile,
      "utf8",
    );

    expect(content).toBe("goodbye world");
  });

  it("does not apply an unsafe edit", async () => {
    const result = await applyApprovedEdit(
      {
        path: "../../../secret.txt",
        oldText: "old",
        newText: "new",
      },
      repositoryRoot,
    );

    expect(result.applied).toBe(false);
  });
});