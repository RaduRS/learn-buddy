"use client";

import { useEffect, useRef, useState } from "react";
import {
  STROKE_MAX_PX,
  STROKE_MIN_PX,
} from "@/lib/games/paint/constants";
import { cn } from "@/lib/utils";

interface PaintSizeControlProps {
  size: number;
  onSizeChange: (size: number) => void;
  /** Disabled visual state when the active tool ignores size (fill, text). */
  disabled?: boolean;
}

/**
 * Stroke-size picker. Renders a single button that previews the current
 * size with a dot. Tapping opens a popover with a slider plus three
 * fast-jump preset chips. The slider is the source of truth — presets
 * just snap the value for quick selection.
 */
export function PaintSizeControl({
  size,
  onSizeChange,
  disabled,
}: PaintSizeControlProps) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Close on outside tap.
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (!popRef.current) return;
      if (e.target instanceof Node && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Cap the preview dot so the toolbar button doesn't grow unbounded.
  const previewDot = Math.min(28, Math.max(4, size));

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={`Stroke size ${size}px`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Stroke size — ${size}px`}
        className={cn(
          "h-12 px-3 rounded-2xl border-2 inline-flex items-center gap-2 transition-transform active:scale-95",
          disabled
            ? "opacity-30 cursor-not-allowed bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong"
            : open
            ? "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]"
            : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
        )}
      >
        <span
          aria-hidden
          className="rounded-full"
          style={{
            width: previewDot,
            height: previewDot,
            background: open ? "var(--ink-on-color)" : "var(--ink-strong)",
          }}
        />
        <span className="font-display text-sm tabular-nums">{size}px</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Stroke size"
          className="absolute z-50 top-14 left-0 surface-card cat-creative p-4 w-72"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-sm uppercase tracking-wider text-arcade-mid">
              Stroke size
            </span>
            <span className="font-display text-base text-arcade-strong tabular-nums">
              {size}px
            </span>
          </div>

          <div className="flex items-center justify-center mb-3 h-10">
            <span
              aria-hidden
              className="rounded-full"
              style={{
                width: Math.min(80, size),
                height: Math.min(80, size),
                background: "var(--ink-strong)",
              }}
            />
          </div>

          <input
            type="range"
            min={STROKE_MIN_PX}
            max={STROKE_MAX_PX}
            step={1}
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="paint-size-slider w-full"
            aria-label="Stroke size slider"
          />

          <div className="mt-3 flex items-center gap-2">
            {[4, 14, 32, 60].map((preset) => {
              const active = size === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSizeChange(preset)}
                  className={cn(
                    "flex-1 font-display text-sm py-2 rounded-xl border-2 transition-transform active:scale-95",
                    active
                      ? "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]"
                      : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
                  )}
                >
                  {preset}px
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
