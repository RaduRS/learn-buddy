"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScore } from "@/hooks/useScore";

type ProblemType =
  | "add"
  | "sub"
  | "mul"
  | "chain_add_mul"
  | "chain_mul_add"
  | "blank_add"
  | "blank_sub"
  | "blank_mul";

interface MathProblem {
  id: number;
  question: string;
  answer: number;
  type: ProblemType;
  userAnswer?: string;
  isCorrect?: boolean;
  isRevealed?: boolean;
}

interface MathSparkGameProps {
  gameId?: string;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MAX_RESULT = 100;

function generateProblem(type: ProblemType): MathProblem | null {
  let question: string;
  let answer: number;

  switch (type) {
    case "add": {
      const a = generateRandomNumber(10, 90);
      const b = generateRandomNumber(1, MAX_RESULT - a);
      question = `${a} + ${b} = ?`;
      answer = a + b;
      break;
    }

    case "sub": {
      const a = generateRandomNumber(10, MAX_RESULT);
      const b = generateRandomNumber(1, a);
      question = `${a} - ${b} = ?`;
      answer = a - b;
      break;
    }

    case "mul": {
      const a = generateRandomNumber(2, 5);
      const b = generateRandomNumber(2, 5);
      question = `${a} × ${b} = ?`;
      answer = a * b;
      break;
    }

    case "chain_add_mul": {
      const mulA = generateRandomNumber(2, 5);
      const mulB = generateRandomNumber(2, 5);
      const mulResult = mulA * mulB;
      const addC = generateRandomNumber(1, MAX_RESULT - mulResult);
      question = `${mulA} × ${mulB} + ${addC} = ?`;
      answer = mulResult + addC;
      break;
    }

    case "chain_mul_add": {
      const addA = generateRandomNumber(10, 90);
      const mulB = generateRandomNumber(2, 5);
      const maxMulC = Math.min(5, Math.floor((MAX_RESULT - addA) / mulB));
      if (maxMulC < 2) return null;
      const mulC = generateRandomNumber(2, maxMulC);
      question = `${addA} + ${mulB} × ${mulC} = ?`;
      answer = addA + mulB * mulC;
      break;
    }

    case "blank_add": {
      const total = generateRandomNumber(20, MAX_RESULT);
      const a = generateRandomNumber(10, total - 10);
      const b = total - a;
      question = `${a} + _ = ${total}`;
      answer = b;
      break;
    }

    case "blank_sub": {
      const a = generateRandomNumber(20, MAX_RESULT);
      const result = generateRandomNumber(1, a - 10);
      const b = a - result;
      question = `${a} - _ = ${result}`;
      answer = b;
      break;
    }

    case "blank_mul": {
      const a = generateRandomNumber(2, 5);
      const result = a * generateRandomNumber(2, Math.min(5, Math.floor(MAX_RESULT / a)));
      const b = result / a;
      question = `${a} × _ = ${result}`;
      answer = b;
      break;
    }
  }

  return {
    id: Math.random(),
    question,
    answer,
    type,
  };
}

function generateProblems(): MathProblem[] {
  const types: ProblemType[] = [
    "add",
    "sub",
    "mul",
    "chain_add_mul",
    "chain_mul_add",
    "blank_add",
    "blank_sub",
    "blank_mul",
  ];

  const problems: MathProblem[] = [];

  while (problems.length < 10) {
    const type = types[generateRandomNumber(0, types.length - 1)];
    const problem = generateProblem(type);
    if (problem) {
      problems.push(problem);
    }
  }

  return problems;
}

export default function MathSparkGame({
  gameId,
  onGameComplete,
}: MathSparkGameProps) {
  const { incrementScore } = useScore();
  const [problems, setProblems] = useState<MathProblem[]>(() =>
    generateProblems(),
  );
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  const handleInputChange = (problemId: number, value: string) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, userAnswer: value } : p,
      ),
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const evaluatedProblems = problems.map((p) => ({
      ...p,
      isCorrect: p.userAnswer ? parseInt(p.userAnswer) === p.answer : false,
      isRevealed: false,
    }));

    const correctCount = evaluatedProblems.filter((p) => p.isCorrect).length;
    setProblems(evaluatedProblems);

    for (let i = 0; i < evaluatedProblems.length; i++) {
      setProblems((prev) =>
        prev.map((problem, index) =>
          index === i ? { ...problem, isRevealed: true } : problem,
        ),
      );

      if (i < evaluatedProblems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setScore(correctCount);
    setGameCompleted(true);
    setIsSubmitting(false);

    if (gameId) incrementScore(gameId, correctCount);
    onGameComplete(correctCount, 10);
  };

  const handleRestart = () => {
    setProblems(generateProblems());
    setGameCompleted(false);
    setScore(0);
    setIsSubmitting(false);
  };

  const allAnswered = problems.every((p) => p.userAnswer && p.userAnswer.trim() !== "");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-purple-600">MathSpark! ⚡</h1>
        <Badge variant="outline">
          Solve all 10 problems, then submit
        </Badge>
      </div>

      <Card className="p-6">
        <CardContent className="space-y-4">
          {problems.map((problem, index) => (
            <div
              key={problem.id}
              className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <span className="font-mono text-lg">
                  {problem.question}
                </span>
              </div>

              <input
                type="number"
                inputMode="numeric"
                value={problem.userAnswer || ""}
                onChange={(e) => handleInputChange(problem.id, e.target.value)}
                disabled={gameCompleted || isSubmitting || problem.isRevealed}
                className={cn(
                  "w-32 px-4 py-2 text-lg font-bold text-center border-2 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500",
                  problem.isRevealed
                    ? problem.isCorrect
                      ? "bg-green-100 border-green-500 text-green-700"
                      : "bg-red-100 border-red-500 text-red-700"
                    : "bg-white border-gray-300",
                )}
                placeholder="?"
              />

              <div className="flex items-center justify-center w-8">
                <div
                  className={cn(
                    "transition-opacity duration-300",
                    problem.isRevealed ? "opacity-100" : "opacity-0",
                  )}
                >
                  {problem.isCorrect ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </div>

              <div className="w-8">
                <span className="text-sm text-gray-500">#{index + 1}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting || gameCompleted}
          size="lg"
          className="px-12"
        >
          {isSubmitting ? "Checking..." : "Submit Answers"}
        </Button>
        {!allAnswered && (
          <p className="text-sm text-gray-500 mt-2">
            Please fill in all answers before submitting
          </p>
        )}
      </div>

      {gameCompleted && (
        <Card className="p-6">
          <CardContent className="text-center space-y-4">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold text-green-600">
              You scored {score} out of 10!
            </h2>
            <div className="text-base text-gray-600">
              {score === 10 && "Perfect! You're a math star! ⭐"}
              {score >= 8 && score < 10 && "Excellent work! 🎉"}
              {score >= 6 && score < 8 && "Good job! Keep practicing! 👍"}
              {score < 6 && "Nice try! Practice makes perfect! 💪"}
            </div>
            <Button onClick={handleRestart} size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
