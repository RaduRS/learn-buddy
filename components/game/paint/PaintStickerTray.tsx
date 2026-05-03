"use client";

import { STICKERS } from "@/lib/games/paint/stickers";
import { cn } from "@/lib/utils";

interface PaintStickerTrayProps {
  stickerId: string;
  onStickerChange: (stickerId: string) => void;
}

export function PaintStickerTray({
  stickerId,
  onStickerChange,
}: PaintStickerTrayProps) {
  return (
    <div
      className="surface-card cat-creative p-3 flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="Sticker tray"
    >
      <span className="font-display text-sm uppercase tracking-wider text-arcade-mid mr-1">
        Stickers
      </span>
      {STICKERS.map(({ id, label, Icon }) => {
        const active = id === stickerId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onStickerChange(id)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(
              "w-12 h-12 rounded-2xl grid place-items-center border-2 transition-transform active:scale-90",
              active
                ? "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]"
                : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
