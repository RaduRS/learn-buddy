// app/api/stories/[id]/route.ts
//
// Full story with its pages for the replay player. Served straight from the
// database, so reading a story again never calls any AI service.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const story = await prisma.story.findUnique({
      where: { id },
      include: { beats: { orderBy: { index: "asc" } } },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("Error loading story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
