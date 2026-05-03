"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Pipette } from "lucide-react";
import { PRESET_COLORS } from "@/lib/games/paint/constants";
import { cn } from "@/lib/utils";

interface PaintColorPaletteProps {
  color: string;
  onChange: (color: string) => void;
  /** "vertical" (default) stacks swatches in a 2-col grid for a side panel. */
  layout?: "vertical" | "horizontal";
}

export function PaintColorPalette({
  color,
  onChange,
  layout = "vertical",
}: PaintColorPaletteProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close picker on outside tap.
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: PointerEvent) => {
      if (!popoverRef.current) return;
      if (e.target instanceof Node && popoverRef.current.contains(e.target)) return;
      setPickerOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [pickerOpen]);

  const isVertical = layout === "vertical";

  return (
    <div
      className={cn(
        "surface-card cat-creative p-2 self-stretch",
        isVertical ? "flex flex-col items-center gap-1.5" : "flex items-center gap-2 flex-wrap",
      )}
      style={{ overflow: "visible" }}
      role="group"
      aria-label="Color palette"
    >
      <div
        className={cn(
          isVertical
            ? "grid grid-cols-2 gap-1.5"
            : "flex items-center gap-1.5 flex-wrap",
        )}
      >
        {PRESET_COLORS.map((preset) => {
          const active = preset.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-label={`Color ${preset}`}
              aria-pressed={active}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-transform active:scale-90 shrink-0",
                active
                  ? "border-[var(--ink-strong)] scale-110 shadow-[0_0_0_3px_var(--cat-creative)]"
                  : "border-[oklch(0_0_0_/_0.25)]",
              )}
              style={{ background: preset }}
            />
          );
        })}
      </div>

      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="More colors"
          aria-expanded={pickerOpen}
          className={cn(
            "w-10 h-10 rounded-full grid place-items-center transition-transform active:scale-90",
            "bg-[var(--arcade-card-soft)] border-2 border-[var(--arcade-edge)]",
            pickerOpen && "border-[var(--cat-creative)]",
          )}
        >
          <Pipette className="w-5 h-5 text-arcade-strong" strokeWidth={1.8} />
        </button>

        {pickerOpen && (
          <div
            className={cn(
              "absolute z-50 surface-card cat-creative p-3",
              isVertical ? "top-0 right-12" : "top-12 right-0",
            )}
            role="dialog"
            aria-label="Pick a color"
          >
            <HexColorPicker color={color} onChange={onChange} />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span
                aria-hidden
                className="w-9 h-9 rounded-full border-2 border-[var(--arcade-edge)]"
                style={{ background: color }}
              />
              <span className="font-display text-sm uppercase tracking-wider text-arcade-mid">
                {color}
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="font-display text-sm px-3 py-1.5 rounded-full bg-[var(--cat-creative)] text-[var(--ink-on-color)]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
