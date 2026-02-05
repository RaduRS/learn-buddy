"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScore } from "@/hooks/useScore";

interface MathProblem {
  id: number;
  firstNumber: number;
  secondNumber: number;
  operation: "+" | "-";
  correctAnswer: number;
  userAnswer?: number;
  isCorrect?: boolean;
}

interface NumberFunGameProps {
  userId?: string;
  gameId?: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

function createProblem(questionNumber: number): MathProblem {
  const operation = Math.random() < 0.5 ? "+" : "-";
  let firstNumber: number;
  let secondNumber: number;
  let correctAnswer: number;

  if (operation === "+") {
    firstNumber = Math.floor(Math.random() * 15) + 1;
    const maxSecond = 20 - firstNumber;
    secondNumber = Math.floor(Math.random() * maxSecond) + 1;
    correctAnswer = firstNumber + secondNumber;
  } else {
    firstNumber = Math.floor(Math.random() * 20) + 1;
    secondNumber = Math.floor(Math.random() * firstNumber) + 1;
    correctAnswer = firstNumber - secondNumber;
  }

  return {
    id: questionNumber,
    firstNumber,
    secondNumber,
    operation,
    correctAnswer,
  };
}

function createAnswerChoices(correctAnswer: number): number[] {
  const choices = [correctAnswer];

  while (choices.length < 4) {
    let wrongAnswer: number;
    if (correctAnswer <= 5) {
      wrongAnswer = Math.floor(Math.random() * 10) + 1;
    } else if (correctAnswer <= 10) {
      wrongAnswer = Math.floor(Math.random() * 15) + 1;
    } else {
      wrongAnswer = Math.floor(Math.random() * 25) + 1;
    }

    if (!choices.includes(wrongAnswer) && wrongAnswer > 0) {
      choices.push(wrongAnswer);
    }
  }

  return choices.sort(() => Math.random() - 0.5);
}

export default function NumberFunGame({
  gameId,
  onGameComplete,
}: NumberFunGameProps) {
  const { incrementScore } = useScore();
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(() =>
    createProblem(1),
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const totalQuestions = 10;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Handle answer selection
  const handleAnswer = async (answer: number) => {
    if (!currentProblem) return;

    setSelectedAnswer(answer);
    const correct = answer === currentProblem.correctAnswer;
    setIsCorrect(correct);

    // Update answers array
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    // Update score if correct
    if (correct) {
      setScore(score + 1);
      // Increment score in the system
      if (gameId) incrementScore(gameId, 1);
    }

    setShowResult(true);
    setShowNextButton(true);
  };

  // Handle next question
  const handleNext = () => {
    setShowNextButton(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResult(false);

    if (currentQuestionIndex + 1 >= totalQuestions) {
      setGameCompleted(true);
      onGameComplete(score, totalQuestions);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      const nextProblem = createProblem(currentQuestionIndex + 2);
      setCurrentProblem(nextProblem);
    }
  };

  // Restart game
  const restartGame = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setShowResult(false);
    setGameCompleted(false);
    setSelectedAnswer(null);
    setCurrentProblem(createProblem(1));
    setShowNextButton(false);
    setIsCorrect(null);
    setError(null);
  };

  // Speak the problem (text-to-speech)
  const speakProblem = () => {
    if (!currentProblem) return;

    const text = `${currentProblem.firstNumber} ${currentProblem.operation === "+" ? "plus" : "minus"} ${currentProblem.secondNumber}`;

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      speechSynthesis.speak(utterance);
    }
  };

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={restartGame}>Try Again</Button>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="text-center p-8 space-y-6">
        <div className="space-y-4">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
          <h2 className="text-3xl font-bold text-green-600">Great Job!</h2>
          <p className="text-xl">
            You scored {score} out of {totalQuestions}!
          </p>
          <div className="text-lg text-gray-600">
            {score === totalQuestions && "Perfect! You're a math star! ⭐"}
            {score >= totalQuestions * 0.8 &&
              score < totalQuestions &&
              "Excellent work! 🎉"}
            {score >= totalQuestions * 0.6 &&
              score < totalQuestions * 0.8 &&
              "Good job! Keep practicing! 👍"}
            {score < totalQuestions * 0.6 &&
              "Nice try! Practice makes perfect! 💪"}
          </div>
        </div>

        <div className="space-y-4">
          <Button onClick={restartGame} size="lg" className="mr-4">
            <RotateCcw className="h-4 w-4 mr-2" />
            Play Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  const answerChoices = createAnswerChoices(currentProblem.correctAnswer);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-blue-600">Number Fun! 🔢</h1>
        <div className="flex items-center justify-center space-x-4">
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Badge>
          <Badge variant="outline">Score: {score}</Badge>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Math Problem */}
      <Card className="p-8">
        <CardContent className="text-center space-y-6">
          <div className="space-y-4">
            <div className="text-6xl font-bold text-gray-800 flex items-center justify-center space-x-4">
              <span className="text-blue-600">
                {currentProblem.firstNumber}
              </span>
              <span className="text-gray-600">{currentProblem.operation}</span>
              <span className="text-green-600">
                {currentProblem.secondNumber}
              </span>
              <span className="text-gray-600">=</span>
              <span className="text-purple-600">?</span>
            </div>

            <Button
              onClick={speakProblem}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Hear Problem
            </Button>
          </div>

          {/* Answer Choices */}
          {!showResult && (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {answerChoices.map((choice, index) => (
                <Button
                  key={index}
                  onClick={() => handleAnswer(choice)}
                  size="lg"
                  variant="outline"
                  className="h-16 text-2xl font-bold hover:bg-blue-50 hover:border-blue-300"
                  disabled={selectedAnswer !== null}
                >
                  {choice}
                </Button>
              ))}
            </div>
          )}

          {/* Result */}
          {showResult && (
            <div className="space-y-4">
              <div
                className={cn(
                  "text-2xl font-bold p-4 rounded-lg",
                  isCorrect
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800",
                )}
              >
                {isCorrect ? (
                  <div className="space-y-2">
                    <div>🎉 Correct!</div>
                    <div className="text-lg">
                      {currentProblem.firstNumber} {currentProblem.operation}{" "}
                      {currentProblem.secondNumber} ={" "}
                      {currentProblem.correctAnswer}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>Try again next time!</div>
                    <div className="text-lg">
                      {currentProblem.firstNumber} {currentProblem.operation}{" "}
                      {currentProblem.secondNumber} ={" "}
                      {currentProblem.correctAnswer}
                    </div>
                  </div>
                )}
              </div>

              {showNextButton && (
                <Button onClick={handleNext} size="lg" className="mt-4">
                  {currentQuestionIndex + 1 >= totalQuestions
                    ? "Finish Game"
                    : "Next Problem"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
