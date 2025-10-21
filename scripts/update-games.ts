import { DatabaseService } from '../lib/database'

async function updateGames() {
  try {
    console.log('Updating games database...')
    
    // Get all existing games
    const existingGames = await DatabaseService.getAllGames()
    console.log(`Found ${existingGames.length} existing games`)
    
    // Check if Color Splash exists and remove it
    const colorSplashGame = existingGames.find(game => game.title === 'Color Splash')
    if (colorSplashGame) {
      console.log('Found Color Splash game, removing it...')
      // Note: We'll need to implement deleteGame in DatabaseService if it doesn't exist
      // For now, let's update it to be the Subitizing game
      await DatabaseService.updateGame(colorSplashGame.id, {
        title: 'Subitizing',
        description: 'Quickly recognize quantities without counting - perfect for developing number sense',
        icon: '👁️',
        category: 'Math',
        difficulty: 2,
        isActive: true
      })
      console.log('Updated Color Splash to Subitizing game')
    } else {
      // Check if Subitizing already exists
      const subitizingGame = existingGames.find(game => game.title === 'Subitizing')
      if (!subitizingGame) {
        // Add new Subitizing game
        await DatabaseService.createGame({
          title: 'Subitizing',
          description: 'Quickly recognize quantities without counting - perfect for developing number sense',
          icon: '👁️',
          category: 'Math',
          difficulty: 2,
          isActive: true
        })
        console.log('Added new Subitizing game')
      } else {
        console.log('Subitizing game already exists')
      }
    }

    // Ensure Puzzle game exists
    const puzzleGame = existingGames.find(game => game.title === 'Puzzle')
    if (!puzzleGame) {
      await DatabaseService.createGame({
        title: 'Puzzle',
        description: 'Drag-and-drop jigsaw puzzles generated from kid-friendly images',
        icon: '🧩',
        category: 'Logic',
        difficulty: 2,
        isActive: true
      })
      console.log('Added new Puzzle game')
    } else {
      console.log('Puzzle game already exists')
    }
    
    console.log('Games update completed successfully!')
    
  } catch (error) {
    console.error('Error updating games:', error)
    process.exit(1)
  }
}

// Main execution
if (require.main === module) {
  updateGames()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Update script failed:', error)
      process.exit(1)
    })
}

export { updateGames }