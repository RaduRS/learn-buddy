import { PrismaClient, Prisma } from '@prisma/client'

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
      omit: { parentEmail: true },
      include: {
        gameProgress: true,
      },
    })
  }

  // The client only needs progress totals for the profile cards; parent
  // emails never leave the server.
  static async getAllUsers() {
    return await prisma.user.findMany({
      omit: { parentEmail: true },
      include: {
        gameProgress: true,
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
  static async getUserAllGameProgress(userId: string): Promise<Prisma.GameProgressGetPayload<{ include: { game: true } }>[]> {
    return await prisma.gameProgress.findMany({
      where: { userId },
      include: {
        game: true,
      },
      orderBy: {
        lastPlayedAt: 'desc',
      },
    })
  }

  // Record one finished round. Totals are incremented in the database
  // rather than read-modify-written, so two saves landing at the same time
  // can't overwrite each other.
  static async recordGamePlay(userId: string, gameId: string, score: number, level?: number) {
    const progress = await prisma.gameProgress.upsert({
      where: {
        userId_gameId: { userId, gameId },
      },
      update: {
        score,
        ...(level !== undefined && { level }),
        totalScore: { increment: score },
        timesPlayed: { increment: 1 },
        lastPlayedAt: new Date(),
      },
      create: {
        userId,
        gameId,
        score,
        level: level ?? 1,
        bestScore: score,
        totalScore: score,
        timesPlayed: 1,
      },
    })

    if (score > progress.bestScore) {
      // Conditional update keeps bestScore a true max under concurrency.
      await prisma.gameProgress.updateMany({
        where: { userId, gameId, bestScore: { lt: score } },
        data: { bestScore: score },
      })
      return { ...progress, bestScore: score }
    }

    return progress
  }

  // Achievement system
  static async unlockAchievement(
    userId: string,
    title: string,
    description: string,
    icon: string,
    gameId?: string | null
  ) {
    // Check if achievement already exists
    const existing = await prisma.achievement.findFirst({
      where: {
        userId,
        title,
        gameId: gameId ?? null,
      },
    })

    if (existing) return existing

    return await prisma.achievement.create({
      data: {
        userId,
        gameId: gameId ?? null,
        title,
        description,
        icon,
      },
    })
  }

  // App settings
  static async setSetting(key: string, value: string) {
    return await prisma.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
}
