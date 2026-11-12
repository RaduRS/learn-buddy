"use client";

import type { ComponentProps, CSSProperties } from "react";
import {
  AudioLines,
  BookOpenText,
  Brain,
  Cable,
  CarFront,
  Calculator,
  CheckCircle2,
  Eye,
  Lightbulb,
  Map as MapIcon,
  Mic,
  Music,
  Palette,
  Puzzle,
  Shapes as ShapesIcon,
  ShoppingBasket,
  SpellCheck,
  Sparkles,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "./categories";
import { CAR_LOGO_GAME } from "./carLogoCatalog";
import { LIGHT_LINKS_GAME } from "./lightLinksCatalog";
import { LANTERN_GRID_GAME, LEARNING_GAMES, MAP_QUEST_GAME, MINI_SHOP_GAME, PATTERN_TRAIN_GAME, SOUND_DETECTIVE_GAME, SWITCH_SORT_GAME, WORD_BUILDER_GAME } from "./learningCatalog";
import { slugifyTitle } from "./registry";

const ICONS: Record<string, LucideIcon> = {
  "memory-match":      Brain,
  "puzzle":            Puzzle,
  [LIGHT_LINKS_GAME.id]: Cable,
  [CAR_LOGO_GAME.id]: CarFront,
  [MINI_SHOP_GAME.id]: ShoppingBasket,
  [WORD_BUILDER_GAME.id]: SpellCheck,
  [MAP_QUEST_GAME.id]: MapIcon,
  [PATTERN_TRAIN_GAME.id]: TrainFront,
  [SOUND_DETECTIVE_GAME.id]: AudioLines,
  [LANTERN_GRID_GAME.id]: Lightbulb,
  [SWITCH_SORT_GAME.id]: ShapesIcon,
  "number-fun":        Calculator,
  "subitizing":        Eye,
  "mathspark":         Sparkles,
  "math-spark":        Sparkles,
  "music-maker":       Music,
  "shapes":            ShapesIcon,
  "reading-helper":    BookOpenText,
  "read-aloud-camera": BookOpenText,
  "true-false":        CheckCircle2,
  "true-or-false":     CheckCircle2,
  "paint":             Palette,
  "build-a-story":     Mic,
};

/**
 * Resolve a game's display icon component from its title/slug. We prefer
 * a curated lucide icon over the per-game emoji that the seed script
 * happens to use — emojis render as small color-locked glyphs that look
 * pasted-in against the arcade palette.
 */
export function getGameIcon(input: { title: string } | string): LucideIcon {
  const title = typeof input === "string" ? input : input.title;
  const slug = slugifyTitle(title);
  return ICONS[slug] ?? Sparkles;
}

/**
 * Render the resolved game icon. Wrap in a tiny static component so the
 * react-hooks/static-components lint rule sees a stable reference at the
 * call-site instead of a per-render `const Icon = pickFn(); <Icon/>`.
 */
export function GameIconFor({
  title,
  className,
  style,
  strokeWidth,
}: {
  title: string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: ComponentProps<LucideIcon>["strokeWidth"];
}) {
  const Icon = ICONS[slugifyTitle(title)] ?? Sparkles;
  return <Icon className={className} style={style} strokeWidth={strokeWidth} />;
}

/** Suggest a category key when only a free-form title is known. */
export function getGameIconAndCategory(title: string): {
  Icon: LucideIcon;
  category: CategoryKey;
} {
  const slug = slugifyTitle(title);
  const Icon = ICONS[slug] ?? Sparkles;
  const learningGame = LEARNING_GAMES.find((game) => game.id === slug);
  if (learningGame) return { Icon, category: learningGame.category };
  // Fall back to a sensible category default when the registry doesn't
  // know about this game (e.g., new seed entry).
  let category: CategoryKey = "default";
  if (slug === CAR_LOGO_GAME.id || slug.includes("memory")) category = "memory";
  else if (slug.includes("math") || slug.includes("number") || slug.includes("subitizing")) category = "math";
  else if (slug.includes("music") || slug.includes("rhythm")) category = "music";
  else if (slug.includes("read") || slug.includes("letter")) category = "reading";
  else if (slug === LIGHT_LINKS_GAME.id || slug.includes("puzzle") || slug.includes("shape") || slug.includes("spatial")) category = "spatial";
  else if (slug.includes("true") || slug.includes("false")) category = "math";
  else if (slug.includes("paint") || slug.includes("draw") || slug.includes("art")) category = "creative";
  return { Icon, category };
}
