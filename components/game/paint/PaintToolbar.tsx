"use client";

import {
  Brush,
  Circle,
  Eraser,
  Minus,
  PaintBucket,
  Pencil,
  RectangleHorizontal,
  Sticker as StickerIcon,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { Tool } from "@/lib/games/paint/types";
import { PaintSizeControl } from "./PaintSizeControl";
import { PaintToolButton } from "./PaintToolButton";

interface PaintToolbarProps {
  tool: Tool;
  strokeSize: number;
  onToolChange: (tool: Tool) => void;
  onStrokeSizeChange: (size: number) => void;
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
 * Left vertical toolbar — just drawing tools + the size control. Undo,
 * redo, fullscreen, save and new live in PaintActionStack on the right
 * so the left column can fit comfortably on shorter tablet viewports.
 */
export function PaintToolbar({
  tool,
  strokeSize,
  onToolChange,
  onStrokeSizeChange,
}: PaintToolbarProps) {
  const showSizes = SIZE_AWARE.has(tool);

  return (
    <div
      className="surface-card cat-creative p-2 flex flex-col items-center gap-1.5"
      style={{ overflow: "visible" }}
      role="toolbar"
      aria-label="Paint tools"
    >
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

      <PaintSizeControl
        size={strokeSize}
        onSizeChange={onStrokeSizeChange}
        disabled={!showSizes}
        direction="right"
      />
    </div>
  );
}
