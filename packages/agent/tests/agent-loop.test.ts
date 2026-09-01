import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import path from "node:path";

import {
  AgentLoop,
} from "../src/agent/loop.js";

const repositoryRoot = path.resolve(
  process.cwd(),
  "../..",
);

describe("AgentLoop", () => {
  it("executes tools, verifies the test, and then finishes", async () => {
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
            type: "tool",
            tool: "run_test",
            arguments: {
              testPath:
                "packages/agent/tests/path-policy.test.ts",
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
        .mockImplementation(
          async (name: string) => {
            if (name === "run_test") {
              return {
                content: [
                  {
                    type: "text",
                    text: [
                      "Test Files  1 passed (1)",
                      "Tests       5 passed (5)",
                    ].join("\n"),
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: "text",
                  text: "# Task 3 Design",
                },
              ],
            };
          },
        ),
    };

    const loop = new AgentLoop({
      model: model as never,
      mcp: mcp as never,
      repositoryRoot,
      maxSteps: 5,
      maxRepeatedActions: 2,
    });

    const result = await loop.run(
      "Read DESIGN.md and verify the test.",
      "packages/agent/tests/path-policy.test.ts",
    );

    expect(result.status).toBe(
      "success",
    );

    expect(result.answer).toBe(
      "Task completed.",
    );

    expect(result.steps).toBe(3);

    expect(result.state.task).toBe(
      "Read DESIGN.md and verify the test.",
    );

    expect(result.state.testPath).toBe(
      "packages/agent/tests/path-policy.test.ts",
    );

    expect(result.state.testPassed).toBe(
      true,
    );

    expect(
      result.state.lastTestOutput,
    ).toContain("5 passed");

    expect(result.state.status).toBe(
      "success",
    );

    expect(result.state.steps).toHaveLength(
      2,
    );

    expect(
      result.state.steps[0],
    ).toMatchObject({
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
      result.state.steps[1].action,
    ).toMatchObject({
      type: "tool",
      tool: "run_test",
    });

    expect(
      mcp.callTool,
    ).toHaveBeenCalledTimes(2);

    expect(
      model.chat,
    ).toHaveBeenCalledTimes(3);
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
      repositoryRoot,
      maxSteps: 3,
      maxRepeatedActions: 2,
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
      repositoryRoot,
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

  it("applies an approved proposed edit and verifies the test", async () => {
    const {
      readFile,
      writeFile,
      unlink,
    } = await import(
      "node:fs/promises"
    );

    const targetPath =
      "packages/agent/tests/temp-agent-edit.txt";

    const absolutePath = path.resolve(
      repositoryRoot,
      targetPath,
    );

    await writeFile(
      absolutePath,
      "before",
      "utf8",
    );

    try {
      const model = {
        chat: vi
          .fn()
          .mockResolvedValueOnce({
            model: "qwen2.5:7b",
            response: JSON.stringify({
              type: "tool",
              tool: "propose_edit",
              arguments: {
                path: targetPath,
                oldText: "before",
                newText: "after",
              },
            }),
            done: true,
          })
          .mockResolvedValueOnce({
            model: "qwen2.5:7b",
            response: JSON.stringify({
              type: "tool",
              tool: "run_test",
              arguments: {
                testPath:
                  "packages/agent/tests/path-policy.test.ts",
              },
            }),
            done: true,
          })
          .mockResolvedValueOnce({
            model: "qwen2.5:7b",
            response: JSON.stringify({
              type: "finish",
              answer:
                "Edit applied successfully.",
            }),
            done: true,
          }),
      };

      const mcp = {
        callTool: vi
          .fn()
          .mockImplementation(
            async (name: string) => {
              if (
                name === "propose_edit"
              ) {
                return {
                  content: [
                    {
                      type: "text",
                      text: [
                        `--- a/${targetPath}`,
                        `+++ b/${targetPath}`,
                        "@@",
                        "- before",
                        "+ after",
                      ].join("\n"),
                    },
                  ],
                };
              }

              if (
                name === "run_test"
              ) {
                return {
                  content: [
                    {
                      type: "text",
                      text: [
                        "Test Files  1 passed (1)",
                        "Tests       5 passed (5)",
                      ].join("\n"),
                    },
                  ],
                };
              }

              return {
                content: [
                  {
                    type: "text",
                    text: "files...",
                  },
                ],
              };
            },
          ),
      };

      const loop = new AgentLoop({
        model: model as never,
        mcp: mcp as never,
        repositoryRoot,
        maxSteps: 5,
        maxRepeatedActions: 2,
      });

      const result = await loop.run(
        "Change before to after and verify the test.",
        "packages/agent/tests/path-policy.test.ts",
      );

      const content = await readFile(
        absolutePath,
        "utf8",
      );

      expect(result.status).toBe(
        "success",
      );

      expect(content).toBe(
        "after",
      );

      expect(
        result.state.testPassed,
      ).toBe(true);

      expect(
        result.state.lastTestOutput,
      ).toContain("5 passed");

      expect(
        result.state.steps[0].observation,
      ).toContain("EDIT APPLIED");

      expect(
        result.state.steps,
      ).toHaveLength(2);

      expect(
        mcp.callTool,
      ).toHaveBeenCalledTimes(2);

      expect(
        model.chat,
      ).toHaveBeenCalledTimes(3);
    } finally {
      try {
        await unlink(absolutePath);
      } catch {
        // File may already be absent.
      }
    }
  });

  it("does not allow successful finish before the test passes", async () => {
    const model = {
      chat: vi
        .fn()
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "finish",
            answer: "Everything is fixed.",
          }),
          done: true,
        })
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "tool",
            tool: "run_test",
            arguments: {
              testPath:
                "packages/agent/tests/path-policy.test.ts",
            },
          }),
          done: true,
        })
        .mockResolvedValueOnce({
          model: "qwen2.5:7b",
          response: JSON.stringify({
            type: "finish",
            answer: "The test now passes.",
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
              text: [
                "Test Files  1 passed (1)",
                "Tests       5 passed (5)",
              ].join("\n"),
            },
          ],
        }),
    };

    const loop = new AgentLoop({
      model: model as never,
      mcp: mcp as never,
      repositoryRoot,
      maxSteps: 5,
      maxRepeatedActions: 2,
    });

    const result = await loop.run(
      "Fix the failing test.",
      "packages/agent/tests/path-policy.test.ts",
    );

    expect(result.status).toBe(
      "success",
    );

    expect(result.state.testPassed).toBe(
      true,
    );

    expect(result.steps).toBe(3);

    expect(
      mcp.callTool,
    ).toHaveBeenCalledTimes(1);

    expect(
      model.chat,
    ).toHaveBeenCalledTimes(3);
  });
});