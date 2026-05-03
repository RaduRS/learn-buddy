"use client";

import { Redo2, RotateCcw, Save, Undo2 } from "lucide-react";
import { PaintToolButton } from "./PaintToolButton";

interface PaintActionStackProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onNew: () => void;
}

/**
 * Right-side action column under the color palette: undo, redo,
 * save, new. Fullscreen lives on the left toolbar.
 */
export function PaintActionStack({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onNew,
}: PaintActionStackProps) {
  return (
    <div
      className="surface-card cat-creative p-2 flex flex-col items-center gap-1.5 shrink-0"
      role="group"
      aria-label="Painting actions"
    >
      <PaintToolButton label="Undo" Icon={Undo2} disabled={!canUndo} onClick={onUndo} />
      <PaintToolButton label="Redo" Icon={Redo2} disabled={!canRedo} onClick={onRedo} />

      <span aria-hidden className="self-stretch h-px bg-[var(--arcade-edge)] my-1" />

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
