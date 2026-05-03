import type { SizeKey, TextSizeKey } from "./constants";

export type Tool =
  | "brush"
  | "pencil"
  | "eraser"
  | "fill"
  | "line"
  | "rect"
  | "ellipse"
  | "text"
  | "sticker";

export type Point = { x: number; y: number };

/**
 * One drawable action. Each entry is everything we need to re-render this
 * action onto a blank canvas. Replay-from-zero powers undo without holding
 * a stack of full-canvas snapshots.
 */
export type Command =
  | {
      kind: "stroke";
      tool: "brush" | "pencil" | "eraser";
      size: SizeKey;
      color: string;
      points: Point[];
    }
  | {
      kind: "shape";
      shape: "line" | "rect" | "ellipse";
      size: SizeKey;
      color: string;
      from: Point;
      to: Point;
    }
  | {
      kind: "fill";
      at: Point;
      color: string;
    }
  | {
      kind: "text";
      at: Point;
      text: string;
      size: TextSizeKey;
      color: string;
    }
  | {
      kind: "sticker";
      at: Point;
      stickerId: string;
      color: string;
      sizePx: number;
    };

/** Active toolbar selection. Persisted in component state (not on disk). */
export interface ToolState {
  tool: Tool;
  brushSize: SizeKey;
  textSize: TextSizeKey;
  color: string;
  stickerId: string;
}
