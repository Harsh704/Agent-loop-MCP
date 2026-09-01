import type { AgentAction } from "./action.js";

export function actionKey(action: AgentAction): string {
  return JSON.stringify(action);
}

export function isRepeatedAction(
  history: AgentAction[],
  action: AgentAction,
  threshold: number,
): boolean {
  if (threshold <= 0) {
    return false;
  }

  const key = actionKey(action);

  let count = 0;

  for (const previous of history) {
    if (actionKey(previous) === key) {
      count += 1;
    }
  }

  return count >= threshold;
}