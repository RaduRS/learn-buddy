import { getStroke, type StrokeOptions } from "perfect-freehand";
import { SIZE_PIXELS, type SizeKey } from "./constants";
import type { Point } from "./types";

/**
 * Build a smooth filled path from a list of pointer points using
 * perfect-freehand. Returns a Path2D ready to be `ctx.fill()`-ed.
 *
 * `tool` controls the stroke "feel":
 *   - brush  → soft tapered ends, slightly thicker
 *   - pencil → tight, jitter-free, harder edges
 *   - eraser → uniform width, no taper (a hard wipe)
 */
export function strokePath(
  points: Point[],
  tool: "brush" | "pencil" | "eraser",
  size: SizeKey,
): Path2D {
  if (points.length === 0) return new Path2D();

  const widths = SIZE_PIXELS[size];
  const baseSize =
    tool === "brush" ? widths.brush : tool === "pencil" ? widths.pencil : widths.eraser;

  const opts: StrokeOptions =
    tool === "eraser"
      ? {
          size: baseSize,
          thinning: 0,
          smoothing: 0.4,
          streamline: 0.3,
          easing: (t) => t,
          start: { taper: 0, cap: true },
          end:   { taper: 0, cap: true },
        }
      : tool === "pencil"
      ? {
          size: baseSize,
          thinning: 0.2,
          smoothing: 0.5,
          streamline: 0.4,
          easing: (t) => t,
          start: { taper: 0, cap: true },
          end:   { taper: 0, cap: true },
        }
      : {
          // brush
          size: baseSize,
          thinning: 0.55,
          smoothing: 0.55,
          streamline: 0.5,
          easing: (t) => t * t,
          start: { taper: baseSize * 0.6, cap: true },
          end:   { taper: baseSize * 0.6, cap: true },
        };

  const outline = getStroke(points.map((p) => [p.x, p.y]), opts);
  const path = new Path2D();
  if (outline.length === 0) return path;

  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    const [x, y] = outline[i];
    path.lineTo(x, y);
  }
  path.closePath();
  return path;
}
