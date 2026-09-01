
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  AgentLoop,
} from "../src/agent/loop.js";

describe("AgentLoop", () => {
  it("executes one tool call and then finishes", async () => {
    const model = {
      chat: vi
        .fn()
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "tool",
            tool: "read_file",
            arguments: {
              path: "DESIGN.md",
            },
          }),
          done: true,
        })
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "finish",
            answer: "Task completed.",
          }),
          done: true,
        }),
    };

    const mcp = {
      callTool: vi
        .fn()
        .mockResolvedValue({
          content: [
            {
              type: "text",
              text: "# Task 3 Design",
            },
          ],
        }),
    };

    const loop = new AgentLoop({
      model: model as never,
      mcp: mcp as never,
      maxSteps: 5,
    });

    const result = await loop.run(
      "Read DESIGN.md",
    );

    expect(result.status).toBe(
      "success",
    );

    expect(result.answer).toBe(
      "Task completed.",
    );

    expect(result.steps).toBe(2);

    expect(result.state.task).toBe(
      "Read DESIGN.md",
    );

    expect(result.state.status).toBe(
      "success",
    );

    expect(result.state.steps).toHaveLength(
      1,
    );

    expect(result.state.steps[0]).toMatchObject({
      step: 1,
      action: {
        type: "tool",
        tool: "read_file",
        arguments: {
          path: "DESIGN.md",
        },
      },
      observation: "# Task 3 Design",
    });

    expect(
      mcp.callTool,
    ).toHaveBeenCalledTimes(1);

    expect(
      mcp.callTool,
    ).toHaveBeenCalledWith(
      "read_file",
      {
        path: "DESIGN.md",
      },
    );

    expect(
      model.chat,
    ).toHaveBeenCalledTimes(2);
  });

  it("stops when the step budget is exceeded", async () => {
    const model = {
      chat: vi
        .fn()
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "tool",
            tool: "list_dir",
            arguments: {
              path: ".",
            },
          }),
          done: true,
        })
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "tool",
            tool: "read_file",
            arguments: {
              path: "DESIGN.md",
            },
          }),
          done: true,
        })
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "tool",
            tool: "grep",
            arguments: {
              pattern: "agent",
            },
          }),
          done: true,
        }),
    };

    const mcp = {
      callTool: vi
        .fn()
        .mockResolvedValue({
          content: [
            {
              type: "text",
              text: "files...",
            },
          ],
        }),
    };

    const loop = new AgentLoop({
      model: model as never,
      mcp: mcp as never,
      maxSteps: 3,
    });

    const result = await loop.run(
      "Keep inspecting the repository.",
    );

    expect(result.status).toBe(
      "failed",
    );

    expect(result.state.status).toBe(
      "failed",
    );

    expect(result.state.steps).toHaveLength(
      3,
    );

    expect(
      result.state.steps[0].action,
    ).toMatchObject({
      type: "tool",
      tool: "list_dir",
    });

    expect(result.steps).toBe(3);

    expect(
      model.chat,
    ).toHaveBeenCalledTimes(3);

    expect(
      mcp.callTool,
    ).toHaveBeenCalledTimes(3);
  });

  it("stops when the model repeats the same tool action", async () => {
    const model = {
      chat: vi
        .fn()
        .mockResolvedValue({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "tool",
            tool: "list_dir",
            arguments: {
              path: ".",
            },
          }),
          done: true,
        }),
    };

    const mcp = {
      callTool: vi
        .fn()
        .mockResolvedValue({
          content: [
            {
              type: "text",
              text: "files...",
            },
          ],
        }),
    };

    const loop = new AgentLoop({
      model: model as never,
      mcp: mcp as never,
      maxSteps: 10,
      maxRepeatedActions: 2,
    });

    const result = await loop.run(
      "Inspect the repository",
    );

    expect(result.status).toBe(
      "failed",
    );

    expect(result.answer).toContain(
      "repeated the same action",
    );

    expect(result.state.status).toBe(
      "failed",
    );

    expect(result.state.steps).toHaveLength(
      2,
    );

    expect(result.steps).toBe(3);

    expect(
      model.chat,
    ).toHaveBeenCalledTimes(3);

    expect(
      mcp.callTool,
    ).toHaveBeenCalledTimes(2);
  });
});
