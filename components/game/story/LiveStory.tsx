"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Square, Volume2 } from "lucide-react";
import { Buddy } from "@/components/mascot/Buddy";
import { useSfx } from "@/components/sound/SoundProvider";
import { useDeepgramStream } from "@/hooks/useDeepgramStream";
import { cn } from "@/lib/utils";

interface LiveStoryProps {
  themeId: string;
  themeLabel: string;
  userId: string;
  gameId: string;
  userAge: number;
  userName?: string;
  onExit: () => void;
  onComplete: (score: number, total: number) => void;
}

interface Beat {
  id: string;
  index: number;
  speaker: "ai" | "child";
  text: string;
  audioB64?: string | null;
  audioMime?: string | null;
  imageB64?: string | null;
}

type Phase = "starting" | "narrating" | "listening" | "error" | "finished";

/** How long we wait for the child to start talking before carrying on. */
const LISTEN_WINDOW_MS = 1700;

/** Loose echo guard: ignore a transcript that is basically the AI's own line. */
function looksLikeEcho(transcript: string, aiText: string | null): boolean {
  if (!aiText) return false;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const t = norm(transcript);
  const a = norm(aiText);
  if (t.length < 6 || a.length < 6) return false;
  return a.includes(t) || t.includes(a.slice(0, Math.min(a.length, 40)));
}

export function LiveStory({
  themeId,
  themeLabel,
  userId,
  gameId,
  userAge,
  userName,
  onExit,
  onComplete,
}: LiveStoryProps) {
  const { play } = useSfx();

  const [beats, setBeats] = useState<Beat[]>([]);
  const [phase, setPhase] = useState<Phase>("starting");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // --- refs (declared up front so every callback can close over them) ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBeatRef = useRef<Beat | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const storyIdRef = useRef<string | null>(null);
  const beatsRef = useRef<Beat[]>([]);
  const phaseRef = useRef<Phase>("starting");

  // Late-bound callbacks that break circular dependencies between the
  // streaming handlers and the turn/advance logic.
  const playBeatRef = useRef<((beat: Beat) => void) | null>(null);
  const finishRef = useRef<((lastBeat?: Beat) => void) | null>(null);
  const scheduleRef = useRef<(() => void) | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  const clearAdvance = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const requestImage = useCallback(async (beat: Beat) => {
    setImageLoading(true);
    try {
      const res = await fetch("/api/ai/story/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId: beat.id }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { imageB64?: string };
      if (data.imageB64) {
        setBeats((prev) =>
          prev.map((b) => (b.id === beat.id ? { ...b, imageB64: data.imageB64 } : b)),
        );
      }
    } catch {
      // The picture is a nice-to-have; text and voice already landed.
    } finally {
      setImageLoading(false);
    }
  }, []);

  const playBeat = useCallback((beat: Beat) => {
    currentBeatRef.current = beat;
    const audio = audioRef.current;
    if (!audio || !beat.audioB64) {
      // No voice for this beat: open the listening window straight away.
      setPhase("listening");
      scheduleRef.current?.();
      return;
    }
    audio.src = beat.audioB64;
    setPhase("narrating");
    audio.play().catch(() => {
      setPhase("listening");
      scheduleRef.current?.();
    });
  }, []);

  const scheduleAdvance = useCallback(() => {
    clearAdvance();
    advanceTimerRef.current = setTimeout(() => {
      if (!speakingRef.current) void advanceRef.current?.(null);
    }, LISTEN_WINDOW_MS);
  }, [clearAdvance]);

  const advance = useCallback(
    async (childText: string | null) => {
      const id = storyIdRef.current;
      if (!id || busyRef.current) return;
      busyRef.current = true;
      clearAdvance();
      setPhase("narrating");
      try {
        const res = await fetch("/api/ai/story/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: id, childText: childText ?? undefined }),
        });
        if (!res.ok) throw new Error("The story paused. Tap the mic to keep going.");
        const data = (await res.json()) as { beat: Beat; done: boolean };

        if (childText) {
          // Show the child's line in the replay stack right away.
          setBeats((prev) => [
            ...prev,
            {
              id: `child-${prev.length}`,
              index: prev.length,
              speaker: "child",
              text: childText,
            },
          ]);
        }
        setBeats((prev) => [...prev, data.beat]);
        void requestImage(data.beat);

        if (data.done) finishRef.current?.(data.beat);
        else playBeatRef.current?.(data.beat);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("error");
      } finally {
        busyRef.current = false;
      }
    },
    [clearAdvance, requestImage],
  );
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  const finish = useCallback(() => {
    clearAdvance();
    stopStreamRef.current?.();
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPhase("finished");
    const aiBeats = beatsRef.current.filter((b) => b.speaker === "ai").length;
    play("finish");
    onComplete(aiBeats, Math.max(aiBeats, 1));
  }, [clearAdvance, onComplete, play]);

  const onSpeechStart = useCallback(() => {
    speakingRef.current = true;
    clearAdvance();
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      // Barge-in: the child is talking, so stop the narrator immediately.
      audio.pause();
      audio.currentTime = 0;
    }
    setPhase("listening");
  }, [clearAdvance]);

  const onInterimText = useCallback((text: string) => {
    speakingRef.current = true;
    setInterim(text);
  }, []);

  const onFinalText = useCallback(
    (text: string) => {
      setInterim("");
      speakingRef.current = false;
      if (looksLikeEcho(text, currentBeatRef.current?.text ?? null)) {
        // The narrator heard itself; ignore it and keep the flow moving.
        if (phaseRef.current === "listening") scheduleRef.current?.();
        return;
      }
      void advanceRef.current?.(text);
    },
    [],
  );

  const { state: streamState, error: streamError, start: startStream, stop: stopStream } =
    useDeepgramStream({ onSpeechStart, onInterim: onInterimText, onFinal: onFinalText });

  // Bind the late refs used by the callbacks above.
  useEffect(() => {
    playBeatRef.current = playBeat;
    finishRef.current = finish;
    scheduleRef.current = scheduleAdvance;
    stopStreamRef.current = stopStream;
  }, [playBeat, finish, scheduleAdvance, stopStream]);

  useEffect(() => {
    beatsRef.current = beats;
  }, [beats]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Kick the story off exactly once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/story/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, gameId, theme: themeId, age: userAge }),
        });
        if (!res.ok) throw new Error("Buddy could not start the story. Please try again.");
        const data = (await res.json()) as { storyId: string; beat: Beat };
        if (cancelled) return;
        storyIdRef.current = data.storyId;
        setStoryId(data.storyId);
        setBeats([data.beat]);
        void requestImage(data.beat);
        void startStream();
        playBeatRef.current?.(data.beat);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      clearAdvance();
      stopStreamRef.current?.();
      // Read the ref at cleanup time on purpose: the element is stable, and
      // capturing it at mount would only ever see the initial null.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = useCallback(() => {
    clearAdvance();
    stopStream();
    audioRef.current?.pause();
    onExit();
  }, [clearAdvance, onExit, stopStream]);

  if (phase === "error") {
    return <ErrorState message={error ?? "Something went wrong"} onExit={handleExit} />;
  }

  const current = beats.filter((b) => b.speaker === "ai").slice(-1)[0] ?? null;
  const speaking = interim.length > 0;
  const listening = phase === "listening";

  return (
    <div className="pop-in max-w-3xl mx-auto">
      <div className="relative surface-card cat-creative overflow-hidden p-2 sm:p-3">
        <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[oklch(0.20_0.06_285_/_0.55)]">
          {current?.imageB64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.imageB64}
              alt={current.text}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <Shimmer label={imageLoading ? "Drawing the picture…" : "Getting ready"} />
            </div>
          )}

          {listening && (
            <div className="absolute left-3 bottom-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[oklch(0.18_0.07_285_/_0.72)] border border-[var(--arcade-edge)]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--cat-music)] animate-pulse" />
              <span className="font-display text-sm text-arcade-strong">
                {speaking ? "I can hear you" : "Your turn"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 surface-card cat-creative px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Buddy mood={speaking ? "cheer" : "think"} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg sm:text-xl text-arcade-strong leading-snug">
              {current?.text ?? "Starting the story…"}
            </p>
            {speaking && (
              <p className="mt-2 text-arcade-mid italic truncate">“{interim}”</p>
            )}
            {phase === "narrating" && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-arcade-soft">
                <Volume2 className="w-4 h-4" aria-hidden /> Buddy is telling the story
              </p>
            )}
            {phase === "starting" && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-arcade-soft">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Buddy is thinking
              </p>
            )}
            {streamError && (
              <p className="mt-2 text-sm" style={{ color: "var(--cat-spatial)" }} role="status">
                {streamError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm text-arcade-mid">
            {streamState === "listening" ? (
              <Mic className="w-4 h-4" style={{ color: "var(--cat-music)" }} aria-hidden />
            ) : (
              <MicOff className="w-4 h-4 opacity-60" aria-hidden />
            )}
            {streamState === "listening" ? "Listening" : "Mic off"}
          </span>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-2 font-display px-5 py-2.5 rounded-full
                       text-arcade-strong bg-[var(--arcade-card-soft)]
                       border border-[var(--arcade-edge)] active:scale-[0.97]"
          >
            <Square className="w-4 h-4" aria-hidden />
            End story
          </button>
        </div>
      </div>

      {phase === "finished" && (
        <FinishedPanel
          themeLabel={themeLabel}
          userName={userName}
          storiesHref={storyId ? `/stories/${storyId}` : undefined}
          onExit={handleExit}
        />
      )}

      {/* Narration sink. Every line is already shown as the on-screen caption,
          so a caption track would be redundant here. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setPhase("listening");
          scheduleRef.current?.();
        }}
        className="hidden"
      />
    </div>
  );
}

function Shimmer({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-[oklch(1_0_0_/_0.06)] animate-pulse" />
      <p className="mt-3 font-display text-arcade-soft">{label}</p>
    </div>
  );
}

function FinishedPanel({
  themeLabel,
  userName,
  storiesHref,
  onExit,
}: {
  themeLabel: string;
  userName?: string;
  storiesHref?: string;
  onExit: () => void;
}) {
  return (
    <div className="mt-4 surface-card cat-music px-6 py-6 text-center pop-in">
      <div className="flex justify-center mb-1">
        <Buddy mood="celebrate" size="md" />
      </div>
      <h2 className="font-display text-2xl text-arcade-strong">
        The end{userName ? `, ${userName}` : ""}!
      </h2>
      <p className="mt-1 text-arcade-mid">
        You made a {themeLabel.toLowerCase()} story. Buddy saved it so you can read
        it again whenever you like.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
        {storiesHref && (
          <a
            href={storiesHref}
            className="font-display text-lg px-7 py-3 rounded-full text-[var(--ink-on-color)]
                       bg-[var(--joy-gold)] hover:brightness-105 active:scale-[0.97]
                       shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                       border border-[oklch(0.65_0.16_75)]"
          >
            Read it again
          </a>
        )}
        <button
          type="button"
          onClick={onExit}
          className="font-display text-lg px-7 py-3 rounded-full text-arcade-strong
                     bg-transparent hover:bg-[oklch(1_0_0_/_0.06)] active:scale-[0.97]
                     border border-[var(--arcade-edge)]"
        >
          Back home
        </button>
      </div>
    </div>
  );
}

function ErrorState({ message, onExit }: { message: string; onExit: () => void }) {
  return (
    <div className="pop-in max-w-lg mx-auto">
      <div className="surface-card cat-spatial px-6 py-8 text-center">
        <div className="flex justify-center mb-3">
          <Buddy mood="sad" size="md" />
        </div>
        <h2 className="font-display text-2xl text-arcade-strong">
          The story took a nap
        </h2>
        <p className="mt-2 text-arcade-mid">{message}</p>
        <button
          type="button"
          onClick={onExit}
          className={cn(
            "mt-6 font-display text-lg px-7 py-3 rounded-full",
            "text-[var(--ink-on-color)] bg-[var(--cat-music)]",
            "border border-[oklch(0.45_0.10_160)] active:scale-[0.97]",
          )}
        >
          Back home
        </button>
      </div>
    </div>
  );
}
