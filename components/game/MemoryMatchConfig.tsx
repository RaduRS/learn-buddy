"use client";

import { useState } from "react";
import { Clock, Grid2X2, Grid3X3, LayoutGrid, Trophy, Zap } from "lucide-react";
import { Buddy } from "@/components/mascot/Buddy";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface GridOption {
  id: string;
  name: string;
  rows: number;
  cols: number;
  totalCards: number;
  pairs: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  estimatedTime: string;
  Icon: typeof Grid3X3;
}

interface MemoryMatchConfigProps {
  onConfigSelect: (config: { rows: number; cols: number; pairs: number }) => void;
  onCancel?: () => void;
}

const GRID_OPTIONS: GridOption[] = [
  { id: "3x3", name: "3 × 3", rows: 3, cols: 3, totalCards: 8, pairs: 4, difficulty: "Easy",   estimatedTime: "1–2 min",  Icon: Grid3X3 },
  { id: "4x3", name: "4 × 3", rows: 4, cols: 3, totalCards: 12, pairs: 6, difficulty: "Easy",   estimatedTime: "2–3 min",  Icon: Grid2X2 },
  { id: "4x4", name: "4 × 4", rows: 4, cols: 4, totalCards: 16, pairs: 8, difficulty: "Medium", estimatedTime: "3–4 min",  Icon: LayoutGrid },
  { id: "5x4", name: "5 × 4", rows: 5, cols: 4, totalCards: 20, pairs: 10, difficulty: "Medium", estimatedTime: "4–5 min",  Icon: LayoutGrid },
  { id: "6x4", name: "6 × 4", rows: 6, cols: 4, totalCards: 24, pairs: 12, difficulty: "Hard",   estimatedTime: "5–7 min",  Icon: LayoutGrid },
  { id: "6x6", name: "6 × 6", rows: 6, cols: 6, totalCards: 36, pairs: 18, difficulty: "Expert", estimatedTime: "8–12 min", Icon: LayoutGrid },
];

const DIFFICULTY_TINT: Record<GridOption["difficulty"], string> = {
  Easy:   "var(--joy-correct)",
  Medium: "var(--cat-math)",
  Hard:   "var(--cat-reading)",
  Expert: "var(--cat-spatial)",
};

export default function MemoryMatchConfig({
  onConfigSelect,
  onCancel,
}: MemoryMatchConfigProps) {
  const { play } = useSfx();
  const [selected, setSelected] = useState<GridOption | null>(null);

  const handleStart = () => {
    if (!selected) return;
    play("levelup");
    onConfigSelect({
      rows: selected.rows,
      cols: selected.cols,
      pairs: selected.pairs,
    });
  };

  return (
    <div className="space-y-6">
      <div className="surface-card cat-memory p-5 sm:p-7 flex items-center gap-5">
        <div className="hidden sm:block">
          <Buddy mood="cheer" size="md" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong">
            Pick your board
          </h2>
          <p className="mt-1 text-arcade-mid">
            Smaller grids are quicker. Bigger grids hide more pairs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {GRID_OPTIONS.map((option) => {
          const Icon = option.Icon;
          const isSelected = selected?.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                play("tap");
                setSelected(option);
              }}
              aria-pressed={isSelected}
              className={cn(
                "surface-card cat-memory text-left p-4 sm:p-5",
                "active:scale-[0.985] transition-transform",
              )}
              style={
                isSelected
                  ? {
                      outline: "2px solid var(--joy-gold)",
                      outlineOffset: "-2px",
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-arcade-strong">
                  <Icon className="w-5 h-5" style={{ color: "var(--cat-memory)" }} />
                  <span className="font-display text-lg">{option.name}</span>
                </div>
                <span
                  className="font-display text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    color: DIFFICULTY_TINT[option.difficulty],
                    borderColor: DIFFICULTY_TINT[option.difficulty],
                    background: "oklch(0.20 0.06 285 / 0.5)",
                  }}
                >
                  {option.difficulty}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm text-arcade-mid">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 opacity-80" aria-hidden />
                  <span>
                    {option.pairs} pairs · {option.totalCards} cards
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-80" aria-hidden />
                  <span>{option.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 opacity-80" aria-hidden />
                  <span>
                    {option.rows} × {option.cols}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="font-display px-6 py-3 rounded-full text-arcade-strong
                       bg-[var(--arcade-card-soft)]
                       border border-[var(--arcade-edge)]
                       active:scale-[0.97]"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleStart}
          disabled={!selected}
          className="font-display text-lg px-8 py-3 rounded-full text-[var(--ink-on-color)]
                     bg-[var(--cat-memory)]
                     border border-[oklch(0.45_0.20_340)]
                     shadow-[0_8px_22px_-10px_var(--cat-memory-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                     hover:brightness-105 active:scale-[0.97]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start matching
        </button>
      </div>
    </div>
  );
}
