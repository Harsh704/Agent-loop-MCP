import { describe, expect, it } from "vitest";
import {
  actionKey,
  isRepeatedAction,
} from "../src/agent/stuck-detection.js";
import type { AgentAction } from "../src/agent/action.js";

describe("stuck detection", () => {
  const action: AgentAction = {
    type: "tool",
    tool: "read_file",
    arguments: {
      path: "DESIGN.md",
    },
  };

  it("creates a stable key for the same action", () => {
    const sameAction: AgentAction = {
      type: "tool",
      tool: "read_file",
      arguments: {
        path: "DESIGN.md",
      },
    };

    expect(actionKey(action)).toBe(
      actionKey(sameAction),
    );
  });

  it("does not flag the first occurrence", () => {
    expect(
      isRepeatedAction([], action, 2),
    ).toBe(false);
  });

  it("does not flag the second occurrence", () => {
    expect(
      isRepeatedAction([action], action, 2),
    ).toBe(false);
  });

  it("flags an action after the threshold", () => {
    expect(
      isRepeatedAction(
        [action, action],
        action,
        2,
      ),
    ).toBe(true);
  });

  it("does not confuse different actions", () => {
    const differentAction: AgentAction = {
      type: "tool",
      tool: "list_dir",
      arguments: {
        path: ".",
      },
    };

    expect(
      isRepeatedAction(
        [action, action],
        differentAction,
        2,
      ),
    ).toBe(false);
  });
});