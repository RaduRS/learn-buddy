'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, RotateCcw, Trophy, Loader2, Eye } from 'lucide-react'
import { useScore } from '@/hooks/useScore'

interface SubitizingGameProps {
  userId: string
  gameId: string
  userAge: number
  onGameComplete: (score: number, totalQuestions: number) => void
}

interface SubitizingQuestion {
  id: number
  objects: Array<{ x: number; y: number; color: string; shape: string }>
  correctAnswer: number
  difficulty: number
  timeLimit: number
  educationalTip?: string
  encouragement?: string
}

const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart']
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

export default function SubitizingGame({ userId, gameId, userAge, onGameComplete }: SubitizingGameProps) {
  const [currentQuestion, setCurrentQuestion] = useState<SubitizingQuestion | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<'playing' | 'answered' | 'complete'>('playing')
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showObjects, setShowObjects] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)
  const { incrementScore } = useScore()
  const generatingRef = useRef(false)

  // Achievement unlocking function
  const unlockAchievement = async (title: string, description: string, icon: string) => {
    try {
      await fetch('/api/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameId,
          title,
          description,
          icon,
        }),
      })
    } catch (error) {
      console.error('Error unlocking achievement:', error)
    }
  }

  const totalQuestions = 10

  // Generate a random subitizing question using AI
  const generateQuestion = useCallback(async () => {
    if (generatingRef.current) return // Prevent duplicate calls
    generatingRef.current = true
    setIsLoading(true)
    
    try {
      // Call the AI API to generate an enhanced subitizing pattern
      const response = await fetch('/api/ai/generate-subitizing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAge,
          difficulty: Math.ceil(questionNumber / 3),
          questionNumber,
          previousCorrect: isCorrect
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI pattern')
      }

      const aiPattern = await response.json()

      const question: SubitizingQuestion = {
        id: questionNumber,
        objects: aiPattern.objects,
        correctAnswer: aiPattern.correctAnswer,
        difficulty: aiPattern.difficulty,
        timeLimit: aiPattern.timeLimit,
        educationalTip: aiPattern.educationalTip,
        encouragement: aiPattern.encouragement
      }

      setCurrentQuestion(question)
      setTimeLeft(aiPattern.timeLimit)
      setShowObjects(true)
      setIsLoading(false)

      // Hide objects after time limit for subitizing practice
      setTimeout(() => {
        setShowObjects(false)
      }, aiPattern.timeLimit)

    } catch (error) {
      console.error('Error generating AI pattern, using fallback:', error)
      
      // Fallback to original logic if AI fails
      let maxObjects = 3
      let timeLimit = 3000
      
      if (userAge >= 6) {
        maxObjects = Math.min(5, 2 + Math.floor(questionNumber / 3))
        timeLimit = Math.max(2000, 4000 - (questionNumber * 100))
      } else {
        maxObjects = Math.min(4, 2 + Math.floor(questionNumber / 4))
        timeLimit = Math.max(2500, 4500 - (questionNumber * 100))
      }

      const numObjects = Math.floor(Math.random() * maxObjects) + 1
      const objects = []
      const usedPositions = new Set()
      
      for (let i = 0; i < numObjects; i++) {
        let x, y, posKey
        let attempts = 0
        
        do {
          x = Math.floor(Math.random() * 8) + 1
          y = Math.floor(Math.random() * 6) + 1
          posKey = `${x}-${y}`
          attempts++
        } while (usedPositions.has(posKey) && attempts < 20)
        
        if (attempts < 20) {
          usedPositions.add(posKey)
          objects.push({
            x: x * 10 + Math.random() * 5,
            y: y * 10 + Math.random() * 5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            shape: SHAPES[Math.floor(Math.random() * SHAPES.length)]
          })
        }
      }

      const question: SubitizingQuestion = {
        id: questionNumber,
        objects,
        correctAnswer: objects.length,
        difficulty: Math.ceil(objects.length / 2),
        timeLimit,
        educationalTip: 'Look quickly and trust your first instinct!',
        encouragement: 'You\'re doing great! Keep practicing!'
      }

      setCurrentQuestion(question)
      setTimeLeft(timeLimit)
      setShowObjects(true)
      setIsLoading(false)

      setTimeout(() => {
        setShowObjects(false)
      }, timeLimit)
    }
    
    generatingRef.current = false // Reset the flag
  }, [questionNumber, userAge])

  // Handle answer selection
  const handleAnswer = useCallback(async (answer: number) => {
    if (gameState !== 'playing' || selectedAnswer !== null) return

    setSelectedAnswer(answer)
    const correct = answer === currentQuestion?.correctAnswer
    setIsCorrect(correct)
    setGameState('answered')

    if (correct) {
      const points = 1 // Always award 1 point per correct answer
      setScore(prev => {
        const newScore = prev + points
        
        // Create achievement records on first point so they show up in achievements page
        if (newScore === 1) {
          // Create all three achievement records so they show up with progress tracking
          unlockAchievement('Bronze Achievement', 'Scored 10 points in Subitizing!', '🥉')
          unlockAchievement('Silver Achievement', 'Scored 50 points in Subitizing!', '🥈')
          unlockAchievement('Gold Achievement', 'Scored 100 points in Subitizing!', '🥇')
        }
        
        return newScore
      })
      
      try {
        await incrementScore(userId, points)
      } catch (error) {
        console.error('Error updating score:', error)
      }
    }

    // Show Next button instead of auto-advancing
    setShowNextButton(true)
  }, [gameState, selectedAnswer, currentQuestion, userId, incrementScore])

  // Handle next question
  const handleNext = () => {
    setShowNextButton(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    
    if (questionNumber >= totalQuestions) {
      setGameState('complete')
      
      // Unlock completion-based achievements
      unlockAchievement('First Game', 'Completed your first Subitizing game!', '🎮')
      
      if (score >= 8) {
        unlockAchievement('High Scorer', 'Scored 8 or more points in a single game!', '🧠')
      }
      
      if (score === totalQuestions) {
        unlockAchievement('Perfect Game', 'Got every question right in a game!', '💎')
      }
      
      onGameComplete(score, totalQuestions)
    } else {
      setQuestionNumber(prev => prev + 1)
      setGameState('playing')
    }
  }

  // Generate question when needed
  useEffect(() => {
    if (questionNumber <= totalQuestions && gameState === 'playing' && !showNextButton) {
      generateQuestion()
    }
  }, [questionNumber, gameState, showNextButton, totalQuestions])

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0 && showObjects) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 100), 100)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, showObjects])

  const resetGame = () => {
    setQuestionNumber(1)
    setScore(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setGameState('playing')
    setShowObjects(true)
    setShowNextButton(false)
  }

  const renderShape = (obj: { x: number; y: number; color: string; shape: string }, index: number) => {
    const style = {
      position: 'absolute' as const,
      left: `${obj.x}%`,
      top: `${obj.y}%`,
      color: obj.color,
      fontSize: '2rem',
      transform: 'translate(-50%, -50%)',
      transition: 'all 0.3s ease',
      opacity: showObjects ? 1 : 0
    }

    const shapeMap = {
      circle: '●',
      square: '■',
      triangle: '▲',
      star: '★',
      heart: '♥'
    }

    return (
      <span key={index} style={style}>
        {shapeMap[obj.shape as keyof typeof shapeMap]}
      </span>
    )
  }

  const progress = (questionNumber / totalQuestions) * 100

  // Game complete state
  if (gameState === 'complete') {
    const percentage = Math.round((score / (totalQuestions * 2)) * 100)
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Game Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-6xl mb-4">
              {percentage >= 80 ? '🌟' : percentage >= 60 ? '🎉' : '👍'}
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">Final Score: {score} points</p>
              <p className="text-lg text-gray-600">{percentage}% correct</p>
              <p className="text-sm text-gray-500">
                You answered {Math.round((score / 2))} questions correctly out of {totalQuestions}
              </p>
            </div>
            <Button 
              onClick={resetGame}
              className="mt-6"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading || !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              <p className="mt-2">Preparing your subitizing challenge...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Question Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Instructions */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
              <Eye className="w-6 h-6 text-blue-500" />
              How many objects do you see?
            </h2>
            <p className="text-sm text-gray-600">
              {showObjects ? 'Look quickly!' : 'Now choose your answer!'}
            </p>
          </div>

          {/* Objects Display Area */}
          <div className="relative w-full h-64 mb-6 rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-blue-50 to-purple-50">
            {currentQuestion.objects.map((obj, index) => renderShape(obj, index))}
            
            {!showObjects && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🤔</div>
                  <p className="text-lg font-medium text-gray-700">How many were there?</p>
                </div>
              </div>
            )}
          </div>

          {/* Timer Bar */}
          {showObjects && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-center mt-1 text-gray-500">
                Look carefully! Objects will disappear soon...
              </p>
            </div>
          )}

          {/* Answer Buttons */}
          {!showObjects && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <Button
                  key={num}
                  onClick={() => handleAnswer(num)}
                  disabled={selectedAnswer !== null}
                  variant={
                    selectedAnswer === num
                      ? isCorrect
                        ? "default"
                        : "destructive"
                      : "outline"
                  }
                  className="h-12 text-lg font-bold"
                >
                  {selectedAnswer === num && (
                    <>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-2" />
                      )}
                    </>
                  )}
                  {num}
                </Button>
              ))}
            </div>
          )}

          {/* Feedback */}
          {selectedAnswer !== null && (
            <div className="text-center space-y-2">
              <p className={`text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? '🎉 Correct!' : `❌ The answer was ${currentQuestion.correctAnswer}`}
              </p>

              {/* AI-generated encouragement */}
              {currentQuestion.encouragement && (
                <p className="text-sm text-blue-600 font-medium">
                  {currentQuestion.encouragement}
                </p>
              )}
            </div>
          )}

          {/* Next Button */}
          {showNextButton && (
            <div className="text-center mt-4">
              <Button 
                onClick={handleNext}
                className="px-8 py-2 text-lg font-semibold"
              >
                {questionNumber >= totalQuestions ? 'Finish Game' : 'Next Question'}
              </Button>
            </div>
          )}

          {/* Educational Tip */}
          {currentQuestion.educationalTip && !selectedAnswer && !showObjects && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">💡 Tip: </span>
                {currentQuestion.educationalTip}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Section */}
      <div className="space-y-4">
        {/* Score and Question Counter */}
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium text-gray-700">
            Question {questionNumber} of {totalQuestions}
          </div>
          <div className="text-sm font-medium text-blue-600">
            Score: {score} points
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Difficulty Badge */}
      <div className="text-center mt-4">
        <Badge variant="outline">
          Difficulty: {currentQuestion.difficulty}/3
        </Badge>
      </div>
    </div>
  )
}