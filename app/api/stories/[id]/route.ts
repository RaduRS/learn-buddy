// app/api/stories/[id]/route.ts
//
// Full story with its pages for the replay player, plus deletion. Serving a
// story reads straight from the database, so reading it again never calls any
// AI service.
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

// Permanently removes a story and every page in it. The StoryBeat rows go with
// it through the relation's onDelete: Cascade, so nothing is left behind.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const story = await prisma.story.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    // Only the story's owner may delete it.
    if (story.userId !== userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.story.delete({ where: { id } });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
