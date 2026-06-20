// app/api/ai/reading-stt/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 },
      );
    }

    const contentType = request.headers.get("content-type") || "audio/webm";
    const audio = await request.arrayBuffer();
    if (!audio || audio.byteLength === 0) {
      return NextResponse.json({ error: "No audio received" }, { status: 400 });
    }

    const sttUrl = new URL("https://api.deepgram.com/v1/listen");
    sttUrl.searchParams.set("model", "nova-2");
    sttUrl.searchParams.set("smart_format", "true");
    sttUrl.searchParams.set("punctuate", "true");

    const dgResponse = await fetch(sttUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": contentType,
      },
      body: audio,
    });

    if (!dgResponse.ok) {
      const errText = await dgResponse.text();
      console.error("Deepgram STT error:", dgResponse.status, errText);
      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: dgResponse.status >= 500 ? 502 : dgResponse.status },
      );
    }

    const data = await dgResponse.json();
    const transcript: string =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript: transcript.trim() });
  } catch (error) {
    console.error("Error in reading STT API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
