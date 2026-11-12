"use client";

import { lazy, useState, type ComponentType } from "react";
import type { CategoryKey } from "./categories";
import { CAR_LOGO_GAME } from "./carLogoCatalog";
import { LIGHT_LINKS_GAME } from "./lightLinksCatalog";
import { ECHO_CARDS_GAME, LANTERN_GRID_GAME, MAP_QUEST_GAME, MINI_SHOP_GAME, PATTERN_TRAIN_GAME, ROBOT_RULES_GAME, SOUND_DETECTIVE_GAME, SWITCH_SORT_GAME, WORD_BUILDER_GAME } from "./learningCatalog";

/**
 * Unified context handed to every game adapter.
 * Game components keep their own current prop shapes; the adapter
 * function bridges from `GameContext` to whatever each game expects.
 */
export interface GameContext {
  userId: string;
  gameId: string;
  userAge: number;
  /** Selected child's display name — used for per-child tuning (e.g. easy math for Eddie). */
  userName: string;
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
const LightLinksGame     = lazy(() => import("@/components/game/LightLinksGame"));
const CarLogoGame        = lazy(() => import("@/components/game/CarLogoGame"));
const MiniShopGame        = lazy(() => import("@/components/game/MiniShopGame"));
const WordBuilderGame     = lazy(() => import("@/components/game/WordBuilderGame"));
const MapQuestGame        = lazy(() => import("@/components/game/MapQuestGame"));
const PatternTrainGame    = lazy(() => import("@/components/game/PatternTrainGame"));
const SoundDetectiveGame  = lazy(() => import("@/components/game/SoundDetectiveGame"));
const LanternGridGame     = lazy(() => import("@/components/game/LanternGridGame"));
const SwitchSortGame      = lazy(() => import("@/components/game/SwitchSortGame"));
const RobotRulesGame      = lazy(() => import("@/components/game/RobotRulesGame"));
const EchoCardsGame       = lazy(() => import("@/components/game/EchoCardsGame"));
const MemoryMatchGame    = lazy(() => import("@/components/game/MemoryMatchGame"));
const MemoryMatchConfig  = lazy(() => import("@/components/game/MemoryMatchConfig"));
const NumberFunGame      = lazy(() => import("@/components/game/NumberFunGame"));
const MusicLearningGame  = lazy(() => import("@/components/game/MusicLearningGame"));
const ShapesGame         = lazy(() => import("@/components/game/ShapesGame"));
const ReadingHelperGame  = lazy(() => import("@/components/game/ReadingHelperGame"));
const MathSparkGame      = lazy(() => import("@/components/game/MathSparkGame"));
const ReadingStoryGame   = lazy(() => import("@/components/game/ReadingStoryGame"));
const StoryBuilderGame   = lazy(() => import("@/components/game/StoryBuilderGame"));
const PaintGame          = lazy(() => import("@/components/game/PaintGame"));

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

function LightLinksAdapter(ctx: GameContext) {
  return <LightLinksGame userId={ctx.userId} gameId={ctx.gameId} onGameComplete={ctx.onGameComplete} />;
}

function CarLogoAdapter(ctx: GameContext) {
  return <CarLogoGame key={ctx.userId} gameId={ctx.gameId} onGameComplete={ctx.onGameComplete} onExit={ctx.onExit} />;
}

function MiniShopAdapter(ctx: GameContext) {
  return <MiniShopGame key={ctx.userId} gameId={ctx.gameId} onGameComplete={ctx.onGameComplete} onExit={ctx.onExit} />;
}

const WordBuilderAdapter = (ctx: GameContext) => <WordBuilderGame key={ctx.userId} {...ctx} />;
const MapQuestAdapter = (ctx: GameContext) => <MapQuestGame key={ctx.userId} {...ctx} />;
const PatternTrainAdapter = (ctx: GameContext) => <PatternTrainGame key={ctx.userId} {...ctx} />;
const SoundDetectiveAdapter = (ctx: GameContext) => <SoundDetectiveGame key={ctx.userId} {...ctx} />;
const LanternGridAdapter = (ctx: GameContext) => <LanternGridGame key={ctx.userId} {...ctx} />;
const SwitchSortAdapter = (ctx: GameContext) => <SwitchSortGame key={ctx.userId} {...ctx} />;
const RobotRulesAdapter = (ctx: GameContext) => <RobotRulesGame key={ctx.userId} {...ctx} />;
const EchoCardsAdapter = (ctx: GameContext) => <EchoCardsGame key={ctx.userId} {...ctx} />;

function NumberFunAdapter(ctx: GameContext) {
  return (
    <NumberFunGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      userName={ctx.userName}
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
    <MathSparkGame
      gameId={ctx.gameId}
      userName={ctx.userName}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function ReadingStoryAdapter(ctx: GameContext) {
  return (
    <ReadingStoryGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}

function PaintAdapter(ctx: GameContext) {
  // Paint is open-ended — it never calls onGameComplete or returns a score.
  return <PaintGame userId={ctx.userId} />;
}

function StoryBuilderAdapter(ctx: GameContext) {
  return (
    <StoryBuilderGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      userName={ctx.userName}
      onGameComplete={ctx.onGameComplete}
      onExit={ctx.onExit}
    />
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
  [LIGHT_LINKS_GAME.id]: { title: LIGHT_LINKS_GAME.title, category: LIGHT_LINKS_GAME.category, Component: LightLinksAdapter },
  [CAR_LOGO_GAME.id]: { title: CAR_LOGO_GAME.title, category: CAR_LOGO_GAME.category, Component: CarLogoAdapter },
  [MINI_SHOP_GAME.id]: { title: MINI_SHOP_GAME.title, category: MINI_SHOP_GAME.category, Component: MiniShopAdapter },
  [WORD_BUILDER_GAME.id]: { title: WORD_BUILDER_GAME.title, category: WORD_BUILDER_GAME.category, Component: WordBuilderAdapter },
  [MAP_QUEST_GAME.id]: { title: MAP_QUEST_GAME.title, category: MAP_QUEST_GAME.category, Component: MapQuestAdapter },
  [PATTERN_TRAIN_GAME.id]: { title: PATTERN_TRAIN_GAME.title, category: PATTERN_TRAIN_GAME.category, Component: PatternTrainAdapter },
  [SOUND_DETECTIVE_GAME.id]: { title: SOUND_DETECTIVE_GAME.title, category: SOUND_DETECTIVE_GAME.category, Component: SoundDetectiveAdapter },
  [LANTERN_GRID_GAME.id]: { title: LANTERN_GRID_GAME.title, category: LANTERN_GRID_GAME.category, Component: LanternGridAdapter },
  [SWITCH_SORT_GAME.id]: { title: SWITCH_SORT_GAME.title, category: SWITCH_SORT_GAME.category, Component: SwitchSortAdapter },
  [ROBOT_RULES_GAME.id]: { title: ROBOT_RULES_GAME.title, category: ROBOT_RULES_GAME.category, Component: RobotRulesAdapter },
  [ECHO_CARDS_GAME.id]: { title: ECHO_CARDS_GAME.title, category: ECHO_CARDS_GAME.category, Component: EchoCardsAdapter },
  "number-fun":     { title: "Number Fun",     category: "math",    Component: NumberFunAdapter },
  "subitizing":     { title: "Subitizing",     category: "math",    Component: SubitizingAdapter },
  "mathspark":      { title: "MathSpark",      category: "math",    Component: MathSparkAdapter },
  "math-spark":     { title: "MathSpark",      category: "math",    Component: MathSparkAdapter },
  "music-maker":    { title: "Music Maker",    category: "music",   Component: MusicAdapter },
  "shapes":         { title: "Shapes",         category: "spatial", Component: ShapesAdapter },
  "reading-helper": { title: "Reading Helper", category: "reading", Component: ReadingHelperAdapter },
  "story-time":     { title: "Story Time",     category: "reading", Component: ReadingStoryAdapter },
  "true-false":     { title: "True or False",  category: "math",    Component: TrueFalseAdapter },
  "paint":          { title: "Paint",          category: "creative",Component: PaintAdapter },
  "build-a-story":  { title: "Build a Story",  category: "creative",Component: StoryBuilderAdapter },
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
