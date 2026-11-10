import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { LIGHT_LINKS_GAME } from '@/lib/games/lightLinksCatalog'

// GET /api/games - Get all games
export async function GET() {
  try {
    const games = await DatabaseService.getAllGames()
    if (!games.some((game) => game.id === LIGHT_LINKS_GAME.id || game.title === LIGHT_LINKS_GAME.title)) {
      try {
        await DatabaseService.ensureGame(LIGHT_LINKS_GAME)
        return NextResponse.json(await DatabaseService.getAllGames())
      } catch (error) {
        console.error('Error registering Light Links:', error)
      }
    }
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
