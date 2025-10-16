import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database utility functions
export class DatabaseService {
  // User management
  static async createUser(data: {
    name: string
    avatar?: string
    age?: number
    parentEmail?: string
  }) {
    return await prisma.user.create({
      data,
      include: {
        gameProgress: true,
        achievements: true,
      },
    })
  }

  static async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        gameProgress: {
          include: {
            game: true,
          },
        },
        achievements: {
          include: {
            game: true,
          },
        },
      },
    })
  }

  static async getAllUsers() {
    return await prisma.user.findMany({
      include: {
        gameProgress: true,
        achievements: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  // Game management
  static async createGame(data: {
    title: string
    description: string
    icon: string
    category: string
    difficulty?: number
    isActive?: boolean
  }) {
    return await prisma.game.create({
      data,
    })
  }

  static async getActiveGames() {
    return await prisma.game.findMany({
      where: { isActive: true },
      orderBy: {
        difficulty: 'asc',
      },
    })
  }

  static async getAllGames() {
    return await prisma.game.findMany({
      orderBy: {
        category: 'asc',
      },
    })
  }

  static async updateGame(id: string, data: {
    title?: string
    description?: string
    icon?: string
    category?: string
    difficulty?: number
    isActive?: boolean
  }) {
    return await prisma.game.update({
      where: { id },
      data,
    })
  }

  // Game progress tracking
  static async updateGameProgress(
    userId: string,
    gameId: string,
    data: {
      level?: number
      score?: number
      bestScore?: number
    }
  ) {
    const existingProgress = await prisma.gameProgress.findUnique({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
    })

    if (existingProgress) {
      return await prisma.gameProgress.update({
        where: {
          userId_gameId: {
            userId,
            gameId,
          },
        },
        data: {
          ...data,
          bestScore: data.bestScore
            ? Math.max(data.bestScore, existingProgress.bestScore)
            : existingProgress.bestScore,
          timesPlayed: existingProgress.timesPlayed + 1,
          lastPlayedAt: new Date(),
        },
      })
    } else {
      return await prisma.gameProgress.create({
        data: {
          userId,
          gameId,
          level: data.level || 1,
          score: data.score || 0,
          bestScore: data.bestScore || data.score || 0,
          timesPlayed: 1,
        },
      })
    }
  }

  static async getUserGameProgress(userId: string, gameId: string) {
    return await prisma.gameProgress.findUnique({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
      include: {
        game: true,
      },
    })
  }

  // Achievement system
  static async unlockAchievement(
    userId: string,
    title: string,
    description: string,
    icon: string,
    gameId?: string
  ) {
    // Check if achievement already exists
    const existing = await prisma.achievement.findFirst({
      where: {
        userId,
        title,
        gameId,
      },
    })

    if (existing) return existing

    return await prisma.achievement.create({
      data: {
        userId,
        gameId,
        title,
        description,
        icon,
      },
    })
  }

  static async getUserAchievements(userId: string) {
    return await prisma.achievement.findMany({
      where: { userId },
      include: {
        game: true,
      },
      orderBy: {
        unlockedAt: 'desc',
      },
    })
  }

  // App settings
  static async getSetting(key: string) {
    const setting = await prisma.appSettings.findUnique({
      where: { key },
    })
    return setting?.value
  }

  static async setSetting(key: string, value: string) {
    return await prisma.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
}