// app/api/ai/story/image/route.ts
//
// Generates the picture for one beat. Called lazily by the client so the
// narration text and voice are never blocked on the slower image model.
// Idempotent: a beat that already has an image is returned as-is, so a retry
// (or a replay) never pays for the same picture twice.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { generateImage, ImageGenerationError } from "@/lib/ai/image";
import { composeImagePrompt } from "@/lib/games/storyBuilder";

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
    if (beat.imageB64) {
      return NextResponse.json({ beatId, imageB64: beat.imageB64 });
    }
    if (!beat.imagePrompt) {
      return NextResponse.json({ error: "Beat has no scene to draw" }, { status: 422 });
    }

    const apiKey = process.env.DEEPINFRA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Image API key not configured" },
        { status: 500 },
      );
    }

    const imageB64 = await generateImage(composeImagePrompt(beat.imagePrompt), apiKey);
    await prisma.storyBeat.update({ where: { id: beatId }, data: { imageB64 } });

    return NextResponse.json({ beatId, imageB64 });
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error in story image route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
