import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { CAR_LOGO_GAME } from '@/lib/games/carLogoCatalog'
import { LIGHT_LINKS_GAME } from '@/lib/games/lightLinksCatalog'

const builtInGames = [LIGHT_LINKS_GAME, CAR_LOGO_GAME]

// GET /api/games - Get all games
export async function GET() {
  try {
    const games = await DatabaseService.getAllGames()
    const missing = builtInGames.filter((entry) => !games.some((game) => game.id === entry.id || game.title === entry.title))
    let addedGame = false
    for (const entry of missing) {
      try {
        await DatabaseService.ensureGame(entry)
        addedGame = true
      } catch (error) {
        console.error(`Error registering ${entry.title}:`, error)
      }
    }
    return NextResponse.json(addedGame ? await DatabaseService.getAllGames() : games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
