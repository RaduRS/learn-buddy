import type { AttentionLevel } from "./attentionGames";
import { shuffled } from "./shuffle";

export const DIRECTIONS = ["Up", "Right", "Down", "Left"] as const;
export type SignalDirection = (typeof DIRECTIONS)[number];
export type SignalQuestion = { signals: SignalDirection[]; answer: SignalDirection };

export function makeSignalRound(level: AttentionLevel): SignalQuestion[] {
  const size = level === "easy" ? 3 : level === "medium" ? 5 : 7;
  return shuffled([...DIRECTIONS, ...DIRECTIONS]).map((answer, index) => {
    const otherDirections = DIRECTIONS.filter((direction) => direction !== answer);
    const [decoy] = shuffled(otherDirections);
    const noise = level === "easy" ? [answer, decoy] : level === "medium" ? [decoy, answer, decoy, decoy] :
      index % 2 === 0 ? Array<SignalDirection>(6).fill(decoy) : [decoy, decoy, ...otherDirections, decoy];
    const signals = shuffled(noise);
    signals.splice((size - 1) / 2, 0, answer);
    return { signals, answer };
  });
}

export const ECHO_SYMBOLS = ["Sun", "Moon", "Star", "Cloud", "Heart", "Leaf", "Lightning", "Snowflake"] as const;
export type EchoSymbol = (typeof ECHO_SYMBOLS)[number];
export interface EchoQuestion {
  warmup: EchoSymbol[];
  symbol: EchoSymbol;
  comparison: EchoSymbol;
  distance: 1 | 2;
}

export function makeEchoRound(level: AttentionLevel): EchoQuestion[] {
  const distance = level === "hard" ? 2 : 1;
  const pool = ECHO_SYMBOLS.slice(0, level === "easy" ? 4 : level === "medium" ? 6 : 8);
  const warmup = shuffled(pool).slice(0, distance);
  const history = [...warmup];
  return shuffled([true, true, true, true, false, false, false, false]).map((same, index) => {
    const comparison = history[history.length - distance];
    const last = history[history.length - 1];
    // Sometimes repeat the most recent card on two-back rounds. It is a
    // distractor if the card two places back has a different symbol.
    const symbol = same ? comparison : distance === 2 && index % 2 === 0 && last !== comparison
      ? last
      : shuffled(pool.filter((item) => item !== comparison))[0];
    history.push(symbol);
    return { warmup: index === 0 ? warmup : [], symbol, comparison, distance };
  });
}
