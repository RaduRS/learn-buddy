"use client";

import type { CSSProperties } from "react";
import { Lock, Play, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, toCategoryKey } from "@/lib/games/categories";
import { useSfx } from "@/components/sound/SoundProvider";
import type { GameCardProps } from "@/types";

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
  4: "Expert",
  5: "Master",
};

const DIFFICULTY_DOTS = (difficulty: number) =>
  Array.from({ length: 5 }, (_, i) => i < difficulty);

/**
 * GameCard — chunky arcade-style card. The category drives the accent
 * color and surface tint. Locked games render a "Coming Soon" ribbon
 * instead of looking faded/broken.
 */
export function GameCard({ game, progress, onPlay, className }: GameCardProps) {
  const cat = CATEGORIES[toCategoryKey(game.category)];
  const { play } = useSfx();

  const handleClick = () => {
    if (!game.isActive) return;
    play("whoosh");
    onPlay(game.id);
  };

  return (
    <div
      className={cn(
        "surface-card relative flex flex-col p-5 sm:p-6",
        `cat-${cat.key}`,
        game.isActive
          ? "cursor-pointer active:scale-[0.985]"
          : "cursor-not-allowed",
        className,
      )}
      onClick={handleClick}
      role="button"
      tabIndex={game.isActive ? 0 : -1}
      aria-disabled={!game.isActive}
      aria-label={
        game.isActive ? `Play ${game.title}` : `${game.title} — coming soon`
      }
      onKeyDown={(e) => {
        if (!game.isActive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Category label */}
      <span
        className="text-[0.7rem] uppercase tracking-[0.18em] font-display"
        style={{ color: `var(${cat.cssVar})` }}
      >
        {cat.label}
      </span>

      <div className="mt-2 flex items-start gap-4">
        {/* Game icon — emoji from DB */}
        <span
          aria-hidden
          className="grid place-items-center text-4xl sm:text-5xl shrink-0
                     w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
                     bg-[oklch(0.20_0.06_285_/_0.6)]
                     border border-[var(--arcade-edge)]
                     shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12)]"
          style={{
            boxShadow: `0 8px 26px -14px var(${cat.cssGlowVar}), inset 0 1px 0 oklch(1 0 0 / 0.12)`,
          }}
        >
          {game.icon}
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl sm:text-2xl text-arcade-strong leading-tight">
            {game.title}
          </h3>
          <p className="mt-1 text-sm text-arcade-mid line-clamp-2">
            {game.description}
          </p>

          {/* Difficulty dots */}
          <div className="mt-3 flex items-center gap-1" aria-label={`Difficulty: ${DIFFICULTY_LABEL[game.difficulty] ?? "Unknown"}`}>
            {DIFFICULTY_DOTS(game.difficulty).map((on, i) => (
              <span
                key={i}
                className={cn(
                  "block h-1.5 w-4 rounded-full",
                  on
                    ? "bg-[color:var(--cat-color)]"
                    : "bg-[oklch(1_0_0_/_0.10)]",
                )}
                style={
                  on
                    ? ({ "--cat-color": `var(${cat.cssVar})` } as CSSProperties)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress / play row */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {progress ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-arcade-mid">
              <Star className="w-4 h-4" style={{ color: "var(--joy-gold)" }} />
              <span className="font-display">{progress.totalScore}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-arcade-soft">
              <Trophy className="w-4 h-4" />
              <span className="font-display">{progress.timesPlayed}</span>
            </span>
          </div>
        ) : (
          <span className="text-sm text-arcade-soft font-display">
            New for you
          </span>
        )}

        {game.isActive ? (
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                       font-display text-sm text-[var(--ink-on-color)]
                       shadow-[0_8px_22px_-12px_var(--cat-glow)]
                       border border-[oklch(0_0_0_/_0.2)]"
            style={
              {
                background: `linear-gradient(180deg, oklch(1 0 0 / 0.18), transparent), var(${cat.cssVar})`,
                "--cat-glow": `var(${cat.cssGlowVar})`,
              } as CSSProperties
            }
          >
            <Play className="w-4 h-4" aria-hidden />
            Play
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display
                           bg-[oklch(0.30_0.05_280_/_0.7)] text-arcade-soft
                           border border-[var(--arcade-edge)]">
            <Lock className="w-3.5 h-3.5" />
            Coming soon
          </span>
        )}
      </div>
    </div>
  );
}
