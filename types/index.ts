declare module "next-pwa";

// Database types (extending Prisma types)
export type User = {
  id: string
  name: string
  avatar?: string | null
  age?: number | null
  parentEmail?: string | null
  createdAt: Date
  updatedAt: Date
  gameProgress?: GameProgress[]
  achievements?: Achievement[]
}

export type Game = {
  id: string
  title: string
  description: string
  icon: string
  category: string
  difficulty: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  gameProgress?: GameProgress[]
  achievements?: Achievement[]
}

export type GameProgress = {
  id: string
  userId: string
  gameId: string
  level: number
  score: number
  bestScore: number
  totalScore: number
  timesPlayed: number
  lastPlayedAt: Date
  createdAt: Date
  updatedAt: Date
  user?: User
  game?: Game
}

export type Achievement = {
  id: string
  userId: string
  gameId?: string | null
  title: string
  description: string
  icon: string
  unlockedAt: Date
  user?: User
  game?: Game | null
}

// UI Component types
export type GameCardProps = {
  game: Game
  progress?: GameProgress
  onPlay: (gameId: string) => void
  className?: string
}

export type UserCardProps = {
  user: User
  onSelect: (userId: string) => void
  isSelected?: boolean
  className?: string
}

export type AchievementBadgeProps = {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Form types
export type CreateUserForm = {
  name: string
  avatar?: string
  age?: number
  parentEmail?: string
}

export type GameResultForm = {
  score: number
  level: number
  timeSpent: number
}

// App state types
export type AppState = {
  currentUser: User | null
  selectedGame: Game | null
  isLoading: boolean
  error: string | null
}

// Game categories
export const GAME_CATEGORIES = {
  MEMORY: 'memory',
  NUMBERS: 'numbers',
  COLORS: 'colors',
  SHAPES: 'shapes',
  LETTERS: 'letters',
  PUZZLES: 'puzzles',
} as const

export type GameCategory = typeof GAME_CATEGORIES[keyof typeof GAME_CATEGORIES]

// Difficulty levels
export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
  EXPERT: 4,
  MASTER: 5,
} as const

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS]

// Achievement types
export const ACHIEVEMENT_TYPES = {
  FIRST_GAME: 'first_game',
  SCORE_MILESTONE: 'score_milestone',
  LEVEL_COMPLETE: 'level_complete',
  STREAK: 'streak',
  CATEGORY_MASTER: 'category_master',
} as const

export type AchievementType = typeof ACHIEVEMENT_TYPES[keyof typeof ACHIEVEMENT_TYPES]
