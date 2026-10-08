// Shared image generation for the AI game routes (FLUX on DeepInfra).
//
// We use FLUX.1 [schnell] on DeepInfra: it is the cheapest and fastest model
// DeepInfra offers for this, generating in a handful of steps. The endpoint is
// OpenAI-compatible and returns the same `b64_json` shape as the OpenAI Images
// API we used before, so callers are unchanged apart from the key.

const DEEPINFRA_IMAGES_URL =
  "https://api.deepinfra.com/v1/openai/images/generations";

// FLUX.1 [schnell] is a few-step model. Four steps trades ~1s for noticeably
// cleaner art than the single-step minimum, and still lands in about two
// seconds — far under the ~8s the previous OpenAI model took.
const IMAGE_MODEL = "black-forest-labs/FLUX-1-schnell";
const IMAGE_STEPS = 4;

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

/** Sniff the mime type from the image's magic bytes. */
function detectMime(bytes: Buffer): string {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF") {
    return "image/webp";
  }
  return "image/jpeg";
}

/**
 * Generate a square kid-friendly illustration and return it inlined as a
 * `data:` URL so the game stays self-contained.
 */
export async function generateImage(
  prompt: string,
  apiKey: string | undefined = process.env.DEEPINFRA_API_KEY,
): Promise<string> {
  if (!apiKey) {
    throw new ImageGenerationError("Image API key not configured", 500);
  }

  let response: Response;
  try {
    response = await fetch(DEEPINFRA_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        size: "1024x1024",
        n: 1,
        num_inference_steps: IMAGE_STEPS,
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
    console.error("DeepInfra image error:", response.status, errorText);
    throw new ImageGenerationError("Failed to generate image", 502);
  }

  const data = (await response.json()) as {
    data?: { b64_json?: string }[];
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    console.error("DeepInfra image returned no data");
    throw new ImageGenerationError("Invalid image response", 502);
  }

  const mime = detectMime(Buffer.from(b64, "base64"));
  return `data:${mime};base64,${b64}`;
}
