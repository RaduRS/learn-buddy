"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Brush,
  Circle,
  Eraser,
  Maximize2,
  Minimize2,
  Minus,
  PaintBucket,
  Pencil,
  RectangleHorizontal,
  Sticker as StickerIcon,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  STROKE_MAX_PX,
  STROKE_MIN_PX,
} from "@/lib/games/paint/constants";
import { STICKERS } from "@/lib/games/paint/stickers";
import type { Tool } from "@/lib/games/paint/types";
import { PaintToolButton } from "./PaintToolButton";
import { cn } from "@/lib/utils";

interface PaintToolbarProps {
  tool: Tool;
  strokeSize: number;
  fullscreen: boolean;
  stickerId: string;
  onToolChange: (tool: Tool) => void;
  onStrokeSizeChange: (size: number) => void;
  onStickerChange: (id: string) => void;
  onToggleFullscreen: () => void;
}

const TOOLS: { id: Tool; label: string; Icon: LucideIcon }[] = [
  { id: "brush",   label: "Brush",     Icon: Brush },
  { id: "pencil",  label: "Pencil",    Icon: Pencil },
  { id: "eraser",  label: "Eraser",    Icon: Eraser },
  { id: "fill",    label: "Fill",      Icon: PaintBucket },
  { id: "line",    label: "Line",      Icon: Minus },
  { id: "rect",    label: "Rectangle", Icon: RectangleHorizontal },
  { id: "ellipse", label: "Ellipse",   Icon: Circle },
  { id: "text",    label: "Text",      Icon: Type },
  { id: "sticker", label: "Sticker",   Icon: StickerIcon },
];

const SIZE_AWARE: ReadonlySet<Tool> = new Set([
  "brush",
  "pencil",
  "eraser",
  "line",
  "rect",
  "ellipse",
]);

/**
 * Left vertical toolbar — drawing tools + an always-visible stroke-size
 * slider at the top, fullscreen toggle at the bottom. The bar is wider
 * than the right action stack to host the slider; widening here is
 * cheaper than the popover-driven layout shift that came before.
 */
export function PaintToolbar({
  tool,
  strokeSize,
  fullscreen,
  stickerId,
  onToolChange,
  onStrokeSizeChange,
  onStickerChange,
  onToggleFullscreen,
}: PaintToolbarProps) {
  const sizeActive = SIZE_AWARE.has(tool);
  // Cap the preview dot so a slider value of 80 doesn't burst the toolbar.
  const previewDot = Math.max(4, Math.min(36, strokeSize));

  return (
    <div
      className="surface-card cat-creative p-2 flex flex-col items-center gap-1.5 w-[112px] relative z-30 min-h-0 paint-panel-scroll"
      role="toolbar"
      aria-label="Paint tools"
    >
      <div
        className={cn(
          "w-full flex flex-col items-center gap-1 transition-opacity",
          sizeActive ? "opacity-100" : "opacity-40 pointer-events-none",
        )}
      >
        <div className="h-10 w-full grid place-items-center">
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: previewDot,
              height: previewDot,
              background: "var(--ink-strong)",
            }}
          />
        </div>
        <input
          type="range"
          min={STROKE_MIN_PX}
          max={STROKE_MAX_PX}
          step={1}
          value={strokeSize}
          onChange={(e) => onStrokeSizeChange(Number(e.target.value))}
          className="paint-size-slider w-full"
          aria-label="Stroke size"
        />
        <span className="font-display text-xs tabular-nums text-arcade-mid leading-none">
          {strokeSize}px
        </span>
      </div>

      <span aria-hidden className="self-stretch h-px bg-[var(--arcade-edge)] my-1" />

      {TOOLS.map(({ id, label, Icon }) => {
        if (id === "sticker") {
          return (
            <StickerToolItem
              key={id}
              label={label}
              Icon={Icon}
              active={tool === id}
              stickerId={stickerId}
              onClick={() => onToolChange(id)}
              onStickerChange={onStickerChange}
            />
          );
        }
        return (
          <PaintToolButton
            key={id}
            label={label}
            Icon={Icon}
            active={tool === id}
            onClick={() => onToolChange(id)}
          />
        );
      })}

      <span aria-hidden className="self-stretch h-px bg-[var(--arcade-edge)] my-1" />

      <PaintToolButton
        label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        Icon={fullscreen ? Minimize2 : Maximize2}
        onClick={onToggleFullscreen}
      />
    </div>
  );
}

interface StickerToolItemProps {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  stickerId: string;
  /** Select the sticker tool (does not control flyout visibility). */
  onClick: () => void;
  onStickerChange: (id: string) => void;
}

/**
 * Sticker tool button + a sticker-grid flyout that escapes the toolbar
 * via React portal. The portal sidesteps stacking-context contention
 * with the canvas-wrapper sibling, which renders later in DOM order
 * and would otherwise paint on top of an in-tree popover.
 *
 * Flyout visibility is its own state (not tied to `active`) so it
 * behaves like a normal dropdown: picking a stamp retracts it, tapping
 * the tool button toggles it, and tapping outside closes it. Otherwise
 * it would sit open over the canvas and swallow stamp taps.
 */
function StickerToolItem({
  label,
  Icon,
  active,
  stickerId,
  onClick,
  onStickerChange,
}: StickerToolItemProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  // Portals only work after hydration — wait for the document to exist.
  useEffect(() => setMounted(true), []);

  // Switching to a different tool retracts the picker.
  useEffect(() => {
    if (!active) setFlyoutOpen(false);
  }, [active]);

  // Tapping the tool button opens the picker when first selecting the
  // sticker tool, then toggles it open/closed on subsequent taps.
  const handleButtonClick = () => {
    if (!active) {
      onClick();
      setFlyoutOpen(true);
    } else {
      setFlyoutOpen((v) => !v);
    }
  };

  // Picking a stamp retracts the flyout so it stops covering the canvas;
  // the sticker tool stays active so the next tap stamps the choice.
  const handlePick = (id: string) => {
    onStickerChange(id);
    setFlyoutOpen(false);
  };

  // Recompute fixed-position coords whenever the flyout opens, the
  // viewport resizes, or the user scrolls.
  useLayoutEffect(() => {
    if (!flyoutOpen) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setCoords({
        left: r.right + 8,
        bottom: window.innerHeight - r.bottom,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [flyoutOpen]);

  // Close on outside tap. Ignore taps on the tool button — those toggle
  // via handleButtonClick and would otherwise immediately re-close.
  useEffect(() => {
    if (!flyoutOpen) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (buttonRef.current?.contains(t)) return;
      if (flyoutRef.current?.contains(t)) return;
      setFlyoutOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [flyoutOpen]);

  return (
    <>
      <PaintToolButton
        ref={buttonRef}
        label={label}
        Icon={Icon}
        active={active}
        onClick={handleButtonClick}
      />
      {flyoutOpen &&
        mounted &&
        coords &&
        createPortal(
          <div
            ref={flyoutRef}
            role="group"
            aria-label="Sticker picker"
            className="surface-card cat-creative p-2"
            style={{
              position: "fixed",
              left: coords.left,
              bottom: coords.bottom,
              zIndex: 60,
              overflow: "visible",
              width: "max-content",
            }}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {STICKERS.map((s) => {
                const isActive = s.id === stickerId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePick(s.id)}
                    aria-label={s.label}
                    aria-pressed={isActive}
                    title={s.label}
                    className={cn(
                      "w-12 h-12 rounded-2xl grid place-items-center border-2 transition-transform active:scale-90",
                      isActive
                        ? "bg-[var(--cat-creative)] border-[var(--cat-creative)] text-[var(--ink-on-color)]"
                        : "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong",
                    )}
                  >
                    <s.Icon className="w-6 h-6" strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
