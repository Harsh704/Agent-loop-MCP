import {
    type OllamaMessage,
    type OllamaClient,
} from "../model/ollama.js";
import type { AgentMcpClient } from "../mcp/client.js";

import {
  parseTestResult,
} from "./test-result.js";

import type { AgentState } from "./state.js";

import {
    applyApprovedEdit,
} from "../safety/approval-gate.js";

import {
    isRepeatedAction,
} from "./stuck-detection.js";

import {
    parseAgentAction,
    type AgentAction,
} from "./action.js";

export interface AgentLoopOptions {
    model: OllamaClient;
    mcp: AgentMcpClient;
    repositoryRoot: string;
    maxSteps?: number;
    maxRepeatedActions?: number;
}
export interface AgentLoopResult {
    status: "success" | "failed";
    answer?: string;
    steps: number;
    state: AgentState;
}

export class AgentLoop {
    private readonly model: OllamaClient;
    private readonly mcp: AgentMcpClient;
    private readonly repositoryRoot: string;
    private readonly maxSteps: number;
    private readonly maxRepeatedActions: number;
    constructor(options: AgentLoopOptions) {
        this.model = options.model;
        this.mcp = options.mcp;
        this.repositoryRoot = options.repositoryRoot;
        this.maxSteps = options.maxSteps ?? 10;
        this.maxRepeatedActions = options.maxRepeatedActions ?? 2;
    }

    async run(
        task: string,
        testPath?: string,
    ): Promise<AgentLoopResult> {
        const state: AgentState = {
            task,
            testPath,
            testPassed: false,  
            steps: [],
            status: "running",
        };

        const actionHistory: AgentAction[] = [];


        const messages: OllamaMessage[] = [
            {
                role: "system",
                content: [
                    "You are a software engineering agent.",
                    "You can use tools through MCP.",
                    "Return exactly one JSON action.",
                    "",
                    "Tool action:",
                    '{"type":"tool","tool":"TOOL_NAME","arguments":{}}',
                    "",
                    "Finish action:",
                    '{"type":"finish","answer":"ANSWER"}',
                    "",
                    "Execute at most one tool per iteration.",
                ].join("\n"),
            },
            {
                role: "user",
                content: task,
            },
        ];

        for (
            let step = 1;
            step <= this.maxSteps;
            step += 1
        ) {
            const response =
                await this.model.chat(messages);

            const action = parseAgentAction(
                response.response,
            );
            if (
                action.type === "tool" &&
                isRepeatedAction(
                    actionHistory,
                    action,
                    this.maxRepeatedActions,
                )
            ) {
                state.status = "failed";

                return {
                    status: "failed",
                    answer:
                        "Agent stopped because it repeated the same action too many times.",
                    steps: step,
                    state,
                };
            }

            if (action.type === "tool") {
                actionHistory.push(action);
            }


            if (action.type === "finish") {
                if (!state.testPassed) {
                    const observation = "Cannot finish successfully because the target test has not passed.";

                    messages.push({
                    role: "assistant",
                    content: response.response,
                    });

                    messages.push({
                    role: "user",
                    content: observation,
                    });

                    continue;
                }

                state.status = "success";

                return {
                    status: "success",
                    answer: action.answer,
                    steps: step,
                    state,
                };
            }

            const observation =
                await this.executeTool(action);

            if (action.tool === "run_test") {
                const testResult =
                    parseTestResult(observation);

                state.lastTestOutput =
                    testResult.output;

                state.testPassed =
                    testResult.passed;
            }

            state.steps.push({
                step,
                action,
                observation,
            });

            messages.push({
                role: "assistant",
                content: response.response,
            });

            messages.push({
                role: "user",
                content: [
                    "Tool observation:",
                    observation,
                    "",
                    "Return exactly one JSON action.",
                ].join("\n"),
            });
        }

        state.status = "failed";
        return {
            status: "failed",
            answer: "Maximum step budget exceeded.",
            steps: this.maxSteps,
            state,
        };
    }

    private async executeTool(
        action: Extract<
            AgentAction,
            { type: "tool" }
        >,
    ): Promise<string> {
        const result =
            await this.mcp.callTool(
                action.tool,
                action.arguments,
            );

        const content = result.content;

        if (
            !Array.isArray(content) ||
            content.length === 0
        ) {
            return result.isError
                ? "Tool failed without an observation."
                : "Tool returned no observation.";
        }

        const observation = content
            .map((item: unknown) => {
                if (
                    typeof item === "object" &&
                    item !== null &&
                    "type" in item &&
                    item.type === "text" &&
                    "text" in item &&
                    typeof item.text === "string"
                ) {
                    return item.text;
                }

                return JSON.stringify(item);
            })
            .join("\n");

        if (action.tool !== "propose_edit") {
            return observation;
        }

        const editResult =
            await applyApprovedEdit(
                action.arguments as {
                    path: string;
                    oldText: string;
                    newText: string;
                },
                this.repositoryRoot,
            );

        if (!editResult.applied) {
            return [
                observation,
                "",
                `EDIT NOT APPLIED: ${editResult.reason}`,
            ].join("\n");
        }

        return [
            observation,
            "",
            `EDIT APPLIED: ${editResult.reason}`,
        ].join("\n");
    }
}