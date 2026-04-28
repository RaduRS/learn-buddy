"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle } from "lucide-react";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { ProgressStrip } from "@/components/game/ProgressStrip";
import { useScore } from "@/hooks/useScore";
import { useApiCall } from "@/hooks/useApiCall";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  statement: string;
  imageUrl: string;
  correctAnswer: boolean;
  difficulty: number;
}

interface TrueFalseGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

interface AIContent {
  statement: string;
  isTrue: boolean;
  imageUrl: string;
  difficulty: number;
}

const TOTAL = 5;

export default function TrueFalseGame({
  gameId,
  userAge,
  onGameComplete,
}: TrueFalseGameProps) {
  const { incrementScore } = useScore();
  const { play } = useSfx();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [trueFalseHistory, setTrueFalseHistory] = useState<boolean[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isGeneratingRef = useRef(false);
  const { execute, loading, error } = useApiCall<AIContent>({ timeout: 30000 });

  const generateQuestion = useCallback(
    async (questionNumber: number, retryCount = 0) => {
      if (isGeneratingRef.current) return;
      isGeneratingRef.current = true;

      try {
        const result = await execute(
          async () => {
            const response = await fetch("/api/ai/generate-content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                age: userAge,
                questionNumber,
                timestamp: Date.now() + retryCount,
                usedQuestions: Array.from(usedQuestions),
                trueFalseHistory,
              }),
            });
            if (!response.ok) {
              throw new Error(`Failed to generate question ${questionNumber}`);
            }
            return await response.json();
          },
          (content: AIContent) => {
            if (usedQuestions.has(content.statement)) {
              throw new Error("DUPLICATE_QUESTION");
            }
            const next: Question = {
              id: questionNumber,
              statement: content.statement,
              imageUrl: content.imageUrl,
              correctAnswer: content.isTrue,
              difficulty: content.difficulty,
            };
            setUsedQuestions((prev) => new Set([...prev, content.statement]));
            setCurrentQuestion(next);
          },
        );

        if (result.error === "DUPLICATE_QUESTION" && retryCount < 3) {
          isGeneratingRef.current = false;
          await generateQuestion(questionNumber, retryCount + 1);
        }
      } finally {
        isGeneratingRef.current = false;
      }
    },
    [userAge, usedQuestions, trueFalseHistory, execute],
  );

  // Generate the first question once on mount.
  useEffect(() => {
    if (!hasInitialized && !currentQuestion && !loading) {
      setHasInitialized(true);
      void generateQuestion(1);
    }
  }, [hasInitialized, currentQuestion, loading, generateQuestion]);

  const handleAnswer = (answer: boolean) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) {
      const next = scoreRef.current + 1;
      scoreRef.current = next;
      setScore(next);
      play("correct");
      if (gameId) incrementScore(gameId, 1);
    } else {
      play("wrong");
    }
    setShowResult(true);
  };

  const handleNext = () => {
    play("tap");
    if (currentQuestion) {
      setTrueFalseHistory((prev) => [...prev, currentQuestion.correctAnswer]);
    }
    setShowResult(false);
    setSelectedAnswer(null);

    if (questionIndex >= TOTAL - 1) {
      setGameCompleted(true);
      onGameComplete(scoreRef.current, TOTAL);
      return;
    }
    setQuestionIndex((i) => i + 1);
    setCurrentQuestion(null);
    void generateQuestion(questionIndex + 2);
  };

  const restart = () => {
    play("tap");
    scoreRef.current = 0;
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameCompleted(false);
    setCurrentQuestion(null);
    setUsedQuestions(new Set());
    setTrueFalseHistory([]);
    setHasInitialized(false);
    isGeneratingRef.current = false;
  };

  if (loading || (!currentQuestion && !error && !gameCompleted)) {
    return (
      <LoadingScreen
        tone="generating"
        message="Buddy is thinking up a question…"
        subMessage={`Question ${questionIndex + 1} of ${TOTAL}`}
      />
    );
  }

  if (error) {
    return (
      <div className="surface-card cat-spatial p-8 max-w-md mx-auto text-center">
        <XCircle className="w-12 h-12 mx-auto" style={{ color: "var(--joy-wrong)" }} />
        <h3 className="mt-3 font-display text-2xl text-arcade-strong">
          Oops!
        </h3>
        <p className="mt-2 text-arcade-mid">{error}</p>
        <button
          type="button"
          onClick={() => generateQuestion(questionIndex + 1)}
          className="mt-5 font-display px-5 py-3 rounded-full
                     bg-[var(--cat-math)] text-[var(--ink-on-color)]
                     border border-[oklch(0.45_0.18_250)]
                     shadow-[0_8px_22px_-10px_var(--cat-math-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                     active:scale-[0.97]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="py-6">
        <ResultsScreen
          score={score}
          total={TOTAL}
          category="math"
          onPlayAgain={restart}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-5">
      <ProgressStrip
        category="math"
        index={questionIndex}
        total={TOTAL}
        score={score}
        label="Question"
      />

      <div className="surface-card cat-math p-5 sm:p-7">
        <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[oklch(0.20_0.06_285_/_0.6)] border border-[var(--arcade-edge)]">
          {currentQuestion.imageUrl ? (
            <Image
              src={currentQuestion.imageUrl}
              alt=""
              fill
              className="object-contain p-4"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-arcade-soft">
              Loading image…
            </div>
          )}
        </div>

        <h2 className="mt-5 font-display text-2xl sm:text-3xl text-arcade-strong text-center">
          {currentQuestion.statement}
        </h2>

        {!showResult ? (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <AnswerButton
              kind="true"
              onClick={() => handleAnswer(true)}
              disabled={selectedAnswer !== null}
            />
            <AnswerButton
              kind="false"
              onClick={() => handleAnswer(false)}
              disabled={selectedAnswer !== null}
            />
          </div>
        ) : (
          <div className="mt-6 text-center">
            <div
              className={cn(
                "px-5 py-4 rounded-2xl border font-display max-w-md mx-auto",
                selectedAnswer === currentQuestion.correctAnswer
                  ? "bg-[oklch(0.30_0.10_145_/_0.5)] text-[oklch(0.92_0.13_145)] border-[oklch(0.55_0.16_145)]"
                  : "bg-[oklch(0.30_0.12_25_/_0.5)] text-[oklch(0.92_0.13_25)] border-[oklch(0.55_0.16_25)]",
              )}
            >
              <div className="text-2xl">
                {selectedAnswer === currentQuestion.correctAnswer
                  ? "Yes! That's right."
                  : "Not this time — let's see."}
              </div>
              <div className="mt-2 text-arcade-mid">
                The answer is <strong>{currentQuestion.correctAnswer ? "True" : "False"}</strong>.
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="mt-5 font-display text-lg px-7 py-3 rounded-full text-[var(--ink-on-color)]
                         bg-[var(--cat-math)]
                         border border-[oklch(0.45_0.18_250)]
                         shadow-[0_8px_22px_-10px_var(--cat-math-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                         active:scale-[0.97]"
            >
              {questionIndex >= TOTAL - 1 ? "Finish game" : "Next question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerButton({
  kind,
  onClick,
  disabled,
}: {
  kind: "true" | "false";
  onClick: () => void;
  disabled?: boolean;
}) {
  const isTrue = kind === "true";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 sm:flex-none sm:min-w-[200px] inline-flex items-center justify-center gap-2",
        "font-display text-xl py-4 px-8 rounded-full",
        "border",
        "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.20)]",
        "active:scale-[0.97]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
      style={{
        color: "var(--ink-on-color)",
        background: isTrue
          ? "linear-gradient(180deg, oklch(0.92 0.18 145), oklch(0.65 0.20 150))"
          : "linear-gradient(180deg, oklch(0.86 0.20 25), oklch(0.60 0.20 25))",
        borderColor: isTrue ? "oklch(0.50 0.16 145)" : "oklch(0.50 0.16 25)",
      }}
    >
      {isTrue ? (
        <CheckCircle className="w-6 h-6" aria-hidden />
      ) : (
        <XCircle className="w-6 h-6" aria-hidden />
      )}
      {isTrue ? "True" : "False"}
    </button>
  );
}
