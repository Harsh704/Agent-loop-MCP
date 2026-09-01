import {
  describe,
  expect,
  it,
} from "vitest";

import { OllamaClient } from "../src/model/ollama.js";

describe("OllamaClient", () => {
  it("receives a response from the configured model", async () => {
    const client = new OllamaClient({
      model: "qwen2.5:7b",
      timeoutMs: 30_000,
    });

    const result = await client.chat([
      {
        role: "user",
        content: "Reply with exactly: OLLAMA_OK",
      },
    ]);

    expect(result.model).toBe("qwen2.5:7b");

    expect(result.response.trim()).toContain(
      "OLLAMA_OK",
    );

    expect(result.done).toBe(true);
  });
});