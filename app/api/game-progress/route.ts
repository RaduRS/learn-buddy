import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// POST /api/game-progress - Record a finished round
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, gameId, score, level } = body

    if (typeof userId !== 'string' || !userId || typeof gameId !== 'string' || !gameId) {
      return NextResponse.json(
        { error: 'User ID and Game ID are required' },
        { status: 400 }
      )
    }

    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
      return NextResponse.json(
        { error: 'Score must be a non-negative number' },
        { status: 400 }
      )
    }

    const progress = await DatabaseService.recordGamePlay(
      userId,
      gameId,
      Math.round(score),
      typeof level === 'number' && level >= 1 ? Math.round(level) : undefined,
    )

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error saving game progress:', error)
    return NextResponse.json(
      { error: 'Failed to save game progress' },
      { status: 500 }
    )
  }
}

// GET /api/game-progress?userId=xxx - Get all of a user's progress
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const userProgress = await DatabaseService.getUserAllGameProgress(userId)
    return NextResponse.json(userProgress)
  } catch (error) {
    console.error('Error fetching game progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game progress' },
      { status: 500 }
    )
  }
}
