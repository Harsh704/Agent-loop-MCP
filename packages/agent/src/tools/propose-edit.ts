import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ToolResult } from "../types/index.js";
import {
  validateRepositoryPath,
} from "../safety/path-policy.js";
import type {
  Tool,
  ToolContext,
} from "./types.js";

export interface ProposeEditArguments {
  path: string;
  oldText: string;
  newText: string;
}

function createDiff(
  filePath: string,
  oldText: string,
  newText: string,
): string {
  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@`,
    `- ${oldText}`,
    `+ ${newText}`,
  ].join("\n");
}

export const proposeEditTool: Tool<ProposeEditArguments> = {
  name: "propose_edit",

  description:
    "Propose a deterministic text edit and return a diff without applying it.",

  async execute(
    args: ProposeEditArguments,
    context: ToolContext,
  ): Promise<ToolResult> {
    const validation = validateRepositoryPath(
      context.repositoryRoot,
      args.path,
    );

    if (
      !validation.allowed ||
      !validation.absolutePath
    ) {
      return {
        id: crypto.randomUUID(),
        ok: false,
        output:
          validation.reason ?? "Invalid edit path.",
      };
    }

    try {
      const content = await readFile(
        validation.absolutePath,
        "utf8",
      );

      const occurrences =
        args.oldText === ""
          ? 0
          : content.split(args.oldText).length - 1;

      if (occurrences === 0) {
        return {
          id: crypto.randomUUID(),
          ok: false,
          output:
            "The requested oldText was not found in the file.",
        };
      }

      if (occurrences > 1) {
        return {
          id: crypto.randomUUID(),
          ok: false,
          output:
            "The requested oldText occurs multiple times; edit is ambiguous.",
        };
      }

      const updatedContent = content.replace(
        args.oldText,
        args.newText,
      );

      const relativePath = path
        .relative(context.repositoryRoot, validation.absolutePath)
        .replaceAll("\\", "/");

      const diff = createDiff(
        relativePath,
        args.oldText,
        args.newText,
      );

      return {
        id: crypto.randomUUID(),
        ok: true,
        output: diff,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        id: crypto.randomUUID(),
        ok: false,
        output: `Unable to propose edit: ${message}`,
      };
    }
  },
};