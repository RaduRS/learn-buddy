import { DatabaseService } from '../lib/database'

const initialGames = [
  {
    title: 'Memory Match',
    description: 'Match colorful cards and improve your memory skills!',
    icon: '🧠',
    category: 'memory',
    difficulty: 1,
    isActive: true,
  },
  {
    title: 'Number Fun',
    description: 'Learn counting and basic math with fun animations!',
    icon: '🔢',
    category: 'numbers',
    difficulty: 1,
    isActive: true,
  },
  {
    title: 'Subitizing',
    description: 'Quickly recognize quantities without counting - perfect for developing number sense',
    icon: '👁️',
    category: 'Math',
    difficulty: 2,
    isActive: true,
  },
  {
    title: 'Shape Builder',
    description: 'Build and learn about different shapes and patterns!',
    icon: '🔷',
    category: 'shapes',
    difficulty: 2,
    isActive: false,
  },
  {
    title: 'Letter Land',
    description: 'Discover letters and start your reading journey!',
    icon: '📝',
    category: 'letters',
    difficulty: 1,
    isActive: false,
  },
  {
    title: 'Music Maker',
    description: 'Create music and learn about sounds and rhythms!',
    icon: '🎵',
    category: 'music',
    difficulty: 2,
    isActive: true,
  },
  {
    title: 'Animal Friends',
    description: 'Learn about animals and their sounds!',
    icon: '🐾',
    category: 'animals',
    difficulty: 1,
    isActive: false,
  },
  {
    title: 'True or False',
    description: 'Look at pictures and decide if the statement is true or false!',
    icon: '✅',
    category: 'learning',
    difficulty: 1,
    isActive: true,
  },
]

async function seedDatabase() {
  try {
    // Check if games already exist
    const existingGames = await DatabaseService.getAllGames()
    if (existingGames.length > 0) {
      return
    }

    // Create initial games
    for (const gameData of initialGames) {
      await DatabaseService.createGame(gameData)
    }

    // Set up initial app settings
    await DatabaseService.setSetting('app_version', '1.0.0')
    await DatabaseService.setSetting('welcome_message', 'Welcome to Learn Buddy!')
    await DatabaseService.setSetting('max_users', '10')

  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

// Main execution
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed script failed:', error)
      process.exit(1)
    })
}

export { seedDatabase }