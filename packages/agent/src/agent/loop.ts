import {
  type OllamaMessage,
  type OllamaClient,
} from "../model/ollama.js";

import type { AgentMcpClient } from "../mcp/client.js";

import {
  parseTestResult,
} from "./test-result.js";

import type {
  AgentState,
  AgentStep,
  AgentStatus,
} from "./state.js";

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
  maxDurationMs?: number;
}

export interface AgentLoopResult {
  status:
    | "success"
    | "failed";

  answer?: string;
  steps: number;
  state: AgentState;
  terminationReason: string;
}

export class AgentLoop {
  private readonly model: OllamaClient;
  private readonly mcp: AgentMcpClient;
  private readonly repositoryRoot: string;

  private readonly maxSteps: number;
  private readonly maxRepeatedActions: number;
  private readonly maxDurationMs: number;

  constructor(
    options: AgentLoopOptions,
  ) {
    this.model = options.model;
    this.mcp = options.mcp;
    this.repositoryRoot =
      options.repositoryRoot;

    this.maxSteps =
      options.maxSteps ?? 12;

    this.maxRepeatedActions =
      options.maxRepeatedActions ?? 3;

    this.maxDurationMs =
      options.maxDurationMs ?? 60_000;
  }

  async run(
    task: string,
    testPath?: string,
  ): Promise<AgentLoopResult> {
    const startTime = Date.now();

    const state: AgentState = {
      task,
      testPath,

      testPassed: false,

      currentStep: 0,
      maxSteps: this.maxSteps,

      startTime,
      maxDurationMs:
        this.maxDurationMs,

      seenFiles: [],

      repeatedCallCount: 0,

      steps: [],

      toolCallErrors: 0,
      guardrailViolations: 0,

      status: "running",
    };

    const actionHistory: AgentAction[] =
      [];

    const messages: OllamaMessage[] = [
      {
        role: "system",
        content: [
          "You are a software engineering agent.",
          "You can use tools through MCP.",
          "Return exactly one JSON action.",
          "",
          "For every tool action, include a concise rationale.",
          "",
          "Tool action:",
          '{"type":"tool","tool":"TOOL_NAME","arguments":{},"rationale":"WHY_THIS_TOOL_IS_NEEDED"}',
          "",
          "Finish action:",
          '{"type":"finish","answer":"ANSWER"}',
          "",
          "Execute at most one tool per iteration.",
          "Do not claim success until the target test has passed.",
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
      state.currentStep = step;

      if (
        this.hasExceededTime(
          startTime,
        )
      ) {
        return this.fail(
          state,
          step,
          "Wall-clock budget exceeded.",
          "budget_exceeded",
        );
      }

      let response;

      try {
        response =
          await this.model.chat(
            messages,
          );
      } catch (error) {
        state.status = "error";

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          status: "failed",
          answer: `Model error: ${message}`,
          steps: step,
          state,
          terminationReason:
            "model_error",
        };
      }

      let action: AgentAction;

      try {
        action = parseAgentAction(
          response.response,
        );
      } catch (error) {
        state.toolCallErrors += 1;

        state.status = "failed";

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          status: "failed",
          answer: message,
          steps: step,
          state,
          terminationReason:
            "invalid_model_action",
        };
      }

      if (
        action.type === "tool"
      ) {
        const repeated =
          isRepeatedAction(
            actionHistory,
            action,
            this.maxRepeatedActions,
          );

        state.repeatedCallCount =
          repeated
            ? this.maxRepeatedActions
            : 0;

        if (repeated) {
          state.status = "stuck";

          return {
            status: "failed",
            answer:
              "Agent stopped because it repeated the same action too many times.",
            steps: step,
            state,
            terminationReason:
              "stuck",
          };
        }

        actionHistory.push(action);

        state.previousToolCall =
          action;

        this.trackSeenFiles(
          state,
          action,
        );
      }

      if (
        action.type === "finish"
      ) {
        if (!state.testPassed) {
          const observation =
            "Cannot finish successfully because the target test has not passed.";

          messages.push({
            role: "assistant",
            content:
              response.response,
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
          terminationReason:
            "test_passed",
        };
      }

      const rationale =
        action.rationale ??
        "No rationale provided.";

      let observation: string;

      try {
        observation =
          await this.executeTool(
            action,
            state,
          );
      } catch (error) {
        state.toolCallErrors += 1;

        observation =
          error instanceof Error
            ? `Tool execution error: ${error.message}`
            : `Tool execution error: ${String(error)}`;
      }

      if (
        action.tool === "run_test"
      ) {
        const testResult =
          parseTestResult(
            observation,
          );

        state.lastTestOutput =
          testResult.output;

        state.testPassed =
          testResult.passed;
      }

      const agentStep: AgentStep = {
        step,
        timestamp:
          new Date().toISOString(),
        action,
        observation,
        rationale,
      };

      state.steps.push(
        agentStep,
      );

      messages.push({
        role: "assistant",
        content:
          response.response,
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

    state.status =
      "budget_exceeded";

    return {
      status: "failed",
      answer:
        "Maximum step budget exceeded.",
      steps: this.maxSteps,
      state,
      terminationReason:
        "step_budget",
    };
  }

  private async executeTool(
    action: Extract<
      AgentAction,
      { type: "tool" }
    >,
    state: AgentState,
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
      if (result.isError) {
        state.toolCallErrors += 1;
      }

      return result.isError
        ? "Tool failed without an observation."
        : "Tool returned no observation.";
    }

    const observation =
      content
        .map((item: unknown) => {
          if (
            typeof item ===
              "object" &&
            item !== null &&
            "type" in item &&
            item.type === "text" &&
            "text" in item &&
            typeof item.text ===
              "string"
          ) {
            return item.text;
          }

          return JSON.stringify(
            item,
          );
        })
        .join("\n");

    if (result.isError) {
      state.toolCallErrors += 1;

      if (
        observation.includes(
          "outside the repository boundary",
        ) ||
        observation.includes(
          "node_modules",
        ) ||
        observation.includes(
          "evaluation harness",
        ) ||
        observation.includes(
          "Access to node_modules is not allowed",
        )
      ) {
        state.guardrailViolations += 1;
      }
    }

    if (
      action.tool !==
      "propose_edit"
    ) {
      return observation;
    }

    const args =
      action.arguments as {
        path: string;
        oldText: string;
        newText: string;
      };

    const editResult =
      await applyApprovedEdit(
        args,
        this.repositoryRoot,
      );

    if (!editResult.applied) {
      if (
        editResult.reason.includes(
          "not allowed",
        ) ||
        editResult.reason.includes(
          "outside",
        ) ||
        editResult.reason.includes(
          "node_modules",
        ) ||
        editResult.reason.includes(
          "evaluation",
        )
      ) {
        state.guardrailViolations += 1;
        state.status =
          "safety_violation";
      }

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

  private trackSeenFiles(
    state: AgentState,
    action: Extract<
      AgentAction,
      { type: "tool" }
    >,
  ): void {
    const possiblePath =
      action.arguments.path ??
      action.arguments.testPath;

    if (
      typeof possiblePath !==
      "string"
    ) {
      return;
    }

    if (
      !state.seenFiles.includes(
        possiblePath,
      )
    ) {
      state.seenFiles.push(
        possiblePath,
      );
    }
  }

  private hasExceededTime(
    startTime: number,
  ): boolean {
    return (
      Date.now() - startTime >=
      this.maxDurationMs
    );
  }

  private fail(
    state: AgentState,
    step: number,
    answer: string,
    status: AgentStatus,
  ): AgentLoopResult {
    state.status = status;

    return {
      status: "failed",
      answer,
      steps: step,
      state,
      terminationReason:
        status,
    };
  }
}