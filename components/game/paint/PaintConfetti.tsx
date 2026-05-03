"use client";

import { useEffect, useState } from "react";

interface PaintConfettiProps {
  /** Bumped to retrigger the animation. */
  trigger: number;
  durationMs?: number;
}

const COLORS = [
  "#f7c948",
  "#7ed957",
  "#3b82f6",
  "#ec4899",
  "#ff8a3d",
  "#8b5cf6",
];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
}

/**
 * Lightweight CSS-only confetti burst. ~60 pieces fall + spin once,
 * unmount themselves after the duration. Avoids pulling in a confetti
 * library for what is a single celebratory moment.
 */
export function PaintConfetti({ trigger, durationMs = 1800 }: PaintConfettiProps) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    const next: Piece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i + trigger * 100,
      left: Math.random() * 100,
      delay: Math.random() * 0.2,
      duration: 1.2 + Math.random() * 0.8,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
    }));
    setPieces(next);
    const t = window.setTimeout(() => setPieces(null), durationMs);
    return () => window.clearTimeout(t);
  }, [trigger, durationMs]);

  if (!pieces) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="paint-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            // Vary spin with a per-piece custom property the keyframe reads.
            ["--rot" as string]: `${p.rotate}deg`,
            animation: `paint-confetti-fall ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
