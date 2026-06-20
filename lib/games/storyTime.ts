// lib/games/storyTime.ts

export interface StoryQuestion {
  q: string;
  expectedAnswer: string;
}

export interface Story {
  title: string;
  pages: string[];
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
    prompt: "friendly animals",
    image: "/story-themes/animals.png",
    imagePrompt: "a group of cute happy cartoon animals in a sunny meadow",
  },
  {
    id: "space",
    label: "Space",
    emoji: "🚀",
    prompt: "a happy space adventure with planets and rockets",
    image: "/story-themes/space.png",
    imagePrompt: "a friendly cartoon rocket flying past smiling planets and stars",
  },
  {
    id: "pirates",
    label: "Pirates",
    emoji: "🏴‍☠️",
    prompt: "friendly pirates looking for treasure",
    image: "/story-themes/pirates.png",
    imagePrompt: "a cute friendly cartoon pirate ship on calm blue sea with a treasure chest",
  },
  {
    id: "dinosaurs",
    label: "Dinosaurs",
    emoji: "🦕",
    prompt: "gentle, friendly dinosaurs",
    image: "/story-themes/dinosaurs.png",
    imagePrompt: "gentle smiling cartoon dinosaurs in a green prehistoric jungle",
  },
  {
    id: "under-the-sea",
    label: "Under the Sea",
    emoji: "🌊",
    prompt: "kind sea creatures under the sea",
    image: "/story-themes/under-the-sea.png",
    imagePrompt: "happy cartoon fish and a smiling octopus in a colorful coral reef",
  },
  {
    id: "magic",
    label: "Magic",
    emoji: "🪄",
    prompt: "a fun magical adventure with a kind wizard and a friendly dragon",
    image: "/story-themes/magic.png",
    imagePrompt: "a friendly cartoon wizard in a blue hat casting glowing sparkles, with a castle and a small friendly green dragon",
  },
  {
    id: "vehicles",
    label: "Vehicles",
    emoji: "🚗",
    prompt: "friendly cars, trucks and diggers in a busy little town",
    image: "/story-themes/vehicles.png",
    imagePrompt: "cute cartoon cars, a truck and a digger with happy faces in a sunny town",
  },
  {
    id: "jungle",
    label: "Jungle Safari",
    emoji: "🦁",
    prompt: "friendly jungle animals on a safari",
    image: "/story-themes/jungle.png",
    imagePrompt: "cute cartoon lion, elephant and giraffe smiling in a leafy green jungle",
  },
];

export const STORY_PAGE_MIN = 8;
export const STORY_PAGE_MAX = 10;
export const STORY_QUESTION_COUNT = 3;
