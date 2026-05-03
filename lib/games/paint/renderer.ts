import { TEXT_SIZES } from "./constants";
import { strokePath } from "./strokes";
import { floodFill } from "./floodFill";
import type { Command, Point } from "./types";

/**
 * Apply one Command to the supplied 2D context. Pure: nothing reads from
 * the canvas beyond what the command itself describes (fill bucket reads
 * pixels — that's its job).
 *
 * `stickerImages` maps a sticker id to an already-loaded HTMLImageElement
 * (the Lucide-icon sprite, tinted at draw time).
 */
export function applyCommand(
  ctx: CanvasRenderingContext2D,
  cmd: Command,
  stickerImages: Map<string, HTMLImageElement>,
): void {
  switch (cmd.kind) {
    case "stroke":
      drawStroke(ctx, cmd);
      break;
    case "shape":
      drawShape(ctx, cmd);
      break;
    case "fill":
      drawFill(ctx, cmd);
      break;
    case "text":
      drawText(ctx, cmd);
      break;
    case "sticker":
      drawSticker(ctx, cmd, stickerImages);
      break;
  }
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<Command, { kind: "stroke" }>,
): void {
  const path = strokePath(cmd.points, cmd.tool, cmd.size);
  ctx.save();
  if (cmd.tool === "eraser") {
    // "Erase" = paint white over the canvas. We never composite-clear to
    // transparent, so fill bucket and PNG export stay predictable.
    ctx.fillStyle = "#ffffff";
  } else {
    ctx.fillStyle = cmd.color;
  }
  ctx.fill(path);
  ctx.restore();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<Command, { kind: "shape" }>,
): void {
  ctx.save();
  ctx.strokeStyle = cmd.color;
  ctx.lineWidth = cmd.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  if (cmd.shape === "line") {
    ctx.moveTo(cmd.from.x, cmd.from.y);
    ctx.lineTo(cmd.to.x, cmd.to.y);
  } else if (cmd.shape === "rect") {
    const x = Math.min(cmd.from.x, cmd.to.x);
    const y = Math.min(cmd.from.y, cmd.to.y);
    const w = Math.abs(cmd.to.x - cmd.from.x);
    const h = Math.abs(cmd.to.y - cmd.from.y);
    ctx.rect(x, y, w, h);
  } else {
    // ellipse
    const cx = (cmd.from.x + cmd.to.x) / 2;
    const cy = (cmd.from.y + cmd.to.y) / 2;
    const rx = Math.abs(cmd.to.x - cmd.from.x) / 2;
    const ry = Math.abs(cmd.to.y - cmd.from.y) / 2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFill(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<Command, { kind: "fill" }>,
): void {
  const { canvas } = ctx;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  floodFill(data, cmd.at.x, cmd.at.y, cmd.color);
  ctx.putImageData(data, 0, 0);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<Command, { kind: "text" }>,
): void {
  const px = TEXT_SIZES[cmd.size];
  ctx.save();
  ctx.fillStyle = cmd.color;
  ctx.textBaseline = "top";
  // Canvas `font` can't parse CSS `var(...)`. Probe a real `.font-display`
  // element (rendered by the page header) for its resolved font-family
  // so we draw with Fredoka instead of silently falling back to 10px
  // sans-serif. Cached after first lookup — next/font names are stable
  // for the page lifetime.
  ctx.font = `bold ${px}px ${getDisplayFontFamily()}`;
  cmd.text.split("\n").forEach((line, i) => {
    ctx.fillText(line, cmd.at.x, cmd.at.y + i * px * 1.1);
  });
  ctx.restore();
}

let cachedDisplayFontFamily: string | null = null;

function getDisplayFontFamily(): string {
  if (cachedDisplayFontFamily) return cachedDisplayFontFamily;
  const probe = document.querySelector(".font-display");
  if (probe) {
    const ff = window.getComputedStyle(probe).fontFamily;
    if (ff) {
      cachedDisplayFontFamily = ff;
      return ff;
    }
  }
  return "system-ui, sans-serif";
}

function drawSticker(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<Command, { kind: "sticker" }>,
  stickerImages: Map<string, HTMLImageElement>,
): void {
  const img = stickerImages.get(cmd.stickerId);
  if (!img) return;
  const half = cmd.sizePx / 2;

  // Draw onto an offscreen canvas first so we can tint via composite.
  const off = document.createElement("canvas");
  off.width = cmd.sizePx;
  off.height = cmd.sizePx;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;

  offCtx.drawImage(img, 0, 0, cmd.sizePx, cmd.sizePx);
  offCtx.globalCompositeOperation = "source-in";
  offCtx.fillStyle = cmd.color;
  offCtx.fillRect(0, 0, cmd.sizePx, cmd.sizePx);

  ctx.drawImage(off, cmd.at.x - half, cmd.at.y - half);
}

/** Convenience: re-render the entire history onto a clean canvas. */
export function replayCommands(
  ctx: CanvasRenderingContext2D,
  commands: readonly Command[],
  stickerImages: Map<string, HTMLImageElement>,
): void {
  for (const cmd of commands) {
    applyCommand(ctx, cmd, stickerImages);
  }
}

/** Live preview while the user is dragging out a shape. */
export function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  shape: "line" | "rect" | "ellipse",
  size: Extract<Command, { kind: "shape" }>["size"],
  color: string,
  from: Point,
  to: Point,
): void {
  drawShape(ctx, { kind: "shape", shape, size, color, from, to });
}
