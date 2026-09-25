// Shared flux-schnell image generation for the AI game routes.

const FLUX_URL =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";

// Total budget for create + poll. Kept well under the client-side timeouts
// so the browser never gives up and retries while a paid prediction is
// still running on the server.
const PREDICTION_DEADLINE_MS = 40_000;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 1200;

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ImageGenerationError";
  }
}

interface Prediction {
  status?: string;
  output?: string | string[];
  error?: unknown;
  urls?: { get?: string; cancel?: string };
}

const isTerminal = (s?: string) =>
  s === "succeeded" || s === "failed" || s === "canceled";

/**
 * Generate a square PNG with flux-schnell and return it inlined as a
 * `data:image/png;base64,…` URL so the client never hits Replicate directly.
 */
export async function generateFluxImage(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const deadline = Date.now() + PREDICTION_DEADLINE_MS;
  const auth = { Authorization: `Bearer ${apiKey}` };

  const response = await fetch(FLUX_URL, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/json",
      // Hold the connection for up to 30s; we poll for the rest.
      Prefer: "wait=30",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "1:1",
        num_outputs: 1,
        output_format: "png",
        output_quality: 90,
        num_inference_steps: 4,
      },
    }),
    signal: AbortSignal.timeout(PREDICTION_DEADLINE_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Replicate API error:", response.status, errorText);
    throw new ImageGenerationError("Failed to generate image", 502);
  }

  let data = (await response.json()) as Prediction;

  // `Prefer: wait` returns the prediction in whatever state it's in once the
  // wait expires. On cold starts / queueing it comes back as "starting" with
  // no output, so poll until it actually finishes.
  const pollUrl = data.urls?.get;
  while (pollUrl && !isTerminal(data.status)) {
    if (Date.now() > deadline) {
      console.error("Replicate prediction timed out:", data.status);
      // Cancel so an abandoned prediction doesn't keep running (and billing).
      if (data.urls?.cancel) {
        await fetch(data.urls.cancel, { method: "POST", headers: auth }).catch(
          () => undefined,
        );
      }
      throw new ImageGenerationError(
        "Image generation timed out, please try again",
        504,
      );
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const poll = await fetch(pollUrl, { headers: auth });
    if (!poll.ok) break;
    data = (await poll.json()) as Prediction;
  }

  if (data.status === "failed" || data.status === "canceled") {
    console.error("Replicate prediction failed:", data.error ?? data.status);
    throw new ImageGenerationError(
      "Image generation failed, please try again",
      502,
    );
  }

  const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!outputUrl) {
    console.error("Replicate returned no output:", data);
    throw new ImageGenerationError("Invalid image response", 502);
  }

  const imgRes = await fetch(outputUrl, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!imgRes.ok) {
    throw new ImageGenerationError("Failed to fetch generated image", 502);
  }
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  return `data:image/png;base64,${imgBuf.toString("base64")}`;
}
