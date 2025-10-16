import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// POST /api/game-progress/update-total - Update only the total score for real-time progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, gameId, pointsToAdd } = body

    if (!userId || !gameId || typeof pointsToAdd !== 'number') {
      return NextResponse.json(
        { error: 'User ID, Game ID, and pointsToAdd are required' },
        { status: 400 }
      )
    }

    // Get existing progress
    const existingProgress = await DatabaseService.getUserGameProgress(userId, gameId)
    
    if (existingProgress) {
      // Update only the total score
      const newTotalScore = existingProgress.totalScore + pointsToAdd
      
      const updatedProgress = await DatabaseService.updateGameProgress(userId, gameId, {
        totalScore: newTotalScore
      })
      
      return NextResponse.json({ totalScore: updatedProgress.totalScore })
    } else {
      // Create new progress record with initial total score
      const newProgress = await DatabaseService.updateGameProgress(userId, gameId, {
        score: 0,
        level: 1,
        bestScore: 0,
        totalScore: pointsToAdd,
        timesPlayed: 0
      })
      
      return NextResponse.json({ totalScore: newProgress.totalScore })
    }
  } catch (error) {
    console.error('Error updating total score:', error)
    return NextResponse.json(
      { error: 'Failed to update total score' },
      { status: 500 }
    )
  }
}