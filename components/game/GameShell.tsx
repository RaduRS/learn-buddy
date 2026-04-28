"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Volume2, VolumeX } from "lucide-react";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { Buddy } from "@/components/mascot/Buddy";
import { CATEGORIES, type CategoryKey } from "@/lib/games/categories";
import { cn } from "@/lib/utils";

interface GameShellProps {
  /** Game title shown in the hero. */
  title: string;
  /** Optional kicker (e.g., "Memory · Easy"). */
  kicker?: string;
  /** Drives the accent color and Buddy framing. */
  category?: CategoryKey;
  /** Where the back arrow goes. Defaults to "/". */
  backHref?: string;
  /** Custom click handler — overrides backHref. */
  onBack?: () => void;
  /** Optional "X / Y" progress chip rendered in the header. */
  progress?: { current: number; total: number };
  /** When false, hides the global score chip. Defaults to true. */
  showScoreChip?: boolean;
  /** When false, paints children directly without arcade backdrop. */
  withBackdrop?: boolean;
  /** When false, hides the category-tinted hero strip. Useful while a game still
   * renders its own internal title/header. Default true. */
  showHero?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * GameShell — the shared frame that wraps every game page and screen.
 *
 * Owns the arcade backdrop, the top app-bar (back, mute, score), and
 * a category-tinted hero with title + Buddy. Replaces the duplicated
 * gradient backgrounds and bespoke headers across the existing games.
 */
export function GameShell({
  title,
  kicker,
  category = "default",
  backHref = "/",
  onBack,
  progress,
  showScoreChip = true,
  withBackdrop = true,
  showHero = true,
  className,
  children,
}: GameShellProps) {
  const meta = CATEGORIES[category];
  const { totalScore, scoreLoaded } = useScore();
  const { muted, toggleMute, play } = useSfx();

  const handleMute = () => {
    play("tap");
    toggleMute();
  };

  const wrapperClass = cn(
    withBackdrop && "bg-arcade",
    "min-h-screen",
    className,
  );

  return (
    <div className={wrapperClass}>
      <header
        className="sticky top-0 z-40 px-3 sm:px-6 pt-3 sm:pt-4 pb-3
                   backdrop-blur-md bg-[oklch(0.18_0.07_285_/_0.65)]
                   border-b border-[var(--arcade-edge)]"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <BackButton href={backHref} onClick={onBack} />

          <div className="flex-1 min-w-0">
            {kicker && (
              <p className="text-xs sm:text-sm text-arcade-soft truncate">
                {kicker}
              </p>
            )}
            <h1 className="font-display text-lg sm:text-xl text-arcade-strong leading-tight truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {progress && (
              <span className="chip" aria-label={`Question ${progress.current} of ${progress.total}`}>
                <span className="font-display text-base leading-none">{progress.current}</span>
                <span className="opacity-60">/</span>
                <span className="font-display text-base leading-none opacity-80">{progress.total}</span>
              </span>
            )}

            {showScoreChip && scoreLoaded && (
              <span className="chip chip-gold" aria-label={`Total stars: ${totalScore}`}>
                <Star className="w-4 h-4" aria-hidden />
                <span className="font-display text-base leading-none">{totalScore}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleMute}
              aria-pressed={muted}
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              className={cn(
                "h-10 w-10 grid place-items-center rounded-full",
                "bg-[var(--arcade-card-soft)] text-arcade-strong",
                "border border-[var(--arcade-edge)]",
                "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]",
                "active:scale-[0.94]",
              )}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {showHero && (
        <section
          aria-hidden
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, var(${meta.cssGlowVar}) 0%, transparent 100%)`,
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex items-end gap-4">
            <Buddy mood="wave" size="md" />
            <div className="flex-1">
              <p
                className="text-xs uppercase tracking-[0.18em] font-display"
                style={{ color: `var(${meta.cssVar})` }}
              >
                {meta.label}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong leading-tight">
                {title}
              </h2>
            </div>
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pb-12 pt-4">
        {children}
      </main>
    </div>
  );
}

function BackButton({ href, onClick }: { href: string; onClick?: () => void }) {
  const className =
    "h-10 w-10 grid place-items-center rounded-full bg-[var(--arcade-card-soft)] " +
    "text-arcade-strong border border-[var(--arcade-edge)] " +
    "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)] active:scale-[0.94]";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Go back"
        className={className}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <Link href={href} aria-label="Go back" className={className}>
      <ArrowLeft className="w-5 h-5" />
    </Link>
  );
}
