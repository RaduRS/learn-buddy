import { NextRequest, NextResponse } from "next/server";

const MAX_TTS_CHARS = 2000;
const TTS_MODEL = "aura-2-thalia-en";
const BASE_TTS_TAGS = ["learn-buddy", "reading-helper", "tts"];

const formatForAuraSpeech = (text: string) => {
  const withoutCodeFences = text
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "");

  return withoutCodeFences
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/^#{1,2}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const sanitizeTag = (tag: string) =>
  tag.trim().replace(/\s+/g, "-").slice(0, 128);

export async function POST(request: NextRequest) {
  try {
    const { text, ocrProvider } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const cleanedText = text.trim();
    if (!cleanedText) {
      return NextResponse.json(
        { error: "Text cannot be empty" },
        { status: 400 },
      );
    }

    const formattedForSpeech = formatForAuraSpeech(cleanedText);

    const textForSpeech =
      formattedForSpeech.length > MAX_TTS_CHARS
        ? formattedForSpeech.slice(0, MAX_TTS_CHARS)
        : formattedForSpeech;

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 },
      );
    }

    const providerTag =
      typeof ocrProvider === "string" && ocrProvider.trim()
        ? sanitizeTag(`ocr-${ocrProvider}`)
        : null;
    const tags = [...BASE_TTS_TAGS];
    if (providerTag) {
      tags.push(providerTag);
    }
    const ttsUrl = new URL("https://api.deepgram.com/v1/speak");
    ttsUrl.searchParams.set("model", TTS_MODEL);
    for (const tag of tags) {
      ttsUrl.searchParams.append("tag", tag);
    }

    const deepgramResponse = await fetch(ttsUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: textForSpeech,
      }),
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error("Deepgram TTS error:", deepgramResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        {
          status:
            deepgramResponse.status >= 500 ? 502 : deepgramResponse.status,
        },
      );
    }

    const audioBuffer = await deepgramResponse.arrayBuffer();
    const contentType =
      deepgramResponse.headers.get("content-type") || "audio/mpeg";

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Text-Truncated": String(formattedForSpeech.length > MAX_TTS_CHARS),
        "X-TTS-Tag-Count": String(tags.length),
      },
    });
  } catch (error) {
    console.error("Error in reading audio API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
