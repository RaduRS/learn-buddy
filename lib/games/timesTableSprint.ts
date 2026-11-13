import { shuffled } from "./shuffle";

export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const ROUND_SECONDS = 60;
export type Table = (typeof TABLES)[number] | "mixed";
export type Fact = { left: number; right: number };

export function makeFactDeck(table: Table, previous?: Fact): Fact[] {
  const factors = table === "mixed" ? TABLES : [table];
  const deck = shuffled(factors.flatMap((left) => TABLES.map((right) => ({ left, right }))));
  if (previous && deck[0].left === previous.left && deck[0].right === previous.right) {
    [deck[0], deck[1]] = [deck[1], deck[0]];
  }
  return deck;
}

export type Sprint = {
  deadline: number;
  remaining: number;
  finished: boolean;
  deck: Fact[];
  index: number;
  score: number;
  answered: number;
  last: { fact: Fact; correct: boolean } | null;
};

type SprintAction = { type: "tick"; now: number } | { type: "answer"; now: number; answer: number | null; nextDeck?: Fact[] };

export function updateSprint(state: Sprint, action: SprintAction): Sprint {
  if (state.finished) return state;
  const remaining = Math.min(state.remaining, Math.ceil((state.deadline - action.now) / 1000));
  if (remaining <= 0) return { ...state, remaining: 0, finished: true };
  if (action.type === "tick") return remaining === state.remaining ? state : { ...state, remaining };

  const fact = state.deck[state.index];
  const correct = action.answer === fact.left * fact.right;
  return {
    ...state,
    remaining,
    deck: action.nextDeck ?? state.deck,
    index: action.nextDeck ? 0 : state.index + 1,
    score: state.score + Number(correct),
    answered: state.answered + 1,
    last: { fact, correct },
  };
}
