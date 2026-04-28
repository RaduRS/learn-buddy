"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Volume2 } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { ProgressStrip } from "@/components/game/ProgressStrip";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface ShapesGameProps {
  userId?: string;
  gameId?: string;
  userAge: number;
  onGameComplete: (score: number, totalShapes: number) => void;
}

type ShapeConfig = {
  id: string;
  label: string;
  fill: string;
  ring: string;
  sizeClass?: string;
  className?: string;
  style?: CSSProperties;
};

const SHAPES: ShapeConfig[] = [
  { id: "circle", label: "Circle", fill: "oklch(0.78 0.18 25)",  ring: "oklch(0.50 0.18 25)",  className: "rounded-full" },
  { id: "square", label: "Square", fill: "oklch(0.74 0.18 250)", ring: "oklch(0.46 0.18 250)" },
  { id: "rectangle", label: "Rectangle", fill: "oklch(0.78 0.18 145)", ring: "oklch(0.45 0.18 145)", sizeClass: "w-28 h-16 sm:w-32 sm:h-18" },
  { id: "triangle", label: "Triangle", fill: "oklch(0.85 0.16 90)", ring: "oklch(0.55 0.16 80)", style: { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" } },
  { id: "oval", label: "Oval", fill: "oklch(0.74 0.20 290)", ring: "oklch(0.46 0.20 290)", sizeClass: "w-16 h-24 sm:w-18 sm:h-28", className: "rounded-full" },
  { id: "diamond", label: "Diamond", fill: "oklch(0.74 0.22 340)", ring: "oklch(0.50 0.22 340)", className: "rotate-45" },
  { id: "pentagon", label: "Pentagon", fill: "oklch(0.78 0.18 60)", ring: "oklch(0.50 0.18 55)", style: { clipPath: "polygon(50% 0%, 0% 38%, 18% 100%, 82% 100%, 100% 38%)" } },
  { id: "hexagon", label: "Hexagon", fill: "oklch(0.78 0.16 200)", ring: "oklch(0.50 0.16 200)", style: { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" } },
  { id: "octagon", label: "Octagon", fill: "oklch(0.74 0.18 280)", ring: "oklch(0.46 0.18 280)", style: { clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" } },
  { id: "star", label: "Star", fill: "oklch(0.85 0.17 88)", ring: "oklch(0.55 0.16 80)", style: { clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" } },
  { id: "trapezoid", label: "Trapezoid", fill: "oklch(0.80 0.18 130)", ring: "oklch(0.50 0.18 130)", style: { clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" } },
  { id: "parallelogram", label: "Parallelogram", fill: "oklch(0.78 0.18 180)", ring: "oklch(0.50 0.18 180)", style: { clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)" } },
];

const QUIZ_TOTAL = 10;

type Mode = "learn" | "quiz";

export default function ShapesGame({ gameId, onGameComplete }: ShapesGameProps) {
  const { play } = useSfx();
  const { incrementScore } = useScore();
  const [mode, setMode] = useState<Mode>("learn");
  const [error, setError] = useState<string | null>(null);

  // Shared TTS — cancelled cleanly on unmount.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setError("Speech is not supported in this browser.");
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    },
    [],
  );

  return (
    <div className="space-y-5">
      <ModeToggle mode={mode} onChange={(m) => { play("tap"); setMode(m); }} />

      {error && (
        <div role="alert" className="surface-card p-4 text-arcade-mid">
          {error}
        </div>
      )}

      {mode === "learn" ? (
        <LearnMode play={play} speak={speak} />
      ) : (
        <QuizMode
          gameId={gameId}
          play={play}
          speak={speak}
          incrementScore={incrementScore}
          onGameComplete={onGameComplete}
        />
      )}
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="surface-card cat-spatial p-2 inline-flex w-full sm:w-auto gap-1">
      {(["learn", "quiz"] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "flex-1 sm:flex-none font-display px-5 py-2.5 rounded-full text-sm sm:text-base",
              "transition-colors",
              active
                ? "text-[var(--ink-on-color)]"
                : "text-arcade-strong",
            )}
            style={
              active
                ? {
                    background:
                      "linear-gradient(180deg, oklch(1 0 0 / 0.18), transparent), var(--cat-spatial)",
                    boxShadow:
                      "0 6px 18px -10px var(--cat-spatial-glow), inset 0 1px 0 oklch(1 0 0 / 0.30)",
                  }
                : undefined
            }
            aria-pressed={active}
          >
            {m === "learn" ? "Learn" : "Quiz"}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Learn mode ───────── */

function LearnMode({
  play,
  speak,
}: {
  play: (s: "tap" | "ding") => void;
  speak: (text: string) => void;
}) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);

  const handleTap = (shape: ShapeConfig) => {
    setLastSpoken(shape.label);
    play("ding");
    speak(shape.label);
  };

  return (
    <div className="space-y-5">
      <div className="surface-card cat-spatial p-5 sm:p-6">
        <h2 className="font-display text-2xl text-arcade-strong">
          Tap a shape to hear its name
        </h2>
        <p className="text-arcade-mid text-sm mt-1">
          Just for fun — no points here. Explore as long as you like.
        </p>
        {lastSpoken && (
          <p className="mt-3 text-sm text-arcade-soft">
            Last: <span className="font-display text-arcade-strong">{lastSpoken}</span>
          </p>
        )}
      </div>

      <ShapesGrid
        onTap={handleTap}
        highlightLabel={lastSpoken ?? undefined}
      />
    </div>
  );
}

/* ───────── Quiz mode ───────── */

function QuizMode({
  gameId,
  play,
  speak,
  incrementScore,
  onGameComplete,
}: {
  gameId: string | undefined;
  play: (s: "tap" | "correct" | "wrong" | "ding" | "levelup") => void;
  speak: (text: string) => void;
  incrementScore: (gameId: string, points?: number) => void;
  onGameComplete: (score: number, total: number) => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [target, setTarget] = useState<ShapeConfig | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);

  const askNext = useCallback(() => {
    const next = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    setTarget(next);
    setFeedback(null);
    setTimeout(() => speak(`Tap the ${next.label}`), 80);
  }, [speak]);

  // Kick off the first question on mount.
  useEffect(() => {
    if (!done) askNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTap = (shape: ShapeConfig) => {
    if (!target || feedback) return;
    if (shape.id === target.id) {
      const next = scoreRef.current + 1;
      scoreRef.current = next;
      setScore(next);
      play("correct");
      if (gameId) incrementScore(gameId, 1);
      setFeedback("correct");
      setTimeout(() => {
        if (questionIndex + 1 >= QUIZ_TOTAL) {
          setDone(true);
          play("levelup");
          onGameComplete(scoreRef.current, QUIZ_TOTAL);
        } else {
          setQuestionIndex((i) => i + 1);
          askNext();
        }
      }, 600);
    } else {
      play("wrong");
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 600);
    }
  };

  const restart = () => {
    play("tap");
    scoreRef.current = 0;
    setScore(0);
    setQuestionIndex(0);
    setDone(false);
    askNext();
  };

  if (done) {
    return (
      <ResultsScreen
        score={score}
        total={QUIZ_TOTAL}
        category="spatial"
        onPlayAgain={restart}
      />
    );
  }

  return (
    <div className="space-y-5">
      <ProgressStrip
        category="spatial"
        index={questionIndex}
        total={QUIZ_TOTAL}
        score={score}
      />

      <div className="surface-card cat-spatial p-5 sm:p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] font-display" style={{ color: "var(--cat-spatial)" }}>
            Buddy says
          </p>
          <h2 className="font-display text-2xl text-arcade-strong">
            Tap the <span style={{ color: "var(--cat-spatial)" }}>{target?.label ?? "…"}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (target) {
              play("tap");
              speak(`Tap the ${target.label}`);
            }
          }}
          className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full
                     bg-[var(--arcade-card-soft)] text-arcade-strong
                     border border-[var(--arcade-edge)]
                     active:scale-[0.97]"
          aria-label="Hear it again"
        >
          <Volume2 className="w-4 h-4" aria-hidden />
          Hear it
        </button>
      </div>

      <ShapesGrid
        onTap={handleTap}
        showLabels={false}
        flashWrong={feedback === "wrong"}
      />
    </div>
  );
}

/* ───────── Shared grid ───────── */

function ShapesGrid({
  onTap,
  highlightLabel,
  showLabels = true,
  flashWrong = false,
}: {
  onTap: (shape: ShapeConfig) => void;
  highlightLabel?: string;
  showLabels?: boolean;
  flashWrong?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4",
        flashWrong && "shake",
      )}
    >
      {SHAPES.map((shape) => {
        const sizeClass = shape.sizeClass ?? "w-20 h-20 sm:w-24 sm:h-24";
        const active = highlightLabel === shape.label;
        return (
          <button
            key={shape.id}
            type="button"
            onClick={() => onTap(shape)}
            aria-label={shape.label}
            className={cn(
              "surface-card cat-spatial p-4 grid place-items-center gap-3 min-h-[10rem]",
              "active:scale-[0.97] transition-transform",
              active && "pulse-correct",
            )}
          >
            <span
              aria-hidden
              className={cn(sizeClass, shape.className)}
              style={{
                ...shape.style,
                background: `linear-gradient(180deg, oklch(1 0 0 / 0.18), transparent), ${shape.fill}`,
                boxShadow: shape.style?.clipPath
                  ? undefined
                  : `0 6px 22px -10px ${shape.ring}, inset 0 1px 0 oklch(1 0 0 / 0.20)`,
              }}
            />
            {showLabels && (
              <span className="font-display text-arcade-strong">
                {shape.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
