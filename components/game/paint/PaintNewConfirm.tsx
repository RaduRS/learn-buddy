"use client";

import { Buddy } from "@/components/mascot/Buddy";

interface PaintNewConfirmProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PaintNewConfirm({
  open,
  onCancel,
  onConfirm,
}: PaintNewConfirmProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start a new painting?"
      className="fixed inset-0 z-[70] grid place-items-center bg-[oklch(0_0_0_/_0.55)] p-4"
    >
      <div className="surface-card cat-creative p-6 w-full max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Buddy mood="cheer" size="lg" />
        </div>
        <h3 className="font-display text-2xl text-arcade-strong">
          Start a new painting?
        </h3>
        <p className="mt-2 text-arcade-mid">
          This will clear the canvas. Make sure to tap{" "}
          <span className="font-display text-arcade-strong">Save</span> first
          if you want to keep this one!
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="font-display px-6 py-3 rounded-full border-2 border-[var(--arcade-edge)] text-arcade-strong active:scale-95"
          >
            Keep painting
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="font-display px-6 py-3 rounded-full bg-[var(--cat-creative)] text-[var(--ink-on-color)] border-2 border-[var(--cat-creative)] active:scale-95"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
