'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Star, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameCardProps } from '@/types'

export function GameCard({ game, progress, onPlay, className }: GameCardProps) {
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-100 text-green-800 border-green-200'
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200'
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200'
      case 5: return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDifficultyText = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Easy'
      case 2: return 'Medium'
      case 3: return 'Hard'
      case 4: return 'Expert'
      case 5: return 'Master'
      default: return 'Unknown'
    }
  }

  return (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-300 cursor-pointer',
      'hover:scale-105 active:scale-95',
      !game.isActive && 'opacity-60',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="text-4xl mb-2">{game.icon}</div>
          <div className="flex flex-col gap-1">
            <Badge 
              variant="outline" 
              className={cn('text-xs', getDifficultyColor(game.difficulty))}
            >
              {getDifficultyText(game.difficulty)}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {game.category}
            </Badge>
          </div>
        </div>
        
        <CardTitle className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
          {game.title}
        </CardTitle>
        
        <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {game.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {progress && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                Level {progress.level}
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-orange-500" />
                {progress.bestScore}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Played {progress.timesPlayed} time{progress.timesPlayed !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        <Button 
          onClick={() => onPlay(game.id)}
          disabled={!game.isActive}
          className="w-full"
          size="sm"
        >
          <Play className="w-4 h-4 mr-2" />
          {game.isActive ? 'Play Now' : 'Coming Soon!'}
        </Button>
      </CardContent>
    </Card>
  )
}