// app/api/ai/story/voice/route.ts
//
// Voices one beat with Flux TTS. Kept separate from the story turn so the
// picture can be generated in parallel: the client fires this and the image
// route together, and both run at once instead of one behind the other.
// Idempotent, so a retry (or a replay) never pays for the same line twice.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { synthesizeSpeech } from "@/lib/ai/speech";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const beatId = typeof body.beatId === "string" ? body.beatId : "";
    if (!beatId) {
      return NextResponse.json({ error: "beatId is required" }, { status: 400 });
    }

    const beat = await prisma.storyBeat.findUnique({ where: { id: beatId } });
    if (!beat) {
      return NextResponse.json({ error: "Beat not found" }, { status: 404 });
    }
    if (beat.audioB64) {
      return NextResponse.json({
        beatId,
        audioB64: beat.audioB64,
        audioMime: beat.audioMime,
      });
    }

    const speech = await synthesizeSpeech(beat.text, process.env.DEEPGRAM_API_KEY);
    // No key or a TTS hiccup: report it as voice-less rather than failing the
    // turn, so the story still reads (and can be re-read) as text.
    if (!speech) {
      return NextResponse.json({ beatId, audioB64: null, audioMime: null });
    }

    await prisma.storyBeat.update({
      where: { id: beatId },
      data: { audioB64: speech.dataUrl, audioMime: speech.mime },
    });

    return NextResponse.json({
      beatId,
      audioB64: speech.dataUrl,
      audioMime: speech.mime,
    });
  } catch (error) {
    console.error("Error in story voice route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
