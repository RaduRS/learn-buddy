// Shared theme table for Build a Story. Used by the game's picker and by the
// story library, so a theme looks the same wherever it shows up.
import {
  Bot,
  Castle,
  Compass,
  Flame,
  Rocket,
  Trees,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface StoryTheme {
  id: string;
  label: string;
  blurb: string;
  Icon: LucideIcon;
  /** Accent token from the app palette. */
  token: string;
}

export const STORY_THEMES: readonly StoryTheme[] = [
  { id: "dragons", label: "Dragons", blurb: "Brave dragons and sky castles", Icon: Flame, token: "--cat-spatial" },
  { id: "space", label: "Space", blurb: "Rockets, planets and friendly stars", Icon: Rocket, token: "--cat-math" },
  { id: "ocean", label: "Ocean", blurb: "Waves, whales and secret islands", Icon: Waves, token: "--cat-music" },
  { id: "jungle", label: "Jungle", blurb: "Tall trees, parrots and hidden trails", Icon: Trees, token: "--cat-reading" },
  { id: "robots", label: "Robots", blurb: "Clanking friends and silly gadgets", Icon: Bot, token: "--cat-memory" },
  { id: "castle", label: "Castle", blurb: "Knights, towers and kindly kings", Icon: Castle, token: "--cat-creative" },
];

const FALLBACK: StoryTheme = {
  id: "adventure",
  label: "Adventure",
  blurb: "A brand new world",
  Icon: Compass,
  token: "--cat-creative",
};

export function findTheme(themeId: string | null | undefined): StoryTheme {
  if (!themeId) return FALLBACK;
  return STORY_THEMES.find((t) => t.id === themeId) ?? { ...FALLBACK, id: themeId };
}
