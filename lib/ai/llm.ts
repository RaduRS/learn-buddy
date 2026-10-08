// Thin DeepSeek chat wrapper shared by the AI routes.

const DEFAULT_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_TIMEOUT_MS = 20_000;

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/**
 * Send a single user prompt and return the raw text of the reply.
 * Throws LlmError with a meaningful status when the key is missing or the
 * upstream call fails, so routes can surface a real error to the client.
 */
export async function chat(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new LlmError("DeepSeek API key not configured", 500);
  }
  const url = process.env.DEEPSEEK_API_URL || DEFAULT_URL;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: opts.temperature ?? 1.0,
        max_tokens: opts.maxTokens ?? 400,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new LlmError("Story model timed out", 504);
    }
    throw new LlmError("Story model unreachable", 502);
  }

  if (!response.ok) {
    console.error("DeepSeek error:", response.status, await response.text());
    throw new LlmError("Story model failed", 502);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError("Story model returned nothing", 502);
  }
  return content;
}
