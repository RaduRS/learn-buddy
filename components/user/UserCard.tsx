'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check, Trophy, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserCardProps } from '@/types'

export function UserCard({ user, onSelect, isSelected = false, className }: UserCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const totalGamesPlayed = user.gameProgress?.length || 0
  const totalAchievements = user.achievements?.length || 0
  const totalScore = user.gameProgress?.reduce((sum, progress) => sum + progress.bestScore, 0) || 0

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-300 hover:shadow-lg',
        'hover:scale-105 active:scale-95 relative',
        isSelected && 'ring-2 ring-blue-500 shadow-lg',
        className
      )}
      onClick={() => onSelect(user.id)}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 z-10">
          <Check className="w-4 h-4" />
        </div>
      )}

      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <Avatar className="w-16 h-16 mx-auto mb-3 ring-2 ring-gray-200 group-hover:ring-blue-300 transition-colors">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-400 to-purple-500 text-white">
              {user.avatar || getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          
          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
            {user.name}
          </h3>
          
          {user.age && (
            <Badge variant="outline" className="mt-1 text-xs">
              Age {user.age}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{totalGamesPlayed} games</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-orange-500" />
              <span>{totalAchievements} badges</span>
            </div>
          </div>
          
          {totalScore > 0 && (
            <div className="text-xs text-gray-500">
              Total Score: {totalScore.toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}