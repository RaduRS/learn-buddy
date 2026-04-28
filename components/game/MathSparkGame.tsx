"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

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
}

interface MathSparkGameProps {
  gameId?: string;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

const TOTAL = 10;
const MAX_RESULT = 100;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(type: ProblemType): MathProblem | null {
  let question: string;
  let answer: number;

  switch (type) {
    case "add": {
      const a = rand(10, 90);
      const b = rand(1, MAX_RESULT - a);
      question = `${a} + ${b} = ?`;
      answer = a + b;
      break;
    }
    case "sub": {
      const a = rand(10, MAX_RESULT);
      const b = rand(1, a);
      question = `${a} - ${b} = ?`;
      answer = a - b;
      break;
    }
    case "mul": {
      const a = rand(2, 5);
      const b = rand(2, 5);
      question = `${a} × ${b} = ?`;
      answer = a * b;
      break;
    }
    case "chain_add_mul": {
      const mulA = rand(2, 5);
      const mulB = rand(2, 5);
      const mulResult = mulA * mulB;
      const addC = rand(1, MAX_RESULT - mulResult);
      question = `${mulA} × ${mulB} + ${addC} = ?`;
      answer = mulResult + addC;
      break;
    }
    case "chain_mul_add": {
      const addA = rand(10, 90);
      const mulB = rand(2, 5);
      const maxMulC = Math.min(5, Math.floor((MAX_RESULT - addA) / mulB));
      if (maxMulC < 2) return null;
      const mulC = rand(2, maxMulC);
      question = `${addA} + ${mulB} × ${mulC} = ?`;
      answer = addA + mulB * mulC;
      break;
    }
    case "blank_add": {
      const total = rand(20, MAX_RESULT);
      const a = rand(10, total - 10);
      question = `${a} + _ = ${total}`;
      answer = total - a;
      break;
    }
    case "blank_sub": {
      const a = rand(20, MAX_RESULT);
      const result = rand(1, a - 10);
      question = `${a} - _ = ${result}`;
      answer = a - result;
      break;
    }
    case "blank_mul": {
      const a = rand(2, 5);
      const result = a * rand(2, Math.min(5, Math.floor(MAX_RESULT / a)));
      question = `${a} × _ = ${result}`;
      answer = result / a;
      break;
    }
  }

  return { id: Math.random(), question, answer, type };
}

function generateRound(): MathProblem[] {
  const types: ProblemType[] = [
    "add", "sub", "mul",
    "chain_add_mul", "chain_mul_add",
    "blank_add", "blank_sub", "blank_mul",
  ];
  const problems: MathProblem[] = [];
  while (problems.length < TOTAL) {
    const type = types[rand(0, types.length - 1)];
    const p = generateProblem(type);
    if (p) problems.push(p);
  }
  return problems;
}

export default function MathSparkGame({
  gameId,
  onGameComplete,
}: MathSparkGameProps) {
  const { incrementScore } = useScore();
  const { play } = useSfx();
  const [problems, setProblems] = useState<MathProblem[]>(() => generateRound());
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
    setProblems(generateRound());
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
            Mix of sums, differences, products, and missing numbers.
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
