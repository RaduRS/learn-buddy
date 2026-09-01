// lib/games/storyTime.ts

export interface StoryQuestion {
  q: string;
  expectedAnswer: string;
}

export interface Story {
  title: string;
  /** Name of the story's main character, used to avoid repeats across plays. */
  mainCharacter: string;
  pages: string[];
  /** Real, age-appropriate facts woven into the story, restated simply. */
  facts: string[];
  questions: StoryQuestion[];
}

export interface JudgeResult {
  correct: boolean;
  feedback: string;
}

export interface StoryTheme {
  id: string;
  label: string;
  emoji: string;
  /** Phrase injected into the story generation prompt. */
  prompt: string;
  /** What the story's real facts should teach (e.g. "real dinosaurs"). */
  factTopic: string;
  /** Pre-generated tile illustration in /public (see scripts/generate-theme-images.ts). */
  image: string;
  /** Prompt used to generate the tile illustration. */
  imagePrompt: string;
}

export const STORY_THEMES: StoryTheme[] = [
  {
    id: "animals",
    label: "Animals",
    emoji: "🐾",
    prompt: "animals (pick any animal — a fox, penguin, hedgehog, owl, whale, bee…)",
    factTopic: "the real animal in the story (what it eats, where it lives, what it can do)",
    image: "/story-themes/animals.png",
    imagePrompt: "a group of cute happy cartoon animals in a sunny meadow",
  },
  {
    id: "space",
    label: "Space",
    emoji: "🚀",
    prompt: "space (rockets, planets, the Moon, astronauts, stars or comets)",
    factTopic: "real space — planets, the Moon, the Sun, stars or astronauts",
    image: "/story-themes/space.png",
    imagePrompt: "a friendly cartoon rocket flying past smiling planets and stars",
  },
  {
    id: "pirates",
    label: "Pirates",
    emoji: "🏴‍☠️",
    prompt: "pirates, ships, islands or treasure",
    factTopic: "the real sea, ships, islands or sea birds",
    image: "/story-themes/pirates.png",
    imagePrompt: "a cute friendly cartoon pirate ship on calm blue sea with a treasure chest",
  },
  {
    id: "dinosaurs",
    label: "Dinosaurs",
    emoji: "🦕",
    prompt: "dinosaurs (pick any dinosaur — not always a T-rex)",
    factTopic: "the real dinosaur in the story (its size, food, or how it lived)",
    image: "/story-themes/dinosaurs.png",
    imagePrompt: "gentle smiling cartoon dinosaurs in a green prehistoric jungle",
  },
  {
    id: "under-the-sea",
    label: "Under the Sea",
    emoji: "🌊",
    prompt: "life under the sea (fish, octopus, turtles, crabs, dolphins, coral…)",
    factTopic: "the real sea creature in the story",
    image: "/story-themes/under-the-sea.png",
    imagePrompt: "happy cartoon fish and a smiling octopus in a colorful coral reef",
  },
  {
    id: "magic",
    label: "Magic",
    emoji: "🪄",
    prompt: "a magical adventure (wizards, fairies, dragons, castles, talking objects…)",
    factTopic: "something real that appears in the story (a real animal, castles, rainbows, the weather…)",
    image: "/story-themes/magic.png",
    imagePrompt: "a friendly cartoon wizard in a blue hat casting glowing sparkles, with a castle and a small friendly green dragon",
  },
  {
    id: "vehicles",
    label: "Vehicles",
    emoji: "🚗",
    prompt: "vehicles (cars, trucks, diggers, trains, boats, planes or fire engines)",
    factTopic: "real vehicles and machines (what they do and how they work)",
    image: "/story-themes/vehicles.png",
    imagePrompt: "cute cartoon cars, a truck and a digger with happy faces in a sunny town",
  },
  {
    id: "jungle",
    label: "Jungle Safari",
    emoji: "🦁",
    prompt: "jungle animals (lions, monkeys, parrots, elephants, snakes, sloths…)",
    factTopic: "the real jungle animal in the story",
    image: "/story-themes/jungle.png",
    imagePrompt: "cute cartoon lion, elephant and giraffe smiling in a leafy green jungle",
  },
];

export const STORY_PAGE_MIN = 8;
export const STORY_PAGE_MAX = 10;
export const STORY_QUESTION_COUNT = 3;
export const STORY_FACT_COUNT = 2;
/** How many past stories we remember to keep new ones fresh. */
export const STORY_HISTORY_SIZE = 12;
