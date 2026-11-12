"use client";

import type { ComponentProps, CSSProperties } from "react";
import {
  BookOpenText,
  Brain,
  Cable,
  CarFront,
  Calculator,
  CheckCircle2,
  Eye,
  Mic,
  Music,
  Palette,
  Puzzle,
  Shapes as ShapesIcon,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "./categories";
import { CAR_LOGO_GAME } from "./carLogoCatalog";
import { LIGHT_LINKS_GAME } from "./lightLinksCatalog";
import { MINI_SHOP_GAME } from "./learningCatalog";
import { slugifyTitle } from "./registry";

const ICONS: Record<string, LucideIcon> = {
  "memory-match":      Brain,
  "puzzle":            Puzzle,
  [LIGHT_LINKS_GAME.id]: Cable,
  [CAR_LOGO_GAME.id]: CarFront,
  [MINI_SHOP_GAME.id]: ShoppingBasket,
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
  // Fall back to a sensible category default when the registry doesn't
  // know about this game (e.g., new seed entry).
  let category: CategoryKey = "default";
  if (slug === CAR_LOGO_GAME.id || slug.includes("memory")) category = "memory";
  else if (slug === MINI_SHOP_GAME.id || slug.includes("math") || slug.includes("number") || slug.includes("subitizing")) category = "math";
  else if (slug.includes("music") || slug.includes("rhythm")) category = "music";
  else if (slug.includes("read") || slug.includes("letter")) category = "reading";
  else if (slug === LIGHT_LINKS_GAME.id || slug.includes("puzzle") || slug.includes("shape") || slug.includes("spatial")) category = "spatial";
  else if (slug.includes("true") || slug.includes("false")) category = "math";
  else if (slug.includes("paint") || slug.includes("draw") || slug.includes("art")) category = "creative";
  return { Icon, category };
}
