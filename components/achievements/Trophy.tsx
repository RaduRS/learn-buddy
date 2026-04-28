"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrophyTier = "bronze" | "silver" | "gold";

interface TrophyProps {
  tier: TrophyTier;
  unlocked: boolean;
  /** 0..100 — how close to unlocking this tier you are. Drives a subtle fill on locked trophies. */
  progress?: number;
  /** Px size of the SVG. Default 96. */
  size?: number;
  className?: string;
}

const TIER_COLORS: Record<TrophyTier, { top: string; mid: string; bottom: string; rim: string }> = {
  bronze: {
    top:    "oklch(0.84 0.13 60)",
    mid:    "oklch(0.66 0.16 50)",
    bottom: "oklch(0.46 0.13 45)",
    rim:    "oklch(0.36 0.10 45)",
  },
  silver: {
    top:    "oklch(0.95 0.02 250)",
    mid:    "oklch(0.78 0.03 250)",
    bottom: "oklch(0.55 0.03 250)",
    rim:    "oklch(0.40 0.02 250)",
  },
  gold: {
    top:    "oklch(0.98 0.10 95)",
    mid:    "oklch(0.84 0.17 88)",
    bottom: "oklch(0.62 0.16 78)",
    rim:    "oklch(0.40 0.10 70)",
  },
};

const LOCKED = {
  top:    "oklch(0.50 0.02 280)",
  mid:    "oklch(0.38 0.02 280)",
  bottom: "oklch(0.28 0.02 280)",
  rim:    "oklch(0.22 0.02 280)",
};

/**
 * Chunky cartoon trophy. Real cup shape with handles, stem and base —
 * none of the thermometer-looking fill from the old design.
 *
 * Locked tiers stay grey with a lock badge; unlocked tiers wear their
 * tier color, a sparkle, a subtle radial shine and a soft ground-glow.
 */
export function Trophy({
  tier,
  unlocked,
  progress = 0,
  size = 96,
  className,
}: TrophyProps) {
  const palette = unlocked ? TIER_COLORS[tier] : LOCKED;
  const gradId = `trophy-${tier}-${unlocked ? "u" : "l"}`;
  const shineId = `trophy-shine-${tier}-${unlocked ? "u" : "l"}`;
  const showProgress = !unlocked && progress > 0 && progress < 100;

  return (
    <div
      className={cn("relative inline-flex items-end justify-center", className)}
      style={{ width: size, height: size * 1.2 }}
      aria-label={`${tier} trophy ${unlocked ? "unlocked" : "locked"}`}
      role="img"
    >
      {/* Glow on the floor when unlocked */}
      {unlocked && (
        <div
          className="absolute inset-x-0 bottom-0 mx-auto rounded-[50%] blur-md opacity-70"
          style={{
            width: "85%",
            height: "12%",
            background: palette.mid,
          }}
          aria-hidden
        />
      )}

      <svg viewBox="0 0 100 120" width={size} height={size * 1.2} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={palette.top} />
            <stop offset="55%" stopColor={palette.mid} />
            <stop offset="100%" stopColor={palette.bottom} />
          </linearGradient>
          <radialGradient id={shineId} cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="oklch(1 0 0 / 0.55)" />
            <stop offset="60%" stopColor="oklch(1 0 0 / 0)" />
          </radialGradient>
        </defs>

        {/* Star above (only when unlocked) */}
        {unlocked && (
          <g className="sparkle" style={{ transformOrigin: "50px 8px" }}>
            <polygon
              points="50,2 53,12 64,12 55,18 58,29 50,22 42,29 45,18 36,12 47,12"
              fill={palette.top}
              stroke={palette.rim}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Handles */}
        <path
          d="M 22 38 C 8 38, 8 70, 26 70"
          fill="none"
          stroke={palette.rim}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 78 38 C 92 38, 92 70, 74 70"
          fill="none"
          stroke={palette.rim}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Cup */}
        <path
          d="M 24 36
             L 76 36
             C 78 36, 80 38, 80 40
             L 80 56
             C 80 76, 70 86, 50 86
             C 30 86, 20 76, 20 56
             L 20 40
             C 20 38, 22 36, 24 36 Z"
          fill={`url(#${gradId})`}
          stroke={palette.rim}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Locked progress fill (rises from the bottom of the cup) */}
        {showProgress && (
          <clipPath id={`${gradId}-clip`}>
            <rect x="20" y={86 - (50 * progress) / 100} width="60" height="100" />
          </clipPath>
        )}
        {showProgress && (
          <path
            d="M 24 36
               L 76 36
               C 78 36, 80 38, 80 40
               L 80 56
               C 80 76, 70 86, 50 86
               C 30 86, 20 76, 20 56
               L 20 40
               C 20 38, 22 36, 24 36 Z"
            fill={TIER_COLORS[tier].mid}
            opacity="0.45"
            clipPath={`url(#${gradId}-clip)`}
          />
        )}

        {/* Top shine */}
        <ellipse cx="42" cy="50" rx="18" ry="10" fill={`url(#${shineId})`} />

        {/* Stem */}
        <rect x="44" y="86" width="12" height="10" fill={palette.bottom} />

        {/* Base */}
        <rect x="30" y="96" width="40" height="10" rx="3" fill={palette.bottom} stroke={palette.rim} strokeWidth="1.5" />
        <rect x="26" y="106" width="48" height="6" rx="2" fill={palette.rim} />
      </svg>

      {!unlocked && (
        <span
          className="absolute top-0 right-0 grid place-items-center w-8 h-8 rounded-full bg-[oklch(0.20_0.05_280_/_0.85)] border border-[var(--arcade-edge)] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]"
          aria-hidden
        >
          <Lock className="w-3.5 h-3.5 text-arcade-soft" />
        </span>
      )}
    </div>
  );
}
