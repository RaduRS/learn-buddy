'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCcw, Trophy, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MemoryCard {
  id: string
  emoji: string
  pairId: string
  isFlipped: boolean
  isMatched: boolean
}

interface MemoryMatchConfig {
  cards: MemoryCard[]
  gridRows: number
  gridCols: number
  numPairs: number
  timeLimit?: number
}

interface MemoryMatchGameProps {
  userId?: string
  gameId?: string
  userAge: number
  gridConfig?: { rows: number; cols: number; pairs: number }
  incrementScore: () => void
  onGameComplete: (score: number, totalQuestions: number) => void
}

export default function MemoryMatchGame({ userAge, userId, gameId, gridConfig, incrementScore, onGameComplete }: MemoryMatchGameProps) {
  const [config, setConfig] = useState<MemoryMatchConfig | null>(null)
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedCards, setFlippedCards] = useState<string[]>([])
  const [matchedPairs, setMatchedPairs] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading')
  const [isProcessing, setIsProcessing] = useState(false)

  const unlockAchievement = async (title: string, description: string, icon: string) => {
    if (!userId || !gameId) return
    
    try {
      await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId, title, description, icon }),
      })
    } catch (error) {
      console.error('Failed to unlock achievement:', error)
    }
  }

  const loadGame = useCallback(async () => {
    setGameStatus('loading')
    setCards([])
    setFlippedCards([])
    setMatchedPairs([])
    setMoves(0)
    setTimeLeft(null)
    setIsProcessing(false)

    try {
      const response = await fetch('/api/ai/generate-memory-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAge,
          rows: gridConfig?.rows,
          cols: gridConfig?.cols,
          pairs: gridConfig?.pairs
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load memory match game')
      }

      const gameConfig: MemoryMatchConfig = await response.json()
      setConfig(gameConfig)
      setCards(gameConfig.cards.map(card => ({ ...card, isFlipped: false, isMatched: false })))
      setTimeLeft(gameConfig.timeLimit || 60000)
      setGameStatus('playing')
    } catch (error) {
      console.error('Error loading memory match game:', error)
      setGameStatus('lost')
    }
  }, [userAge])

  // Load game on mount
  useEffect(() => {
    loadGame()
  }, [loadGame])

  // Timer effect
  useEffect(() => {
    if (gameStatus === 'playing' && timeLeft !== null && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1000) {
            setGameStatus('lost')
            return 0
          }
          return prev - 1000
        })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [timeLeft, gameStatus])

  // Check for matches when two cards are flipped
  useEffect(() => {
    if (flippedCards.length === 2 && !isProcessing) {
      setIsProcessing(true)
      setMoves(prev => prev + 1)

      const [firstId, secondId] = flippedCards
      const firstCard = cards.find(card => card.id === firstId)
      const secondCard = cards.find(card => card.id === secondId)

      setTimeout(() => {
        if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
          // Match found!
          setMatchedPairs(prev => [...prev, firstCard.pairId])
          setCards(prev => prev.map(card => 
            card.pairId === firstCard.pairId 
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          ))
          incrementScore()
        } else {
          // No match, flip cards back
          setCards(prev => prev.map(card => 
            flippedCards.includes(card.id)
              ? { ...card, isFlipped: false }
              : card
          ))
        }
        
        setFlippedCards([])
        setIsProcessing(false)
      }, 1000)
    }
  }, [flippedCards, cards, isProcessing, incrementScore])

  // Check for win condition
  useEffect(() => {
    if (config && matchedPairs.length === config.cards.length / 2 && gameStatus === 'playing') {
      setGameStatus('won')
      
      // Calculate score based on performance
      const numPairs = config.cards.length / 2
      let score = 1 // Base score for completion
      if (moves <= numPairs + 2) score += 1 // Bonus for efficiency
      if (timeLeft && timeLeft > (config.timeLimit || 60000) * 0.5) score += 1 // Bonus for speed
      
      // Call onGameComplete to properly track score
      if (typeof onGameComplete === 'function') {
        onGameComplete(score, numPairs)
      }
      
      // Unlock achievements
      unlockAchievement('Memory Master', 'Complete a Memory Match game!', '🧠')
      
      if (moves <= config.cards.length) {
        unlockAchievement('Perfect Memory', 'Complete Memory Match with minimal moves!', '⭐')
      }
      
      if (timeLeft && timeLeft > (config.timeLimit || 60000) * 0.5) {
        unlockAchievement('Speed Demon', 'Complete Memory Match quickly!', '⚡')
      }
    }
  }, [matchedPairs, config, gameStatus, moves, timeLeft, unlockAchievement])

  const handleCardClick = (cardId: string) => {
    if (isProcessing || flippedCards.length >= 2 || gameStatus !== 'playing') return

    const card = cards.find(c => c.id === cardId)
    if (!card || card.isMatched || card.isFlipped) return

    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ))
    setFlippedCards(prev => [...prev, cardId])
  }

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  const getGridCols = (cols: number) => {
    switch (cols) {
      case 2: return 'grid-cols-2'
      case 3: return 'grid-cols-3'
      case 4: return 'grid-cols-4'
      case 5: return 'grid-cols-5'
      case 6: return 'grid-cols-6'
      case 7: return 'grid-cols-7'
      case 8: return 'grid-cols-8'
      default: return 'grid-cols-4'
    }
  }

  if (gameStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-lg font-medium">Generating your memory cards...</p>
        <p className="text-sm text-muted-foreground">Creating beautiful images just for you!</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Game Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            Moves: {moves}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Pairs: {matchedPairs.length}/{config ? config.cards.length / 2 : 0}
          </Badge>
          {timeLeft !== null && (
            <Badge variant={timeLeft < 10000 ? "destructive" : "outline"} className="text-sm">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={loadGame} 
          variant="outline" 
          size="sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>

      {/* Game Grid */}
      {config && (
        <div className={cn(
          "grid gap-3 mx-auto max-w-2xl",
          getGridCols(config.gridCols)
        )}>
          {cards.map((card) => {
            const isEmpty = card.emoji === ''
            
            return (
              <Card 
                key={card.id}
                className={cn(
                  "aspect-square transition-all duration-300 relative overflow-hidden",
                  isEmpty 
                    ? "bg-gray-100 border-gray-200" 
                    : cn(
                        "cursor-pointer hover:scale-105",
                        card.isMatched && "ring-2 ring-green-500 ring-opacity-50",
                        (card.isFlipped || card.isMatched) ? "bg-white" : "bg-gradient-to-br from-blue-500 to-purple-600"
                      )
                )}
                onClick={() => !isEmpty && handleCardClick(card.id)}
              >
                <CardContent className="p-0 h-full relative">
                  {/* Card Back */}
                  {!isEmpty && (
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                      (card.isFlipped || card.isMatched) ? "opacity-0" : "opacity-100"
                    )}>
                      <div className="text-white text-2xl font-bold">?</div>
                    </div>
                  )}
                  
                  {/* Card Front */}
                  {!isEmpty && (
                    <div className={cn(
                      "absolute inset-0 transition-opacity duration-300",
                      (card.isFlipped || card.isMatched) ? "opacity-100" : "opacity-0"
                    )}>
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {card.emoji}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Game Status Messages */}
      {gameStatus === 'won' && (
        <div className="text-center space-y-4 p-6 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-center">
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-green-800">Congratulations!</h3>
          <p className="text-green-700">
            You matched all pairs in {moves} moves! 
            {timeLeft && ` With ${formatTime(timeLeft)} remaining!`}
          </p>
          <Button onClick={loadGame} className="bg-green-600 hover:bg-green-700">
            Play Again
          </Button>
        </div>
      )}

      {gameStatus === 'lost' && (
        <div className="text-center space-y-4 p-6 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-2xl font-bold text-red-800">Time&apos;s Up!</h3>
          <p className="text-red-700">
            You matched {matchedPairs.length} out of {config ? config.cards.length / 2 : 0} pairs.
          </p>
          <Button onClick={loadGame} className="bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}