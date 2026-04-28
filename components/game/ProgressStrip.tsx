"use client";

import type { CategoryKey } from "@/lib/games/categories";

interface ProgressStripProps {
  category?: CategoryKey;
  /** 0-based current question index. */
  index: number;
  total: number;
  /** Optional running score chip on the right. */
  score?: number;
  /** Override the kicker text on the left chip ("Question" by default). */
  label?: string;
}

/**
 * Slim per-round progress strip: chip · bar · score chip.
 * Used by every round-based game inside <GameShell>.
 */
export function ProgressStrip({
  category = "default",
  index,
  total,
  score,
  label = "Question",
}: ProgressStripProps) {
  const pct = total > 0 ? (index / total) * 100 : 0;

  return (
    <div className="surface-card p-3 sm:p-4 flex items-center gap-3">
      <span className="chip">
        <span className="text-sm opacity-80">{label}</span>
        <span className="font-display">{Math.min(index + 1, total)}</span>
        <span className="opacity-70">/</span>
        <span className="font-display opacity-80">{total}</span>
      </span>
      <div className="flex-1 h-2 rounded-full bg-[oklch(0.30_0.06_280_/_0.6)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: `var(--cat-${category})`,
          }}
        />
      </div>
      {score !== undefined && (
        <span className="chip chip-gold" aria-label={`Score: ${score}`}>
          <span className="font-display">{score}</span>
          <span className="text-sm opacity-80">★</span>
        </span>
      )}
    </div>
  );
}
