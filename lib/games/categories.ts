/**
 * Five visual category channels + a default fallback.
 * Drives card glow, surface tint, hero color and Buddy framing.
 *
 * The DB stores a free-form string in `Game.category`. We map any
 * incoming value (case-insensitive) to a known CategoryKey here so
 * the rest of the app speaks one vocabulary.
 */

export type CategoryKey =
  | "math"
  | "memory"
  | "reading"
  | "music"
  | "spatial"
  | "default";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  /** CSS variable name used for the channel's primary color. */
  cssVar: string;
  /** CSS variable name for the soft-glow shadow color. */
  cssGlowVar: string;
  /** Hex-fallback (used in the manifest theme). */
  swatch: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  math:    { key: "math",    label: "Math",    cssVar: "--cat-math",    cssGlowVar: "--cat-math-glow",    swatch: "#5b8def" },
  memory:  { key: "memory",  label: "Memory",  cssVar: "--cat-memory",  cssGlowVar: "--cat-memory-glow",  swatch: "#e26db1" },
  reading: { key: "reading", label: "Reading", cssVar: "--cat-reading", cssGlowVar: "--cat-reading-glow", swatch: "#f0a644" },
  music:   { key: "music",   label: "Music",   cssVar: "--cat-music",   cssGlowVar: "--cat-music-glow",   swatch: "#52cba0" },
  spatial: { key: "spatial", label: "Puzzle",  cssVar: "--cat-spatial", cssGlowVar: "--cat-spatial-glow", swatch: "#ec7a5e" },
  default: { key: "default", label: "Game",    cssVar: "--cat-default", cssGlowVar: "--cat-default-glow", swatch: "#8b80f0" },
};

const ALIAS_MAP: Record<string, CategoryKey> = {
  math: "math",
  numbers: "math",
  number: "math",
  counting: "math",
  arithmetic: "math",

  memory: "memory",
  recall: "memory",

  reading: "reading",
  letters: "reading",
  literacy: "reading",
  language: "reading",

  music: "music",
  rhythm: "music",
  sound: "music",
  audio: "music",

  spatial: "spatial",
  puzzle: "spatial",
  puzzles: "spatial",
  shapes: "spatial",
  visual: "spatial",
};

/** Map any category string (case-insensitive) to a known CategoryKey. */
export function toCategoryKey(input: string | null | undefined): CategoryKey {
  if (!input) return "default";
  const k = input.trim().toLowerCase();
  return ALIAS_MAP[k] ?? "default";
}

export function getCategory(input: string | null | undefined): CategoryMeta {
  return CATEGORIES[toCategoryKey(input)];
}
