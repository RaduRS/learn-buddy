'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TrueFalseGame from '@/components/game/TrueFalseGame'
import SubitizingGame from '@/components/game/SubitizingGame'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/Header'
import { ArrowLeft } from 'lucide-react'
import type { User, Game } from '@/types'

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGameComplete = async (score: number, _totalQuestions: number) => {
    // Game completion handler - individual scores are already tracked per correct answer
    // No need to save total score again to prevent double-counting
    console.log(`Game completed with score: ${score}/${_totalQuestions}`)
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

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'home':
        router.push('/')
        break
      case 'profile':
        router.push('/') // For now, redirect to home since profile page doesn't exist
        break
      case 'achievements':
        router.push('/achievements')
        break
      case 'settings':
        router.push('/') // For now, redirect to home since settings page doesn't exist
        break
      default:
        router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header 
        currentUser={currentUser} 
        onNavigate={handleNavigate}
      />
      
      <div className="max-w-4xl mx-auto p-4">
        {/* Game Title Section */}
        <div className="mb-0 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-0">{game.title}</h1>
          {/* <p className="text-gray-600 text-lg">{game.description}</p> */}
        </div>

        {/* Game Component */}
        {game.title === 'Subitizing' ? (
          <SubitizingGame 
            userId={currentUser.id}
            gameId={game.id}
            userAge={currentUser.age || 6}
            onGameComplete={handleGameComplete}
          />
        ) : (
          <TrueFalseGame 
            userId={currentUser.id}
            gameId={game.id}
            userAge={currentUser.age || 6}
            onGameComplete={handleGameComplete}
          />
        )}
      </div>
    </div>
  )
}