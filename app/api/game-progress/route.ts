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

    // Check if progress already exists
    const existingProgress = await DatabaseService.getUserGameProgress(userId, gameId)
    
    if (existingProgress) {
      // Update existing progress
      const newBestScore = Math.max(existingProgress.bestScore, score)
      const newTotalScore = existingProgress.totalScore + score
      const newTimesPlayed = existingProgress.timesPlayed + 1
      
      const updatedProgress = await DatabaseService.updateGameProgress(userId, gameId, {
        score,
        level: level || existingProgress.level,
        bestScore: newBestScore,
        totalScore: newTotalScore,
        timesPlayed: newTimesPlayed
      })
      
      return NextResponse.json(updatedProgress)
    } else {
      // Create new progress record
      const newProgress = await DatabaseService.updateGameProgress(userId, gameId, {
        score,
        level: level || 1,
        bestScore: score,
        totalScore: score,
        timesPlayed: 1
      })
      
      return NextResponse.json(newProgress, { status: 201 })
    }
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
      const { prisma } = await import('@/lib/database')
      const allProgress = await prisma.gameProgress.findMany({
        include: {
          game: true,
          user: true,
        },
        orderBy: {
          lastPlayedAt: 'desc',
        },
      })
      return NextResponse.json(allProgress)
    }

    // If only partial parameters, return error
    if (!userId || !gameId) {
      return NextResponse.json(
        { error: 'User ID and Game ID are required for specific progress lookup' },
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