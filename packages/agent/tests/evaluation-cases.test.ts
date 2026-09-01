import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluationCases,
} from "../src/evaluation/cases.js";

describe("evaluation cases", () => {
  it("contains exactly 15 cases", () => {
    expect(evaluationCases).toHaveLength(
      15,
    );
  });

  it("contains 6 easy cases", () => {
    expect(
      evaluationCases.filter(
        (item) =>
          item.difficulty === "easy",
      ),
    ).toHaveLength(6);
  });

  it("contains 6 medium cases", () => {
    expect(
      evaluationCases.filter(
        (item) =>
          item.difficulty === "medium",
      ),
    ).toHaveLength(6);
  });

  it("contains 3 hard cases", () => {
    expect(
      evaluationCases.filter(
        (item) =>
          item.difficulty === "hard",
      ),
    ).toHaveLength(3);
  });

  it("gives every case a unique id", () => {
    const ids = evaluationCases.map(
      (item) => item.id,
    );

    expect(
      new Set(ids).size,
    ).toBe(ids.length);
  });
});