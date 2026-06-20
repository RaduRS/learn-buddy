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
  /** Phrase injected into the generation prompt. */
  prompt: string;
}

export const STORY_THEMES: StoryTheme[] = [
  { id: "animals", label: "Animals", emoji: "🐾", prompt: "friendly animals" },
  { id: "space", label: "Space", emoji: "🚀", prompt: "a happy space adventure with planets and rockets" },
  { id: "pirates", label: "Pirates", emoji: "🏴‍☠️", prompt: "friendly pirates looking for treasure" },
  { id: "dinosaurs", label: "Dinosaurs", emoji: "🦕", prompt: "gentle, friendly dinosaurs" },
  { id: "under-the-sea", label: "Under the Sea", emoji: "🌊", prompt: "kind sea creatures under the sea" },
  { id: "magic", label: "Magic", emoji: "🧚", prompt: "a gentle magical fairy tale" },
];

export const STORY_PAGE_MIN = 8;
export const STORY_PAGE_MAX = 10;
export const STORY_QUESTION_COUNT = 3;
