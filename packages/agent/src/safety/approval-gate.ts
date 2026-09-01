import { readFile, writeFile } from "node:fs/promises";
import type { ProposeEditArguments } from "../tools/propose-edit.js";
import {
  validateRepositoryPath,
} from "./path-policy.js";

export interface ApprovalResult {
  approved: boolean;
  reason: string;
  absolutePath?: string;
}

export interface ApplyEditResult {
  applied: boolean;
  reason: string;
}

export async function approveEdit(
  args: ProposeEditArguments,
  repositoryRoot: string,
): Promise<ApprovalResult> {
  const validation = validateRepositoryPath(
    repositoryRoot,
    args.path,
  );

  if (
    !validation.allowed ||
    !validation.absolutePath
  ) {
    return {
      approved: false,
      reason:
        validation.reason ?? "Edit path is not allowed.",
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
        approved: false,
        reason:
          "The original text was not found in the file.",
      };
    }

    if (occurrences > 1) {
      return {
        approved: false,
        reason:
          "The original text occurs multiple times.",
      };
    }

    return {
      approved: true,
      reason: "Edit passed the approval gate.",
      absolutePath: validation.absolutePath,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      approved: false,
      reason: `Unable to validate edit: ${message}`,
    };
  }
}

export async function applyApprovedEdit(
  args: ProposeEditArguments,
  repositoryRoot: string,
): Promise<ApplyEditResult> {
  const approval = await approveEdit(
    args,
    repositoryRoot,
  );

  if (!approval.approved || !approval.absolutePath) {
    return {
      applied: false,
      reason: approval.reason,
    };
  }

  try {
    const content = await readFile(
      approval.absolutePath,
      "utf8",
    );

    const updatedContent = content.replace(
      args.oldText,
      args.newText,
    );

    await writeFile(
      approval.absolutePath,
      updatedContent,
      "utf8",
    );

    return {
      applied: true,
      reason: "Edit applied successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      applied: false,
      reason: `Unable to apply edit: ${message}`,
    };
  }
}