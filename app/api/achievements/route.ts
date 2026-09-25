import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService, prisma } from '@/lib/database'

// GET /api/achievements?userId=xxx - Get a user's achievements
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const achievements = await prisma.achievement.findMany({
      where: { userId },
      orderBy: [
        { gameId: 'asc' },
        { unlockedAt: 'desc' }
      ]
    })

    return NextResponse.json(achievements)
  } catch (error) {
    console.error('Failed to fetch achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

// POST /api/achievements - Unlock an achievement (idempotent)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, gameId, title, description, icon } = body

    if (
      !isNonEmptyString(userId) ||
      !isNonEmptyString(title) ||
      !isNonEmptyString(description) ||
      !isNonEmptyString(icon) ||
      (gameId != null && !isNonEmptyString(gameId))
    ) {
      return NextResponse.json(
        { error: 'userId, title, description and icon are required' },
        { status: 400 }
      )
    }

    const achievement = await DatabaseService.unlockAchievement(
      userId,
      title,
      description,
      icon,
      gameId ?? null
    )

    return NextResponse.json(achievement)
  } catch (error) {
    console.error('Failed to create achievement:', error)
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    )
  }
}
