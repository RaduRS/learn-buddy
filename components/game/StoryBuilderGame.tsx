"use client";

import { useCallback, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { Buddy } from "@/components/mascot/Buddy";
import { LiveStory } from "@/components/game/story/LiveStory";
import { useSfx } from "@/components/sound/SoundProvider";
import { STORY_THEMES, type StoryTheme } from "@/lib/games/storyThemes";
import { cn } from "@/lib/utils";

export interface StoryBuilderGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  userName?: string;
  /** Called once when a story wraps up. Open-ended, so the score is beat count. */
  onGameComplete?: (score: number, totalQuestions: number) => void;
  onExit?: () => void;
}

type Stage = "pick" | "ready" | "live";

export default function StoryBuilderGame({
  userId,
  gameId,
  userAge,
  userName,
  onGameComplete,
  onExit,
}: StoryBuilderGameProps) {
  const { play } = useSfx();
  const [stage, setStage] = useState<Stage>("pick");
  const [theme, setTheme] = useState<StoryTheme | null>(null);

  const chooseTheme = useCallback(
    (next: StoryTheme) => {
      play("whoosh");
      setTheme(next);
      setStage("ready");
    },
    [play],
  );

  const surpriseMe = useCallback(() => {
    const next = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
    chooseTheme(next);
  }, [chooseTheme]);

  const startStory = useCallback(() => {
    play("tap");
    setStage("live");
  }, [play]);

  const backToThemes = useCallback(() => {
    play("tap");
    setStage("pick");
  }, [play]);

  if (stage === "pick") {
    return (
      <div className="pop-in">
        <div className="text-center max-w-xl mx-auto">
          <div className="flex justify-center mb-1">
            <Buddy mood="wave" size="lg" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-arcade-strong leading-tight">
            What is our story about?
          </h2>
          <p className="mt-2 text-arcade-mid">
            Pick a world. We&apos;ll make it up together, and you can talk to
            add your own ideas.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STORY_THEMES.map((t) => (
            <ThemeCard key={t.id} theme={t} onPick={() => chooseTheme(t)} />
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={surpriseMe}
            className="inline-flex items-center gap-2 font-display text-base px-6 py-3 rounded-full
                       text-arcade-strong bg-[var(--arcade-card-soft)]
                       border border-[var(--arcade-edge)]
                       shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]
                       active:scale-[0.97]"
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            Surprise me
          </button>
        </div>
      </div>
    );
  }

  if (stage === "ready" && theme) {
    return (
      <ReadyScreen
        theme={theme}
        userName={userName}
        onStart={startStory}
        onBack={backToThemes}
      />
    );
  }

  return (
    <LiveStory
      themeId={theme?.id ?? "adventure"}
      themeLabel={theme?.label ?? "Story"}
      userId={userId}
      gameId={gameId}
      userAge={userAge}
      userName={userName}
      onExit={onExit ?? backToThemes}
      onComplete={(score, total) => onGameComplete?.(score, total)}
    />
  );
}

function ThemeCard({ theme, onPick }: { theme: StoryTheme; onPick: () => void }) {
  const { Icon } = theme;
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "surface-card cat-creative text-left p-5 sm:p-6",
        "active:scale-[0.985] focus-visible:outline-none",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid place-items-center shrink-0 w-14 h-14 rounded-2xl
                     bg-[oklch(0.20_0.06_285_/_0.6)]
                     border border-[var(--arcade-edge)]"
          style={{ boxShadow: `0 8px 26px -14px var(${theme.token}-glow, var(--cat-creative-glow))` }}
        >
          <Icon className="w-7 h-7" strokeWidth={1.6} style={{ color: `var(${theme.token})` }} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-xl text-arcade-strong leading-tight">
            {theme.label}
          </h3>
          <p className="mt-1 text-sm text-arcade-mid">{theme.blurb}</p>
        </div>
      </div>
    </button>
  );
}

function ReadyScreen({
  theme,
  userName,
  onStart,
  onBack,
}: {
  theme: StoryTheme;
  userName?: string;
  onStart: () => void;
  onBack: () => void;
}) {
  const { Icon } = theme;
  return (
    <div className="pop-in max-w-xl mx-auto text-center">
      <div className="surface-card cat-creative px-6 sm:px-10 py-9">
        <div className="flex justify-center mb-3">
          <Buddy mood="cheer" size="lg" />
        </div>

        <h2 className="font-display text-3xl sm:text-4xl text-arcade-strong leading-tight">
          Let&apos;s build a story together{userName ? `, ${userName}` : ""}!
        </h2>
        <p className="mt-3 text-arcade-mid">
          I&apos;ll start telling it out loud. Whenever you want, jump in and say
          what happens next. I&apos;ll add pictures as we go.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full chip">
          <Icon className="w-4 h-4" style={{ color: `var(${theme.token})` }} aria-hidden />
          <span className="font-display text-sm">{theme.label}</span>
        </div>

        <p className="mt-4 text-sm text-arcade-soft">
          Buddy will ask for your microphone next.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 font-display text-lg px-8 py-3.5 rounded-full
                       text-[var(--ink-on-color)] bg-[var(--joy-gold)] hover:brightness-105 active:scale-[0.97]
                       shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                       border border-[oklch(0.65_0.16_75)]"
          >
            <Mic className="w-5 h-5" aria-hidden />
            Start the story
          </button>
          <button
            type="button"
            onClick={onBack}
            className="font-display text-lg px-6 py-3.5 rounded-full text-arcade-strong
                       bg-transparent hover:bg-[oklch(1_0_0_/_0.06)] active:scale-[0.97]
                       border border-[var(--arcade-edge)]"
          >
            Pick another world
          </button>
        </div>
      </div>
    </div>
  );
}
