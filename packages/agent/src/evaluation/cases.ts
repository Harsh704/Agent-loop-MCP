import type {
  EvaluationCase,
} from "./types.js";

export const evaluationCases: EvaluationCase[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `easy-${String(index + 1).padStart(2, "0")}`,
    difficulty: "easy" as const,
    description: `Easy evaluation case ${index + 1}.`,
    testPath: `tests/golden/easy-${String(index + 1).padStart(2, "0")}.test.ts`,
  })),

  ...Array.from({ length: 6 }, (_, index) => ({
    id: `medium-${String(index + 1).padStart(2, "0")}`,
    difficulty: "medium" as const,
    description: `Medium evaluation case ${index + 1}.`,
    testPath: `tests/golden/medium-${String(index + 1).padStart(2, "0")}.test.ts`,
  })),

  ...Array.from({ length: 3 }, (_, index) => ({
    id: `hard-${String(index + 1).padStart(2, "0")}`,
    difficulty: "hard" as const,
    description: `Hard evaluation case ${index + 1}.`,
    testPath: `tests/golden/hard-${String(index + 1).padStart(2, "0")}.test.ts`,
  })),
];