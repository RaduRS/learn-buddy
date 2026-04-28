"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Volume2 } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
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
  fill: string; // CSS color
  ring: string; // CSS color
  sizeClass?: string;
  className?: string;
  style?: CSSProperties;
};

const SHAPES: ShapeConfig[] = [
  {
    id: "circle",
    label: "Circle",
    fill: "oklch(0.78 0.18 25)",
    ring: "oklch(0.50 0.18 25)",
    className: "rounded-full",
  },
  {
    id: "square",
    label: "Square",
    fill: "oklch(0.74 0.18 250)",
    ring: "oklch(0.46 0.18 250)",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    fill: "oklch(0.78 0.18 145)",
    ring: "oklch(0.45 0.18 145)",
    sizeClass: "w-28 h-16 sm:w-32 sm:h-18",
  },
  {
    id: "triangle",
    label: "Triangle",
    fill: "oklch(0.85 0.16 90)",
    ring: "oklch(0.55 0.16 80)",
    style: { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" },
  },
  {
    id: "oval",
    label: "Oval",
    fill: "oklch(0.74 0.20 290)",
    ring: "oklch(0.46 0.20 290)",
    sizeClass: "w-16 h-24 sm:w-18 sm:h-28",
    className: "rounded-full",
  },
  {
    id: "diamond",
    label: "Diamond",
    fill: "oklch(0.74 0.22 340)",
    ring: "oklch(0.50 0.22 340)",
    className: "rotate-45",
  },
  {
    id: "pentagon",
    label: "Pentagon",
    fill: "oklch(0.78 0.18 60)",
    ring: "oklch(0.50 0.18 55)",
    style: { clipPath: "polygon(50% 0%, 0% 38%, 18% 100%, 82% 100%, 100% 38%)" },
  },
  {
    id: "hexagon",
    label: "Hexagon",
    fill: "oklch(0.78 0.16 200)",
    ring: "oklch(0.50 0.16 200)",
    style: {
      clipPath:
        "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    },
  },
  {
    id: "octagon",
    label: "Octagon",
    fill: "oklch(0.74 0.18 280)",
    ring: "oklch(0.46 0.18 280)",
    style: {
      clipPath:
        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    },
  },
  {
    id: "star",
    label: "Star",
    fill: "oklch(0.85 0.17 88)",
    ring: "oklch(0.55 0.16 80)",
    style: {
      clipPath:
        "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    },
  },
  {
    id: "trapezoid",
    label: "Trapezoid",
    fill: "oklch(0.80 0.18 130)",
    ring: "oklch(0.50 0.18 130)",
    style: { clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" },
  },
  {
    id: "parallelogram",
    label: "Parallelogram",
    fill: "oklch(0.78 0.18 180)",
    ring: "oklch(0.50 0.18 180)",
    style: { clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)" },
  },
];

export default function ShapesGame({ onGameComplete }: ShapesGameProps) {
  const { play } = useSfx();
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [tappedIds, setTappedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const handleShapeTap = (shape: ShapeConfig) => {
    setError(null);
    setLastSpoken(shape.label);
    setTappedIds((prev) => new Set(prev).add(shape.id));
    play("ding");
    speak(shape.label);
  };

  const handleRepeat = () => {
    if (lastSpoken) {
      play("tap");
      speak(lastSpoken);
    }
  };

  const handleFinish = () => {
    play("finish");
    setIsComplete(true);
    onGameComplete(tappedIds.size, SHAPES.length);
  };

  const handleReset = () => {
    setIsComplete(false);
    setTappedIds(new Set());
    setLastSpoken(null);
    setError(null);
  };

  if (isComplete) {
    return (
      <div className="py-6">
        <ResultsScreen
          score={tappedIds.size}
          total={SHAPES.length}
          category="spatial"
          headline={
            tappedIds.size === SHAPES.length
              ? "You met every shape!"
              : tappedIds.size > 0
                ? "Nice exploring!"
                : "Tap a shape to hear it!"
          }
          message={
            tappedIds.size === SHAPES.length
              ? "Every shape said hello back to you. Want to play again?"
              : `You met ${tappedIds.size} of ${SHAPES.length} shapes. Try the rest next time!`
          }
          onPlayAgain={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="surface-card cat-spatial p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-display text-2xl text-arcade-strong">
            Tap a shape to hear its name
          </h2>
          <p className="text-arcade-mid text-sm mt-1">
            Explore circles, squares, triangles, and more. Tap the gold button when you&apos;re done.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="chip">
            <span className="text-sm opacity-80">Met</span>
            <span className="font-display">{tappedIds.size}</span>
            <span className="opacity-70">/</span>
            <span className="font-display opacity-80">{SHAPES.length}</span>
          </span>
          {lastSpoken && (
            <span className="chip">
              <span className="text-sm opacity-80">Last</span>
              <span className="font-display">{lastSpoken}</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="surface-card p-4 text-arcade-mid">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {SHAPES.map((shape) => {
          const sizeClass = shape.sizeClass ?? "w-20 h-20 sm:w-24 sm:h-24";
          const tapped = tappedIds.has(shape.id);
          const active = lastSpoken === shape.label;
          return (
            <button
              key={shape.id}
              type="button"
              onClick={() => handleShapeTap(shape)}
              aria-label={shape.label}
              className={cn(
                "surface-card cat-spatial p-4 grid place-items-center gap-3 min-h-[10rem]",
                "active:scale-[0.97] transition-transform",
                active && "pulse-correct",
              )}
              style={
                tapped
                  ? ({
                      outline: "2px solid var(--cat-spatial)",
                      outlineOffset: "-2px",
                    } as CSSProperties)
                  : undefined
              }
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
              <span className="font-display text-arcade-strong">
                {shape.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={handleRepeat}
          disabled={!lastSpoken}
          className="font-display px-5 py-3 rounded-full inline-flex items-center justify-center gap-2
                     bg-[var(--arcade-card-soft)] text-arcade-strong
                     border border-[var(--arcade-edge)]
                     active:scale-[0.97]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Volume2 className="w-4 h-4" aria-hidden />
          Hear again
        </button>
        <button
          type="button"
          onClick={handleFinish}
          className="font-display px-6 py-3 rounded-full text-[var(--ink-on-color)]
                     bg-[var(--joy-gold)]
                     border border-[oklch(0.65_0.16_75)]
                     shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                     hover:brightness-105 active:scale-[0.97]"
        >
          I&apos;m done!
        </button>
      </div>
    </div>
  );
}
