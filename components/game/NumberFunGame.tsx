"use client";

import { useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { ProgressStrip } from "@/components/game/ProgressStrip";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface MathProblem {
  id: number;
  firstNumber: number;
  secondNumber: number;
  operation: "+" | "-";
  correctAnswer: number;
}

interface NumberFunGameProps {
  userId?: string;
  gameId?: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

const TOTAL_QUESTIONS = 10;

function createProblem(id: number): MathProblem {
  const operation = Math.random() < 0.5 ? "+" : "-";
  let firstNumber: number;
  let secondNumber: number;
  let correctAnswer: number;

  if (operation === "+") {
    correctAnswer = Math.floor(Math.random() * 90) + 10;
    firstNumber = Math.floor(Math.random() * (correctAnswer - 5)) + 5;
    secondNumber = correctAnswer - firstNumber;
  } else {
    firstNumber = Math.floor(Math.random() * 90) + 10;
    secondNumber = Math.floor(Math.random() * (firstNumber - 1)) + 1;
    correctAnswer = firstNumber - secondNumber;
  }
  return { id, firstNumber, secondNumber, operation, correctAnswer };
}

function createAnswerChoices(correct: number): number[] {
  const choices = [correct];
  while (choices.length < 4) {
    const offset = Math.floor(Math.random() * 20) + 1;
    const direction = Math.random() < 0.5 ? -1 : 1;
    let wrong = correct + direction * offset;
    if (wrong < 1 || wrong > 100) wrong = Math.floor(Math.random() * 100) + 1;
    if (!choices.includes(wrong)) choices.push(wrong);
  }
  return choices.sort(() => Math.random() - 0.5);
}

export default function NumberFunGame({
  gameId,
  onGameComplete,
}: NumberFunGameProps) {
  const { incrementScore } = useScore();
  const { play } = useSfx();

  const [currentProblem, setCurrentProblem] = useState<MathProblem>(() => createProblem(1));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const scoreRef = useRef(0);

  // Stable per-question answer choices.
  const answerChoices = useMemo(
    () => createAnswerChoices(currentProblem.correctAnswer),
    [currentProblem],
  );

  const handleAnswer = (answer: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    const correct = answer === currentProblem.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      const next = scoreRef.current + 1;
      scoreRef.current = next;
      setScore(next);
      play("correct");
      if (gameId) incrementScore(gameId, 1);
    } else {
      play("wrong");
    }
  };

  const handleNext = () => {
    play("tap");
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResult(false);

    if (questionIndex + 1 >= TOTAL_QUESTIONS) {
      setGameCompleted(true);
      onGameComplete(scoreRef.current, TOTAL_QUESTIONS);
      return;
    }
    setQuestionIndex((i) => i + 1);
    setCurrentProblem(createProblem(questionIndex + 2));
  };

  const restart = () => {
    play("tap");
    scoreRef.current = 0;
    setScore(0);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResult(false);
    setGameCompleted(false);
    setCurrentProblem(createProblem(1));
  };

  const speakProblem = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    play("tap");
    const text = `${currentProblem.firstNumber} ${currentProblem.operation === "+" ? "plus" : "minus"} ${currentProblem.secondNumber}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  };

  if (gameCompleted) {
    return (
      <div className="py-6">
        <ResultsScreen
          score={score}
          total={TOTAL_QUESTIONS}
          category="math"
          onPlayAgain={restart}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProgressStrip
        category="math"
        index={questionIndex}
        total={TOTAL_QUESTIONS}
        score={score}
      />

      <div className="surface-card cat-math p-6 sm:p-10">
        <div className="flex flex-col items-center gap-5">
          <div className="font-display text-5xl sm:text-7xl text-arcade-strong tracking-tight flex items-center gap-3 sm:gap-5">
            <span style={{ color: "var(--cat-math)" }}>
              {currentProblem.firstNumber}
            </span>
            <span className="text-arcade-mid">{currentProblem.operation}</span>
            <span style={{ color: "var(--cat-music)" }}>
              {currentProblem.secondNumber}
            </span>
            <span className="text-arcade-mid">=</span>
            <span style={{ color: "var(--joy-gold)" }}>?</span>
          </div>

          <button
            type="button"
            onClick={speakProblem}
            className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)]
                       active:scale-[0.97]"
          >
            <Volume2 className="w-4 h-4" aria-hidden />
            Hear it
          </button>
        </div>

        {!showResult && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto">
            {answerChoices.map((choice) => (
              <AnswerButton
                key={choice}
                value={choice}
                onClick={() => handleAnswer(choice)}
                disabled={selectedAnswer !== null}
              />
            ))}
          </div>
        )}

        {showResult && (
          <FeedbackPanel
            correct={!!isCorrect}
            answer={currentProblem.correctAnswer}
            expression={`${currentProblem.firstNumber} ${currentProblem.operation} ${currentProblem.secondNumber}`}
            isLastQuestion={questionIndex + 1 >= TOTAL_QUESTIONS}
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  );
}

function AnswerButton({
  value,
  onClick,
  disabled,
}: {
  value: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-display text-3xl h-16 sm:h-20 rounded-2xl",
        "bg-[var(--arcade-card-soft)] text-arcade-strong",
        "border border-[var(--arcade-edge)]",
        "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]",
        "active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      {value}
    </button>
  );
}

function FeedbackPanel({
  correct,
  answer,
  expression,
  isLastQuestion,
  onNext,
}: {
  correct: boolean;
  answer: number;
  expression: string;
  isLastQuestion: boolean;
  onNext: () => void;
}) {
  return (
    <div className="mt-8 max-w-lg mx-auto text-center">
      <div
        className={cn(
          "px-5 py-4 rounded-2xl border font-display",
          correct
            ? "bg-[oklch(0.30_0.10_145_/_0.5)] text-[oklch(0.92_0.13_145)] border-[oklch(0.55_0.16_145)]"
            : "bg-[oklch(0.30_0.12_25_/_0.5)] text-[oklch(0.92_0.13_25)] border-[oklch(0.55_0.16_25)]",
        )}
      >
        <div className="text-2xl">
          {correct ? "Yes! That's right." : "Nice try — let's see it together."}
        </div>
        <div className="mt-2 text-lg opacity-95">
          {expression} = {answer}
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-5 font-display text-lg px-6 py-3 rounded-full text-[var(--ink-on-color)]
                   bg-[var(--cat-math)]
                   border border-[oklch(0.45_0.18_250)]
                   shadow-[0_8px_22px_-10px_var(--cat-math-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                   hover:brightness-105 active:scale-[0.97]"
      >
        {isLastQuestion ? "Finish game" : "Next question"}
      </button>
    </div>
  );
}

