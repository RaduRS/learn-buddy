// components/game/ReadingStoryGame.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  Square,
} from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { cn } from "@/lib/utils";
import {
  STORY_THEMES,
  STORY_QUESTION_COUNT,
  type Story,
  type JudgeResult,
  type StoryTheme,
} from "@/lib/games/storyTime";

interface ReadingStoryGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

type Phase =
  | "theme"
  | "loading"
  | "reading"
  | "questions"
  | "judging"
  | "results"
  | "error";

interface AnswerState {
  transcript: string | null;
  transcribing: boolean;
}

export default function ReadingStoryGame({
  gameId,
  userAge,
  onGameComplete,
}: ReadingStoryGameProps) {
  const { incrementScore } = useScore();
  const { play } = useSfx();
  const recorder = useAudioRecorder();
  const stopRef = useRef(recorder.stop);
  stopRef.current = recorder.stop;

  // Stop the mic if the player leaves mid-recording.
  useEffect(() => {
    return () => {
      void stopRef.current();
    };
  }, []);

  const [phase, setPhase] = useState<Phase>("theme");
  const [story, setStory] = useState<Story | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [activeRecording, setActiveRecording] = useState<number | null>(null);
  const [results, setResults] = useState<JudgeResult[] | null>(null);
  const [score, setScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const pickTheme = useCallback(
    async (theme: StoryTheme) => {
      play("tap");
      setPhase("loading");
      setErrorMsg("");
      try {
        const res = await fetch("/api/ai/generate-story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: theme.prompt, age: userAge }),
        });
        if (!res.ok) throw new Error("generate failed");
        const data = (await res.json()) as Story;
        setStory(data);
        setPageIndex(0);
        setAnswers(
          Array.from({ length: data.questions.length }, () => ({
            transcript: null,
            transcribing: false,
          })),
        );
        setResults(null);
        setScore(0);
        setPhase("reading");
      } catch {
        setErrorMsg("Buddy couldn't write a story this time.");
        setPhase("error");
      }
    },
    [play, userAge],
  );

  const goPage = useCallback(
    (next: number) => {
      if (!story) return;
      play("tap");
      const clamped = Math.max(0, Math.min(story.pages.length - 1, next));
      setPageIndex(clamped);
    },
    [story, play],
  );

  const toggleRecording = useCallback(
    async (i: number) => {
      if (activeRecording === i) {
        const blob = await recorder.stop();
        setActiveRecording(null);
        if (!blob) return;
        setAnswers((prev) =>
          prev.map((a, idx) => (idx === i ? { ...a, transcribing: true } : a)),
        );
        try {
          const res = await fetch("/api/ai/reading-stt", {
            method: "POST",
            headers: { "Content-Type": blob.type || "audio/webm" },
            body: blob,
          });
          if (!res.ok) throw new Error("stt failed");
          const data = (await res.json()) as { transcript: string };
          play(data.transcript ? "correct" : "wrong");
          setAnswers((prev) =>
            prev.map((a, idx) =>
              idx === i
                ? { transcript: data.transcript, transcribing: false }
                : a,
            ),
          );
        } catch {
          setAnswers((prev) =>
            prev.map((a, idx) =>
              idx === i ? { transcript: null, transcribing: false } : a,
            ),
          );
        }
      } else {
        play("tap");
        try {
          await recorder.start();
          setActiveRecording(i);
        } catch {
          setActiveRecording(null);
        }
      }
    },
    [activeRecording, recorder, play],
  );

  const finish = useCallback(async () => {
    if (!story) return;
    play("tap");
    setPhase("judging");
    try {
      const payload = {
        storyTitle: story.title,
        answers: story.questions.map((q, i) => ({
          question: q.q,
          expectedAnswer: q.expectedAnswer,
          transcript: answers[i]?.transcript ?? "",
        })),
      };
      const res = await fetch("/api/ai/reading-judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("judge failed");
      const data = (await res.json()) as { results: JudgeResult[] };
      const correct = data.results.filter((r) => r.correct).length;
      setResults(data.results);
      setScore(correct);
      setPhase("results");
      if (gameId) incrementScore(gameId, correct);
      onGameComplete(correct, STORY_QUESTION_COUNT);
    } catch {
      setErrorMsg("Buddy couldn't check your answers. Let's try again.");
      setPhase("questions");
    }
  }, [story, answers, play, gameId, incrementScore, onGameComplete]);

  const restart = useCallback(() => {
    play("tap");
    setStory(null);
    setPageIndex(0);
    setAnswers([]);
    setActiveRecording(null);
    setResults(null);
    setScore(0);
    setErrorMsg("");
    setPhase("theme");
  }, [play]);

  if (phase === "loading") {
    return (
      <LoadingScreen
        tone="thinking"
        message="Writing your story…"
        subMessage="Buddy is dreaming up something fun to read."
      />
    );
  }

  if (phase === "judging") {
    return (
      <LoadingScreen
        tone="thinking"
        message="Checking your answers…"
        subMessage="Buddy is listening carefully."
      />
    );
  }

  if (phase === "error") {
    return (
      <div className="surface-card cat-reading p-8 text-center">
        <div className="flex justify-center mb-3">
          <Buddy mood="sad" size="lg" />
        </div>
        <h3 className="font-display text-2xl text-arcade-strong">Oops!</h3>
        <p className="mt-2 text-arcade-mid">{errorMsg}</p>
        <button
          type="button"
          onClick={restart}
          className="mt-5 font-display text-lg px-6 py-3 rounded-full text-[var(--ink-on-color)]
                     bg-[var(--cat-reading)] active:scale-[0.97]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === "results" && results && story) {
    return (
      <div className="space-y-4">
        <ResultsScreen
          score={score}
          total={STORY_QUESTION_COUNT}
          category="reading"
          onPlayAgain={restart}
        />
        <div className="surface-card cat-reading p-5 max-w-2xl mx-auto space-y-3">
          {story.questions.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 bg-[var(--arcade-card-soft)] border border-[var(--arcade-edge)]"
            >
              <div className="font-display text-arcade-strong">{q.q}</div>
              <div
                className="text-sm mt-1"
                style={{
                  color: results[i].correct
                    ? "var(--joy-correct)"
                    : "var(--joy-wrong)",
                }}
              >
                {results[i].correct ? "✓ " : "✗ "}
                {results[i].feedback}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "questions" && story) {
    const allAnswered = answers.every(
      (a) => a.transcript && a.transcript.trim() !== "",
    );
    const micProblem =
      !recorder.isSupported ||
      recorder.error === "denied" ||
      recorder.error === "unsupported";
    return (
      <div className="space-y-4">
        <div className="surface-card cat-reading p-5">
          <p
            className="text-xs uppercase tracking-[0.18em] font-display"
            style={{ color: "var(--cat-reading)" }}
          >
            {story.title}
          </p>
          <h3 className="font-display text-xl sm:text-2xl text-arcade-strong mt-1">
            Answer out loud
          </h3>
          <p className="text-arcade-mid text-sm mt-1">
            Tap the mic, say your answer, then tap again to stop.
          </p>
          {errorMsg && (
            <p className="text-sm mt-2" style={{ color: "var(--joy-wrong)" }}>
              {errorMsg}
            </p>
          )}
        </div>

        {micProblem && (
          <div className="surface-card p-4 flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 mt-0.5"
              style={{ color: "var(--joy-wrong)" }}
            />
            <div>
              <p className="font-display text-arcade-strong">
                Buddy needs the microphone
              </p>
              <p className="text-arcade-mid text-sm mt-1">
                Please allow microphone access, then tap a mic button to try
                again.
              </p>
            </div>
          </div>
        )}

        {story.questions.map((q, i) => {
          const a = answers[i];
          const isRec = activeRecording === i;
          return (
            <div key={i} className="surface-card cat-reading p-5">
              <div className="font-display text-lg text-arcade-strong">
                {i + 1}. {q.q}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleRecording(i)}
                  disabled={
                    a.transcribing ||
                    (activeRecording !== null && !isRec)
                  }
                  className={cn(
                    "font-display inline-flex items-center gap-2 px-5 py-2.5 rounded-full",
                    "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
                    isRec
                      ? "text-white"
                      : "text-[var(--ink-on-color)]",
                  )}
                  style={{
                    background: isRec
                      ? "var(--joy-wrong)"
                      : "var(--cat-reading)",
                  }}
                >
                  {isRec ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isRec
                    ? "Stop"
                    : a.transcript
                      ? "Record again"
                      : "Record answer"}
                </button>
                {a.transcribing && (
                  <Loader2 className="w-5 h-5 animate-spin text-arcade-soft" />
                )}
              </div>
              {a.transcript && (
                <p className="mt-3 text-arcade-mid text-sm">
                  You said:{" "}
                  <span className="text-arcade-strong">
                    &ldquo;{a.transcript}&rdquo;
                  </span>
                </p>
              )}
            </div>
          );
        })}

        <div className="text-center">
          <button
            type="button"
            onClick={finish}
            disabled={!allAnswered}
            className="font-display text-lg px-10 py-3 rounded-full text-[var(--ink-on-color)]
                       bg-[var(--joy-gold)] active:scale-[0.97]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Finish
          </button>
          {!allAnswered && (
            <p className="text-arcade-soft text-sm mt-2">
              Answer all {STORY_QUESTION_COUNT} questions to finish.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "reading" && story) {
    const isLast = pageIndex === story.pages.length - 1;
    return (
      <div className="space-y-4">
        <div className="surface-card cat-reading p-5">
          <p
            className="text-xs uppercase tracking-[0.18em] font-display"
            style={{ color: "var(--cat-reading)" }}
          >
            {story.title}
          </p>
          <p className="text-arcade-mid text-sm mt-1">
            Page {pageIndex + 1} of {story.pages.length}
          </p>
        </div>

        <div className="surface-card cat-reading p-8 sm:p-12 min-h-[40vh] flex items-center justify-center">
          <p className="font-display text-3xl sm:text-5xl leading-snug text-center text-arcade-strong">
            {story.pages[pageIndex]}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {story.pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goPage(i)}
              aria-label={`Go to page ${i + 1}`}
              className="w-3 h-3 rounded-full"
              style={{
                background:
                  i === pageIndex
                    ? "var(--cat-reading)"
                    : "var(--arcade-edge)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="font-display inline-flex items-center gap-1 px-5 py-2.5 rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)]
                       disabled:opacity-40 active:scale-[0.97]"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => {
                play("tap");
                setPhase("questions");
              }}
              className="font-display inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                         text-[var(--ink-on-color)] bg-[var(--cat-reading)] active:scale-[0.97]"
            >
              Questions <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goPage(pageIndex + 1)}
              className="font-display inline-flex items-center gap-1 px-5 py-2.5 rounded-full
                         text-[var(--ink-on-color)] bg-[var(--cat-reading)] active:scale-[0.97]"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // phase === "theme" (default)
  return (
    <div className="space-y-4">
      <div className="surface-card cat-reading p-5 sm:p-7 flex items-center gap-5">
        <div className="hidden sm:block">
          <Buddy mood="cheer" size="md" />
        </div>
        <div>
          <p
            className="text-xs uppercase tracking-[0.22em] font-display"
            style={{ color: "var(--cat-reading)" }}
          >
            Story Time
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong">
            Pick a story to read
          </h2>
          <p className="mt-1 text-arcade-mid text-sm">
            Choose what your story is about. Then read it and answer 3 questions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STORY_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => pickTheme(theme)}
            className="surface-card cat-reading p-5 sm:p-6 text-left active:scale-[0.985] transition-transform
                       flex items-center gap-4"
          >
            <Image
              src={theme.image}
              alt=""
              width={96}
              height={96}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 bg-white/90 ring-1 ring-[var(--arcade-edge)]"
            />
            <div className="font-display text-lg sm:text-xl text-arcade-strong">
              {theme.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
