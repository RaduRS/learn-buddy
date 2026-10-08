// app/api/ai/deepgram-token/route.ts
//
// Mints a short-lived Deepgram token so the browser can open a streaming
// speech-to-text WebSocket directly. The real API key never leaves the server.
import { NextResponse } from "next/server";

// Long enough for a whole story session (a story runs a few minutes); short
// enough that a leaked token is useless quickly.
const TTL_SECONDS = 600;

export async function POST() {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: TTL_SECONDS }),
    });

    if (!response.ok) {
      console.error("Deepgram token error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Failed to create speech token" },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      return NextResponse.json(
        { error: "Speech token missing" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? TTL_SECONDS,
    });
  } catch (error) {
    console.error("Error in deepgram-token route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
