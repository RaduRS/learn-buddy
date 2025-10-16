'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star, Award, Calendar } from 'lucide-react'
import type { User, Game, GameProgress, Achievement } from '@/types'

interface GameAchievement {
  game: Game
  totalScore: number
  timesPlayed: number
  lastPlayed: Date
  achievements: {
    bronze: { unlocked: boolean; unlockedAt?: Date }
    silver: { unlocked: boolean; unlockedAt?: Date }
    gold: { unlocked: boolean; unlockedAt?: Date }
  }
}

export default function AchievementsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [gameAchievements, setGameAchievements] = useState<GameAchievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserAndAchievements()
  }, [])

  const loadUserAndAchievements = async () => {
    try {
      // Get current user
      const savedUserId = localStorage.getItem('selectedUserId')
      if (!savedUserId) {
        router.push('/')
        return
      }

      // Load user data
      const usersResponse = await fetch('/api/users')
      const users = await usersResponse.json()
      const user = users.find((u: User) => u.id === savedUserId)
      
      if (!user) {
        router.push('/')
        return
      }
      setCurrentUser(user)

      // Load games and progress
      const [gamesResponse, progressResponse, achievementsResponse] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/game-progress'),
        fetch('/api/achievements')
      ])

      // Check if responses are ok
      if (!gamesResponse.ok || !progressResponse.ok || !achievementsResponse.ok) {
        throw new Error('Failed to fetch data from APIs')
      }

      const games = await gamesResponse.json()
      const allProgress = await progressResponse.json()
      const allAchievements = await achievementsResponse.json()

      // Ensure data is arrays before filtering
      const gamesArray = Array.isArray(games) ? games : []
      const progressArray = Array.isArray(allProgress) ? allProgress : []
      const achievementsArray = Array.isArray(allAchievements) ? allAchievements : []

      // Filter progress for current user
      const userProgress = progressArray.filter((p: GameProgress) => p.userId === savedUserId)
      const userAchievements = achievementsArray.filter((a: Achievement) => a.userId === savedUserId)

      // Create game achievements data
      const gameAchievementsData: GameAchievement[] = gamesArray
        .filter((game: Game) => game.isActive)
        .map((game: Game) => {
          const progress = userProgress.find((p: GameProgress) => p.gameId === game.id)
          const gameSpecificAchievements = userAchievements.filter((a: Achievement) => a.gameId === game.id)
          
          const totalScore = progress?.score || 0
          
          // Check achievement levels
          const bronze = gameSpecificAchievements.find((a: Achievement) => a.title.includes('Bronze') || a.description.includes('10'))
          const silver = gameSpecificAchievements.find((a: Achievement) => a.title.includes('Silver') || a.description.includes('50'))
          const gold = gameSpecificAchievements.find((a: Achievement) => a.title.includes('Gold') || a.description.includes('100'))

          return {
            game,
            totalScore,
            timesPlayed: progress?.timesPlayed || 0,
            lastPlayed: progress?.lastPlayedAt ? new Date(progress.lastPlayedAt) : new Date(),
            achievements: {
              bronze: { 
                unlocked: !!bronze || totalScore >= 10, 
                unlockedAt: bronze?.unlockedAt ? new Date(bronze.unlockedAt) : undefined 
              },
              silver: { 
                unlocked: !!silver || totalScore >= 50, 
                unlockedAt: silver?.unlockedAt ? new Date(silver.unlockedAt) : undefined 
              },
              gold: { 
                unlocked: !!gold || totalScore >= 100, 
                unlockedAt: gold?.unlockedAt ? new Date(gold.unlockedAt) : undefined 
              }
            }
          }
        })
        .filter((ga: GameAchievement) => ga.totalScore > 0) // Only show games with progress

      setGameAchievements(gameAchievementsData)
    } catch (error) {
      console.error('Failed to load achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'home':
        router.push('/')
        break
      case 'profile':
        // Could open user dialog or navigate to profile page
        router.push('/')
        break
      case 'achievements':
        // Already on achievements page
        break
      case 'settings':
        // Navigate to settings when implemented
        router.push('/')
        break
      default:
        router.push('/')
        break
    }
  }

  const TrophyCup = ({ level, unlocked, progress }: { level: 'bronze' | 'silver' | 'gold', unlocked: boolean, progress: number }) => {
    const colors = {
      bronze: unlocked ? 'from-amber-400 to-amber-600' : 'from-gray-300 to-gray-400',
      silver: unlocked ? 'from-gray-300 to-gray-500' : 'from-gray-200 to-gray-300',
      gold: unlocked ? 'from-yellow-400 to-yellow-600' : 'from-gray-200 to-gray-300'
    }

    const fillHeight = Math.min(progress, 100)

    return (
      <div className="relative w-16 h-20 mx-auto">
        {/* Trophy Cup Base */}
        <div className="absolute bottom-0 w-full h-16 rounded-t-full border-4 border-gray-400 bg-gray-100 overflow-hidden">
          {/* Fill Animation */}
          <div 
            className={`absolute bottom-0 w-full bg-gradient-to-t ${colors[level]} transition-all duration-1000 ease-out`}
            style={{ height: `${fillHeight}%` }}
          />
        </div>
        
        {/* Trophy Handles */}
        <div className="absolute top-4 -left-2 w-4 h-8 border-4 border-gray-400 rounded-l-full bg-transparent" />
        <div className="absolute top-4 -right-2 w-4 h-8 border-4 border-gray-400 rounded-r-full bg-transparent" />
        
        {/* Trophy Base */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-gray-400 rounded" />
        
        {/* Achievement Badge */}
        {unlocked && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Star className="w-3 h-3 text-white fill-current" />
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header currentUser={currentUser} onNavigate={handleNavigate} />
        <div className="max-w-6xl mx-auto p-4">
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 animate-pulse mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Loading your achievements...</h2>
          </div>
        </div>
      </div>
    )
  }

  const totalAchievements = gameAchievements.reduce((total, ga: GameAchievement) => {
    return total + Object.values(ga.achievements).filter(a => a.unlocked).length
  }, 0)

  const totalScore = gameAchievements.reduce((total, ga: GameAchievement) => total + ga.totalScore, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header currentUser={currentUser} onNavigate={handleNavigate} />
      
      <div className="max-w-6xl mx-auto p-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-800">Achievements</h1>
            <Award className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-gray-600 text-lg">Your learning journey and accomplishments</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{totalAchievements}</div>
              <div className="text-gray-600">Achievements Unlocked</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{totalScore}</div>
              <div className="text-gray-600">Total Score</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{gameAchievements.length}</div>
              <div className="text-gray-600">Games Played</div>
            </CardContent>
          </Card>
        </div>

        {/* Game Achievements */}
        {gameAchievements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No achievements yet!</h3>
              <p className="text-gray-500 mb-6">Start playing games to unlock your first achievements.</p>
              <button 
                onClick={() => router.push('/')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Start Playing
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gameAchievements.map((gameAchievement) => (
              <Card key={gameAchievement.game.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-2xl">{gameAchievement.game.icon}</span>
                    <div>
                      <div className="text-xl">{gameAchievement.game.title}</div>
                      <div className="text-blue-100 text-sm">Total Score: {gameAchievement.totalScore}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Achievement Trophies */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Bronze Trophy */}
                    <div className="text-center">
                      <TrophyCup 
                        level="bronze" 
                        unlocked={gameAchievement.achievements.bronze.unlocked}
                        progress={Math.min((gameAchievement.totalScore / 10) * 100, 100)}
                      />
                      <div className="mt-2">
                        <Badge variant={gameAchievement.achievements.bronze.unlocked ? "default" : "secondary"}>
                          Bronze
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">10 points</div>
                        {gameAchievement.achievements.bronze.unlocked && gameAchievement.achievements.bronze.unlockedAt && (
                          <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {gameAchievement.achievements.bronze.unlockedAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Silver Trophy */}
                    <div className="text-center">
                      <TrophyCup 
                        level="silver" 
                        unlocked={gameAchievement.achievements.silver.unlocked}
                        progress={Math.min((gameAchievement.totalScore / 50) * 100, 100)}
                      />
                      <div className="mt-2">
                        <Badge variant={gameAchievement.achievements.silver.unlocked ? "default" : "secondary"}>
                          Silver
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">50 points</div>
                        {gameAchievement.achievements.silver.unlocked && gameAchievement.achievements.silver.unlockedAt && (
                          <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {gameAchievement.achievements.silver.unlockedAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gold Trophy */}
                    <div className="text-center">
                      <TrophyCup 
                        level="gold" 
                        unlocked={gameAchievement.achievements.gold.unlocked}
                        progress={Math.min((gameAchievement.totalScore / 100) * 100, 100)}
                      />
                      <div className="mt-2">
                        <Badge variant={gameAchievement.achievements.gold.unlocked ? "default" : "secondary"}>
                          Gold
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">100 points</div>
                        {gameAchievement.achievements.gold.unlocked && gameAchievement.achievements.gold.unlockedAt && (
                          <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {gameAchievement.achievements.gold.unlockedAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Info */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Times Played:</span>
                      <span className="font-medium">{gameAchievement.timesPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Played:</span>
                      <span className="font-medium">{gameAchievement.lastPlayed.toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Next Achievement Progress */}
                  {!gameAchievement.achievements.gold.unlocked && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Next Achievement: {
                          !gameAchievement.achievements.bronze.unlocked ? 'Bronze (10 points)' :
                          !gameAchievement.achievements.silver.unlocked ? 'Silver (50 points)' :
                          'Gold (100 points)'
                        }
                      </div>
                      <div className="text-xs text-gray-600">
                        {
                          !gameAchievement.achievements.bronze.unlocked 
                            ? `${10 - gameAchievement.totalScore} points to go!`
                            : !gameAchievement.achievements.silver.unlocked 
                            ? `${50 - gameAchievement.totalScore} points to go!`
                            : `${100 - gameAchievement.totalScore} points to go!`
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}