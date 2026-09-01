import type { ToolResult } from "../types/index.js";

export interface ToolContext {
  repositoryRoot: string;
}

export interface Tool<TArguments> {
  name: string;
  description: string;
  execute(
    args: TArguments,
    context: ToolContext,
  ): Promise<ToolResult>;
}