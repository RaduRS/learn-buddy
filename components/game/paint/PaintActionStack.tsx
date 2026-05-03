"use client";

import {
  Maximize2,
  Minimize2,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
} from "lucide-react";
import { PaintToolButton } from "./PaintToolButton";

interface PaintActionStackProps {
  canUndo: boolean;
  canRedo: boolean;
  fullscreen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleFullscreen: () => void;
  onSave: () => void;
  onNew: () => void;
}

/**
 * Right-side action column — sits under the color palette so the left
 * toolbar can be just-tools and fit on shorter tablet viewports.
 */
export function PaintActionStack({
  canUndo,
  canRedo,
  fullscreen,
  onUndo,
  onRedo,
  onToggleFullscreen,
  onSave,
  onNew,
}: PaintActionStackProps) {
  return (
    <div
      className="surface-card cat-creative p-2 flex flex-col items-center gap-1.5"
      role="group"
      aria-label="Painting actions"
    >
      <PaintToolButton label="Undo" Icon={Undo2} disabled={!canUndo} onClick={onUndo} />
      <PaintToolButton label="Redo" Icon={Redo2} disabled={!canRedo} onClick={onRedo} />

      <span aria-hidden className="self-stretch h-px bg-[var(--arcade-edge)] my-1" />

      <PaintToolButton
        label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        Icon={fullscreen ? Minimize2 : Maximize2}
        onClick={onToggleFullscreen}
      />
      <PaintToolButton
        label="Save to photos"
        Icon={Save}
        onClick={onSave}
        tone="action"
      />
      <PaintToolButton
        label="New painting"
        Icon={RotateCcw}
        onClick={onNew}
        tone="warn"
      />
    </div>
  );
}
