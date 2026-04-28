"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type BuddyMood =
  | "idle"
  | "cheer"
  | "wave"
  | "think"
  | "sad"
  | "celebrate";

export type BuddySize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<BuddySize, number> = {
  xs: 36,
  sm: 56,
  md: 96,
  lg: 160,
  xl: 240,
};

interface BuddyProps {
  mood?: BuddyMood;
  size?: BuddySize;
  /** Tailwind / utility classes for the wrapper. */
  className?: string;
  /** Disable the constant idle bob/float (useful inside small chips). */
  still?: boolean;
  /** Decorative — exclude from a11y tree. Default true. */
  decorative?: boolean;
  /** Accessible name when not decorative. */
  label?: string;
}

/**
 * Buddy — Learn Buddy's mascot.
 *
 * A chunky egg-shaped creature in mint, with a star antenna,
 * big sparkly eyes, blush cheeks and a mood-driven mouth.
 *
 * All animation is CSS — no images, no asset bundle cost.
 */
export function Buddy({
  mood = "idle",
  size = "md",
  className,
  still = false,
  decorative = true,
  label,
}: BuddyProps) {
  const px = SIZE_PX[size];

  return (
    <div
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={!decorative ? label ?? "Buddy" : undefined}
      className={cn(
        "relative inline-flex items-end justify-center select-none",
        !still && (mood === "celebrate" ? "wobble" : "float-mascot"),
        className,
      )}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 200 200"
        width={px}
        height={px}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="buddyBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="oklch(0.92 0.13 165)" />
            <stop offset="55%"  stopColor="oklch(0.80 0.18 162)" />
            <stop offset="100%" stopColor="oklch(0.66 0.17 158)" />
          </linearGradient>
          <linearGradient id="buddyBelly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="oklch(0.97 0.06 165 / 0.95)" />
            <stop offset="100%" stopColor="oklch(0.92 0.10 165 / 0.7)" />
          </linearGradient>
          <radialGradient id="buddyShine" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="oklch(1 0 0 / 0.55)" />
            <stop offset="100%" stopColor="oklch(1 0 0 / 0)" />
          </radialGradient>
          <linearGradient id="buddyStar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="oklch(0.96 0.15 90)" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 75)" />
          </linearGradient>
        </defs>

        {/* Soft drop-shadow under feet */}
        <ellipse cx="100" cy="186" rx="42" ry="6" fill="oklch(0 0 0 / 0.25)" />

        {/* Antenna */}
        <g style={{ transformOrigin: "100px 60px" }} className={mood === "think" ? "spin-slow" : undefined}>
          <line
            x1="100" y1="62" x2="100" y2="32"
            stroke="oklch(0.55 0.10 160)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Star */}
          <polygon
            points="100,12 105,26 119,26 108,34 112,48 100,40 88,48 92,34 81,26 95,26"
            fill="url(#buddyStar)"
            stroke="oklch(0.55 0.18 70)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* Body — chunky egg */}
        <path
          d="M 100 60
             C 150 60 175 100 175 130
             C 175 165 145 185 100 185
             C 55  185 25  165 25  130
             C 25  100 50  60  100 60 Z"
          fill="url(#buddyBody)"
          stroke="oklch(0.42 0.09 160)"
          strokeWidth="3"
        />

        {/* Belly */}
        <ellipse cx="100" cy="140" rx="46" ry="32" fill="url(#buddyBelly)" />

        {/* Top shine */}
        <ellipse cx="80" cy="92" rx="32" ry="14" fill="url(#buddyShine)" />

        {/* Cheeks */}
        <ellipse cx="58"  cy="130" rx="11" ry="7" fill="oklch(0.78 0.18 25 / 0.65)" />
        <ellipse cx="142" cy="130" rx="11" ry="7" fill="oklch(0.78 0.18 25 / 0.65)" />

        {/* Eyes — switch shape by mood */}
        <BuddyEyes mood={mood} />

        {/* Mouth — switch shape by mood */}
        <BuddyMouth mood={mood} />

        {/* Sparkles for cheer / celebrate */}
        {(mood === "cheer" || mood === "celebrate") && (
          <g className="sparkle">
            <Sparkle x={28}  y={38}  size={8} />
            <Sparkle x={170} y={50}  size={10} delay={0.3} />
            <Sparkle x={20}  y={120} size={6} delay={0.6} />
            <Sparkle x={180} y={115} size={9} delay={0.9} />
          </g>
        )}

        {/* Single tear for sad */}
        {mood === "sad" && (
          <ellipse cx="74" cy="138" rx="3.4" ry="6" fill="oklch(0.75 0.13 250)">
            <animate
              attributeName="cy"
              from="138" to="158"
              dur="1.6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="1" to="0"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </ellipse>
        )}

        {/* Waving hand */}
        {mood === "wave" && (
          <g style={{ transformOrigin: "172px 120px" }} className="wobble">
            <ellipse cx="172" cy="120" rx="12" ry="14" fill="url(#buddyBody)" stroke="oklch(0.42 0.09 160)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

function BuddyEyes({ mood }: { mood: BuddyMood }) {
  // Closed-curve happy eyes for cheer/celebrate.
  if (mood === "cheer" || mood === "celebrate") {
    return (
      <g
        fill="none"
        stroke="oklch(0.20 0.06 280)"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M 70 110 Q 80 100 90 110" />
        <path d="M 110 110 Q 120 100 130 110" />
      </g>
    );
  }

  // Half-lidded thinking
  if (mood === "think") {
    return (
      <g fill="oklch(0.18 0.05 280)">
        <ellipse cx="80" cy="115" rx="6" ry="3" />
        <ellipse cx="120" cy="115" rx="6" ry="3" />
      </g>
    );
  }

  // Sad — drooping
  if (mood === "sad") {
    return (
      <g fill="none" stroke="oklch(0.18 0.05 280)" strokeWidth="5" strokeLinecap="round">
        <path d="M 70 118 Q 80 110 90 118" />
        <path d="M 110 118 Q 120 110 130 118" />
      </g>
    );
  }

  // Idle / wave: round eyes with white sparkle
  return (
    <g>
      <g className="blink-eyes" style={{ transformOrigin: "80px 115px" }}>
        <ellipse cx="80" cy="115" rx="9.5" ry="11" fill="oklch(0.18 0.05 280)" />
        <circle cx="84"  cy="111" r="3" fill="oklch(0.99 0.02 280)" />
      </g>
      <g className="blink-eyes" style={{ transformOrigin: "120px 115px" }}>
        <ellipse cx="120" cy="115" rx="9.5" ry="11" fill="oklch(0.18 0.05 280)" />
        <circle cx="124"  cy="111" r="3" fill="oklch(0.99 0.02 280)" />
      </g>
    </g>
  );
}

function BuddyMouth({ mood }: { mood: BuddyMood }) {
  if (mood === "celebrate") {
    return (
      <g>
        <ellipse cx="100" cy="148" rx="14" ry="13" fill="oklch(0.30 0.08 20)" />
        <ellipse cx="100" cy="156" rx="9" ry="6" fill="oklch(0.66 0.20 25)" />
      </g>
    );
  }
  if (mood === "cheer") {
    return (
      <path
        d="M 80 144 Q 100 165 120 144"
        fill="oklch(0.30 0.08 20)"
        stroke="oklch(0.20 0.06 20)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    );
  }
  if (mood === "think") {
    return (
      <path
        d="M 88 148 Q 100 142 112 148"
        fill="none"
        stroke="oklch(0.20 0.06 280)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    );
  }
  if (mood === "sad") {
    return (
      <path
        d="M 84 152 Q 100 142 116 152"
        fill="none"
        stroke="oklch(0.20 0.06 280)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    );
  }
  // idle / wave: gentle smile
  return (
    <path
      d="M 84 144 Q 100 158 116 144"
      fill="none"
      stroke="oklch(0.20 0.06 280)"
      strokeWidth="4"
      strokeLinecap="round"
    />
  );
}

function Sparkle({
  x, y, size = 8, delay = 0,
}: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ animationDelay: `${delay}s` } as CSSProperties}
      className="sparkle"
    >
      <path
        d={`M 0 -${size} L ${size * 0.3} -${size * 0.3} L ${size} 0 L ${size * 0.3} ${size * 0.3} L 0 ${size} L -${size * 0.3} ${size * 0.3} L -${size} 0 L -${size * 0.3} -${size * 0.3} Z`}
        fill="oklch(0.95 0.12 88)"
        stroke="oklch(0.78 0.18 78)"
        strokeWidth="1.5"
      />
    </g>
  );
}
