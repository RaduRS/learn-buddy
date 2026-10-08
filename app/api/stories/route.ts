// app/api/stories/route.ts
//
// Lists a child's stories for the library. Covers are left out on purpose:
// a list should stay light, so the client renders a theme icon instead.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const stories = await prisma.story.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        theme: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { beats: true } },
      },
    });

    return NextResponse.json(stories);
  } catch (error) {
    console.error("Error listing stories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
