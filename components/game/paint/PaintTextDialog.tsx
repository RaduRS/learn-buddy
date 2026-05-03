"use client";

import { useEffect, useRef, useState } from "react";
import { TEXT_SIZES, type TextSizeKey } from "@/lib/games/paint/constants";
import { cn } from "@/lib/utils";

interface PaintTextDialogProps {
  open: boolean;
  initialSize: TextSizeKey;
  initialColor: string;
  onCancel: () => void;
  onCommit: (text: string, size: TextSizeKey) => void;
}

export function PaintTextDialog({
  open,
  initialSize,
  initialColor,
  onCancel,
  onCommit,
}: PaintTextDialogProps) {
  const [text, setText] = useState("");
  const [size, setSize] = useState<TextSizeKey>(initialSize);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset on open and focus the input so the soft keyboard appears.
  useEffect(() => {
    if (!open) return;
    setText("");
    setSize(initialSize);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, initialSize]);

  if (!open) return null;

  const submit = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onCommit(text, size);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add text"
      className="fixed inset-0 z-[60] grid place-items-center bg-[oklch(0_0_0_/_0.55)] p-4"
    >
      <div className="surface-card cat-creative p-6 w-full max-w-md">
        <h3 className="font-display text-2xl text-arcade-strong">
          Type your text
        </h3>
        <p className="text-arcade-mid text-sm mt-1">
          It will be stamped onto the painting.
        </p>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Hello!"
          maxLength={60}
          className="mt-4 w-full px-4 py-3 rounded-xl text-lg
                     bg-[var(--arcade-card-soft)] border-2 border-[var(--arcade-edge)]
                     text-arcade-strong placeholder:text-arcade-soft
                     focus:outline-none focus:border-[var(--cat-creative)]"
          style={{ color: initialColor }}
        />

        <div className="mt-4 flex items-center gap-2" aria-label="Text size">
          {(Object.keys(TEXT_SIZES) as TextSizeKey[]).map((k) => {
            const active = size === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSize(k)}
                aria-pressed={active}
                className={cn(
                  "flex-1 font-display py-2.5 rounded-xl border-2 transition-transform active:scale-95",
                  active
                    ? "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]"
                    : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
                )}
              >
                {k === "small" ? "Aa" : k === "medium" ? "Aa" : "Aa"}
                <span className="text-xs opacity-70 ml-1 capitalize">{k}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="font-display px-5 py-2.5 rounded-full border-2 border-[var(--arcade-edge)] text-arcade-strong"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="font-display px-5 py-2.5 rounded-full bg-[var(--cat-creative)] text-[var(--ink-on-color)] border-2 border-[var(--cat-creative)]"
          >
            Add text
          </button>
        </div>
      </div>
    </div>
  );
}
