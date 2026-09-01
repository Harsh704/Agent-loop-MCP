import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { ToolResult } from "../types/index.js";
import {
  validateRepositoryPath,
} from "../safety/path-policy.js";
import type {
  Tool,
  ToolContext,
} from "./types.js";

export interface GrepArguments {
  pattern: string;
  path?: string;
}

const MAX_RESULTS = 100;
const MAX_OUTPUT_SIZE = 50_000;

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
]);

async function searchDirectory(
  directory: string,
  pattern: string,
  root: string,
  results: string[],
): Promise<void> {
  if (results.length >= MAX_RESULTS) {
    return;
  }

  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (results.length >= MAX_RESULTS) {
      return;
    }

    if (
      entry.isDirectory() &&
      IGNORED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    const absolutePath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      await searchDirectory(
        absolutePath,
        pattern,
        root,
        results,
      );

      continue;
    }

    const relativePath = path.relative(
      root,
      absolutePath,
    );

    const validation = validateRepositoryPath(
      root,
      relativePath,
    );

    if (!validation.allowed) {
      continue;
    }

    try {
      const content = await readFile(
        absolutePath,
        "utf8",
      );

      const lines = content.split(/\r?\n/);

      for (
        let index = 0;
        index < lines.length;
        index++
      ) {
        if (lines[index].includes(pattern)) {
          results.push(
            `${relativePath}:${index + 1}:${lines[index]}`,
          );

          if (results.length >= MAX_RESULTS) {
            return;
          }
        }
      }
    } catch {
      // Ignore files that cannot be read as text.
    }
  }
}

export const grepTool: Tool<GrepArguments> = {
  name: "grep",

  description:
    "Search repository files for a text pattern.",

  async execute(
    args: GrepArguments,
    context: ToolContext,
  ): Promise<ToolResult> {
    if (!args.pattern) {
      return {
        id: crypto.randomUUID(),
        ok: false,
        output: "Search pattern cannot be empty.",
      };
    }

    const requestedPath = args.path ?? ".";

    const validation = validateRepositoryPath(
      context.repositoryRoot,
      requestedPath,
    );

    if (
      !validation.allowed ||
      !validation.absolutePath
    ) {
      return {
        id: crypto.randomUUID(),
        ok: false,
        output:
          validation.reason ?? "Invalid search path.",
      };
    }

    try {
      const results: string[] = [];

      await searchDirectory(
        validation.absolutePath,
        args.pattern,
        context.repositoryRoot,
        results,
      );

      if (results.length === 0) {
        return {
          id: crypto.randomUUID(),
          ok: true,
          output: "No matches found.",
        };
      }

      let output = results.join("\n");

      if (output.length > MAX_OUTPUT_SIZE) {
        output = output.slice(0, MAX_OUTPUT_SIZE);
      }

      return {
        id: crypto.randomUUID(),
        ok: true,
        output,
        truncated:
          results.length >= MAX_RESULTS ||
          output.length >= MAX_OUTPUT_SIZE,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        id: crypto.randomUUID(),
        ok: false,
        output: `Unable to search repository: ${message}`,
      };
    }
  },
};