// Shared text-to-speech for the AI routes (Deepgram Aura).
//
// The reading-helper route keeps its own inline copy for now; this module is
// the version the story builder uses, since it needs the audio back as a
// base64 data URL it can persist alongside the beat.

const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";

// Aura-2 voices carry the language in the model name. Thalia is a warm,
// clear narrator that works well for bedtime-story pacing.
const TTS_MODEL = "aura-2-thalia-en";
const TTS_TAGS = ["learn-buddy", "build-a-story", "tts"];
const TTS_TIMEOUT_MS = 30_000;

/** Strip markdown so Aura doesn't read punctuation literally. */
export function formatForAuraSpeech(text: string): string {
  return text
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,2}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export class SpeechError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SpeechError";
  }
}

/**
 * Synthesize speech and return it as a base64 `data:` URL plus its mime type.
 * Returns null when the API key is missing so callers can degrade to a
 * silent (text-only) story rather than failing the whole turn.
 */
export async function synthesizeSpeech(
  text: string,
  apiKey: string | undefined,
): Promise<{ dataUrl: string; mime: string } | null> {
  if (!apiKey) return null;

  const spoken = formatForAuraSpeech(text);
  if (!spoken) return null;

  const url = new URL(DEEPGRAM_SPEAK_URL);
  url.searchParams.set("model", TTS_MODEL);
  for (const tag of TTS_TAGS) url.searchParams.append("tag", tag);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: spoken }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Aura TTS request failed:", error);
    return null;
  }

  if (!response.ok) {
    console.error("Aura TTS error:", response.status, await response.text());
    return null;
  }

  const mime = response.headers.get("content-type") || "audio/mpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  return { dataUrl: `data:${mime};base64,${bytes.toString("base64")}`, mime };
}
