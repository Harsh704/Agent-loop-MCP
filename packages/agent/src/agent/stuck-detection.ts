import type { AgentAction } from "./action.js";

export function actionKey(
  action: AgentAction,
): string {
  return JSON.stringify(action);
}

export function countConsecutiveActions(
  history: AgentAction[],
  action: AgentAction,
): number {
  const key = actionKey(action);
  let count = 0;

  for (
    let index = history.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (actionKey(history[index]) !== key) {
      break;
    }

    count += 1;
  }

  return count;
}

export function isRepeatedAction(
  history: AgentAction[],
  action: AgentAction,
  threshold: number,
): boolean {
  if (threshold <= 1) {
    return true;
  }

  const previousConsecutive =
    countConsecutiveActions(
      history,
      action,
    );

  // Include the current action in the count.
  return (
    previousConsecutive + 1 >= threshold
  );
}