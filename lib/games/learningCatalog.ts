export const MINI_SHOP_GAME = {
  id: "mini-shop",
  title: "Mini Shop",
  description: "Pay with UK coins and help customers get the right change.",
  icon: "shopping-basket",
  category: "math",
  difficulty: 2,
  isActive: true,
} as const;

export const WORD_BUILDER_GAME = {
  id: "word-builder", title: "Word Builder", description: "Hear the word, look at the picture, and tap the letters to spell it.",
  icon: "spell-check", category: "reading", difficulty: 1, isActive: true,
} as const;

export const MAP_QUEST_GAME = {
  id: "map-quest", title: "Map Quest", description: "Find your own route to the treasure before you run out of moves.",
  icon: "map", category: "spatial", difficulty: 2, isActive: true,
} as const;

export const PATTERN_TRAIN_GAME = {
  id: "pattern-train", title: "Pattern Train", description: "Spot the pattern and choose the carriage that comes next.",
  icon: "train-front", category: "math", difficulty: 2, isActive: true,
} as const;

export const SOUND_DETECTIVE_GAME = {
  id: "sound-detective", title: "Sound Detective", description: "Listen and guess the animal, instrument, or everyday sound.",
  icon: "audio-lines", category: "music", difficulty: 1, isActive: true,
} as const;

export const LANTERN_GRID_GAME = {
  id: "lantern-grid", title: "Lantern Grid", description: "Remember where the lanterns were lit, then find those squares again.",
  icon: "lightbulb", category: "memory", difficulty: 2, isActive: true,
} as const;

export const SWITCH_SORT_GAME = {
  id: "switch-sort", title: "Switch Sort", description: "Match cards by shape or colour and keep up when the rule changes.",
  icon: "shapes", category: "spatial", difficulty: 2, isActive: true,
} as const;

export const ROBOT_RULES_GAME = {
  id: "robot-rules", title: "Robot Rules", description: "Build IF, THEN and ELSE rules to help a robot sort parcels.",
  icon: "bot", category: "spatial", difficulty: 2, isActive: true,
} as const;

export const ECHO_CARDS_GAME = {
  id: "echo-cards", title: "Echo Cards", description: "Remember the cards you saw and spot when a symbol repeats.",
  icon: "layers", category: "memory", difficulty: 2, isActive: true,
} as const;

export const LEARNING_GAMES = [
  MINI_SHOP_GAME, WORD_BUILDER_GAME, MAP_QUEST_GAME, PATTERN_TRAIN_GAME, SOUND_DETECTIVE_GAME,
  LANTERN_GRID_GAME, SWITCH_SORT_GAME, ROBOT_RULES_GAME, ECHO_CARDS_GAME,
] as const;
