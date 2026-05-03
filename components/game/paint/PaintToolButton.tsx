"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PaintToolButtonProps {
  label: string;
  Icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tone?: "default" | "action" | "warn";
}

/**
 * Shared 48×48 tool button used by the left toolbar and the right
 * action stack. Round-cornered, big enough for kid-finger taps.
 */
export function PaintToolButton({
  label,
  Icon,
  active,
  disabled,
  onClick,
  tone = "default",
}: PaintToolButtonProps) {
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
