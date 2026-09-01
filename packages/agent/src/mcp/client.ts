import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpClientConfig {
  serverCommand: string;
  serverArgs: string[];
  cwd: string;
  env?: Record<string, string>;
}

export class AgentMcpClient {
  private readonly client: Client;
  private transport?: StdioClientTransport;

  constructor() {
    this.client = new Client(
      {
        name: "agent-loop-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );
  }

  async connect(
    config: McpClientConfig,
  ): Promise<void> {
    this.transport =
      new StdioClientTransport({
        command: config.serverCommand,
        args: config.serverArgs,
        cwd: config.cwd,
        env: {
            ...Object.fromEntries(
                Object.entries(process.env).filter(
                    (entry): entry is [string, string] =>
                    entry[1] !== undefined,
            ),
            ),
            ...(config.env ?? {}),
        } as Record<string, string>,
      });

    await this.client.connect(
      this.transport,
    );
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(
    name: string,
    arguments_: Record<string, unknown>,
  ) {
    return this.client.callTool({
      name,
      arguments: arguments_,
    });
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}