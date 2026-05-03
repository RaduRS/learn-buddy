"use client";

import {
  Brush,
  Circle,
  Eraser,
  Maximize2,
  Minimize2,
  Minus,
  PaintBucket,
  Pencil,
  RectangleHorizontal,
  Sticker as StickerIcon,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  STROKE_MAX_PX,
  STROKE_MIN_PX,
} from "@/lib/games/paint/constants";
import type { Tool } from "@/lib/games/paint/types";
import { PaintToolButton } from "./PaintToolButton";
import { cn } from "@/lib/utils";

interface PaintToolbarProps {
  tool: Tool;
  strokeSize: number;
  fullscreen: boolean;
  onToolChange: (tool: Tool) => void;
  onStrokeSizeChange: (size: number) => void;
  onToggleFullscreen: () => void;
}

const TOOLS: { id: Tool; label: string; Icon: LucideIcon }[] = [
  { id: "brush",   label: "Brush",     Icon: Brush },
  { id: "pencil",  label: "Pencil",    Icon: Pencil },
  { id: "eraser",  label: "Eraser",    Icon: Eraser },
  { id: "fill",    label: "Fill",      Icon: PaintBucket },
  { id: "line",    label: "Line",      Icon: Minus },
  { id: "rect",    label: "Rectangle", Icon: RectangleHorizontal },
  { id: "ellipse", label: "Ellipse",   Icon: Circle },
  { id: "text",    label: "Text",      Icon: Type },
  { id: "sticker", label: "Sticker",   Icon: StickerIcon },
];

const SIZE_AWARE: ReadonlySet<Tool> = new Set([
  "brush",
  "pencil",
  "eraser",
  "line",
  "rect",
  "ellipse",
]);

/**
 * Left vertical toolbar — drawing tools + an always-visible stroke-size
 * slider at the top, fullscreen toggle at the bottom. The bar is wider
 * than the right action stack to host the slider; widening here is
 * cheaper than the popover-driven layout shift that came before.
 */
export function PaintToolbar({
  tool,
  strokeSize,
  fullscreen,
  onToolChange,
  onStrokeSizeChange,
  onToggleFullscreen,
}: PaintToolbarProps) {
  const sizeActive = SIZE_AWARE.has(tool);
  // Cap the preview dot so a slider value of 80 doesn't burst the toolbar.
  const previewDot = Math.max(4, Math.min(36, strokeSize));

  return (
    <div
      className="surface-card cat-creative p-2 flex flex-col items-center gap-1.5 w-[112px]"
      role="toolbar"
      aria-label="Paint tools"
    >
      <div
        className={cn(
          "w-full flex flex-col items-center gap-1 transition-opacity",
          sizeActive ? "opacity-100" : "opacity-40 pointer-events-none",
        )}
      >
        <div className="h-10 w-full grid place-items-center">
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: previewDot,
              height: previewDot,
              background: "var(--ink-strong)",
            }}
          />
        </div>
        <input
          type="range"
          min={STROKE_MIN_PX}
          max={STROKE_MAX_PX}
          step={1}
          value={strokeSize}
          onChange={(e) => onStrokeSizeChange(Number(e.target.value))}
          className="paint-size-slider w-full"
          aria-label="Stroke size"
        />
        <span className="font-display text-xs tabular-nums text-arcade-mid leading-none">
          {strokeSize}px
        </span>
      </div>

      <span aria-hidden className="self-stretch h-px bg-[var(--arcade-edge)] my-1" />

      {TOOLS.map(({ id, label, Icon }) => (
        <PaintToolButton
          key={id}
          label={label}
          Icon={Icon}
          active={tool === id}
          onClick={() => onToolChange(id)}
        />
      ))}

      <span aria-hidden className="self-stretch h-px bg-[var(--arcade-edge)] my-1" />

      <PaintToolButton
        label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        Icon={fullscreen ? Minimize2 : Maximize2}
        onClick={onToggleFullscreen}
      />
    </div>
  );
}
