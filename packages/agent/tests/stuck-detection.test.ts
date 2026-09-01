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
            isRepeatedAction(
                [],
                action,
                3,
            ),
        ).toBe(false);
    });

    it("does not flag the second occurrence", () => {
        expect(
            isRepeatedAction(
                [action],
                action,
                3,
            ),
        ).toBe(false);
    });

    it("flags the third consecutive occurrence", () => {
        expect(
            isRepeatedAction(
                [action, action],
                action,
                3,
            ),
        ).toBe(true);
    });

    it("does not flag non-consecutive repetition", () => {
        const differentAction: AgentAction = {
            type: "tool",
            tool: "list_dir",
            arguments: {
                path: ".",
            },
        };

        expect(
            isRepeatedAction(
                [action, differentAction, action],
                action,
                3,
            ),
        ).toBe(false);
    });
});