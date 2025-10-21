'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Grid3X3, Grid2X2, LayoutGrid, Zap, Clock, Trophy } from 'lucide-react'

interface GridOption {
  id: string
  name: string
  rows: number
  cols: number
  totalCards: number
  pairs: number
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  estimatedTime: string
  icon: React.ReactNode
}

interface MemoryMatchConfigProps {
  onConfigSelect: (config: { rows: number; cols: number; pairs: number }) => void
  onCancel?: () => void
}

const gridOptions: GridOption[] = [
  {
    id: '3x3',
    name: '3×3 Grid',
    rows: 3,
    cols: 3,
    totalCards: 8, // 4 pairs + 1 empty spot
    pairs: 4,
    difficulty: 'Easy',
    estimatedTime: '1-2 min',
    icon: <Grid3X3 className="w-6 h-6" />
  },
  {
    id: '4x3',
    name: '4×3 Grid',
    rows: 4,
    cols: 3,
    totalCards: 12,
    pairs: 6,
    difficulty: 'Easy',
    estimatedTime: '2-3 min',
    icon: <Grid2X2 className="w-6 h-6" />
  },
  {
    id: '4x4',
    name: '4×4 Grid',
    rows: 4,
    cols: 4,
    totalCards: 16,
    pairs: 8,
    difficulty: 'Medium',
    estimatedTime: '3-4 min',
    icon: <LayoutGrid className="w-6 h-6" />
  },
  {
    id: '5x4',
    name: '5×4 Grid',
    rows: 5,
    cols: 4,
    totalCards: 20,
    pairs: 10,
    difficulty: 'Medium',
    estimatedTime: '4-5 min',
    icon: <LayoutGrid className="w-6 h-6" />
  },
  {
    id: '6x4',
    name: '6×4 Grid',
    rows: 6,
    cols: 4,
    totalCards: 24,
    pairs: 12,
    difficulty: 'Hard',
    estimatedTime: '5-7 min',
    icon: <LayoutGrid className="w-6 h-6" />
  },
  {
    id: '6x6',
    name: '6×6 Grid',
    rows: 6,
    cols: 6,
    totalCards: 36,
    pairs: 18,
    difficulty: 'Expert',
    estimatedTime: '8-12 min',
    icon: <LayoutGrid className="w-6 h-6" />
  }
]

const difficultyColors = {
  Easy: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Hard: 'bg-orange-100 text-orange-800 border-orange-200',
  Expert: 'bg-red-100 text-red-800 border-red-200'
}

export default function MemoryMatchConfig({ onConfigSelect, onCancel }: MemoryMatchConfigProps) {
  const [selectedOption, setSelectedOption] = useState<GridOption | null>(null)

  const handleStartGame = () => {
    if (selectedOption) {
      onConfigSelect({
        rows: selectedOption.rows,
        cols: selectedOption.cols,
        pairs: selectedOption.pairs
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Memory Match</h1>
        <p className="text-gray-600">Choose your challenge level and start matching!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {gridOptions.map((option) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedOption?.id === option.id
                ? 'ring-2 ring-blue-500 shadow-lg'
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedOption(option)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <CardTitle className="text-lg">{option.name}</CardTitle>
                </div>
                <Badge className={difficultyColors[option.difficulty]}>
                  {option.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Trophy className="w-4 h-4" />
                  <span>{option.pairs} pairs ({option.totalCards} cards)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{option.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4" />
                  <span>Grid: {option.rows} × {option.cols}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="px-8">
            Cancel
          </Button>
        )}
        <Button
          onClick={handleStartGame}
          disabled={!selectedOption}
          className="px-8"
        >
          Start Game
        </Button>
      </div>

      {selectedOption && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Selected Configuration:</h3>
          <p className="text-blue-800">
            <strong>{selectedOption.name}</strong> - {selectedOption.difficulty} difficulty with {selectedOption.pairs} pairs
          </p>
          <p className="text-blue-700 text-sm mt-1">
            Estimated completion time: {selectedOption.estimatedTime}
          </p>
        </div>
      )}
    </div>
  )
}