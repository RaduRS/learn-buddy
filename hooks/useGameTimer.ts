"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface GameTimerOptions {
  /** Total duration in seconds. */
  duration: number;
  /** Auto-start on mount. Defaults to false. */
  autoStart?: boolean;
  /** Called once when the timer reaches zero. */
  onExpire?: () => void;
  /** How often the displayed value updates, in ms. Defaults to 250ms. */
  tickMs?: number;
}

interface GameTimerApi {
  /** Seconds remaining (rounded down). */
  remaining: number;
  /** 0..1 — how much of the duration is left. */
  fraction: number;
  running: boolean;
  expired: boolean;
  start: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
}

/**
 * Shared countdown hook used by timed games (Memory Match, Subitizing, …).
 * Robust against tab-throttling — measures time against a wall-clock
 * reference, not via `setInterval` accumulation.
 */
export function useGameTimer({
  duration,
  autoStart = false,
  onExpire,
  tickMs = 250,
}: GameTimerOptions): GameTimerApi {
  const [running, setRunning] = useState(autoStart);
  const [remainingMs, setRemainingMs] = useState(duration * 1000);

  const startedAtRef = useRef<number | null>(null);
  const carryRef = useRef<number>(duration * 1000);
  const intervalRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (startedAtRef.current === null) return;
    const elapsed = Date.now() - startedAtRef.current;
    const ms = Math.max(0, carryRef.current - elapsed);
    setRemainingMs(ms);
    if (ms <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      stopInterval();
      setRunning(false);
      onExpireRef.current?.();
    }
  }, [stopInterval]);

  const start = useCallback(() => {
    if (expiredRef.current) return;
    if (startedAtRef.current !== null) return;
    startedAtRef.current = Date.now();
    stopInterval();
    intervalRef.current = window.setInterval(tick, tickMs);
    setRunning(true);
  }, [tick, tickMs, stopInterval]);

  const pause = useCallback(() => {
    if (startedAtRef.current === null) return;
    const elapsed = Date.now() - startedAtRef.current;
    carryRef.current = Math.max(0, carryRef.current - elapsed);
    startedAtRef.current = null;
    stopInterval();
    setRunning(false);
  }, [stopInterval]);

  const reset = useCallback(
    (newDuration?: number) => {
      stopInterval();
      const dur = (newDuration ?? duration) * 1000;
      carryRef.current = dur;
      startedAtRef.current = null;
      expiredRef.current = false;
      setRemainingMs(dur);
      setRunning(false);
    },
    [duration, stopInterval],
  );

  // Auto-start on mount when requested.
  useEffect(() => {
    if (autoStart) start();
    return stopInterval;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    remaining: Math.ceil(remainingMs / 1000),
    fraction: duration > 0 ? Math.max(0, Math.min(1, remainingMs / (duration * 1000))) : 0,
    running,
    expired: expiredRef.current,
    start,
    pause,
    reset,
  };
}
