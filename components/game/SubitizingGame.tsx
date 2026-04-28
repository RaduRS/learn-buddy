"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Eye, XCircle } from "lucide-react";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { ProgressStrip } from "@/components/game/ProgressStrip";
import { useScore } from "@/hooks/useScore";
import { useApiCall } from "@/hooks/useApiCall";
import { useAchievementUnlock } from "@/hooks/useAchievementUnlock";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface SubitizingGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

interface SubitizingObject {
  x: number;
  y: number;
  color: string;
  shape: string;
  size?: "small" | "medium" | "large";
}

interface SubitizingQuestion {
  id: number;
  objects: SubitizingObject[];
  correctAnswer: number;
  difficulty: number;
  timeLimit: number;
  educationalTip?: string;
  encouragement?: string;
}

const SHAPES_FALLBACK = ["circle", "square", "triangle", "star", "heart"];
const COLORS_FALLBACK = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8",
];
const TOTAL = 10;

const SHAPE_GLYPH: Record<string, string> = {
  circle: "●",
  square: "■",
  triangle: "▲",
  star: "★",
  heart: "♥",
};

export default function SubitizingGame({
  userId,
  gameId,
  userAge,
  onGameComplete,
}: SubitizingGameProps) {
  const { incrementScore } = useScore();
  const { unlock } = useAchievementUnlock(userId);
  const { play } = useSfx();
  const { execute, loading } = useApiCall<SubitizingQuestion>({ timeout: 20000 });

  const [currentQuestion, setCurrentQuestion] = useState<SubitizingQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0); // 0-based
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [phase, setPhase] = useState<"playing" | "answered" | "complete">("playing");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showObjects, setShowObjects] = useState(true);
  const generatingRef = useRef(false);

  const generateQuestion = useCallback(
    async (number: number, prevCorrect: boolean | null) => {
      if (generatingRef.current) return;
      generatingRef.current = true;

      const result = await execute(
        async () => {
          const response = await fetch("/api/ai/generate-subitizing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
              userAge,
              difficulty: Math.ceil(number / 3),
              questionNumber: number,
              previousCorrect: prevCorrect,
              timestamp: Date.now(),
            }),
          });
          if (!response.ok) throw new Error("Failed to generate AI pattern");
          return await response.json();
        },
        (aiPattern) => {
          const question: SubitizingQuestion = {
            id: number,
            objects: aiPattern.objects,
            correctAnswer: aiPattern.correctAnswer,
            difficulty: aiPattern.difficulty,
            timeLimit: aiPattern.timeLimit,
            educationalTip: aiPattern.educationalTip,
            encouragement: aiPattern.encouragement,
          };
          setCurrentQuestion(question);
          setTimeLeft(aiPattern.timeLimit);
          setShowObjects(true);
          window.setTimeout(() => setShowObjects(false), aiPattern.timeLimit);
        },
      );

      if (result.error) {
        // Fallback: locally generated pattern.
        const maxObjects =
          userAge >= 6
            ? Math.min(5, 2 + Math.floor(number / 3))
            : Math.min(4, 2 + Math.floor(number / 4));
        const timeLimit =
          userAge >= 6
            ? Math.max(2000, 4000 - number * 100)
            : Math.max(2500, 4500 - number * 100);

        const numObjects = Math.floor(Math.random() * maxObjects) + 1;
        const objects: SubitizingObject[] = [];
        const used = new Set<string>();
        for (let i = 0; i < numObjects; i++) {
          let x = 0, y = 0, posKey = "";
          let attempts = 0;
          do {
            x = Math.floor(Math.random() * 8) + 1;
            y = Math.floor(Math.random() * 6) + 1;
            posKey = `${x}-${y}`;
            attempts++;
          } while (used.has(posKey) && attempts < 20);
          if (attempts < 20) {
            used.add(posKey);
            objects.push({
              x: x * 10 + Math.random() * 5,
              y: y * 10 + Math.random() * 5,
              color: COLORS_FALLBACK[Math.floor(Math.random() * COLORS_FALLBACK.length)],
              shape: SHAPES_FALLBACK[Math.floor(Math.random() * SHAPES_FALLBACK.length)],
            });
          }
        }
        const fallback: SubitizingQuestion = {
          id: number,
          objects,
          correctAnswer: objects.length,
          difficulty: Math.ceil(objects.length / 2),
          timeLimit,
          educationalTip: "Look quickly and trust your first instinct!",
          encouragement: "You're doing great — keep going!",
        };
        setCurrentQuestion(fallback);
        setTimeLeft(timeLimit);
        setShowObjects(true);
        window.setTimeout(() => setShowObjects(false), timeLimit);
      }

      generatingRef.current = false;
    },
    [userAge, execute],
  );

  // Countdown bar (100ms tick).
  useEffect(() => {
    if (timeLeft <= 0 || !showObjects) return;
    const id = window.setTimeout(() => setTimeLeft((v) => Math.max(0, v - 100)), 100);
    return () => window.clearTimeout(id);
  }, [timeLeft, showObjects]);

  // Generate when needed.
  useEffect(() => {
    if (phase === "playing" && !currentQuestion && questionIndex < TOTAL) {
      void generateQuestion(questionIndex + 1, isCorrect);
    }
  }, [phase, currentQuestion, questionIndex, generateQuestion, isCorrect]);

  const handleAnswer = useCallback(
    async (answer: number) => {
      if (phase !== "playing" || !currentQuestion || selectedAnswer !== null) return;

      setSelectedAnswer(answer);
      const correct = answer === currentQuestion.correctAnswer;
      setIsCorrect(correct);
      setPhase("answered");

      if (correct) {
        const next = scoreRef.current + 1;
        scoreRef.current = next;
        setScore(next);
        play("correct");

        if (next === 1) {
          // Mirror the original behavior: pre-create the three score-tier
          // achievements so the achievements page can render their progress.
          void unlock({ gameId, title: "Bronze Achievement", description: "Scored 10 points in Subitizing!", icon: "🥉" });
          void unlock({ gameId, title: "Silver Achievement", description: "Scored 50 points in Subitizing!", icon: "🥈" });
          void unlock({ gameId, title: "Gold Achievement",   description: "Scored 100 points in Subitizing!", icon: "🥇" });
        }

        try {
          await incrementScore(gameId, 1);
        } catch (error) {
          console.error("Error updating score:", error);
        }
      } else {
        play("wrong");
      }
    },
    [phase, currentQuestion, selectedAnswer, gameId, incrementScore, play, unlock],
  );

  const handleNext = useCallback(() => {
    play("tap");
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowObjects(false);

    if (questionIndex + 1 >= TOTAL) {
      setPhase("complete");
      void unlock({ gameId, title: "First Game", description: "Completed your first Subitizing game!", icon: "🎮" });
      if (scoreRef.current >= 8) {
        void unlock({ gameId, title: "High Scorer", description: "Scored 8 or more points in a single game!", icon: "🧠" });
      }
      if (scoreRef.current === TOTAL) {
        void unlock({ gameId, title: "Perfect Game", description: "Got every question right in a game!", icon: "💎" });
      }
      onGameComplete(scoreRef.current, TOTAL);
      return;
    }
    setQuestionIndex((i) => i + 1);
    setCurrentQuestion(null);
    setPhase("playing");
  }, [questionIndex, gameId, onGameComplete, play, unlock]);

  const restart = () => {
    play("tap");
    scoreRef.current = 0;
    setScore(0);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCurrentQuestion(null);
    setPhase("playing");
    setShowObjects(true);
  };

  if (phase === "complete") {
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

  if (loading || !currentQuestion) {
    return (
      <LoadingScreen
        tone="generating"
        message="Buddy is arranging objects…"
        subMessage="Get ready to count quick!"
      />
    );
  }

  return (
    <div className="space-y-5">
      <ProgressStrip
        category="math"
        index={questionIndex}
        total={TOTAL}
        score={score}
      />

      <div className="surface-card cat-math p-5 sm:p-7">
        <div className="text-center mb-4">
          <h2 className="font-display text-2xl text-arcade-strong inline-flex items-center gap-2">
            <Eye className="w-6 h-6" style={{ color: "var(--cat-math)" }} aria-hidden />
            How many objects do you see?
          </h2>
          <p className="text-arcade-mid text-sm mt-1">
            {showObjects ? "Look quick!" : "Now pick your answer."}
          </p>
        </div>

        <div className="relative w-full h-64 sm:h-72 rounded-2xl border-2 border-dashed border-[var(--arcade-edge)] bg-[oklch(0.20_0.06_285_/_0.45)] overflow-hidden">
          {currentQuestion.objects.map((obj, i) => (
            <ShapeGlyph key={i} obj={obj} visible={showObjects} />
          ))}
          {!showObjects && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-5xl">🤔</div>
                <p className="mt-2 text-arcade-mid font-display">
                  How many were there?
                </p>
              </div>
            </div>
          )}
        </div>

        {showObjects && (
          <div className="mt-4">
            <div className="w-full h-2 rounded-full bg-[oklch(0.30_0.06_280_/_0.6)] overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-100"
                style={{
                  width: `${(timeLeft / currentQuestion.timeLimit) * 100}%`,
                  background: "var(--cat-math)",
                }}
              />
            </div>
            <p className="text-xs text-arcade-soft text-center mt-1">
              Look carefully — objects will disappear soon.
            </p>
          </div>
        )}

        {!showObjects && (
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
              const picked = selectedAnswer === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleAnswer(n)}
                  disabled={selectedAnswer !== null}
                  className={cn(
                    "h-14 rounded-2xl font-display text-2xl",
                    "border",
                    "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]",
                    "active:scale-[0.97]",
                    "disabled:cursor-not-allowed",
                    picked
                      ? isCorrect
                        ? "bg-[oklch(0.30_0.10_145_/_0.7)] text-[oklch(0.95_0.13_145)] border-[oklch(0.55_0.16_145)]"
                        : "bg-[oklch(0.30_0.12_25_/_0.7)] text-[oklch(0.95_0.13_25)] border-[oklch(0.55_0.16_25)]"
                      : "bg-[var(--arcade-card-soft)] text-arcade-strong border-[var(--arcade-edge)] disabled:opacity-50",
                  )}
                >
                  {picked && (
                    <span className="inline-flex items-center gap-1.5">
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4" aria-hidden />
                      ) : (
                        <XCircle className="w-4 h-4" aria-hidden />
                      )}
                      {n}
                    </span>
                  )}
                  {!picked && n}
                </button>
              );
            })}
          </div>
        )}

        {selectedAnswer !== null && (
          <div className="mt-5 text-center space-y-2">
            <p
              className="text-lg font-display"
              style={{
                color: isCorrect ? "var(--joy-correct)" : "var(--joy-wrong)",
              }}
            >
              {isCorrect
                ? "Yes! That's right."
                : `Not this time — there were ${currentQuestion.correctAnswer}.`}
            </p>
            {currentQuestion.encouragement && (
              <p className="text-sm" style={{ color: "var(--cat-math)" }}>
                {currentQuestion.encouragement}
              </p>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="mt-3 font-display text-lg px-7 py-3 rounded-full text-[var(--ink-on-color)]
                         bg-[var(--cat-math)]
                         border border-[oklch(0.45_0.18_250)]
                         shadow-[0_8px_22px_-10px_var(--cat-math-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                         active:scale-[0.97]"
            >
              {questionIndex + 1 >= TOTAL ? "Finish game" : "Next question"}
            </button>
          </div>
        )}

        {currentQuestion.educationalTip && !selectedAnswer && !showObjects && (
          <div className="mt-4 mx-auto max-w-lg p-3 rounded-2xl bg-[oklch(0.30_0.12_250_/_0.4)] border border-[var(--arcade-edge)] text-arcade-mid text-sm">
            <span className="font-display" style={{ color: "var(--cat-math)" }}>
              Tip ·{" "}
            </span>
            {currentQuestion.educationalTip}
          </div>
        )}
      </div>

      <div className="text-center">
        <span className="chip">
          <span className="text-sm opacity-80">Difficulty</span>
          <span className="font-display">{currentQuestion.difficulty}</span>
          <span className="opacity-70">/</span>
          <span className="font-display opacity-80">3</span>
        </span>
      </div>
    </div>
  );
}

function ShapeGlyph({
  obj,
  visible,
}: {
  obj: SubitizingObject;
  visible: boolean;
}) {
  const sizeMap: Record<NonNullable<SubitizingObject["size"]>, string> = {
    small: "1.6rem",
    medium: "3rem",
    large: "4.2rem",
  };
  const fontSize = sizeMap[obj.size ?? "medium"];

  return (
    <span
      style={{
        position: "absolute",
        left: `${Math.max(8, Math.min(92, obj.x))}%`,
        top: `${Math.max(10, Math.min(90, obj.y))}%`,
        color: obj.color,
        fontSize,
        transform: "translate(-50%, -50%)",
        transition: "opacity 0.3s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
        textShadow: "0 4px 18px oklch(0 0 0 / 0.45)",
      }}
    >
      {SHAPE_GLYPH[obj.shape] ?? "●"}
    </span>
  );
}
