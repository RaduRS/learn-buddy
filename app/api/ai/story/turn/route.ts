// app/api/ai/story/turn/route.ts
//
// Advances a story by one beat. If the child spoke, their line is saved and
// the next beat agrees with it and weaves it in ("mostly yes").
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { chat, LlmError } from "@/lib/ai/llm";
import { synthesizeSpeech } from "@/lib/ai/speech";
import {
  buildNextBeatPrompt,
  parseBeat,
  STORY_TARGET_BEATS,
  type BeatHistoryLine,
  type ParsedBeat,
} from "@/lib/games/storyBuilder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storyId = typeof body.storyId === "string" ? body.storyId : "";
    const childText =
      typeof body.childText === "string" ? body.childText.trim().slice(0, 300) : "";

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        beats: { orderBy: { index: "asc" } },
        user: { select: { age: true } },
      },
    });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const age = story.user?.age ?? 6;
    const existingBeats = story.beats;

    // Already finished: hand back the last page instead of writing more.
    // Keeps a stray retry from spending money on a story that's told.
    if (story.status === "complete") {
      const lastAi = [...existingBeats].reverse().find((b) => b.speaker === "ai") ?? null;
      return NextResponse.json({
        beat: lastAi,
        done: true,
      });
    }

    const aiCount = existingBeats.filter((b) => b.speaker === "ai").length;
    const isFinal = aiCount >= STORY_TARGET_BEATS - 1;
    let nextIndex = existingBeats.length
      ? Math.max(...existingBeats.map((b) => b.index)) + 1
      : 0;

    // Persist the child's own line first so it appears in the replay too.
    if (childText) {
      await prisma.storyBeat.create({
        data: { storyId, index: nextIndex, speaker: "child", text: childText },
      });
      nextIndex += 1;
    }

    const history: BeatHistoryLine[] = existingBeats.map((b) => ({
      speaker: b.speaker === "child" ? "child" : "ai",
      text: b.text,
    }));
    if (childText) history.push({ speaker: "child", text: childText });

    // Reuse the cast chosen when the story opened, so the characters stay the
    // same from page to page.
    const seed = story.seed ? { description: story.seed } : null;

    const prompt = buildNextBeatPrompt(
      story.theme,
      age,
      history,
      childText || null,
      isFinal,
      seed,
    );

    let beat: ParsedBeat | null = null;
    for (let attempt = 0; attempt < 2 && !beat; attempt++) {
      const content = await chat(prompt, { temperature: 1.05 });
      beat = parseBeat(content);
    }
    if (!beat) {
      return NextResponse.json({ error: "Failed to continue the story" }, { status: 502 });
    }

    const speech = await synthesizeSpeech(beat.text, process.env.DEEPGRAM_API_KEY);

    const [saved] = await prisma.$transaction([
      prisma.storyBeat.create({
        data: {
          storyId,
          index: nextIndex,
          speaker: "ai",
          text: beat.text,
          imagePrompt: beat.imagePrompt,
          audioB64: speech?.dataUrl ?? null,
          audioMime: speech?.mime ?? null,
        },
      }),
      prisma.story.update({
        where: { id: storyId },
        data: isFinal ? { status: "complete" } : {},
      }),
    ]);

    return NextResponse.json({
      beat: {
        id: saved.id,
        index: saved.index,
        speaker: saved.speaker,
        text: saved.text,
        imagePrompt: saved.imagePrompt,
        audioB64: saved.audioB64,
        audioMime: saved.audioMime,
      },
      done: isFinal,
    });
  } catch (error) {
    if (error instanceof LlmError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error in story turn route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
