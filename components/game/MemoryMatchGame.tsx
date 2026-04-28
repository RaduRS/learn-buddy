"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, RotateCcw, Sparkles } from "lucide-react";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useScore } from "@/hooks/useScore";
import { useAchievementUnlock } from "@/hooks/useAchievementUnlock";
import { useSfx } from "@/components/sound/SoundProvider";
import { MEMORY_ICON_MAP } from "@/lib/games/memory-icon-map";
import { cn } from "@/lib/utils";

interface MemoryCard {
  id: string;
  /** Lucide icon name (or "" for empty slot). */
  emoji: string;
  /** CSS color used to tint the icon when revealed. */
  color?: string;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchConfig {
  cards: MemoryCard[];
  gridRows: number;
  gridCols: number;
  numPairs: number;
  timeLimit?: number;
}

interface MemoryMatchGameProps {
  userId?: string;
  gameId?: string;
  userAge: number;
  gridConfig?: { rows: number; cols: number; pairs: number };
  onGameComplete: (score: number, totalQuestions: number) => void;
}

const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
};

export default function MemoryMatchGame({
  userId,
  gameId,
  userAge,
  gridConfig,
  onGameComplete,
}: MemoryMatchGameProps) {
  const { incrementScore } = useScore();
  const { unlock } = useAchievementUnlock(userId);
  const { play } = useSfx();

  const [config, setConfig] = useState<MemoryMatchConfig | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost">("loading");
  const completedRef = useRef(false);
  const cardsRef = useRef<MemoryCard[]>([]);
  cardsRef.current = cards;

  const loadGame = useCallback(async () => {
    completedRef.current = false;
    setStatus("loading");
    setCards([]);
    setFlippedIds([]);
    setMatchedPairs([]);
    setMoves(0);
    setTimeLeft(null);

    try {
      const response = await fetch("/api/ai/generate-memory-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAge,
          rows: gridConfig?.rows,
          cols: gridConfig?.cols,
          pairs: gridConfig?.pairs,
        }),
      });
      if (!response.ok) throw new Error("Failed to load memory match game");

      const gameConfig: MemoryMatchConfig = await response.json();
      setConfig(gameConfig);
      setCards(
        gameConfig.cards.map((c) => ({ ...c, isFlipped: false, isMatched: false })),
      );
      setTimeLeft(gameConfig.timeLimit || 60000);
      setStatus("playing");
    } catch (error) {
      console.error("Error loading memory match game:", error);
      setStatus("lost");
    }
  }, [userAge, gridConfig?.rows, gridConfig?.cols, gridConfig?.pairs]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  // Wall-clock timer (re-uses the existing 1s tick logic but is robust to tab throttling).
  useEffect(() => {
    if (status !== "playing" || timeLeft === null || timeLeft <= 0) return;
    const id = window.setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1000) {
          setStatus("lost");
          play("wrong");
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => window.clearTimeout(id);
  }, [timeLeft, status, play]);

  // Resolve a pair after two cards are flipped.
  useEffect(() => {
    if (flippedIds.length !== 2) return;
    setMoves((m) => m + 1);

    const [firstId, secondId] = flippedIds;

    const id = window.setTimeout(() => {
      const a = cardsRef.current.find((c) => c.id === firstId);
      const b = cardsRef.current.find((c) => c.id === secondId);
      if (a && b && a.pairId === b.pairId) {
        play("correct");
        setMatchedPairs((prev) => [...prev, a.pairId]);
        setCards((prev) =>
          prev.map((c) =>
            c.pairId === a.pairId ? { ...c, isMatched: true, isFlipped: true } : c,
          ),
        );
      } else {
        play("wrong");
        setCards((prev) =>
          prev.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c,
          ),
        );
      }
      setFlippedIds([]);
    }, 900);
    return () => window.clearTimeout(id);
  }, [flippedIds, play]);

  // Win condition.
  useEffect(() => {
    if (
      !config ||
      status !== "playing" ||
      matchedPairs.length !== config.cards.length / 2 ||
      completedRef.current
    ) {
      return;
    }
    completedRef.current = true;
    setStatus("won");

    const numPairs = config.cards.length / 2;
    let score = 1;
    if (moves <= numPairs + 2) score += 1;
    if (timeLeft && timeLeft > (config.timeLimit || 60000) * 0.5) score += 1;

    if (gameId) incrementScore(gameId, score);
    onGameComplete(score, numPairs);

    void unlock({
      gameId,
      title: "Memory Master",
      description: "Complete a Memory Match game!",
      icon: "🧠",
    });

    if (moves <= config.cards.length) {
      void unlock({
        gameId,
        title: "Perfect Memory",
        description: "Complete Memory Match with minimal moves!",
        icon: "⭐",
      });
    }
    if (timeLeft && timeLeft > (config.timeLimit || 60000) * 0.5) {
      void unlock({
        gameId,
        title: "Speed Demon",
        description: "Complete Memory Match quickly!",
        icon: "⚡",
      });
    }
  }, [
    matchedPairs,
    config,
    status,
    moves,
    timeLeft,
    gameId,
    unlock,
    incrementScore,
    onGameComplete,
  ]);

  const handleCardClick = (cardId: string) => {
    if (flippedIds.length >= 2 || status !== "playing") return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isMatched || card.isFlipped) return;

    play("tap");
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c)),
    );
    setFlippedIds((prev) => [...prev, cardId]);
  };

  const formattedTime = useMemo(() => {
    if (timeLeft === null) return null;
    return `${Math.ceil(timeLeft / 1000)}s`;
  }, [timeLeft]);

  if (status === "loading") {
    return (
      <LoadingScreen
        tone="generating"
        message="Buddy is shuffling the cards…"
        subMessage="Picking a fresh set just for you."
      />
    );
  }

  if (status === "won" && config) {
    const numPairs = config.cards.length / 2;
    const finalScore = (() => {
      let score = 1;
      if (moves <= numPairs + 2) score += 1;
      if (timeLeft && timeLeft > (config.timeLimit || 60000) * 0.5) score += 1;
      return score;
    })();
    return (
      <div className="py-6">
        <ResultsScreen
          score={finalScore}
          total={3}
          category="memory"
          headline="Match made!"
          message={`You found all ${numPairs} pairs in ${moves} moves${timeLeft ? `, with ${formattedTime} to spare` : ""}.`}
          onPlayAgain={loadGame}
        />
      </div>
    );
  }

  if (status === "lost" && config) {
    return (
      <div className="py-6">
        <ResultsScreen
          score={matchedPairs.length}
          total={config.cards.length / 2}
          category="memory"
          headline="Time's up!"
          message={`You matched ${matchedPairs.length} of ${config.cards.length / 2} pairs. Want another round?`}
          onPlayAgain={loadGame}
        />
      </div>
    );
  }

  if (!config) return null;

  const totalPairs = config.cards.length / 2;
  const lowTime = (timeLeft ?? Infinity) < 10000;

  return (
    <div className="space-y-5">
      <div className="surface-card cat-memory p-4 flex items-center gap-3">
        <span className="chip">
          <span className="text-sm opacity-80">Moves</span>
          <span className="font-display">{moves}</span>
        </span>
        <span className="chip">
          <span className="text-sm opacity-80">Pairs</span>
          <span className="font-display">{matchedPairs.length}</span>
          <span className="opacity-70">/</span>
          <span className="font-display opacity-80">{totalPairs}</span>
        </span>
        {formattedTime !== null && (
          <span
            className={cn("chip", lowTime && "chip-gold")}
            style={
              lowTime
                ? {
                    background:
                      "linear-gradient(180deg, oklch(0.86 0.20 25), oklch(0.62 0.20 25))",
                    color: "oklch(0.18 0.06 25)",
                    borderColor: "oklch(0.50 0.16 25)",
                  }
                : undefined
            }
          >
            <Clock className="w-4 h-4" aria-hidden />
            <span className="font-display">{formattedTime}</span>
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={loadGame}
          className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full
                     bg-[var(--arcade-card-soft)] text-arcade-strong
                     border border-[var(--arcade-edge)]
                     active:scale-[0.97]"
          aria-label="New game"
        >
          <RotateCcw className="w-4 h-4" />
          New
        </button>
      </div>

      <div
        className={cn(
          "grid gap-2 sm:gap-3 mx-auto",
          GRID_COLS_CLASS[config.gridCols] ?? "grid-cols-4",
        )}
        style={{ maxWidth: `${Math.min(900, config.gridCols * 110)}px` }}
      >
        {cards.map((card) => {
          const empty = card.emoji === "";
          const revealed = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => !empty && handleCardClick(card.id)}
              disabled={empty}
              aria-label={revealed ? card.emoji : "Hidden card"}
              className={cn(
                "aspect-square rounded-2xl relative overflow-hidden",
                "border border-[var(--arcade-edge)]",
                "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]",
                "transition-transform",
                empty
                  ? "bg-[oklch(0.20_0.06_285_/_0.45)] opacity-40 cursor-default"
                  : revealed
                    ? "bg-[var(--arcade-card-soft)]"
                    : "active:scale-[0.97] cursor-pointer",
                card.isMatched && "ring-2 ring-[color:var(--cat-music)] just-placed",
              )}
              style={
                !revealed && !empty
                  ? {
                      background:
                        "linear-gradient(140deg, var(--cat-memory) 0%, var(--cat-default) 100%)",
                    }
                  : undefined
              }
            >
              {!empty && (
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center font-display text-3xl text-white/95",
                    "transition-opacity duration-300",
                    revealed ? "opacity-0" : "opacity-100",
                  )}
                >
                  ?
                </span>
              )}
              {!empty && (
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center",
                    "transition-opacity duration-300",
                    revealed ? "opacity-100" : "opacity-0",
                  )}
                >
                  <CardFace name={card.emoji} color={card.color} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardFace({ name, color }: { name: string; color?: string }) {
  const Icon = MEMORY_ICON_MAP[name] ?? Sparkles;
  return (
    <Icon
      className="w-9 h-9 sm:w-12 sm:h-12"
      strokeWidth={1.6}
      style={{ color: color ?? "var(--cat-memory)" }}
      aria-hidden
    />
  );
}
