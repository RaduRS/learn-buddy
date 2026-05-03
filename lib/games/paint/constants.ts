/**
 * Constants for the Paint game. Centralised so tweaks (palette, brush
 * sizes, sticker set) don't require touching the canvas engine.
 */

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const HISTORY_LIMIT = 30;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.25;

export const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Stroke size is a free-form number (px). The slider lets the user pick
 * anywhere in this range. Pencil renders thinner and eraser thicker
 * (see PENCIL_RATIO / ERASER_RATIO) so one slider feels right for all
 * three tools.
 */
export const STROKE_MIN_PX = 2;
export const STROKE_MAX_PX = 80;
export const STROKE_DEFAULT_PX = 14;

export const PENCIL_RATIO = 0.5;
export const ERASER_RATIO = 2.5;

/** Twelve kid-friendly preset swatches. */
export const PRESET_COLORS: readonly string[] = [
  "#1a1a1a", // black
  "#ffffff", // white
  "#e74c3c", // red
  "#ff8a3d", // orange
  "#f7c948", // yellow
  "#7ed957", // grass green
  "#22c4a8", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#a0522d", // brown
  "#fbcaa3", // skin / peach
];

/**
 * Sizes are absolute canvas pixels (canvas is 1200×800), so "large" is
 * roughly a fifth of canvas height — a real headline.
 */
export const TEXT_SIZES = {
  small: 56,
  medium: 110,
  large: 180,
} as const;

export type TextSizeKey = keyof typeof TEXT_SIZES;

export const STICKER_SIZE_PX = 96;
