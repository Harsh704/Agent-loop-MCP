import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import path from "node:path";

import { AgentMcpClient } from "../src/mcp/client.js";

describe("MCP client", () => {
  let client: AgentMcpClient | undefined;

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  it("connects to the MCP server and discovers five tools", async () => {
    const packageRoot = process.cwd();
    const repositoryRoot = path.resolve(
        packageRoot,
        "../..",
    );

    client = new AgentMcpClient();

    await client.connect({
      serverCommand: "pnpm",
      serverArgs: [
        "exec",
        "tsx",
        "src/mcp/server.ts",
      ],
      cwd: packageRoot,
      env: {
        REPOSITORY_ROOT: repositoryRoot,
      },
    });

    const result = await client.listTools();

    const toolNames = result.tools
      .map((tool) => tool.name)
      .sort();

    expect(toolNames).toEqual([
      "grep",
      "list_dir",
      "propose_edit",
      "read_file",
      "run_test",
    ]);
  });

  it("calls read_file through the MCP server", async () => {
    const packageRoot = process.cwd();
    const repositoryRoot = path.resolve(
        packageRoot,
        "../..",
    );
    client = new AgentMcpClient();

    await client.connect({
      serverCommand: "pnpm",
      serverArgs: [
        "exec",
        "tsx",
        "src/mcp/server.ts",
      ],
      cwd: packageRoot,
      env: {
        REPOSITORY_ROOT: repositoryRoot,
      },
    });

    const result = await client.callTool(
      "read_file",
      {
        path: "DESIGN.md",
      },
    );

    expect(result.isError).not.toBe(true);

    const content = result.content[0];

    expect(content.type).toBe("text");

    if (content.type === "text") {
      expect(content.text).toContain(
        "Task 3",
      );
    }
  });
});