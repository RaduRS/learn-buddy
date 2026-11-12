import { shuffled } from "./shuffle";

export type AttentionLevel = "easy" | "medium" | "hard";

const LANTERN_LEVELS = {
  easy: { size: 3, count: 3 },
  medium: { size: 4, count: 5 },
  hard: { size: 5, count: 7 },
} as const;

export interface LanternQuestion {
  size: number;
  lit: number[];
}

export function makeLanternRound(level: AttentionLevel): LanternQuestion[] {
  const { size, count } = LANTERN_LEVELS[level];
  const cells = Array.from({ length: size * size }, (_, index) => index);
  const seen = new Set<string>();
  const questions: LanternQuestion[] = [];
  while (questions.length < 8) {
    const lit = shuffled(cells).slice(0, count).sort((a, b) => a - b);
    const key = lit.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({ size, lit });
  }
  return questions;
}

export const SORT_COLOURS = ["Red", "Blue", "Green", "Yellow"] as const;
export const SORT_SHAPES = ["Circle", "Square", "Triangle", "Diamond"] as const;
export type SortCard = { colour: (typeof SORT_COLOURS)[number]; shape: (typeof SORT_SHAPES)[number] };
export type SortRule = keyof SortCard;

const CARDS: SortCard[] = SORT_COLOURS.flatMap((colour) => SORT_SHAPES.map((shape) => ({ colour, shape })));

export interface SortQuestion {
  target: SortCard;
  rule: SortRule;
  choices: SortCard[];
  answer: SortCard;
}

export function makeSortRound(level: AttentionLevel): SortQuestion[] {
  const bothRules: SortRule[] = ["shape", "colour", "shape", "colour", "shape", "colour", "shape", "colour"];
  const rules = level === "hard" ? shuffled(bothRules) : bothRules;
  return shuffled(CARDS).slice(0, 8).map((target, index) => {
    const rule = level === "easy" ? "shape" : rules[index];
    const otherRule = rule === "shape" ? "colour" : "shape";
    const [answer] = shuffled(CARDS.filter((card) => card[rule] === target[rule] && card[otherRule] !== target[otherRule]));
    const [decoy] = shuffled(CARDS.filter((card) => card[otherRule] === target[otherRule] && card[rule] !== target[rule]));
    const otherCards = shuffled(CARDS.filter((card) => card[rule] !== target[rule] && card[otherRule] !== target[otherRule])).slice(0, 2);
    return { target, rule, choices: shuffled([answer, decoy, ...otherCards]), answer };
  });
}
