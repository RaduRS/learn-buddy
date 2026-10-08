// app/api/ai/story/start/route.ts
//
// Opens a story: writes the first beat, voices it with Flux TTS, saves the story
// and its first page, and hands the client everything it needs to begin.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { chat, LlmError } from "@/lib/ai/llm";
import { synthesizeSpeech } from "@/lib/ai/speech";
import {
  buildFirstBeatPrompt,
  parseBeat,
  themeMeta,
  type ParsedBeat,
} from "@/lib/games/storyBuilder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const theme = typeof body.theme === "string" ? body.theme.trim().toLowerCase() : "";
    const gameId = typeof body.gameId === "string" ? body.gameId : null;
    const age = typeof body.age === "number" && body.age >= 3 && body.age <= 12 ? body.age : 6;

    if (!userId || !theme) {
      return NextResponse.json(
        { error: "userId and theme are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Unknown user" }, { status: 404 });
    }

    // One retry with a fresh sample if the model returns a dud.
    let beat: ParsedBeat | null = null;
    for (let attempt = 0; attempt < 2 && !beat; attempt++) {
      const content = await chat(buildFirstBeatPrompt(theme, age), {
        temperature: 1.05,
      });
      beat = parseBeat(content);
    }
    if (!beat) {
      return NextResponse.json({ error: "Failed to write a story" }, { status: 502 });
    }

    const speech = await synthesizeSpeech(beat.text, process.env.DEEPGRAM_API_KEY);

    const story = await prisma.story.create({
      data: {
        userId,
        gameId,
        theme,
        title: beat.title || `${themeMeta(theme).label} Story`,
        status: "in_progress",
        beats: {
          create: {
            index: 0,
            speaker: "ai",
            text: beat.text,
            imagePrompt: beat.imagePrompt,
            audioB64: speech?.dataUrl ?? null,
            audioMime: speech?.mime ?? null,
          },
        },
      },
      include: { beats: { orderBy: { index: "asc" } } },
    });

    const first = story.beats[0];
    return NextResponse.json({
      storyId: story.id,
      title: story.title,
      theme: story.theme,
      beat: {
        id: first.id,
        index: first.index,
        speaker: first.speaker,
        text: first.text,
        imagePrompt: first.imagePrompt,
        audioB64: first.audioB64,
        audioMime: first.audioMime,
      },
    });
  } catch (error) {
    if (error instanceof LlmError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error in story start route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
