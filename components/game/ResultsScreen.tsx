"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Buddy, type BuddyMood } from "@/components/mascot/Buddy";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";
import type { CategoryKey } from "@/lib/games/categories";

interface ResultsScreenProps {
  score: number;
  total?: number;
  /** Category drives accent color of the card. */
  category?: CategoryKey;
  /** Big headline override; otherwise generated from band. */
  headline?: string;
  /** Override the encouraging line. */
  message?: string;
  onPlayAgain?: () => void;
  onHome?: () => void;
  /** Optional secondary CTA (e.g., "Next Game"). */
  secondary?: { label: string; onClick: () => void };
  className?: string;
}

type Band = "high" | "mid" | "low";

function bandFor(score: number, total?: number): Band {
  if (total && total > 0) {
    const pct = score / total;
    if (pct >= 0.8) return "high";
    if (pct >= 0.5) return "mid";
    return "low";
  }
  if (score >= 8) return "high";
  if (score >= 4) return "mid";
  return "low";
}

const BAND_HEADLINE: Record<Band, string> = {
  high: "Brilliant!",
  mid: "Nice work!",
  low: "Good try!",
};

const BAND_LINE: Record<Band, string> = {
  high: "Buddy is so proud of you. You crushed it!",
  mid: "You're getting better and better. One more round?",
  low: "Every try makes you stronger. Let's go again!",
};

const BAND_MOOD: Record<Band, BuddyMood> = {
  high: "celebrate",
  mid: "cheer",
  low: "wave",
};

export function ResultsScreen({
  score,
  total,
  category = "default",
  headline,
  message,
  onPlayAgain,
  onHome,
  secondary,
  className,
}: ResultsScreenProps) {
  const band = useMemo(() => bandFor(score, total), [score, total]);
  const { play } = useSfx();
  const playedRef = useRef(false);

  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    play(band === "high" ? "finish" : band === "mid" ? "levelup" : "ding");
  }, [band, play]);

  return (
    <div className={cn("relative", className)}>
      {band === "high" && <Confetti />}

      <div
        className={cn(
          "surface-card",
          `cat-${category}`,
          "max-w-lg mx-auto px-6 sm:px-10 py-10 text-center pop-in",
        )}
      >
        <div className="mx-auto mb-2 flex justify-center">
          <Buddy mood={BAND_MOOD[band]} size="lg" />
        </div>

        <h2 className="font-display text-4xl sm:text-5xl text-arcade-strong">
          {headline ?? BAND_HEADLINE[band]}
        </h2>
        <p className="mt-2 text-arcade-mid text-base sm:text-lg max-w-md mx-auto">
          {message ?? BAND_LINE[band]}
        </p>

        <div className="mt-6 flex justify-center">
          <ScorePill score={score} total={total} />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch">
          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="font-display text-lg px-8 py-3.5 rounded-full text-[var(--ink-on-color)]
                         bg-[var(--joy-gold)] hover:brightness-105 active:scale-[0.97]
                         shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                         border border-[oklch(0.65_0.16_75)]"
            >
              Play Again
            </button>
          )}
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="font-display text-lg px-8 py-3.5 rounded-full text-arcade-strong
                         bg-[var(--arcade-card-soft)] hover:brightness-110 active:scale-[0.97]
                         border border-[var(--arcade-edge)]
                         shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]"
            >
              {secondary.label}
            </button>
          )}
          {onHome && (
            <button
              type="button"
              onClick={onHome}
              className="font-display text-lg px-8 py-3.5 rounded-full text-arcade-strong
                         bg-transparent hover:bg-[oklch(1_0_0_/_0.06)] active:scale-[0.97]
                         border border-[var(--arcade-edge)]"
            >
              Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScorePill({ score, total }: { score: number; total?: number }) {
  return (
    <div
      className="inline-flex items-baseline gap-3 px-6 py-3 rounded-full chip-gold"
      aria-label={`Your score is ${score}${total ? ` out of ${total}` : ""}`}
    >
      <span className="font-display text-4xl leading-none">{score}</span>
      {total !== undefined && (
        <>
          <span className="text-xl opacity-70">/</span>
          <span className="font-display text-2xl opacity-80">{total}</span>
        </>
      )}
    </div>
  );
}

function Confetti() {
  // 24 fixed pieces; deterministic colors so SSR + first paint match.
  const pieces = useMemo(() => {
    const colors = [
      "var(--cat-math)",
      "var(--cat-memory)",
      "var(--cat-reading)",
      "var(--cat-music)",
      "var(--cat-spatial)",
      "var(--joy-gold)",
    ];
    return Array.from({ length: 24 }, (_, i) => ({
      left: `${(i * 4.16 + 6) % 100}%`,
      cx: `${((i * 13) % 80) - 40}px`,
      cd: `${1.2 + ((i * 0.12) % 1.0)}s`,
      cdelay: `${(i * 0.07) % 1.4}s`,
      color: colors[i % colors.length],
      tilt: i % 2 === 0 ? "rotate(35deg)" : "rotate(-25deg)",
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: p.left,
              background: p.color,
              transform: p.tilt,
              "--cx": p.cx,
              "--cd": p.cd,
              "--cdelay": p.cdelay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
