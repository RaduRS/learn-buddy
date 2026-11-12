import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { CAR_LOGO_GAME } from '@/lib/games/carLogoCatalog'
import { LIGHT_LINKS_GAME } from '@/lib/games/lightLinksCatalog'
import { LEARNING_GAMES, MAP_QUEST_GAME } from '@/lib/games/learningCatalog'

const builtInGames = [LIGHT_LINKS_GAME, CAR_LOGO_GAME, ...LEARNING_GAMES]

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
    const catalog = addedGame ? await DatabaseService.getAllGames() : games
    // Existing seeded copies may still describe the old guided trails.
    return NextResponse.json(catalog.map((game) => game.title === MAP_QUEST_GAME.title && game.description === 'Follow directions and find a path to the treasure.'
      ? { ...game, description: MAP_QUEST_GAME.description }
      : game))
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
