"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options<Q> {
  /** Generates a single question. May be async. May return null on failure. */
  generate: (signal?: AbortSignal) => Promise<Q | null> | Q | null;
  /** Number of questions in a round. */
  total: number;
  /** Function returning a stable identity for a question — used to dedupe. */
  identityOf?: (q: Q) => string;
  /** When false, questions may repeat. Default true. */
  unique?: boolean;
  /** Max attempts to fetch a unique question before giving up. Default 5. */
  maxAttempts?: number;
}

interface State<Q> {
  current: Q | null;
  index: number; // 0-based
  score: number;
  total: number;
  loading: boolean;
  error: string | null;
  /** True once the round's last question has been answered. */
  finished: boolean;
}

interface Api<Q> extends State<Q> {
  /** Start the round: generate the first question. */
  start: () => Promise<void>;
  /** Mark the current question correct (or with custom delta) and advance. */
  answer: (correct: boolean, points?: number) => Promise<void>;
  /** Force-skip without scoring. */
  skip: () => Promise<void>;
  /** Reset to a fresh round (does NOT auto-start). */
  reset: () => void;
}

/**
 * Shared question-driver for round-based games (TrueFalse, Subitizing, NumberFun, MathSpark).
 * Owns: current question, currentIndex, score, dedupe, retries, finish state.
 *
 * The hook is logic-only — your component renders the UI for the current question,
 * decides correctness, and calls `answer(true | false, points?)`.
 */
export function useGameQuestions<Q>({
  generate,
  total,
  identityOf,
  unique = true,
  maxAttempts = 5,
}: Options<Q>): Api<Q> {
  const [current, setCurrent] = useState<Q | null>(null);
  const [index, setIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<boolean>(false);

  const seenRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<AbortController | null>(null);

  // Keep refs to the latest options so the callbacks below never go stale.
  const generateRef = useRef(generate);
  const identityRef = useRef(identityOf);
  useEffect(() => {
    generateRef.current = generate;
    identityRef.current = identityOf;
  });

  const fetchOne = useCallback(async (): Promise<Q | null> => {
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const q = await generateRef.current(ctrl.signal);
        if (ctrl.signal.aborted) return null;
        if (!q) continue;
        if (unique && identityRef.current) {
          const id = identityRef.current(q);
          if (seenRef.current.has(id)) continue;
          seenRef.current.add(id);
        }
        return q;
      }
      throw new Error("Could not generate a unique question.");
    } catch (e) {
      if (ctrl.signal.aborted) return null;
      const msg = e instanceof Error ? e.message : "Failed to generate question";
      setError(msg);
      return null;
    } finally {
      if (inFlightRef.current === ctrl) {
        inFlightRef.current = null;
      }
      setLoading(false);
    }
  }, [maxAttempts, unique]);

  const start = useCallback(async () => {
    setIndex(0);
    setScore(0);
    setFinished(false);
    seenRef.current.clear();
    const q = await fetchOne();
    setCurrent(q);
  }, [fetchOne]);

  const advance = useCallback(async () => {
    const next = index + 1;
    if (next >= total) {
      setIndex(next);
      setCurrent(null);
      setFinished(true);
      return;
    }
    setIndex(next);
    const q = await fetchOne();
    setCurrent(q);
  }, [fetchOne, index, total]);

  const answer = useCallback(
    async (correct: boolean, points: number = 1) => {
      if (correct) setScore((s) => s + points);
      await advance();
    },
    [advance],
  );

  const skip = useCallback(() => advance(), [advance]);

  const reset = useCallback(() => {
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    seenRef.current.clear();
    setCurrent(null);
    setIndex(0);
    setScore(0);
    setError(null);
    setFinished(false);
  }, []);

  // Cleanup any in-flight generation on unmount.
  useEffect(() => () => inFlightRef.current?.abort(), []);

  return {
    current,
    index,
    score,
    total,
    loading,
    error,
    finished,
    start,
    answer,
    skip,
    reset,
  };
}
