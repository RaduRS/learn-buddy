'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GameCard } from '@/components/game/GameCard'
import { Header } from '@/components/layout/Header'
import { UserSelectionDialog } from '@/components/user/UserSelectionDialog'
import { Logo } from '@/components/ui/logo'
import { Sparkles, Users, Target } from 'lucide-react'
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

  // Load saved user from localStorage
  useEffect(() => {
    const savedUserId = localStorage.getItem('selectedUserId')
    if (savedUserId && users.length > 0) {
      const savedUser = users.find(user => user.id === savedUserId)
      if (savedUser) {
        setCurrentUser(savedUser)
      }
    }
  }, [users])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [usersResponse, gamesResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/games')
      ])
      
      const usersData = await usersResponse.json()
      const gamesData = await gamesResponse.json()
      
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
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create user')
      }
      
      const newUser = await response.json()
      setUsers(prev => [newUser, ...prev])
      setCurrentUser(newUser)
      localStorage.setItem('selectedUserId', newUser.id)
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  const handleSelectUser = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem('selectedUserId', user.id)
  }

  const handlePlayGame = async (gameId: string) => {
    if (!currentUser) {
      setShowUserDialog(true)
      return
    }

    const game = games.find(g => g.id === gameId)
    // Only allow active games
    if (game?.isActive) {
      // Navigate to the game page
      window.location.href = `/game/${gameId}`
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
          <Logo size="xl" className="mx-auto mb-4" />
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
          <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
            {currentUser 
              ? `Welcome back, ${currentUser.name}!` 
              : 'Welcome to Your Learning Adventure!'
            }
            <Sparkles className="w-8 h-8 text-yellow-500" />
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
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
              <Target className="w-7 h-7 text-red-500" />
              Choose Your Game
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
                    className={!game.isActive ? 'opacity-40 pointer-events-none' : ''}
                  />
                )
              })}</div>
          </section>
        )}


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
