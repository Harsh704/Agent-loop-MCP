import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";

import { readFileTool } from "../tools/read-file.js";
import { listDirTool } from "../tools/list-dir.js";
import { grepTool } from "../tools/grep.js";
import { proposeEditTool } from "../tools/propose-edit.js";
import { runTestTool } from "../tools/run-test.js";

const repositoryRoot = path.resolve(
  process.env.REPOSITORY_ROOT ??
    path.resolve(process.cwd(), "../.."),
);

const context = {
  repositoryRoot,
};

const server = new McpServer({
  name: "agent-loop-mcp",
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
    const result = await proposeEditTool.execute(
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

const transport = new StdioServerTransport();

await server.connect(transport);