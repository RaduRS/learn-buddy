import { shuffled } from "./shuffle";

export type PatternMode = "easy" | "medium" | "hard";

const COLOURS = ["Red", "Blue", "Yellow", "Green"] as const;
const SHAPES = ["Circle", "Square", "Triangle", "Diamond"] as const;
type Colour = (typeof COLOURS)[number];
type Shape = (typeof SHAPES)[number];

export type Carriage = { id: string; label: string } & (
  | { kind: "shape"; colour: Colour; shape: Shape }
  | { kind: "number"; value: number }
);

export interface PatternQuestion {
  track: Carriage[];
  choices: Carriage[];
  answer: Carriage;
  instruction: string;
  explanation: string;
}

function shapeCarriage(colour: Colour, shape: Shape, label: string): Carriage {
  return { id: `${colour}-${shape}`, kind: "shape", label, colour, shape };
}

function numberCarriage(value: number): Carriage {
  return { id: String(value), kind: "number", label: String(value), value };
}

function repeatGroup(group: Carriage[], pool: Carriage[], shown: number): PatternQuestion {
  const track = Array.from({ length: shown }, (_, index) => group[index % group.length]);
  const answer = group[shown % group.length];
  const names = group.map(({ label }) => label.toLowerCase());
  return {
    track,
    choices: shuffled(pool),
    answer,
    instruction: `The same group of ${group.length} carriages repeats.`,
    explanation: `Keep repeating ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`,
  };
}

const EASY_PAIRS = [[0, 1], [1, 2], [2, 3], [3, 0]];
const GROUPS = [[0, 1, 2], [0, 0, 1], [0, 1, 1], [0, 1, 0, 2], [0, 1, 1, 2], [0, 1, 2, 3], [0, 0, 1, 2], [0, 1, 2, 2]];

function easyRound(): PatternQuestion[] {
  const colourPool = COLOURS.map((colour) => shapeCarriage(colour, "Circle", colour));
  const shapePool = SHAPES.map((shape) => shapeCarriage("Blue", shape, shape));
  return shuffled([colourPool, shapePool].flatMap((pool) =>
    EASY_PAIRS.map((pair) => repeatGroup(shuffled(pair.map((index) => pool[index])), pool, 4 + Math.floor(Math.random() * 3))),
  ));
}

function mediumRound(): PatternQuestion[] {
  return shuffled(GROUPS).map((group) => {
    const colours = shuffled(COLOURS).slice(0, 2);
    const shapes = shuffled(SHAPES).slice(0, 2);
    const pool = shuffled(colours.flatMap((colour) => shapes.map((shape) => shapeCarriage(colour, shape, `${colour} ${shape.toLowerCase()}`))));
    const shown = group.length === 3 ? 6 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 2);
    return repeatGroup(group.map((index) => pool[index]), pool, shown);
  });
}

function skipCount(step: number, backwards: boolean): PatternQuestion {
  const shown = 4 + Math.floor(Math.random() * 2);
  const distance = shown * step;
  const low = Math.floor(Math.random() * (101 - distance));
  const start = backwards ? low + distance : low;
  const delta = backwards ? -step : step;
  const track = Array.from({ length: shown }, (_, index) => numberCarriage(start + index * delta));
  const answerValue = start + shown * delta;
  const answer = numberCarriage(answerValue);
  const distractors = [...new Set([
    answerValue - delta, answerValue + delta, answerValue - 1, answerValue + 1,
    answerValue - 2, answerValue + 2, answerValue - 3, answerValue + 3,
  ])].filter((value) => value >= 0 && value <= 100 && value !== answerValue);
  return {
    track,
    choices: shuffled([answer, ...shuffled(distractors).slice(0, 3).map(numberCarriage)]),
    answer,
    instruction: "Find the counting rule.",
    explanation: `Count ${backwards ? "backwards" : "forwards"} in ${step}s.`,
  };
}

export function makePatternRound(mode: PatternMode): PatternQuestion[] {
  if (mode === "easy") return easyRound();
  if (mode === "medium") return mediumRound();
  return shuffled([2, 3, 5, 10].flatMap((step) => [skipCount(step, false), skipCount(step, true)]));
}
