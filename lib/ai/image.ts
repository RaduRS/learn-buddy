// Shared image generation for the AI game routes (OpenAI GPT Image).

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

// Cheapest GPT Image model. At "low" quality a 1024x1024 image is ~272
// output tokens at $8/1M, about $0.002 per image (pricing checked Sept 2026).
const IMAGE_MODEL = "gpt-image-1-mini";

// Kept under the client-side timeouts so the browser never gives up and
// retries while a paid generation is still running on the server.
const IMAGE_TIMEOUT_MS = 45_000;

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ImageGenerationError";
  }
}

/**
 * Generate a square kid-friendly illustration and return it inlined as a
 * `data:image/jpeg;base64,…` URL so the game stays self-contained.
 */
export async function generateImage(
  prompt: string,
  apiKey: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
        output_format: "jpeg",
        output_compression: 80,
      }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ImageGenerationError(
        "Image generation timed out, please try again",
        504,
      );
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI image error:", response.status, errorText);
    throw new ImageGenerationError("Failed to generate image", 502);
  }

  const data = (await response.json()) as {
    data?: { b64_json?: string }[];
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    console.error("OpenAI image returned no data");
    throw new ImageGenerationError("Invalid image response", 502);
  }

  return `data:image/jpeg;base64,${b64}`;
}
