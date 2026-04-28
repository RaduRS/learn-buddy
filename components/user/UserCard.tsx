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
        "relative surface-card cat-default text-left p-5 sm:p-6",
        "min-h-[10rem] flex flex-col gap-3",
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

      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid place-items-center w-14 h-14 rounded-2xl shrink-0 bg-[oklch(0.20_0.06_285_/_0.6)] border border-[var(--arcade-edge)] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12)]"
        >
          <Icon className="w-7 h-7" style={{ color: avatar.tint }} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="font-display text-xl text-arcade-strong truncate">
            {user.name}
          </div>
          {user.age && (
            <div className="mt-1 text-xs text-arcade-soft">Age {user.age}</div>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 flex-wrap">
        <span className="chip">
          <Star className="w-4 h-4" style={{ color: "var(--joy-gold)" }} aria-hidden />
          <span className="font-display">{totalStars}</span>
        </span>
        <span className="chip">
          <Trophy className="w-4 h-4" style={{ color: "var(--cat-math)" }} aria-hidden />
          <span className="font-display">{totalGames}</span>
          <span className="text-sm opacity-70">games</span>
        </span>
      </div>
    </button>
  );
}
