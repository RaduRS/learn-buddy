"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle, ChevronRight, Lock, Music, Sparkles, Volume2 } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { useAchievementUnlock } from "@/hooks/useAchievementUnlock";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface MusicLearningGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

type LessonId = "notes" | "rhythm" | "song" | "free";

interface PianoKey {
  note: string;
  freq: number;
  isBlack?: boolean;
}

const KEYS: PianoKey[] = [
  { note: "C",  freq: 261.63 },
  { note: "C#", freq: 277.18, isBlack: true },
  { note: "D",  freq: 293.66 },
  { note: "D#", freq: 311.13, isBlack: true },
  { note: "E",  freq: 329.63 },
  { note: "F",  freq: 349.23 },
  { note: "F#", freq: 369.99, isBlack: true },
  { note: "G",  freq: 392.00 },
  { note: "G#", freq: 415.30, isBlack: true },
  { note: "A",  freq: 440.00 },
  { note: "A#", freq: 466.16, isBlack: true },
  { note: "B",  freq: 493.88 },
  { note: "C2", freq: 523.25 },
];

const WHITE_KEYS = KEYS.filter((k) => !k.isBlack);
const NOTE_LABEL: Record<string, string> = {
  C: "C", D: "D", E: "E", F: "F", G: "G", A: "A", B: "B", C2: "C",
};

const TWINKLE = ["C", "C", "G", "G", "A", "A", "G"];
const RHYTHM_PATTERNS: number[][] = [
  [1, 1, 1, 1],
  [1, 1, 2],
  [2, 1, 1],
  [1, 2, 1],
  [1, 1, 1, 2],
];

const STORAGE_KEY = "learn-buddy:music-progress";

type Progress = Record<LessonId, boolean>;
const EMPTY_PROGRESS: Progress = { notes: false, rhythm: false, song: false, free: false };

function loadProgress(userId: string): Progress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return EMPTY_PROGRESS;
    return { ...EMPTY_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveProgress(userId: string, progress: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY}:${userId}`,
      JSON.stringify(progress),
    );
  } catch {
    // ignore quota / private mode
  }
}

export default function MusicLearningGame({
  userId,
  gameId,
  onGameComplete,
}: MusicLearningGameProps) {
  const { incrementScore } = useScore();
  const { unlock } = useAchievementUnlock(userId);
  const { play: sfx } = useSfx();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [activeLesson, setActiveLesson] = useState<LessonId>("notes");

  useEffect(() => {
    setProgress(loadProgress(userId));
  }, [userId]);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playNote = useCallback(
    (freq: number, duration = 0.45) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.01);
      g.gain.linearRampToValueAtTime(0.16, now + duration * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, now + duration);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    },
    [ensureCtx],
  );

  const speakName = useCallback((noteKey: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(NOTE_LABEL[noteKey] ?? noteKey);
    u.rate = 0.85;
    u.pitch = 1.15;
    window.speechSynthesis.speak(u);
  }, []);

  const completeLesson = useCallback(
    (lesson: LessonId) => {
      const next = { ...progress, [lesson]: true };
      setProgress(next);
      saveProgress(userId, next);
      void unlock({
        gameId,
        title:
          lesson === "notes"
            ? "Note Spotter"
            : lesson === "rhythm"
              ? "Rhythm Star"
              : lesson === "song"
                ? "First Song"
                : "Free Player",
        description:
          lesson === "notes"
            ? "Found every note in Sing the Notes!"
            : lesson === "rhythm"
              ? "Matched a rhythm pattern!"
              : lesson === "song"
                ? "Played a real melody!"
                : "Started Free Play!",
        icon: lesson === "notes" ? "🎵" : lesson === "rhythm" ? "🥁" : lesson === "song" ? "🎶" : "🎹",
      });
      incrementScore(gameId, 1);
      onGameComplete(1, 1);
    },
    [progress, userId, unlock, gameId, incrementScore, onGameComplete],
  );

  const lessonsDone =
    Number(progress.notes) + Number(progress.rhythm) + Number(progress.song);
  const freePlayUnlocked = lessonsDone >= 3;

  return (
    <div className="space-y-5">
      <div className="surface-card cat-music p-5 sm:p-7 flex items-center gap-5">
        <div className="hidden sm:block">
          <Buddy mood={lessonsDone === 3 ? "celebrate" : "cheer"} size="md" />
        </div>
        <div className="flex-1">
          <p
            className="text-xs uppercase tracking-[0.22em] font-display"
            style={{ color: "var(--cat-music)" }}
          >
            Music Lab
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong">
            Three lessons, then a piano playground.
          </h2>
          <p className="mt-1 text-arcade-mid text-sm">
            Learn the names of notes, match a rhythm, then play your first song.
          </p>
        </div>
        <span className="chip chip-gold shrink-0" aria-label={`${lessonsDone} of 3 lessons done`}>
          <Sparkles className="w-4 h-4" aria-hidden />
          <span className="font-display">{lessonsDone}</span>
          <span className="opacity-70">/</span>
          <span className="font-display opacity-80">3</span>
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <LessonTile
          id="notes"
          title="1 · Sing the Notes"
          subtitle="Hear it, find it"
          done={progress.notes}
          active={activeLesson === "notes"}
          onSelect={setActiveLesson}
        />
        <LessonTile
          id="rhythm"
          title="2 · Match the Rhythm"
          subtitle="Tap it back"
          done={progress.rhythm}
          active={activeLesson === "rhythm"}
          locked={!progress.notes}
          onSelect={setActiveLesson}
        />
        <LessonTile
          id="song"
          title="3 · Play a Song"
          subtitle="Twinkle Twinkle"
          done={progress.song}
          active={activeLesson === "song"}
          locked={!progress.rhythm}
          onSelect={setActiveLesson}
        />
        <LessonTile
          id="free"
          title="Free Play"
          subtitle="Just have fun"
          done={progress.free}
          active={activeLesson === "free"}
          locked={!freePlayUnlocked}
          onSelect={setActiveLesson}
        />
      </div>

      {activeLesson === "notes" && (
        <NotesLesson
          playNote={playNote}
          speakName={speakName}
          sfx={sfx}
          onComplete={() => completeLesson("notes")}
        />
      )}
      {activeLesson === "rhythm" && (
        <RhythmLesson
          playNote={playNote}
          sfx={sfx}
          onComplete={() => completeLesson("rhythm")}
        />
      )}
      {activeLesson === "song" && (
        <SongLesson
          playNote={playNote}
          sfx={sfx}
          onComplete={() => completeLesson("song")}
        />
      )}
      {activeLesson === "free" && (
        <FreePlay playNote={playNote} unlocked={freePlayUnlocked} />
      )}
    </div>
  );
}

function LessonTile({
  id,
  title,
  subtitle,
  done,
  active,
  locked,
  onSelect,
}: {
  id: LessonId;
  title: string;
  subtitle: string;
  done: boolean;
  active: boolean;
  locked?: boolean;
  onSelect: (id: LessonId) => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onSelect(id)}
      className={cn(
        "surface-card cat-music text-left p-4 relative",
        "active:scale-[0.985] transition-transform",
        locked && "opacity-55 cursor-not-allowed",
      )}
      style={
        active
          ? { outline: "2px solid var(--joy-gold)", outlineOffset: "-2px" }
          : undefined
      }
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-arcade-strong text-base sm:text-lg">
          {title}
        </span>
        {done ? (
          <CheckCircle className="w-5 h-5" style={{ color: "var(--joy-correct)" }} />
        ) : locked ? (
          <Lock className="w-4 h-4 text-arcade-soft" />
        ) : (
          <ChevronRight className="w-5 h-5 text-arcade-soft" />
        )}
      </div>
      <p className="mt-1 text-sm text-arcade-mid">{subtitle}</p>
    </button>
  );
}

/* ───────── Lesson 1: Sing the Notes ───────── */

function NotesLesson({
  playNote,
  speakName,
  sfx,
  onComplete,
}: {
  playNote: (freq: number, duration?: number) => void;
  speakName: (note: string) => void;
  sfx: (sound: "tap" | "correct" | "wrong" | "levelup" | "finish" | "ding") => void;
  onComplete: () => void;
}) {
  const TARGET_COUNT = 8;
  const [target, setTarget] = useState<PianoKey | null>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [doneCelebration, setDoneCelebration] = useState(false);

  const newRound = useCallback(() => {
    const nextTarget = WHITE_KEYS[Math.floor(Math.random() * WHITE_KEYS.length)];
    setTarget(nextTarget);
    setFeedback(null);
    setTimeout(() => {
      playNote(nextTarget.freq, 0.5);
      setTimeout(() => speakName(nextTarget.note), 350);
    }, 80);
  }, [playNote, speakName]);

  useEffect(() => {
    if (round < TARGET_COUNT) newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handleKey = (key: PianoKey) => {
    if (key.isBlack) return;
    playNote(key.freq);
    if (!target || feedback || round >= TARGET_COUNT) return;
    if (key.note === target.note) {
      sfx("correct");
      setFeedback("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        if (round + 1 >= TARGET_COUNT) {
          setDoneCelebration(true);
          sfx("levelup");
          onComplete();
        } else {
          setRound((r) => r + 1);
        }
      }, 700);
    } else {
      sfx("wrong");
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 700);
    }
  };

  const replay = () => {
    if (!target) return;
    playNote(target.freq, 0.5);
    setTimeout(() => speakName(target.note), 350);
  };

  if (doneCelebration) {
    return (
      <ResultsScreen
        score={score}
        total={TARGET_COUNT}
        category="music"
        headline="Note master!"
        message="Beautiful ear — you found every note."
        onPlayAgain={() => {
          setRound(0);
          setScore(0);
          setDoneCelebration(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card cat-music p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-display" style={{ color: "var(--cat-music)" }}>
              Lesson 1
            </p>
            <h3 className="font-display text-xl sm:text-2xl text-arcade-strong">
              Listen — then tap the matching note
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">
              <span className="text-sm opacity-80">Round</span>
              <span className="font-display">{Math.min(round + 1, TARGET_COUNT)}</span>
              <span className="opacity-70">/</span>
              <span className="font-display opacity-80">{TARGET_COUNT}</span>
            </span>
            <button
              type="button"
              onClick={replay}
              className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full
                         bg-[var(--arcade-card-soft)] text-arcade-strong
                         border border-[var(--arcade-edge)]
                         active:scale-[0.97]"
            >
              <Volume2 className="w-4 h-4" aria-hidden />
              Hear again
            </button>
          </div>
        </div>
      </div>

      <Piano
        onKey={handleKey}
        highlightedNote={feedback === "correct" ? target?.note : undefined}
        wrongShake={feedback === "wrong"}
      />
    </div>
  );
}

/* ───────── Lesson 2: Match the Rhythm ───────── */

function RhythmLesson({
  playNote,
  sfx,
  onComplete,
}: {
  playNote: (freq: number, duration?: number) => void;
  sfx: (sound: "tap" | "correct" | "wrong" | "levelup") => void;
  onComplete: () => void;
}) {
  const [patternIndex, setPatternIndex] = useState(0);
  const [phase, setPhase] = useState<"playing" | "listening">("playing");
  const [tapsLeft, setTapsLeft] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);

  const pattern = RHYTHM_PATTERNS[patternIndex];
  const totalTaps = useMemo(() => pattern.length, [pattern]);

  const playPattern = useCallback(async () => {
    setPhase("playing");
    setFeedback(null);
    for (let i = 0; i < pattern.length; i++) {
      const beat = pattern[i];
      playNote(440, 0.18);
      await new Promise((r) => setTimeout(r, beat * 320));
    }
    setPhase("listening");
    setTapsLeft(pattern.length);
  }, [pattern, playNote]);

  useEffect(() => {
    void playPattern();
  }, [playPattern]);

  const handleDrum = () => {
    if (phase !== "listening") return;
    playNote(440, 0.18);
    sfx("tap");
    setTapsLeft((n) => {
      const left = Math.max(0, n - 1);
      if (left === 0) {
        sfx("correct");
        setFeedback("correct");
        setTimeout(() => {
          if (patternIndex + 1 >= RHYTHM_PATTERNS.length) {
            setDone(true);
            sfx("levelup");
            onComplete();
          } else {
            setPatternIndex((p) => p + 1);
          }
        }, 700);
      }
      return left;
    });
  };

  if (done) {
    return (
      <ResultsScreen
        score={RHYTHM_PATTERNS.length}
        total={RHYTHM_PATTERNS.length}
        category="music"
        headline="Rhythm matched!"
        message="You've got the beat. Ready for a real song?"
        onPlayAgain={() => {
          setPatternIndex(0);
          setDone(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card cat-music p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-display" style={{ color: "var(--cat-music)" }}>
              Lesson 2
            </p>
            <h3 className="font-display text-xl sm:text-2xl text-arcade-strong">
              {phase === "playing" ? "Listen carefully…" : "Now tap the drum back"}
            </h3>
            <p className="text-arcade-mid text-sm mt-1">
              Pattern {patternIndex + 1} of {RHYTHM_PATTERNS.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void playPattern()}
            disabled={phase === "playing"}
            className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)]
                       active:scale-[0.97] disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4" aria-hidden />
            Hear it
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleDrum}
            disabled={phase !== "listening"}
            className={cn(
              "w-40 h-40 sm:w-52 sm:h-52 rounded-full grid place-items-center",
              "border-4 active:scale-[0.96] transition-transform",
              "shadow-[0_18px_40px_-12px_var(--cat-music-glow),inset_0_2px_0_oklch(1_0_0_/_0.30)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              feedback === "wrong" && "shake",
            )}
            style={{
              background:
                "radial-gradient(circle at 35% 28%, oklch(1 0 0 / 0.35) 0%, transparent 38%), linear-gradient(160deg, var(--cat-music) 0%, var(--cat-default) 100%)",
              borderColor: "oklch(0.45 0.10 160)",
              color: "var(--ink-on-color)",
            }}
            aria-label="Drum"
          >
            <Music className="w-12 h-12 sm:w-14 sm:h-14" />
          </button>
        </div>
        {phase === "listening" && (
          <div className="mt-3 text-center text-arcade-mid font-display">
            Taps left: <span className="text-arcade-strong">{tapsLeft}</span> / {totalTaps}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Lesson 3: Play the Song ───────── */

function SongLesson({
  playNote,
  sfx,
  onComplete,
}: {
  playNote: (freq: number, duration?: number) => void;
  sfx: (sound: "tap" | "correct" | "wrong" | "levelup") => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const expected = TWINKLE[step];
  const expectedKey = WHITE_KEYS.find((k) => k.note === expected);

  const handleKey = (key: PianoKey) => {
    if (key.isBlack) return;
    playNote(key.freq, 0.4);
    if (!expectedKey || feedback) return;
    if (key.note === expected) {
      sfx("correct");
      setFeedback("correct");
      setTimeout(() => {
        setFeedback(null);
        if (step + 1 >= TWINKLE.length) {
          setDone(true);
          sfx("levelup");
          onComplete();
        } else {
          setStep((s) => s + 1);
        }
      }, 280);
    } else {
      sfx("wrong");
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 600);
    }
  };

  if (done) {
    return (
      <ResultsScreen
        score={TWINKLE.length}
        total={TWINKLE.length}
        category="music"
        headline="You played a song!"
        message="Twinkle Twinkle is officially in your hands. Free play is unlocked."
        onPlayAgain={() => {
          setStep(0);
          setDone(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card cat-music p-5">
        <p className="text-xs uppercase tracking-[0.18em] font-display" style={{ color: "var(--cat-music)" }}>
          Lesson 3 · Twinkle Twinkle
        </p>
        <h3 className="font-display text-xl sm:text-2xl text-arcade-strong mt-1">
          Tap the glowing key
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {TWINKLE.map((n, i) => (
            <span
              key={i}
              className={cn(
                "min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-full font-display text-sm border",
                i < step
                  ? "bg-[oklch(0.30_0.10_145_/_0.5)] text-[oklch(0.92_0.13_145)] border-[oklch(0.55_0.16_145)]"
                  : i === step
                    ? "bg-[var(--cat-music)] text-[var(--ink-on-color)] border-[oklch(0.45_0.10_160)] sparkle"
                    : "bg-[var(--arcade-card-soft)] text-arcade-mid border-[var(--arcade-edge)]",
              )}
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      <Piano
        onKey={handleKey}
        glowingNote={expected}
        highlightedNote={feedback === "correct" ? expected : undefined}
        wrongShake={feedback === "wrong"}
      />
    </div>
  );
}

/* ───────── Free Play ───────── */

function FreePlay({
  playNote,
  unlocked,
}: {
  playNote: (freq: number, duration?: number) => void;
  unlocked: boolean;
}) {
  if (!unlocked) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="flex justify-center mb-3">
          <Buddy mood="think" size="lg" />
        </div>
        <h3 className="font-display text-2xl text-arcade-strong">
          Finish the lessons first!
        </h3>
        <p className="mt-2 text-arcade-mid">
          Free Play unlocks once you complete all three.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="surface-card cat-music p-4 text-arcade-mid">
        Tap any key. Try playing the notes you just learned.
      </div>
      <Piano onKey={(k) => playNote(k.freq, 0.5)} />
    </div>
  );
}

/* ───────── Piano keyboard ───────── */

function Piano({
  onKey,
  glowingNote,
  highlightedNote,
  wrongShake,
}: {
  onKey: (key: PianoKey) => void;
  glowingNote?: string;
  highlightedNote?: string;
  wrongShake?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card cat-music p-3 sm:p-4 overflow-x-auto scroll-arcade",
        wrongShake && "shake",
      )}
    >
      <div className="relative h-44 sm:h-56 mx-auto" style={{ width: "100%", maxWidth: 720 }}>
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: `repeat(${WHITE_KEYS.length}, 1fr)`,
            gap: 4,
          }}
        >
          {WHITE_KEYS.map((key) => {
            const glow = glowingNote === key.note;
            const hot = highlightedNote === key.note;
            return (
              <button
                key={key.note}
                type="button"
                onPointerDown={() => onKey(key)}
                aria-label={`${NOTE_LABEL[key.note]} key`}
                className={cn(
                  "relative rounded-b-2xl rounded-t-md border",
                  "active:translate-y-0.5",
                  "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.50),0_6px_0_oklch(0_0_0_/_0.45)]",
                )}
                style={{
                  background: hot
                    ? "linear-gradient(180deg, oklch(0.92 0.18 145), oklch(0.65 0.20 150))"
                    : "linear-gradient(180deg, oklch(0.97 0.01 95), oklch(0.86 0.04 90))",
                  borderColor: hot ? "oklch(0.50 0.16 145)" : "oklch(0.55 0.04 90)",
                  boxShadow: glow
                    ? "0 0 28px 6px var(--cat-music-glow), inset 0 1px 0 oklch(1 0 0 / 0.5)"
                    : undefined,
                  transition: "box-shadow 0.18s ease",
                }}
              >
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-display text-[oklch(0.20_0.05_280)]">
                  {NOTE_LABEL[key.note]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Black keys overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {KEYS.filter((k) => k.isBlack).map((key) => {
            const whiteIndex = WHITE_KEYS.findIndex((w) => {
              const indexW = KEYS.indexOf(w);
              const indexB = KEYS.indexOf(key);
              return indexB === indexW + 1;
            });
            if (whiteIndex < 0) return null;
            const left = ((whiteIndex + 1) / WHITE_KEYS.length) * 100;
            return (
              <button
                key={key.note}
                type="button"
                onPointerDown={() => onKey(key)}
                aria-label={`${key.note} key`}
                className="absolute pointer-events-auto rounded-b-xl rounded-t-md
                           shadow-[inset_0_2px_0_oklch(1_0_0_/_0.10),0_4px_0_oklch(0_0_0_/_0.6)]
                           active:translate-y-0.5"
                style={{
                  width: "7%",
                  height: "62%",
                  top: 0,
                  left: `calc(${left}% - 3.5%)`,
                  background:
                    "linear-gradient(180deg, oklch(0.30 0.05 280), oklch(0.13 0.04 280))",
                  border: "1px solid oklch(0.10 0.04 280)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
