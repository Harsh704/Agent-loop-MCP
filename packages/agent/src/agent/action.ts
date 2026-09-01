import { z } from "zod";

export const AgentActionSchema =
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("tool"),
      tool: z.string().min(1),
      arguments: z.record(
        z.string(),
        z.unknown(),
      ),
      rationale: z.string().optional(),
    }),

    z.object({
      type: z.literal("finish"),
      answer: z.string(),
    }),
  ]);

export type AgentAction = z.infer<
  typeof AgentActionSchema
>;

export function parseAgentAction(
  response: string,
): AgentAction {
  let parsed: unknown;

  try {
    parsed = JSON.parse(response);
  } catch {
    throw new Error(
      "Model returned invalid JSON",
    );
  }

  return AgentActionSchema.parse(
    parsed,
  );
}