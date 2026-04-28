"use client";

import {
  Check,
  Coffee,
  Crown,
  Heart,
  Moon,
  Sparkles,
  Star,
  Sun,
  User as UserIcon,
  Smile,
  Trophy,
  Zap,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { UserCardProps } from "@/types";

const AVATAR_ICONS: Record<
  string,
  { Icon: ComponentType<{ className?: string; style?: CSSProperties }>; tint: string }
> = {
  smile:    { Icon: Smile,    tint: "var(--joy-gold)" },
  heart:    { Icon: Heart,    tint: "var(--cat-spatial)" },
  star:     { Icon: Star,     tint: "var(--cat-math)" },
  zap:      { Icon: Zap,      tint: "var(--cat-default)" },
  crown:    { Icon: Crown,    tint: "var(--joy-gold)" },
  sparkles: { Icon: Sparkles, tint: "var(--cat-memory)" },
  sun:      { Icon: Sun,      tint: "var(--cat-reading)" },
  moon:     { Icon: Moon,     tint: "var(--cat-default)" },
  coffee:   { Icon: Coffee,   tint: "var(--cat-spatial)" },
  user:     { Icon: UserIcon, tint: "var(--ink-soft)" },
};

export function UserCard({ user, onSelect, isSelected = false, className }: UserCardProps) {
  const avatar =
    (user.avatar ? AVATAR_ICONS[user.avatar] : undefined) ?? AVATAR_ICONS.user;
  const Icon = avatar.Icon;

  const totalStars =
    user.gameProgress?.reduce((sum, p) => sum + (p.totalScore ?? 0), 0) ?? 0;
  const totalGames = user.gameProgress?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(user.id)}
      aria-pressed={isSelected}
      aria-label={`Select profile ${user.name}`}
      className={cn(
        "relative surface-card cat-default text-center p-4 sm:p-5",
        "min-h-[12rem] flex flex-col items-center justify-between gap-3",
        "active:scale-[0.985] transition-transform",
        className,
      )}
      style={
        isSelected
          ? ({
              outline: "2px solid var(--joy-gold)",
              outlineOffset: "-2px",
            } as CSSProperties)
          : undefined
      }
    >
      {isSelected && (
        <span className="absolute -top-2 -right-2 grid place-items-center w-7 h-7 rounded-full bg-[var(--joy-gold)] text-[var(--ink-on-color)] shadow-[0_4px_10px_-4px_var(--joy-gold-glow)]">
          <Check className="w-4 h-4" />
        </span>
      )}

      <span
        aria-hidden
        className="grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
                   bg-[oklch(0.20_0.06_285_/_0.7)]
                   border border-[var(--arcade-edge)]
                   shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12)]"
      >
        <Icon className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: avatar.tint }} />
      </span>

      <div className="min-w-0 w-full">
        <div className="font-display text-lg sm:text-xl text-arcade-strong truncate">
          {user.name}
        </div>
        {user.age != null && (
          <div className="text-xs text-arcade-soft mt-0.5">Age {user.age}</div>
        )}
      </div>

      <div className="w-full flex items-center justify-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 text-arcade-mid">
          <Star className="w-4 h-4" style={{ color: "var(--joy-gold)" }} aria-hidden />
          <span className="font-display">{totalStars}</span>
        </span>
        <span className="text-arcade-soft">·</span>
        <span className="inline-flex items-center gap-1 text-arcade-mid">
          <Trophy className="w-4 h-4" style={{ color: "var(--cat-math)" }} aria-hidden />
          <span className="font-display">{totalGames}</span>
          <span className="text-xs opacity-70">games</span>
        </span>
      </div>
    </button>
  );
}
