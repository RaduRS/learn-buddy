"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Sfx =
  | "tap"
  | "correct"
  | "wrong"
  | "levelup"
  | "finish"
  | "whoosh"
  | "ding";

type SoundCtx = {
  play: (sfx: Sfx) => void;
  muted: boolean;
  toggleMute: () => void;
  setMuted: (m: boolean) => void;
};

const Ctx = createContext<SoundCtx | null>(null);
const STORAGE_KEY = "learn-buddy:muted";

type Voice = {
  type: "sine" | "triangle" | "sawtooth" | "square";
  freq: number;
  duration: number;
  attack?: number;
  release?: number;
  gain?: number;
  slideTo?: number;
  delay?: number;
};

const VOICES: Record<Sfx, Voice[]> = {
  tap: [
    { type: "triangle", freq: 760, duration: 0.06, gain: 0.18 },
  ],
  correct: [
    { type: "triangle", freq: 660, duration: 0.10, gain: 0.20 },
    { type: "triangle", freq: 880, duration: 0.14, gain: 0.20, delay: 0.07 },
  ],
  wrong: [
    { type: "sawtooth", freq: 220, duration: 0.16, gain: 0.14, slideTo: 130 },
  ],
  levelup: [
    { type: "triangle", freq: 523, duration: 0.10, gain: 0.20 },
    { type: "triangle", freq: 659, duration: 0.10, gain: 0.20, delay: 0.07 },
    { type: "triangle", freq: 784, duration: 0.10, gain: 0.20, delay: 0.14 },
    { type: "triangle", freq: 1047, duration: 0.18, gain: 0.20, delay: 0.21 },
  ],
  finish: [
    { type: "triangle", freq: 392, duration: 0.12, gain: 0.20 },
    { type: "triangle", freq: 587, duration: 0.12, gain: 0.20, delay: 0.10 },
    { type: "triangle", freq: 784, duration: 0.20, gain: 0.22, delay: 0.20 },
    { type: "triangle", freq: 988, duration: 0.30, gain: 0.22, delay: 0.30 },
  ],
  whoosh: [
    { type: "sine", freq: 220, duration: 0.20, gain: 0.10, slideTo: 880 },
  ],
  ding: [
    { type: "sine", freq: 1320, duration: 0.18, gain: 0.16 },
  ],
};

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  // Hydrate from localStorage on mount only
  useEffect(() => {
    setMutedState(readMuted());
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m ? "1" : "0");
    } catch {
      // storage blocked — keep in-memory only
    }
  }, []);

  const toggleMute = useCallback(() => setMuted(!muted), [muted, setMuted]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") {
      // Browsers gate audio behind user interaction; resuming on first play is safe.
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playVoice = useCallback((ctx: AudioContext, voice: Voice) => {
    const now = ctx.currentTime + (voice.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.freq, now);
    if (voice.slideTo !== undefined) {
      osc.frequency.linearRampToValueAtTime(voice.slideTo, now + voice.duration);
    }

    const peak = voice.gain ?? 0.18;
    const attack = voice.attack ?? 0.005;
    const release = voice.release ?? 0.06;

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.linearRampToValueAtTime(
      peak * 0.6,
      now + Math.max(attack, voice.duration - release),
    );
    g.gain.linearRampToValueAtTime(0.0001, now + voice.duration);

    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + voice.duration + 0.02);
  }, []);

  const play = useCallback(
    (sfx: Sfx) => {
      if (muted) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const voices = VOICES[sfx];
      for (const v of voices) playVoice(ctx, v);
    },
    [muted, ensureContext, playVoice],
  );

  const value = useMemo<SoundCtx>(
    () => ({ play, muted, toggleMute, setMuted }),
    [play, muted, toggleMute, setMuted],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSfx(): SoundCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op fallback: lets components be SSR/test-friendly.
    return {
      play: () => {},
      muted: true,
      toggleMute: () => {},
      setMuted: () => {},
    };
  }
  return ctx;
}
