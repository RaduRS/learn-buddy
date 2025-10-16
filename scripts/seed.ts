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
    title: 'Color Splash',
    description: 'Explore colors and create beautiful patterns!',
    icon: '🎨',
    category: 'colors',
    difficulty: 1,
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
    title: 'Puzzle Time',
    description: 'Solve fun puzzles and develop problem-solving skills!',
    icon: '🧩',
    category: 'puzzles',
    difficulty: 3,
    isActive: false,
  },
  {
    title: 'Music Maker',
    description: 'Create music and learn about sounds and rhythms!',
    icon: '🎵',
    category: 'music',
    difficulty: 2,
    isActive: false,
  },
  {
    title: 'Animal Friends',
    description: 'Learn about animals and their sounds!',
    icon: '🐾',
    category: 'animals',
    difficulty: 1,
    isActive: false,
  },
]

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...')

    // Check if games already exist
    const existingGames = await DatabaseService.getAllGames()
    if (existingGames.length > 0) {
      console.log('📚 Games already exist in database. Skipping seed.')
      return
    }

    // Create initial games
    console.log('🎮 Creating initial games...')
    for (const gameData of initialGames) {
      const game = await DatabaseService.createGame(gameData)
      console.log(`✅ Created game: ${game.title}`)
    }

    // Set up initial app settings
    console.log('⚙️ Setting up app settings...')
    await DatabaseService.setSetting('app_version', '1.0.0')
    await DatabaseService.setSetting('welcome_message', 'Welcome to Learn Buddy!')
    await DatabaseService.setSetting('max_users', '10')

    console.log('🎉 Database seed completed successfully!')
    console.log(`📊 Created ${initialGames.length} games`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✨ Seed script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed script failed:', error)
      process.exit(1)
    })
}

export { seedDatabase }