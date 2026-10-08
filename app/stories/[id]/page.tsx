"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Pause, Play, PlayCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { findTheme } from "@/lib/games/storyThemes";
import { useSfx } from "@/components/sound/SoundProvider";
import type { Story, StoryBeat, User } from "@/types";

export default function StoryPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { play } = useSfx();
  const id = params.id as string;

  const [story, setStory] = useState<Story | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const savedUserId = localStorage.getItem("selectedUserId");
        if (savedUserId) {
          const usersRes = await fetch("/api/users");
          const users = (await usersRes.json()) as User[];
          setCurrentUser(users.find((u) => u.id === savedUserId) ?? null);
        }
        const res = await fetch(`/api/stories/${id}`);
        if (res.ok) {
          setStory((await res.json()) as Story);
        }
      } catch (error) {
        console.error("Failed to load story:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const beats = useMemo<StoryBeat[]>(() => story?.beats ?? [], [story]);
  const beat = beats[index] ?? null;
  const lastIndex = beats.length - 1;

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const playCurrent = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !beat?.audioB64) return;
    audio.src = beat.audioB64;
    void audio.play().catch(() => undefined);
  }, [beat]);

  const goTo = useCallback(
    (next: number) => {
      stopAudio();
      setIndex(Math.max(0, Math.min(lastIndex, next)));
    },
    [lastIndex, stopAudio],
  );

  const toggleReadToMe = useCallback(() => {
    play("tap");
    setAutoPlay((prev) => {
      const next = !prev;
      if (!next) stopAudio();
      return next;
    });
  }, [play, stopAudio]);

  // When auto-play is on, voice the current page whenever it changes.
  useEffect(() => {
    if (!autoPlay) return;
    if (!beat?.audioB64) {
      // Silent page (e.g. the child's own line): move on after a beat.
      const t = setTimeout(() => {
        if (index < lastIndex) setIndex((i) => i + 1);
        else setAutoPlay(false);
      }, 1400);
      return () => clearTimeout(t);
    }
    playCurrent();
    return undefined;
  }, [autoPlay, beat, index, lastIndex, playCurrent]);

  // Stop narration when leaving the page.
  useEffect(() => () => stopAudio(), [stopAudio]);

  const handleNavigate = (page: string) => {
    if (page === "home") router.push("/");
    else if (page === "stories") router.push("/stories");
    else if (page === "achievements") router.push("/achievements");
  };

  if (loading) {
    return (
      <LoadingScreen
        tone="loading"
        message="Opening the story…"
        subMessage="Buddy is flipping to the first page."
        fullscreen
      />
    );
  }

  if (!story) {
    return (
      <div className="bg-arcade min-h-screen flex items-center justify-center p-4">
        <div className="surface-card cat-spatial p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <Buddy mood="sad" size="lg" />
          </div>
          <h1 className="font-display text-2xl text-arcade-strong">
            Story not found
          </h1>
          <p className="mt-2 text-arcade-mid">
            Buddy looked everywhere but couldn&apos;t find that story.
          </p>
          <button
            type="button"
            onClick={() => router.push("/stories")}
            className="mt-6 font-display px-6 py-3 rounded-full text-arcade-strong
                       bg-[var(--arcade-card-soft)] border border-[var(--arcade-edge)]
                       active:scale-[0.97]"
          >
            Back to My Stories
          </button>
        </div>
      </div>
    );
  }

  const theme = findTheme(story.theme);
  const { Icon } = theme;
  const isChildLine = beat?.speaker === "child";

  return (
    <div className="bg-arcade min-h-screen">
      <Header currentUser={currentUser} onNavigate={handleNavigate} />

      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-5 pb-12">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <span
            aria-hidden
            className="grid place-items-center shrink-0 w-11 h-11 rounded-2xl
                       bg-[oklch(0.20_0.06_285_/_0.6)] border border-[var(--arcade-edge)]"
          >
            <Icon className="w-6 h-6" strokeWidth={1.6} style={{ color: `var(${theme.token})` }} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl text-arcade-strong leading-tight">
              {story.title}
            </h1>
            <p className="text-sm text-arcade-soft">
              {theme.label} · {beats.length}{" "}
              {beats.length === 1 ? "page" : "pages"}
            </p>
          </div>
        </div>

        {/* Page */}
        <div className="surface-card cat-creative overflow-hidden p-2 sm:p-3">
          <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[oklch(0.20_0.06_285_/_0.55)]">
            {beat?.imageB64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={beat.imageB64}
                alt={beat.text}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <Buddy mood="think" size="md" />
                  <p className="mt-3 font-display text-arcade-soft">
                    {isChildLine ? "Your idea" : "No picture for this page"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caption */}
        <div
          className={
            "mt-4 surface-card px-5 py-4 sm:px-6 " +
            (isChildLine ? "cat-music" : "cat-creative")
          }
        >
          {isChildLine && (
            <p className="font-display text-sm uppercase tracking-[0.14em] text-arcade-soft">
              You said
            </p>
          )}
          <p className="mt-1 font-display text-lg sm:text-xl text-arcade-strong leading-snug">
            {beat?.text ?? "This story has no pages yet."}
          </p>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous page"
            className="h-11 w-11 grid place-items-center rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)] active:scale-[0.94]
                       disabled:opacity-40 disabled:active:scale-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={toggleReadToMe}
            disabled={!beats.some((b) => b.audioB64)}
            className="flex-1 inline-flex items-center justify-center gap-2 font-display text-base px-5 py-3 rounded-full
                       text-[var(--ink-on-color)] bg-[var(--joy-gold)] hover:brightness-105 active:scale-[0.98]
                       shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                       border border-[oklch(0.65_0.16_75)]
                       disabled:opacity-50 disabled:active:scale-100"
          >
            {autoPlay ? (
              <>
                <Pause className="w-5 h-5" aria-hidden /> Pause
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" aria-hidden /> Read to me
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= lastIndex}
            aria-label="Next page"
            className="h-11 w-11 grid place-items-center rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)] active:scale-[0.94]
                       disabled:opacity-40 disabled:active:scale-100"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-center text-sm text-arcade-soft">
          Page {index + 1} of {Math.max(beats.length, 1)}
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              play("tap");
              stopAudio();
              router.push("/stories");
            }}
            className="inline-flex items-center gap-2 font-display px-6 py-3 rounded-full text-arcade-strong
                       bg-transparent hover:bg-[oklch(1_0_0_/_0.06)] border border-[var(--arcade-edge)]
                       active:scale-[0.97]"
          >
            <Play className="w-4 h-4" aria-hidden />
            My Stories
          </button>
        </div>
      </main>

      {/* Narration sink, page-by-page. Captions are shown on screen. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        onEnded={() => {
          if (!autoPlay) return;
          if (index < lastIndex) setIndex((i) => i + 1);
          else setAutoPlay(false);
        }}
        className="hidden"
      />
    </div>
  );
}
