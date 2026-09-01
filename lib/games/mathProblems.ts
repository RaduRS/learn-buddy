// lib/games/mathProblems.ts
// Pure generation logic for the maths games. Kept UI-free so it can be
// exercised from scripts as well as components.

import { EASY_MATH_MAX } from "../utils";

export type ProblemType =
  | "add"
  | "sub"
  | "mul"
  | "chain_add_mul"
  | "chain_mul_add"
  | "blank_add"
  | "blank_sub"
  | "blank_mul";

export interface MathProblem {
  id: number;
  question: string;
  answer: number;
  type: ProblemType;
  /**
   * Canonical identity of the underlying fact. Commutative operands are
   * sorted, and blank variants share the namespace of their plain
   * counterpart, so `3 + 5`, `5 + 3` and `3 + _ = 8` all collide.
   */
  key: string;
  /**
   * The multiplication fact (e.g. "2x5") behind mul, blank_mul and the two
   * chain types — no two problems in a round may reuse the same fact.
   */
  mulFact?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export const MATH_ROUND_SIZE = 10;
const MAX_RESULT = 100;
const MAX_ATTEMPTS_PER_SLOT = 40;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function addKey(a: number, b: number): string {
  return `add:${Math.min(a, b)}:${Math.max(a, b)}`;
}

function mulFactOf(a: number, b: number): string {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

function generateProblem(type: ProblemType): MathProblem | null {
  switch (type) {
    case "add": {
      const a = rand(10, 90);
      const b = rand(1, MAX_RESULT - a);
      return make(type, `${a} + ${b} = ?`, a + b, addKey(a, b));
    }
    case "sub": {
      const a = rand(10, MAX_RESULT);
      const b = rand(1, a);
      return make(type, `${a} - ${b} = ?`, a - b, `sub:${a}:${b}`);
    }
    case "mul": {
      const a = rand(2, 5);
      const b = rand(2, 5);
      const fact = mulFactOf(a, b);
      return make(type, `${a} × ${b} = ?`, a * b, `mul:${fact}`, fact);
    }
    case "chain_add_mul": {
      const mulA = rand(2, 5);
      const mulB = rand(2, 5);
      const mulResult = mulA * mulB;
      const addC = rand(1, MAX_RESULT - mulResult);
      const fact = mulFactOf(mulA, mulB);
      return make(
        type,
        `${mulA} × ${mulB} + ${addC} = ?`,
        mulResult + addC,
        `camul:${fact}:${addC}`,
        fact,
      );
    }
    case "chain_mul_add": {
      const addA = rand(10, 90);
      const mulB = rand(2, 5);
      const maxMulC = Math.min(5, Math.floor((MAX_RESULT - addA) / mulB));
      if (maxMulC < 2) return null;
      const mulC = rand(2, maxMulC);
      const fact = mulFactOf(mulB, mulC);
      return make(
        type,
        `${addA} + ${mulB} × ${mulC} = ?`,
        addA + mulB * mulC,
        `cmadd:${addA}:${fact}`,
        fact,
      );
    }
    case "blank_add": {
      const total = rand(20, MAX_RESULT);
      const a = rand(10, total - 10);
      return make(type, `${a} + _ = ${total}`, total - a, addKey(a, total - a));
    }
    case "blank_sub": {
      const a = rand(20, MAX_RESULT);
      const result = rand(1, a - 10);
      return make(type, `${a} - _ = ${result}`, a - result, `sub:${a}:${a - result}`);
    }
    case "blank_mul": {
      const a = rand(2, 5);
      const b = rand(2, Math.min(5, Math.floor(MAX_RESULT / a)));
      const fact = mulFactOf(a, b);
      return make(type, `${a} × _ = ${a * b}`, b, `mul:${fact}`, fact);
    }
  }
}

// Easy mode (e.g. Eddie): add & subtract only, every answer capped at EASY_MATH_MAX.
function generateEasyProblem(type: "add" | "sub"): MathProblem {
  if (type === "add") {
    const a = rand(1, EASY_MATH_MAX - 1);
    const b = rand(1, EASY_MATH_MAX - a);
    return make(type, `${a} + ${b} = ?`, a + b, addKey(a, b));
  }
  const a = rand(2, EASY_MATH_MAX);
  const b = rand(1, a);
  return make(type, `${a} - ${b} = ?`, a - b, `sub:${a}:${b}`);
}

function make(
  type: ProblemType,
  question: string,
  answer: number,
  key: string,
  mulFact?: string,
): MathProblem {
  return { id: Math.random(), question, answer, type, key, mulFact };
}

/**
 * A balanced queue of problem types for one round: every type appears at
 * least once, the remaining slots are random, and the order is shuffled.
 */
function buildTypeQueue(): ProblemType[] {
  const types: ProblemType[] = [
    "add", "sub", "mul",
    "chain_add_mul", "chain_mul_add",
    "blank_add", "blank_sub", "blank_mul",
  ];
  const queue = [...types];
  while (queue.length < MATH_ROUND_SIZE) {
    queue.push(types[rand(0, types.length - 1)]);
  }
  return shuffle(queue);
}

export function generateRound(easy = false): MathProblem[] {
  const problems: MathProblem[] = [];
  const seenKeys = new Set<string>();
  const seenMulFacts = new Set<string>();

  const accept = (p: MathProblem) => {
    seenKeys.add(p.key);
    if (p.mulFact) seenMulFacts.add(p.mulFact);
    problems.push(p);
  };

  if (easy) {
    const queue = shuffle<"add" | "sub">([
      "add", "add", "add", "add", "add",
      "sub", "sub", "sub", "sub", "sub",
    ]);
    for (const type of queue) {
      let candidate = generateEasyProblem(type);
      for (
        let attempt = 0;
        attempt < MAX_ATTEMPTS_PER_SLOT && seenKeys.has(candidate.key);
        attempt++
      ) {
        candidate = generateEasyProblem(type);
      }
      accept(candidate);
    }
    return problems;
  }

  for (const type of buildTypeQueue()) {
    let candidate: MathProblem | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_SLOT; attempt++) {
      const p = generateProblem(type);
      if (!p) continue;
      candidate = p;
      if (!seenKeys.has(p.key) && !(p.mulFact && seenMulFacts.has(p.mulFact))) {
        break;
      }
    }
    if (candidate) accept(candidate);
  }

  // Backfill in the unlikely case every attempt for a type failed outright.
  while (problems.length < MATH_ROUND_SIZE) {
    const p = generateProblem("add");
    if (p && !seenKeys.has(p.key)) accept(p);
  }
  return problems;
}
