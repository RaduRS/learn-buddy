'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GameCard } from '@/components/game/GameCard'
import { Header } from '@/components/layout/Header'
import { UserSelectionDialog } from '@/components/user/UserSelectionDialog'
import { Sparkles, Tablet, Shield, Users } from 'lucide-react'
import { DatabaseService } from '@/lib/database'
import type { User, Game, CreateUserForm } from '@/types'

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [usersData, gamesData] = await Promise.all([
        DatabaseService.getAllUsers(),
        DatabaseService.getAllGames()
      ])
      
      setUsers(usersData)
      setGames(gamesData)
      
      // If no users exist, show user creation dialog
      if (usersData.length === 0) {
        setShowUserDialog(true)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (userData: CreateUserForm) => {
    try {
      const newUser = await DatabaseService.createUser(userData)
      setUsers(prev => [newUser, ...prev])
      setCurrentUser(newUser)
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  const handleSelectUser = (user: User) => {
    setCurrentUser(user)
  }

  const handlePlayGame = async (gameId: string) => {
    if (!currentUser) {
      setShowUserDialog(true)
      return
    }

    // For now, just show an alert since games aren't implemented yet
    const game = games.find(g => g.id === gameId)
    if (game?.isActive) {
      alert(`Starting ${game.title}! Game implementation coming soon.`)
    } else {
      alert('This game is coming soon!')
    }
  }

  const handleNavigation = (page: string) => {
    switch (page) {
      case 'profile':
        setShowUserDialog(true)
        break
      case 'achievements':
        alert('Achievements page coming soon!')
        break
      case 'settings':
        alert('Settings page coming soon!')
        break
      default:
        // Home - do nothing
        break
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-xl font-semibold text-gray-600">Loading Learn Buddy...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header 
        currentUser={currentUser}
        onNavigate={handleNavigation}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {currentUser 
              ? `Welcome back, ${currentUser.name}! 🌟` 
              : 'Welcome to Your Learning Adventure! 🌟'
            }
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {currentUser
              ? 'Ready to continue your learning journey? Choose a game below!'
              : 'Choose a profile and start learning with fun games designed just for kids!'
            }
          </p>
          
          {!currentUser && (
            <Button 
              onClick={() => setShowUserDialog(true)}
              size="lg"
              className="mt-6"
            >
              <Users className="w-5 h-5 mr-2" />
              Choose Your Profile
            </Button>
          )}
        </section>

        {/* Games Grid */}
        {games.length > 0 && (
          <section className="mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              🎯 Choose Your Game
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => {
                const progress = currentUser?.gameProgress?.find(p => p.gameId === game.id)
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    progress={progress}
                    onPlay={handlePlayGame}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Fun Games</h3>
            <p className="text-gray-600">
              Engaging and educational games designed specifically for kids
            </p>
          </Card>
          
          <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <Tablet className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tablet Friendly</h3>
            <p className="text-gray-600">
              Optimized for touch screens and mobile devices
            </p>
          </Card>
          
          <Card className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Safe Learning</h3>
            <p className="text-gray-600">
              A secure environment for children to learn and play
            </p>
          </Card>
        </section>
      </main>

      {/* User Selection Dialog */}
      <UserSelectionDialog
        isOpen={showUserDialog}
        onClose={() => setShowUserDialog(false)}
        users={users}
        onSelectUser={handleSelectUser}
        onCreateUser={handleCreateUser}
      />
    </div>
  )
}
