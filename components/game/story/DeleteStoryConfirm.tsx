"use client";

import { useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Buddy } from "@/components/mascot/Buddy";

interface DeleteStoryConfirmProps {
  open: boolean;
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Warning modal before a story is deleted for good. */
export function DeleteStoryConfirm({
  open,
  title,
  busy,
  onCancel,
  onConfirm,
}: DeleteStoryConfirmProps) {
  // Escape backs out of the warning, as long as nothing is mid-delete.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delete this story?"
      className="fixed inset-0 z-[70] grid place-items-center bg-[oklch(0_0_0_/_0.55)] p-4"
    >
      <div className="surface-card cat-spatial p-6 w-full max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Buddy mood="sad" size="lg" />
        </div>
        <h3 className="font-display text-2xl text-arcade-strong">
          Delete this story?
        </h3>
        <p className="mt-2 text-arcade-mid">
          <span className="font-display text-arcade-strong">“{title}”</span> and
          all of its pages and pictures will be gone for good. This cannot be
          undone.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="font-display px-6 py-3 rounded-full border-2 border-[var(--arcade-edge)]
                       text-arcade-strong active:scale-95 disabled:opacity-60"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 font-display px-6 py-3 rounded-full
                       bg-[var(--cat-spatial)] text-[var(--ink-on-color)]
                       border-2 border-[var(--cat-spatial)] active:scale-95
                       disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="w-5 h-5" aria-hidden />
            )}
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
