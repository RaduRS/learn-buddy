import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// POST /api/game-progress - Save or update game progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, gameId, score, level } = body

    if (!userId || !gameId) {
      return NextResponse.json(
        { error: 'User ID and Game ID are required' },
        { status: 400 }
      )
    }

    // Use Prisma upsert to avoid read-then-write race condition
    // First get existing to compute derived fields
    const existing = await DatabaseService.getUserGameProgress(userId, gameId)
    
    const newBestScore = Math.max(existing?.bestScore ?? 0, score ?? 0)
    const newTotalScore = (existing?.totalScore ?? 0) + (score ?? 0)
    const newTimesPlayed = (existing?.timesPlayed ?? 0) + 1

    const upsertedProgress = await DatabaseService.upsertGameProgress(userId, gameId, {
      score: score ?? 0,
      level: level || existing?.level || 1,
      bestScore: newBestScore,
      totalScore: newTotalScore,
      timesPlayed: newTimesPlayed,
    })
    
    return NextResponse.json(upsertedProgress)
  } catch (error) {
    console.error('Error saving game progress:', error)
    return NextResponse.json(
      { error: 'Failed to save game progress' },
      { status: 500 }
    )
  }
}

// GET /api/game-progress?userId=xxx&gameId=xxx - Get specific user's progress for a game
// GET /api/game-progress - Get all game progress (for achievements page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const gameId = searchParams.get('gameId')

    // If no parameters provided, return all progress (for achievements page)
    if (!userId && !gameId) {
      const allProgress = await DatabaseService.getAllGameProgress()
      return NextResponse.json(allProgress)
    }

    // If only userId provided, return all progress for that user (efficient DB query)
    if (userId && !gameId) {
      const userProgress = await DatabaseService.getUserAllGameProgress(userId)
      return NextResponse.json(userProgress)
    }

    // If only gameId provided, return error
    if (!userId && gameId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // At this point, both userId and gameId must be non-null strings
    if (!userId || !gameId) {
      return NextResponse.json(
        { error: 'Both User ID and Game ID are required' },
        { status: 400 }
      )
    }

    const progress = await DatabaseService.getUserGameProgress(userId, gameId)
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Progress not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error fetching game progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game progress' },
      { status: 500 }
    )
  }
}