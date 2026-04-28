"use client";

import { lazy, useState, type ComponentType } from "react";
import type { CategoryKey } from "./categories";

/**
 * Unified context handed to every game adapter.
 * Game components keep their own current prop shapes; the adapter
 * function bridges from `GameContext` to whatever each game expects.
 */
export interface GameContext {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
  onExit: () => void;
}

export interface RegistryEntry {
  /** Canonical title for display + debug. */
  title: string;
  category: CategoryKey;
  /** Adapter component that lazy-loads the underlying game. */
  Component: ComponentType<GameContext>;
}

// Each game becomes its own JS chunk via React.lazy.
const TrueFalseGame      = lazy(() => import("@/components/game/TrueFalseGame"));
const SubitizingGame     = lazy(() => import("@/components/game/SubitizingGame"));
const PuzzleGame         = lazy(() => import("@/components/game/PuzzleGame"));
const MemoryMatchGame    = lazy(() => import("@/components/game/MemoryMatchGame"));
const MemoryMatchConfig  = lazy(() => import("@/components/game/MemoryMatchConfig"));
const NumberFunGame      = lazy(() => import("@/components/game/NumberFunGame"));
const MusicLearningGame  = lazy(() => import("@/components/game/MusicLearningGame"));
const ShapesGame         = lazy(() => import("@/components/game/ShapesGame"));
const ReadingHelperGame  = lazy(() => import("@/components/game/ReadingHelperGame"));
const MathSparkGame      = lazy(() => import("@/components/game/MathSparkGame"));

interface MemoryGridConfig {
  rows: number;
  cols: number;
  pairs: number;
}

function TrueFalseAdapter(ctx: GameContext) {
  return (
    <TrueFalseGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function SubitizingAdapter(ctx: GameContext) {
  return (
    <SubitizingGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function PuzzleAdapter(ctx: GameContext) {
  return (
    <PuzzleGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function NumberFunAdapter(ctx: GameContext) {
  return (
    <NumberFunGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function MusicAdapter(ctx: GameContext) {
  return (
    <MusicLearningGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function ShapesAdapter(ctx: GameContext) {
  return (
    <ShapesGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function ReadingHelperAdapter(ctx: GameContext) {
  return (
    <ReadingHelperGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function MathSparkAdapter(ctx: GameContext) {
  return (
    <MathSparkGame gameId={ctx.gameId} onGameComplete={ctx.onGameComplete} />
  );
}

/** Memory Match shows a grid-size picker before the game. */
function MemoryMatchAdapter(ctx: GameContext) {
  const [config, setConfig] = useState<MemoryGridConfig | null>(null);
  if (!config) {
    return <MemoryMatchConfig onConfigSelect={setConfig} onCancel={ctx.onExit} />;
  }
  return (
    <MemoryMatchGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      gridConfig={config}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

/**
 * Slugify any title to its registry key.
 * "Memory Match" -> "memory-match", "MathSpark" -> "mathspark".
 */
export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const REGISTRY: Record<string, RegistryEntry> = {
  "memory-match":   { title: "Memory Match",   category: "memory",  Component: MemoryMatchAdapter },
  "puzzle":         { title: "Puzzle",         category: "spatial", Component: PuzzleAdapter },
  "number-fun":     { title: "Number Fun",     category: "math",    Component: NumberFunAdapter },
  "subitizing":     { title: "Subitizing",     category: "math",    Component: SubitizingAdapter },
  "mathspark":      { title: "MathSpark",      category: "math",    Component: MathSparkAdapter },
  "math-spark":     { title: "MathSpark",      category: "math",    Component: MathSparkAdapter },
  "music-maker":    { title: "Music Maker",    category: "music",   Component: MusicAdapter },
  "shapes":         { title: "Shapes",         category: "spatial", Component: ShapesAdapter },
  "reading-helper": { title: "Reading Helper", category: "reading", Component: ReadingHelperAdapter },
  "true-false":     { title: "True or False",  category: "math",    Component: TrueFalseAdapter },
};

/**
 * Resolve a DB game record to its registry entry, falling back to the
 * legacy dispatch rules so existing seeded titles keep working.
 */
export function resolveGameEntry(game: {
  title: string;
  category?: string | null;
}): RegistryEntry | null {
  const slug = slugifyTitle(game.title);
  const direct = REGISTRY[slug];
  if (direct) return direct;

  if ((game.category ?? "").toLowerCase() === "reading") {
    return REGISTRY["reading-helper"];
  }

  return REGISTRY["true-false"] ?? null;
}
