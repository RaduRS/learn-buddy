'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, RotateCcw, Trophy, Loader2 } from 'lucide-react'

interface Question {
  id: number
  statement: string
  imageUrl: string
  correctAnswer: boolean
  difficulty: number
}

interface TrueFalseGameProps {
  userId: string
  gameId: string
  userAge: number
  onGameComplete: (score: number, totalQuestions: number) => void
}

interface AIContent {
  statement: string
  isTrue: boolean
  imageUrl: string
  difficulty: number
}

export default function TrueFalseGame({ userId: _userId, gameId: _gameId, userAge, onGameComplete }: TrueFalseGameProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [showResult, setShowResult] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set())
  const [showNextButton, setShowNextButton] = useState(false)
  const [trueFalseHistory, setTrueFalseHistory] = useState<boolean[]>([])

  const totalQuestions = 5
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  // Generate a single question with duplicate prevention
  const generateQuestion = async (questionNumber: number, retryCount = 0) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          age: userAge,
          questionNumber: questionNumber,
          timestamp: Date.now() + retryCount, // Add retry count for more uniqueness
          usedQuestions: Array.from(usedQuestions), // Send used questions to API
          trueFalseHistory: trueFalseHistory
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate question ${questionNumber}`)
      }

      const content: AIContent = await response.json()
      
      // Check if this question was already used
      if (usedQuestions.has(content.statement) && retryCount < 3) {
        console.log('Duplicate question detected, retrying...', content.statement)
        return generateQuestion(questionNumber, retryCount + 1)
      }
      
      const newQuestion: Question = {
        id: questionNumber,
        statement: content.statement,
        imageUrl: content.imageUrl,
        correctAnswer: content.isTrue,
        difficulty: content.difficulty,
      }

      // Add to used questions
      setUsedQuestions(prev => new Set([...prev, content.statement]))
      setCurrentQuestion(newQuestion)
      setLoading(false)
    } catch (error) {
      console.error('Error generating question:', error)
      setError('Failed to generate question. Please try again.')
      setLoading(false)
    }
  }

  // Generate first question on component mount
  useEffect(() => {
    generateQuestion(1)
  }, [userAge])

  const handleAnswer = (answer: boolean) => {
    if (!currentQuestion) return

    setSelectedAnswer(answer)
    const isCorrect = answer === currentQuestion.correctAnswer
    
    // Update answers array
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    
    // Update score if correct
    if (isCorrect) {
      setScore(score + 1)
    }
    
    setShowResult(true)
    
    // Show Next button instead of auto-advancing
    setShowNextButton(true)
  }

  const handleNext = () => {
    // Record the current question's true/false value in history
    if (currentQuestion) {
      setTrueFalseHistory(prev => [...prev, currentQuestion.correctAnswer])
    }
    
    setShowResult(false)
    setSelectedAnswer(null)
    setShowNextButton(false)
    
    if (currentQuestionIndex >= totalQuestions - 1) {
      setGameCompleted(true)
      onGameComplete(score, totalQuestions)
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      generateQuestion(currentQuestionIndex + 2)
    }
  }

  const restartGame = () => {
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setShowResult(false)
    setGameCompleted(false)
    setSelectedAnswer(null)
    setCurrentQuestion(null)
    setShowNextButton(false)
    setUsedQuestions(new Set()) // Clear used questions
    setTrueFalseHistory([]) // Clear true/false history for new game
    generateQuestion(1)
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <h3 className="text-xl font-semibold">Creating Your Question</h3>
              <p className="text-gray-600">
                Generating question {currentQuestionIndex + 1} of {totalQuestions}...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">
                We&apos;re creating a personalized question just for you!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <h3 className="text-xl font-semibold text-red-600">Oops!</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => generateQuestion(currentQuestionIndex + 1)} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Game completed state
  if (gameCompleted) {
    const percentage = Math.round((score / totalQuestions) * 100)
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Game Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-4xl font-bold text-blue-600">
              {score}/{totalQuestions}
            </div>
            <div className="text-lg text-gray-600">
              You got {percentage}% correct!
            </div>
            
            {percentage >= 80 && (
              <div className="text-green-600 font-semibold">
                🎉 Excellent work!
              </div>
            )}
            {percentage >= 60 && percentage < 80 && (
              <div className="text-blue-600 font-semibold">
                👍 Good job!
              </div>
            )}
            {percentage < 60 && (
              <div className="text-orange-600 font-semibold">
                💪 Keep practicing!
              </div>
            )}
            
            <Button onClick={restartGame} className="mt-6 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Game playing state
  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              <p className="mt-2">Loading question...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span className="text-sm text-gray-500">{score} correct</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Image */}
          <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {currentQuestion.imageUrl ? (
               <Image
                 src={currentQuestion.imageUrl}
                 alt="Question image"
                 fill
                 className="object-contain"
               />
             ) : (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-sm text-gray-500">Loading image...</span>
              </div>
            )}
          </div>

          {/* Question Text */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{currentQuestion.statement}</h2>
            <p className="text-gray-600">Is this statement true or false?</p>
          </div>

          {/* Answer Buttons */}
          {!showResult ? (
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => handleAnswer(true)}
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg"
                disabled={selectedAnswer !== null}
              >
                <CheckCircle className="w-6 h-6 mr-2" />
                True
              </Button>
              <Button
                onClick={() => handleAnswer(false)}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg"
                disabled={selectedAnswer !== null}
              >
                <XCircle className="w-6 h-6 mr-2" />
                False
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${
                selectedAnswer === currentQuestion.correctAnswer ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedAnswer === currentQuestion.correctAnswer ? '✅ Correct!' : '❌ Incorrect!'}
              </div>
              <div className="text-gray-600">
                The correct answer is: <strong>{currentQuestion.correctAnswer ? 'True' : 'False'}</strong>
              </div>
              {showNextButton && (
                <div className="mt-4">
                  <Button 
                    onClick={handleNext}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg font-semibold rounded-lg"
                  >
                    {currentQuestionIndex >= totalQuestions - 1 ? 'Finish Game' : 'Next Question'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Difficulty Badge */}
      <div className="text-center">
        <Badge variant="outline">
          Difficulty: {currentQuestion.difficulty}/3
        </Badge>
      </div>
    </div>
  )
}