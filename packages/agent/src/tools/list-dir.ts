import { readdir } from "node:fs/promises";
import type { ToolResult } from "../types/index.js";
import {
  validateRepositoryPath,
} from "../safety/path-policy.js";
import type {
  Tool,
  ToolContext,
} from "./types.js";

export interface ListDirArguments {
  path?: string;
}

export const listDirTool: Tool<ListDirArguments> = {
  name: "list_dir",

  description:
    "List files and directories inside the repository.",

  async execute(
    args: ListDirArguments,
    context: ToolContext,
  ): Promise<ToolResult> {
    const requestedPath = args.path ?? ".";

    const validation = validateRepositoryPath(
      context.repositoryRoot,
      requestedPath,
    );

    if (!validation.allowed || !validation.absolutePath) {
      return {
        id: crypto.randomUUID(),
        ok: false,
        output: validation.reason ?? "Invalid path.",
      };
    }

    try {
      const entries = await readdir(
        validation.absolutePath,
        {
          withFileTypes: true,
        },
      );

      const output = entries
        .sort((a, b) =>
          a.name.localeCompare(b.name),
        )
        .map((entry) => {
          const suffix = entry.isDirectory()
            ? "/"
            : "";

          return `${entry.name}${suffix}`;
        })
        .join("\n");

      return {
        id: crypto.randomUUID(),
        ok: true,
        output,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        id: crypto.randomUUID(),
        ok: false,
        output: `Unable to list directory: ${message}`,
      };
    }
  },
};