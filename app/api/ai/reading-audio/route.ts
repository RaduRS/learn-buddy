import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 },
      );
    }

    const cleanedText = text.trim();
    if (!cleanedText) {
      return NextResponse.json(
        { error: "Text cannot be empty" },
        { status: 400 },
      );
    }

    if (cleanedText.length > 2000) {
      return NextResponse.json(
        { error: "Text exceeds 2000 characters" },
        { status: 400 },
      );
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 },
      );
    }

    const deepgramResponse = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanedText,
        }),
      },
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error("Deepgram TTS error:", deepgramResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: deepgramResponse.status >= 500 ? 502 : deepgramResponse.status },
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
