"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn, isEasyMathChild } from "@/lib/utils";
import {
  generateRound,
  MATH_ROUND_SIZE,
  type MathProblem,
} from "@/lib/games/mathProblems";

interface MathSparkGameProps {
  gameId?: string;
  userName?: string;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

const TOTAL = MATH_ROUND_SIZE;

export default function MathSparkGame({
  gameId,
  userName,
  onGameComplete,
}: MathSparkGameProps) {
  const { incrementScore } = useScore();
  const { play } = useSfx();
  const easy = isEasyMathChild(userName);
  const [problems, setProblems] = useState<MathProblem[]>(() => generateRound(easy));
  const [submitted, setSubmitted] = useState(false);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const handleInputChange = (id: number, value: string) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, userAnswer: value } : p)),
    );
  };

  const handleSubmit = async () => {
    play("tap");
    const evaluated = problems.map((p) => ({
      ...p,
      isCorrect: p.userAnswer ? parseInt(p.userAnswer, 10) === p.answer : false,
    }));
    const correctCount = evaluated.filter((p) => p.isCorrect).length;
    setProblems(evaluated);

    for (let i = 0; i < evaluated.length; i++) {
      setRevealIndex(i);
      play(evaluated[i].isCorrect ? "correct" : "wrong");
      if (i < evaluated.length - 1) {
        await new Promise((r) => setTimeout(r, 280));
      }
    }

    setScore(correctCount);
    setSubmitted(true);

    if (gameId) incrementScore(gameId, correctCount);
    onGameComplete(correctCount, TOTAL);
  };

  const restart = () => {
    play("tap");
    setProblems(generateRound(easy));
    setSubmitted(false);
    setRevealIndex(null);
    setScore(0);
    setFocusedId(null);
  };

  const allAnswered = problems.every((p) => p.userAnswer && p.userAnswer.trim() !== "");

  if (submitted) {
    return (
      <div className="py-4 space-y-5">
        <ResultsScreen
          score={score}
          total={TOTAL}
          category="math"
          onPlayAgain={restart}
        />
        <div className="surface-card cat-math p-5 sm:p-6 max-w-3xl mx-auto">
          <div className="text-arcade-soft text-sm font-display mb-3">
            Your answers
          </div>
          <div className="space-y-2">
            {problems.map((p) => (
              <ProblemRow
                key={p.id}
                problem={p}
                revealed
                focusedId={null}
                onChange={() => {}}
                onFocus={() => {}}
                onBlur={() => {}}
                disabled
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="surface-card cat-math p-5 sm:p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-arcade-strong">
            Solve all 10 — then submit
          </h2>
          <p className="text-arcade-mid text-sm mt-1">
            {easy
              ? "Friendly sums and differences up to 10."
              : "Mix of sums, differences, products, and missing numbers."}
          </p>
        </div>
        <span className="chip">
          <span className="text-sm opacity-80">Filled</span>
          <span className="font-display">
            {problems.filter((p) => p.userAnswer && p.userAnswer.trim() !== "").length}
          </span>
          <span className="opacity-70">/</span>
          <span className="font-display opacity-80">{TOTAL}</span>
        </span>
      </div>

      <div className="surface-card p-5 sm:p-6">
        <div className="space-y-2">
          {problems.map((problem, index) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              revealed={revealIndex !== null && index <= revealIndex}
              focusedId={focusedId}
              onChange={(value) => handleInputChange(problem.id, value)}
              onFocus={() => setFocusedId(problem.id)}
              onBlur={() => setFocusedId(null)}
              disabled={revealIndex !== null && index <= revealIndex}
            />
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="font-display text-lg px-10 py-3 rounded-full text-[var(--ink-on-color)]
                     bg-[var(--joy-gold)]
                     border border-[oklch(0.65_0.16_75)]
                     shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                     hover:brightness-105 active:scale-[0.97]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Check my answers
        </button>
        {!allAnswered && (
          <p className="text-arcade-soft text-sm mt-2">
            Fill in every blank to unlock the button.
          </p>
        )}
      </div>
    </div>
  );
}

function ProblemRow({
  problem,
  revealed,
  focusedId,
  onChange,
  onFocus,
  onBlur,
  disabled,
}: {
  problem: MathProblem;
  revealed: boolean;
  focusedId: number | null;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  disabled: boolean;
}) {
  const inputClass = cn(
    "h-11 px-3 text-lg font-display font-bold text-center rounded-xl border-2 inline-block",
    "focus:outline-none",
    revealed
      ? problem.isCorrect
        ? "bg-[oklch(0.30_0.10_145_/_0.5)] border-[oklch(0.55_0.16_145)] text-[oklch(0.92_0.13_145)]"
        : "bg-[oklch(0.30_0.12_25_/_0.5)] border-[oklch(0.55_0.16_25)] text-[oklch(0.92_0.13_25)]"
      : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong focus:border-[var(--cat-math)] focus:ring-2 focus:ring-[var(--cat-math-glow)]",
  );
  const placeholder = focusedId === problem.id ? "" : "?";

  return (
    <div className="flex items-center justify-between gap-4 px-3 sm:px-4 py-3 rounded-2xl bg-[oklch(0.20_0.06_285_/_0.45)] border border-[var(--arcade-edge)]">
      {problem.type.startsWith("blank_") ? (
        <div className="flex-1 flex items-center gap-2 font-display text-lg sm:text-xl text-arcade-strong flex-wrap">
          {problem.question.split("_").map((part, i, arr) => (
            <span key={i} className="contents">
              <span>{part}</span>
              {i < arr.length - 1 && (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={problem.userAnswer ?? ""}
                  onChange={(e) =>
                    onChange(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  onFocus={onFocus}
                  onBlur={onBlur}
                  disabled={disabled}
                  className={cn("w-16", inputClass)}
                  placeholder={placeholder}
                />
              )}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2 font-display text-lg sm:text-xl text-arcade-strong">
          <span>{problem.question.replace("= ?", "=")}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={problem.userAnswer ?? ""}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={disabled}
            className={cn("w-20", inputClass)}
            placeholder={placeholder}
          />
        </div>
      )}

      <div className="min-w-[90px] flex items-center justify-end gap-1.5">
        {revealed &&
          (problem.isCorrect ? (
            <CheckCircle
              className="w-6 h-6"
              style={{ color: "var(--joy-correct)" }}
              aria-hidden
            />
          ) : (
            <>
              <XCircle
                className="w-6 h-6"
                style={{ color: "var(--joy-wrong)" }}
                aria-hidden
              />
              <span
                className="font-display whitespace-nowrap"
                style={{ color: "var(--joy-wrong)" }}
              >
                = {problem.answer}
              </span>
            </>
          ))}
      </div>
    </div>
  );
}
