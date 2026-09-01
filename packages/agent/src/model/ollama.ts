export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface OllamaClientOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OllamaClientOptions = {}) {
    this.baseUrl =
      options.baseUrl ??
      process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434";

    this.model =
      options.model ??
      process.env.OLLAMA_MODEL ??
      "qwen2.5:7b";

    this.timeoutMs =
      options.timeoutMs ?? 30_000;
  }

  async chat(
    messages: OllamaMessage[],
  ): Promise<OllamaResponse> {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const response = await fetch(
        `${this.baseUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            stream: false,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `Ollama request failed (${response.status}): ${body}`,
        );
      }

      const data =
        (await response.json()) as {
          model?: unknown;
          message?: {
            content?: unknown;
          };
          done?: unknown;
        };

      if (
        typeof data.model !== "string" ||
        typeof data.message?.content !== "string"
      ) {
        throw new Error(
          "Invalid response received from Ollama",
        );
      }

      return {
        model: data.model,
        response: data.message.content,
        done: data.done === true,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}