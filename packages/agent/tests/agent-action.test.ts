import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseAgentAction,
} from "../src/agent/action.js";

describe("agent action", () => {
  it("parses a valid tool action", () => {
    const action = parseAgentAction(
      JSON.stringify({
        type: "tool",
        tool: "read_file",
        arguments: {
          path: "DESIGN.md",
        },
      }),
    );

    expect(action.type).toBe("tool");
    expect(action.tool).toBe("read_file");

    expect(action.arguments).toEqual({
      path: "DESIGN.md",
    });
  });

  it("parses a finish action", () => {
    const action = parseAgentAction(
      JSON.stringify({
        type: "finish",
        answer: "Task completed.",
      }),
    );

    expect(action.type).toBe("finish");
    expect(action.answer).toBe(
      "Task completed.",
    );
  });

  it("rejects invalid JSON", () => {
    expect(() =>
      parseAgentAction(
        "not valid json",
      ),
    ).toThrow(
      "Model returned invalid JSON",
    );
  });

  it("rejects an action without a type", () => {
    expect(() =>
      parseAgentAction(
        JSON.stringify({
          tool: "read_file",
          arguments: {},
        }),
      ),
    ).toThrow();
  });
});