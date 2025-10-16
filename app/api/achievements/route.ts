import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET() {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [
        { userId: 'asc' },
        { gameId: 'asc' },
        { unlockedAt: 'desc' }
      ]
    })
    
    return NextResponse.json(achievements)
  } catch (error) {
    console.error('Failed to fetch achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, gameId, title, description, icon } = body

    // Check if achievement already exists
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        userId,
        gameId,
        title
      }
    })

    if (existingAchievement) {
      return NextResponse.json(existingAchievement)
    }

    // Create new achievement
    const achievement = await prisma.achievement.create({
      data: {
        userId,
        gameId,
        title,
        description,
        icon,
        unlockedAt: new Date()
      }
    })

    return NextResponse.json(achievement)
  } catch (error) {
    console.error('Failed to create achievement:', error)
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    )
  }
}