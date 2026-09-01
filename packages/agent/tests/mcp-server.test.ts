import {
  describe,
  expect,
  it,
} from "vitest";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { readFileTool } from "../src/tools/read-file.js";
import { listDirTool } from "../src/tools/list-dir.js";
import { grepTool } from "../src/tools/grep.js";
import { proposeEditTool } from "../src/tools/propose-edit.js";
import { runTestTool } from "../src/tools/run-test.js";

function createTestServer() {
  const repositoryRoot = path.resolve(
    process.cwd(),
    "../..",
  );

  const context = {
    repositoryRoot,
  };

  const server = new McpServer({
    name: "agent-loop-mcp-test",
    version: "1.0.0",
  });

  server.registerTool(
    "read_file",
    {
      description: readFileTool.description,
      inputSchema: {
        path: z.string(),
      },
    },
    async ({ path }) => {
      const result = await readFileTool.execute(
        { path },
        context,
      );

      return {
        content: [
          {
            type: "text",
            text: result.output,
          },
        ],
        isError: !result.ok,
      };
    },
  );

  server.registerTool(
    "list_dir",
    {
      description: listDirTool.description,
      inputSchema: {
        path: z.string().optional(),
      },
    },
    async ({ path }) => {
      const result = await listDirTool.execute(
        { path },
        context,
      );

      return {
        content: [
          {
            type: "text",
            text: result.output,
          },
        ],
        isError: !result.ok,
      };
    },
  );

  server.registerTool(
    "grep",
    {
      description: grepTool.description,
      inputSchema: {
        pattern: z.string(),
        path: z.string().optional(),
      },
    },
    async ({ pattern, path }) => {
      const result = await grepTool.execute(
        {
          pattern,
          path,
        },
        context,
      );

      return {
        content: [
          {
            type: "text",
            text: result.output,
          },
        ],
        isError: !result.ok,
      };
    },
  );

  server.registerTool(
    "propose_edit",
    {
      description: proposeEditTool.description,
      inputSchema: {
        path: z.string(),
        oldText: z.string(),
        newText: z.string(),
      },
    },
    async ({ path, oldText, newText }) => {
      const result =
        await proposeEditTool.execute(
          {
            path,
            oldText,
            newText,
          },
          context,
        );

      return {
        content: [
          {
            type: "text",
            text: result.output,
          },
        ],
        isError: !result.ok,
      };
    },
  );

  server.registerTool(
    "run_test",
    {
      description: runTestTool.description,
      inputSchema: {
        testPath: z.string(),
      },
    },
    async ({ testPath }) => {
      const result = await runTestTool.execute(
        { testPath },
        context,
      );

      return {
        content: [
          {
            type: "text",
            text: result.output,
          },
        ],
        isError: !result.ok,
      };
    },
  );

  return server;
}

describe("MCP server", () => {
  it("exposes exactly five tools", async () => {
    const server = createTestServer();

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    const client = new Client(
      {
        name: "agent-loop-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();

    const names = result.tools
      .map((tool) => tool.name)
      .sort();

    expect(names).toEqual([
      "grep",
      "list_dir",
      "propose_edit",
      "read_file",
      "run_test",
    ]);

    await client.close();
    await server.close();
  });

  it("calls read_file through MCP", async () => {
    const server = createTestServer();

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    const client = new Client(
      {
        name: "agent-loop-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: "read_file",
      arguments: {
        path: "DESIGN.md",
      },
    });

    const text =
      result.content[0]?.type === "text"
        ? result.content[0].text
        : "";

    expect(result.isError).not.toBe(true);
    expect(text).toContain("Task 3");

    await client.close();
    await server.close();
  });
});