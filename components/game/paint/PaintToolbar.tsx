"use client";

import {
  Brush,
  Circle,
  Eraser,
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
import type { SizeKey } from "@/lib/games/paint/constants";
import type { Tool } from "@/lib/games/paint/types";
import { cn } from "@/lib/utils";

interface PaintToolbarProps {
  tool: Tool;
  brushSize: SizeKey;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onSizeChange: (size: SizeKey) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onSave: () => void;
}

const TOOLS: { id: Tool; label: string; Icon: LucideIcon }[] = [
  { id: "brush",   label: "Brush",   Icon: Brush },
  { id: "pencil",  label: "Pencil",  Icon: Pencil },
  { id: "eraser",  label: "Eraser",  Icon: Eraser },
  { id: "fill",    label: "Fill",    Icon: PaintBucket },
  { id: "line",    label: "Line",    Icon: Minus },
  { id: "rect",    label: "Rectangle", Icon: RectangleHorizontal },
  { id: "ellipse", label: "Ellipse", Icon: Circle },
  { id: "text",    label: "Text",    Icon: Type },
  { id: "sticker", label: "Sticker", Icon: StickerIcon },
];

const SIZES: { id: SizeKey; label: string; dot: number }[] = [
  { id: "small",  label: "Small",  dot: 6 },
  { id: "medium", label: "Medium", dot: 14 },
  { id: "large",  label: "Large",  dot: 24 },
];

const SIZE_AWARE: ReadonlySet<Tool> = new Set([
  "brush",
  "pencil",
  "eraser",
  "line",
  "rect",
  "ellipse",
]);

export function PaintToolbar({
  tool,
  brushSize,
  canUndo,
  canRedo,
  onToolChange,
  onSizeChange,
  onUndo,
  onRedo,
  onNew,
  onSave,
}: PaintToolbarProps) {
  const showSizes = SIZE_AWARE.has(tool);

  return (
    <div
      className="surface-card cat-creative p-3 flex flex-wrap items-center gap-3"
      role="toolbar"
      aria-label="Paint tools"
    >
      <div className="flex items-center gap-1.5">
        {TOOLS.map(({ id, label, Icon }) => (
          <ToolButton
            key={id}
            label={label}
            Icon={Icon}
            active={tool === id}
            onClick={() => onToolChange(id)}
          />
        ))}
      </div>

      <Divider />

      <div
        className={cn(
          "flex items-center gap-1.5 transition-opacity",
          showSizes ? "opacity-100" : "opacity-30 pointer-events-none",
        )}
        aria-label="Brush size"
      >
        {SIZES.map(({ id, label, dot }) => {
          const active = brushSize === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSizeChange(id)}
              aria-label={`${label} size`}
              aria-pressed={active}
              className={cn(
                "w-12 h-12 rounded-2xl grid place-items-center border-2 transition-transform active:scale-90",
                active
                  ? "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]"
                  : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
              )}
            >
              <span
                aria-hidden
                className="rounded-full"
                style={{
                  width: dot,
                  height: dot,
                  background: active ? "var(--ink-on-color)" : "var(--ink-strong)",
                }}
              />
            </button>
          );
        })}
      </div>

      <Divider />

      <div className="flex items-center gap-1.5">
        <ToolButton label="Undo" Icon={Undo2} disabled={!canUndo} onClick={onUndo} />
        <ToolButton label="Redo" Icon={Redo2} disabled={!canRedo} onClick={onRedo} />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
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
        "w-12 h-12 rounded-2xl grid place-items-center border-2 transition-transform active:scale-90",
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
      className="self-stretch w-px bg-[var(--arcade-edge)] mx-1"
    />
  );
}

