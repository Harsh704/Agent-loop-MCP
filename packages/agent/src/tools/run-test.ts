import { execa } from "execa";
import path from "node:path";
import type { Tool, ToolContext } from "./types.js";
import type { ToolResult } from "../types/index.js";
import { validateRepositoryPath } from "../safety/path-policy.js";

export interface RunTestArguments {
  testPath: string;
}

const MAX_OUTPUT_SIZE = 30_000;

export const runTestTool: Tool<RunTestArguments> = {
  name: "run_test",

  description:
    "Run a specific Vitest test file using the controlled test runner.",

  async execute(
    args: RunTestArguments,
    context: ToolContext,
  ): Promise<ToolResult> {
    const validation = validateRepositoryPath(
      context.repositoryRoot,
      args.testPath,
    );

    if (
      !validation.allowed ||
      !validation.absolutePath
    ) {
      return {
        id: crypto.randomUUID(),
        ok: false,
        output:
          validation.reason ?? "Invalid test path.",
      };
    }

    try {
      const agentPackageRoot = path.join(
    context.repositoryRoot,
        "packages",
        "agent",
    );

    const relativeTestPath = path.relative(
        agentPackageRoot,
        validation.absolutePath,
    );

    const result = await execa(
        "pnpm",
        [
            "exec",
            "vitest",
            "run",
            relativeTestPath,
        ],
        {
            cwd: agentPackageRoot,
            reject: false,
            timeout: 30_000,
        },
    );

      const combinedOutput = [
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n");

      const output =
        combinedOutput.length > MAX_OUTPUT_SIZE
          ? combinedOutput.slice(0, MAX_OUTPUT_SIZE)
          : combinedOutput;

      return {
        id: crypto.randomUUID(),
        ok: result.exitCode === 0,
        output,
        truncated:
          combinedOutput.length > MAX_OUTPUT_SIZE,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        id: crypto.randomUUID(),
        ok: false,
        output: `Unable to run test: ${message}`,
      };
    }
  },
};