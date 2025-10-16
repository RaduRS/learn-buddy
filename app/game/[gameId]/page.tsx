'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TrueFalseGame from '@/components/game/TrueFalseGame'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

interface Game {
  id: string
  title: string
  description: string
  icon: string
  category: string
}

interface User {
  id: string
  name: string
  avatar?: string
  age?: number
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [game, setGame] = useState<Game | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadGameData = useCallback(async () => {
    try {
      const response = await fetch('/api/games')
      const games = await response.json()
      const currentGame = games.find((g: Game) => g.id === gameId)
      setGame(currentGame || null)
    } catch (error) {
      console.error('Failed to load game:', error)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  const loadCurrentUser = useCallback(async () => {
    try {
      // Get user ID from localStorage
      const savedUserId = localStorage.getItem('selectedUserId')
      if (!savedUserId) {
        // No user selected, redirect to homepage
        router.push('/')
        return
      }

      // Fetch user data
      const response = await fetch('/api/users')
      const users = await response.json()
      const user = users.find((u: User) => u.id === savedUserId)
      
      if (!user) {
        // User not found, redirect to homepage
        router.push('/')
        return
      }

      setCurrentUser(user)
    } catch (error) {
      console.error('Failed to load user:', error)
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    loadGameData()
    loadCurrentUser()
  }, [gameId, loadGameData, loadCurrentUser])

  const handleGameComplete = async (score: number, _totalQuestions: number) => {
    if (!currentUser) return

    try {
      // Update game progress in database
      const response = await fetch('/api/game-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          gameId: gameId,
          score: score,
          level: 1, // For now, we'll use level 1
          bestScore: score
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save progress')
      }

      console.log('Game progress saved successfully!')
    } catch (error) {
      console.error('Failed to save game progress:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600">Loading game...</div>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center p-6">
            <h1 className="text-xl font-semibold mb-4">Game not found</h1>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600">Redirecting to homepage...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{game.title}</h1>
            <p className="text-gray-600">{game.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Playing as</div>
            <div className="font-semibold flex items-center gap-2">
              <span>{currentUser.avatar || '👤'}</span>
              {currentUser.name}
            </div>
          </div>
        </div>

        {/* Game Component */}
        <TrueFalseGame 
          userId={currentUser.id}
          gameId={gameId}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      </div>
    </div>
  )
}