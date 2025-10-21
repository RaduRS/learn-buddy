'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trophy, RotateCcw } from 'lucide-react'
import { useScore } from '@/hooks/useScore'

interface PuzzlePiece {
  id: string
  row: number
  col: number
}

interface PuzzleConfig {
  imageUrl: string
  gridSize: number
  pieces: PuzzlePiece[]
}

interface PuzzleGameProps {
  userId: string
  gameId: string
  userAge: number
  onGameComplete: (score: number, totalQuestions: number) => void
}

export default function PuzzleGame({ userId, gameId, userAge, onGameComplete }: PuzzleGameProps) {
  const [config, setConfig] = useState<PuzzleConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<Record<string, boolean>>({})
  const [bank, setBank] = useState<PuzzlePiece[]>([])
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const { incrementScore } = useScore()

  const gridPx = 320 // board size in pixels

  const unlockAchievement = async (title: string, description: string, icon: string) => {
    try {
      await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId, title, description, icon }),
      })
    } catch (err) {
      console.error('Error unlocking achievement:', err)
    }
  }

  const loadPuzzle = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setConfig(null)
      setPlaced({})
      setSelectedPieceId(null)
      setIsCompleted(false)

      const response = await fetch('/api/ai/generate-puzzle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAge, difficulty: 2 }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate puzzle')
      }

      const cfg: PuzzleConfig = await response.json()
      // Shuffle bank pieces
      const shuffled = [...cfg.pieces].sort(() => Math.random() - 0.5)
      setConfig(cfg)
      setBank(shuffled)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error loading puzzle'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [userAge])

  // Load puzzle only once on mount
  useEffect(() => {
    loadPuzzle()
  }, []) // Remove loadPuzzle dependency to prevent double calls

  const backgroundSize = (gridSize: number) => `${gridSize * 100}% ${gridSize * 100}%`
  const backgroundPosition = (row: number, col: number, gridSize: number) => {
    const x = (col * 100) / (gridSize - 1)
    const y = (row * 100) / (gridSize - 1)
    return `${x}% ${y}%`
  }

  const handleDragStart = (ev: React.DragEvent<HTMLDivElement>, pieceId: string) => {
    ev.dataTransfer.setData('text/plain', pieceId)
    setSelectedPieceId(pieceId)
  }

  const handleDrop = (ev: React.DragEvent<HTMLDivElement>, targetId: string) => {
    ev.preventDefault()
    const pieceId = ev.dataTransfer.getData('text/plain') || selectedPieceId
    if (!pieceId || !config) return
    if (pieceId === targetId) {
      setPlaced(prev => ({ ...prev, [targetId]: true }))
      setBank(prev => prev.filter(p => p.id !== pieceId))
      setSelectedPieceId(null)
    }
  }

  const handleDragOver = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault()
  }

  const handleTapPlace = (targetId: string) => {
    if (!selectedPieceId || !config) return
    if (selectedPieceId === targetId) {
      setPlaced(prev => ({ ...prev, [targetId]: true }))
      setBank(prev => prev.filter(p => p.id !== selectedPieceId))
      setSelectedPieceId(null)
    }
  }

  // Check completion when pieces are placed
  useEffect(() => {
    if (!config || isCompleted) return
    const total = config.pieces.length
    const placedCount = Object.values(placed).filter(Boolean).length
    if (placedCount === total) {
      setIsCompleted(true)
      setScore(s => s + 1)
      incrementScore(gameId, 1)
      unlockAchievement('First Game', 'Completed your first Puzzle!', '🧩')
      onGameComplete?.(1, 1)
    }
  }, [placed, config, isCompleted, gameId]) // Remove incrementScore from deps

  if (loading || !config) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : null}
      </div>
    )
  }

  const { imageUrl, gridSize, pieces } = config
  const cell = gridPx / gridSize

  return (
    <div className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Puzzle</span>
            <Badge variant="secondary" className="ml-2">{gridSize} x {gridSize}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Board */}
          <div className="flex flex-col md:flex-row gap-4">
            <div
              className="relative border rounded-lg shadow bg-white"
              style={{ width: gridPx, height: gridPx }}
            >
              {pieces.map(piece => {
                const targetId = `${piece.row}-${piece.col}`
                const isPlaced = placed[targetId]
                return (
                  <div
                    key={targetId}
                    onDrop={(e) => handleDrop(e, targetId)}
                    onDragOver={handleDragOver}
                    onClick={() => handleTapPlace(targetId)}
                    className="absolute border border-gray-200"
                    style={{
                      left: piece.col * cell,
                      top: piece.row * cell,
                      width: cell,
                      height: cell,
                    }}
                  >
                    {isPlaced && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: backgroundSize(gridSize),
                          backgroundPosition: backgroundPosition(piece.row, piece.col, gridSize),
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pieces bank */}
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-2">
                {bank.map(piece => (
                  <div
                    key={piece.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, piece.id)}
                    onClick={() => setSelectedPieceId(piece.id)}
                    className={`cursor-grab active:cursor-grabbing border rounded-md overflow-hidden ${selectedPieceId === piece.id ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ width: cell, height: cell }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: backgroundSize(gridSize),
                        backgroundPosition: backgroundPosition(Number(piece.id.split('-')[0]), Number(piece.id.split('-')[1]), gridSize),
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button onClick={loadPuzzle}>
                  <RotateCcw className="w-4 h-4 mr-2" /> New Puzzle
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Score: {score}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}