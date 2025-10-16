'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react'

interface Question {
  id: number
  text: string
  imageUrl: string
  correctAnswer: boolean
  explanation?: string
}

interface TrueFalseGameProps {
  userId: string
  gameId: string
  onGameComplete: (score: number, totalQuestions: number) => void
}

// Sample questions - in the future this could come from AI or a database
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "The house is big",
    imageUrl: "/images/small-house.jpg", // You'll need to add these images
    correctAnswer: false,
    explanation: "The house in the image is small, not big."
  },
  {
    id: 2,
    text: "The dog is brown",
    imageUrl: "/images/brown-dog.jpg",
    correctAnswer: true,
    explanation: "Yes! The dog in the image is brown."
  },
  {
    id: 3,
    text: "The car is red",
    imageUrl: "/images/blue-car.jpg",
    correctAnswer: false,
    explanation: "The car in the image is blue, not red."
  },
  {
    id: 4,
    text: "The sun is yellow",
    imageUrl: "/images/yellow-sun.jpg",
    correctAnswer: true,
    explanation: "Correct! The sun appears yellow in the image."
  },
  {
    id: 5,
    text: "The tree has leaves",
    imageUrl: "/images/bare-tree.jpg",
    correctAnswer: false,
    explanation: "The tree in the image has no leaves."
  },
  {
    id: 6,
    text: "The cat is sleeping",
    imageUrl: "/images/sleeping-cat.jpg",
    correctAnswer: true,
    explanation: "Yes! The cat is sleeping in the image."
  },
  {
    id: 7,
    text: "The ball is square",
    imageUrl: "/images/round-ball.jpg",
    correctAnswer: false,
    explanation: "Balls are round, not square!"
  },
  {
    id: 8,
    text: "The flower is pink",
    imageUrl: "/images/pink-flower.jpg",
    correctAnswer: true,
    explanation: "Correct! The flower is pink."
  },
  {
    id: 9,
    text: "The book is open",
    imageUrl: "/images/closed-book.jpg",
    correctAnswer: false,
    explanation: "The book in the image is closed."
  },
  {
    id: 10,
    text: "The bird can fly",
    imageUrl: "/images/flying-bird.jpg",
    correctAnswer: true,
    explanation: "Yes! Birds can fly and this one is flying."
  }
]

export default function TrueFalseGame({ userId: _userId, gameId: _gameId, onGameComplete }: TrueFalseGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [showResult, setShowResult] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null)

  const currentQuestion = SAMPLE_QUESTIONS[currentQuestionIndex]
  const totalQuestions = SAMPLE_QUESTIONS.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  const handleAnswer = (answer: boolean) => {
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
    
    // Auto-advance after 2 seconds
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setShowResult(false)
        setSelectedAnswer(null)
      } else {
        // Game completed
        setGameCompleted(true)
        onGameComplete(score + (isCorrect ? 1 : 0), totalQuestions)
      }
    }, 2000)
  }

  const restartGame = () => {
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setShowResult(false)
    setGameCompleted(false)
    setSelectedAnswer(null)
  }

  if (gameCompleted) {
    const percentage = Math.round((score / totalQuestions) * 100)
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Game Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <div className="text-4xl font-bold text-blue-600">{score}/{totalQuestions}</div>
            <div className="text-lg text-gray-600">
              You got {percentage}% correct!
            </div>
          </div>
          
          <div className="space-y-2">
            {percentage >= 80 && (
              <Badge variant="default" className="bg-green-500">
                Excellent! 🌟
              </Badge>
            )}
            {percentage >= 60 && percentage < 80 && (
              <Badge variant="default" className="bg-blue-500">
                Good job! 👍
              </Badge>
            )}
            {percentage < 60 && (
              <Badge variant="default" className="bg-orange-500">
                Keep practicing! 💪
              </Badge>
            )}
          </div>

          <Button onClick={restartGame} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Play Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>True or False?</CardTitle>
          <Badge variant="outline">
            {currentQuestionIndex + 1} / {totalQuestions}
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">{currentQuestion.text}</h2>
          
          <div className="relative h-48 w-full max-w-md mx-auto">
            <Image 
              src={currentQuestion.imageUrl} 
              alt="Question image"
              fill
              className="object-cover rounded-lg shadow-md"
              priority
            />
          </div>
        </div>

        {!showResult ? (
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => handleAnswer(true)}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg"
            >
              ✓ TRUE
            </Button>
            <Button 
              onClick={() => handleAnswer(false)}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg"
            >
              ✗ FALSE
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <span className="text-2xl font-semibold text-green-600">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-red-500" />
                  <span className="text-2xl font-semibold text-red-600">Incorrect</span>
                </>
              )}
            </div>
            
            {currentQuestion.explanation && (
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                {currentQuestion.explanation}
              </p>
            )}
            
            <div className="text-sm text-gray-500">
              Moving to next question...
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          Score: {score} / {currentQuestionIndex + (showResult ? 1 : 0)}
        </div>
      </CardContent>
    </Card>
  )
}