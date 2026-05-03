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
 * Brush / pencil / eraser line widths. Pencil is half the width of brush
 * for a sharper, technical-pen feel; eraser matches brush.
 */
export const SIZE_PIXELS = {
  small: { brush: 6,  pencil: 3,  eraser: 18 },
  medium:{ brush: 14, pencil: 6,  eraser: 36 },
  large: { brush: 28, pencil: 12, eraser: 64 },
} as const;

export type SizeKey = keyof typeof SIZE_PIXELS;

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

export const TEXT_SIZES = {
  small: 32,
  medium: 56,
  large: 96,
} as const;

export type TextSizeKey = keyof typeof TEXT_SIZES;

export const STICKER_SIZE_PX = 96;
