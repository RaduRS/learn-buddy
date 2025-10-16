import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// GET /api/games - Get all games
export async function GET() {
  try {
    const games = await DatabaseService.getAllGames()
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}