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
  Redo2,
  RotateCcw,
  Save,
  Sticker as StickerIcon,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { Tool } from "@/lib/games/paint/types";
import { PaintSizeControl } from "./PaintSizeControl";
import { cn } from "@/lib/utils";

interface PaintToolbarProps {
  tool: Tool;
  strokeSize: number;
  canUndo: boolean;
  canRedo: boolean;
  fullscreen: boolean;
  onToolChange: (tool: Tool) => void;
  onStrokeSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onSave: () => void;
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
 * Vertical toolbar — pinned to the left side of the canvas. Tablets in
 * landscape have plenty of width but tight height once the page header
 * and color palette are accounted for; stacking the tools vertically
 * gives the canvas back ~140px of vertical real estate.
 */
export function PaintToolbar({
  tool,
  strokeSize,
  canUndo,
  canRedo,
  fullscreen,
  onToolChange,
  onStrokeSizeChange,
  onUndo,
  onRedo,
  onNew,
  onSave,
  onToggleFullscreen,
}: PaintToolbarProps) {
  const showSizes = SIZE_AWARE.has(tool);

  return (
    <div
      className="surface-card cat-creative p-2 flex flex-col items-center gap-1.5 self-stretch"
      style={{ overflow: "visible" }}
      role="toolbar"
      aria-label="Paint tools"
    >
      {TOOLS.map(({ id, label, Icon }) => (
        <ToolButton
          key={id}
          label={label}
          Icon={Icon}
          active={tool === id}
          onClick={() => onToolChange(id)}
        />
      ))}

      <Divider />

      <PaintSizeControl
        size={strokeSize}
        onSizeChange={onStrokeSizeChange}
        disabled={!showSizes}
        direction="right"
      />

      <Divider />

      <ToolButton label="Undo" Icon={Undo2} disabled={!canUndo} onClick={onUndo} />
      <ToolButton label="Redo" Icon={Redo2} disabled={!canRedo} onClick={onRedo} />

      <div className="mt-auto flex flex-col items-center gap-1.5 pt-1.5">
        <ToolButton
          label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          Icon={fullscreen ? Minimize2 : Maximize2}
          onClick={onToggleFullscreen}
        />
        <ToolButton
          label="Save to photos"
          Icon={Save}
          onClick={onSave}
          tone="action"
        />
        <ToolButton
          label="New painting"
          Icon={RotateCcw}
          onClick={onNew}
          tone="warn"
        />
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  Icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tone?: "default" | "action" | "warn";
}

function ToolButton({
  label,
  Icon,
  active,
  disabled,
  onClick,
  tone = "default",
}: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "w-12 h-12 rounded-2xl grid place-items-center border-2 transition-transform active:scale-90 shrink-0",
        disabled && "opacity-30 cursor-not-allowed",
        !disabled && !active && tone === "default" &&
          "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
        !disabled && active &&
          "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]",
        !disabled && !active && tone === "action" &&
          "bg-[var(--joy-correct)] border-[oklch(0.45_0.20_145)] text-[var(--ink-on-color)]",
        !disabled && !active && tone === "warn" &&
          "bg-[var(--joy-wrong)] border-[oklch(0.45_0.20_25)] text-[var(--ink-on-color)]",
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={1.8} />
    </button>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="self-stretch h-px bg-[var(--arcade-edge)] my-1"
    />
  );
}
