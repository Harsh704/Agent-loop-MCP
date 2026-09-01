import { readFile } from "node:fs/promises";
import type { ToolResult } from "../types/index.js";
import {
  validateRepositoryPath,
} from "../safety/path-policy.js";
import type {
  Tool,
  ToolContext,
} from "./types.js";

export interface ReadFileArguments {
  path: string;
}

const MAX_FILE_SIZE = 100_000;

export const readFileTool: Tool<ReadFileArguments> = {
  name: "read_file",

  description:
    "Read the contents of a file inside the repository.",

  async execute(
    args: ReadFileArguments,
    context: ToolContext,
  ): Promise<ToolResult> {
    const validation = validateRepositoryPath(
      context.repositoryRoot,
      args.path,
    );

    if (!validation.allowed || !validation.absolutePath) {
      return {
        id: crypto.randomUUID(),
        ok: false,
        output: validation.reason ?? "Invalid path.",
      };
    }

    try {
      const content = await readFile(
        validation.absolutePath,
        "utf8",
      );

      if (content.length > MAX_FILE_SIZE) {
        return {
          id: crypto.randomUUID(),
          ok: true,
          output: content.slice(0, MAX_FILE_SIZE),
          truncated: true,
        };
      }

      return {
        id: crypto.randomUUID(),
        ok: true,
        output: content,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        id: crypto.randomUUID(),
        ok: false,
        output: `Unable to read file: ${message}`,
      };
    }
  },
};