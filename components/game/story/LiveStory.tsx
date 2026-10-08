"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Square, Volume2 } from "lucide-react";
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

type Phase = "starting" | "narrating" | "yourturn" | "listening" | "error" | "finished";

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
  const [busy, setBusy] = useState(false);

  // --- refs (declared up front so every callback can close over them) ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busyRef = useRef(false);
  const storyIdRef = useRef<string | null>(null);
  const beatsRef = useRef<Beat[]>([]);
  const phaseRef = useRef<Phase>("starting");
  // Latest thing the child said, whatever the transcription confidence.
  const transcriptRef = useRef("");

  // Late-bound callbacks that break circular dependencies between the
  // streaming handlers and the turn/advance logic.
  const playBeatRef = useRef<((beat: Beat) => void) | null>(null);
  const finishRef = useRef<((lastBeat?: Beat) => void) | null>(null);
  const advanceRef = useRef<((childText: string | null) => void) | null>(null);
  const startStreamRef = useRef<(() => void) | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  // Keep the ref and the render state in step in one place.
  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
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

  const playBeat = useCallback(
    (beat: Beat) => {
      const audio = audioRef.current;
      if (!audio || !beat.audioB64) {
        // No voice for this beat: hand the turn straight to the child.
        goPhase("yourturn");
        return;
      }
      audio.src = beat.audioB64;
      goPhase("narrating");
      audio.play().catch(() => goPhase("yourturn"));
    },
    [goPhase],
  );

  const advance = useCallback(
    async (childText: string | null) => {
      const id = storyIdRef.current;
      if (!id || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      goPhase("narrating");
      try {
        const res = await fetch("/api/ai/story/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: id, childText: childText ?? undefined }),
        });
        if (!res.ok) throw new Error("The story paused. Tap the mic to try again.");
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
        goPhase("error");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [goPhase, requestImage],
  );
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  const finish = useCallback(() => {
    stopStreamRef.current?.();
    audioRef.current?.pause();
    goPhase("finished");
    const aiBeats = beatsRef.current.filter((b) => b.speaker === "ai").length;
    play("finish");
    onComplete(aiBeats, Math.max(aiBeats, 1));
  }, [goPhase, onComplete, play]);

  // --- push-to-talk ------------------------------------------------------
  // First tap: stop Buddy mid-sentence and start listening. Second tap: stop
  // listening and send whatever the child said. Nothing happens on a timer, so
  // the child is always in control of when they talk.
  const beginListening = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    transcriptRef.current = "";
    setInterim("");
    goPhase("listening");
    void startStreamRef.current?.();
  }, [goPhase]);

  const endListening = useCallback(() => {
    stopStreamRef.current?.();
    const text = transcriptRef.current.trim();
    transcriptRef.current = "";
    setInterim("");
    void advanceRef.current?.(text || null);
  }, []);

  const onSpeechStart = useCallback(() => {
    // Barge-in: Buddy stops the moment the child starts talking.
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    goPhase("listening");
  }, [goPhase]);

  const onInterimText = useCallback((text: string) => {
    transcriptRef.current = text;
    setInterim(text);
  }, []);

  const onFinalText = useCallback((text: string) => {
    transcriptRef.current = text;
  }, []);

  const { state: streamState, error: streamError, start: startStream, stop: stopStream } =
    useDeepgramStream({ onSpeechStart, onInterim: onInterimText, onFinal: onFinalText });

  const pushToTalk = useCallback(() => {
    if (phaseRef.current === "listening") endListening();
    else beginListening();
  }, [beginListening, endListening]);

  // Bind the late refs used by the callbacks above.
  useEffect(() => {
    playBeatRef.current = playBeat;
    finishRef.current = finish;
    startStreamRef.current = startStream;
    stopStreamRef.current = stopStream;
  }, [playBeat, finish, startStream, stopStream]);

  useEffect(() => {
    beatsRef.current = beats;
  }, [beats]);

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
        playBeatRef.current?.(data.beat);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        goPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      stopStreamRef.current?.();
      // Read the ref at cleanup time on purpose: the element is stable, and
      // capturing it at mount would only ever see the initial null.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = useCallback(() => {
    stopStream();
    audioRef.current?.pause();
    onExit();
  }, [onExit, stopStream]);

  if (phase === "error") {
    return <ErrorState message={error ?? "Something went wrong"} onExit={handleExit} />;
  }

  const current = beats.filter((b) => b.speaker === "ai").slice(-1)[0] ?? null;
  const speaking = interim.length > 0;
  const listening = phase === "listening";
  const micBusy = streamState === "connecting";

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

          {(listening || phase === "yourturn") && (
            <div className="absolute left-3 bottom-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[oklch(0.18_0.07_285_/_0.72)] border border-[var(--arcade-edge)]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--cat-music)] animate-pulse" />
              <span className="font-display text-sm text-arcade-strong">
                {listening ? (speaking ? "I can hear you" : "Listening") : "Your turn"}
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
            {phase === "narrating" && !busy && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-arcade-soft">
                <Volume2 className="w-4 h-4" aria-hidden /> Buddy is telling the story
              </p>
            )}
            {(phase === "starting" || busy) && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-arcade-soft">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Buddy is thinking
              </p>
            )}
            {phase === "yourturn" && (
              <p className="mt-2 text-sm text-arcade-soft">
                Tap the mic and tell Buddy what happens next.
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
          <button
            type="button"
            onClick={pushToTalk}
            disabled={micBusy || busy}
            aria-pressed={listening}
            className={cn(
              "inline-flex items-center gap-2 font-display px-5 py-3 rounded-full",
              "border border-[var(--arcade-edge)] active:scale-[0.97]",
              "disabled:opacity-60 disabled:active:scale-100",
              listening
                ? "text-arcade-strong bg-[oklch(0.30_0.08_160_/_0.4)]"
                : "text-[var(--ink-on-color)] bg-[var(--cat-music)]",
            )}
          >
            {listening ? (
              <Check className="w-5 h-5" aria-hidden />
            ) : (
              <Mic className="w-5 h-5" aria-hidden />
            )}
            {listening ? "I'm done" : micBusy ? "Starting the mic…" : "Tap to talk"}
          </button>

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
        onEnded={() => goPhase("yourturn")}
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
