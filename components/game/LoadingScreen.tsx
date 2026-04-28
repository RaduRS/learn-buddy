"use client";

import { Buddy } from "@/components/mascot/Buddy";
import { cn } from "@/lib/utils";

export type LoadingTone = "loading" | "generating" | "thinking" | "preparing";

interface LoadingScreenProps {
  /** Big headline. Falls back to a tone-based default. */
  message?: string;
  /** Quiet supporting line. */
  subMessage?: string;
  /** Optional progress 0..100. Hidden if omitted. */
  progress?: number;
  /** Picks a default headline + Buddy mood. */
  tone?: LoadingTone;
  /** Render full-screen with arcade backdrop, or inline inside an existing shell. */
  fullscreen?: boolean;
  className?: string;
}

const DEFAULT_HEADLINE: Record<LoadingTone, string> = {
  loading: "Loading…",
  generating: "Buddy is thinking…",
  thinking: "One moment, friend!",
  preparing: "Setting things up…",
};

const DEFAULT_SUB: Record<LoadingTone, string> = {
  loading: "Almost there.",
  generating: "Cooking up something fun.",
  thinking: "Here we go!",
  preparing: "Buddy is getting the stage ready.",
};

export function LoadingScreen({
  message,
  subMessage,
  progress,
  tone = "loading",
  fullscreen = false,
  className,
}: LoadingScreenProps) {
  const headline = message ?? DEFAULT_HEADLINE[tone];
  const sub = subMessage ?? DEFAULT_SUB[tone];
  const buddyMood =
    tone === "thinking" || tone === "generating" ? "think" : "idle";

  const inner = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 text-center px-6",
        fullscreen ? "min-h-screen" : "min-h-[60vh]",
        className,
      )}
    >
      <div className="relative">
        <Buddy mood={buddyMood} size="lg" />
        <span
          className="absolute inset-0 m-auto rounded-full ring-pulse text-[oklch(0.78_0.18_160_/_0.55)]"
          aria-hidden
          style={{ width: "60%", height: "60%", left: 0, right: 0, top: "20%" }}
        />
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong">
          {headline}
        </h2>
        {sub && (
          <p className="text-base text-arcade-soft max-w-sm mx-auto">{sub}</p>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-64 max-w-full h-2.5 rounded-full bg-[oklch(0.30_0.06_280_/_0.6)] overflow-hidden ring-1 ring-[var(--arcade-edge)]">
          <div
            className="h-full bg-[var(--cat-music)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return <div className="bg-arcade min-h-screen">{inner}</div>;
  }
  return inner;
}
