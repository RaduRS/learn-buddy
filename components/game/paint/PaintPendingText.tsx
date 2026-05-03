"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check } from "lucide-react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TEXT_SIZES,
  type TextSizeKey,
} from "@/lib/games/paint/constants";
import type { Point } from "@/lib/games/paint/types";

// Local alias: the canvas's logical height in pixels, used as the
// denominator for the overlay's `top` percentage so the position
// follows the wrapper's aspect-ratio-locked height.
const TEXT_SIZES_REF_HEIGHT = CANVAS_HEIGHT;

interface PaintPendingTextProps {
  text: string;
  size: TextSizeKey;
  color: string;
  /** Canvas-space position. Updated only on pointerup; during the drag
   * we move the overlay via direct DOM transforms (smoother). */
  at: Point;
  /** Bumped when the parent resets the placement target so we drop any
   * leftover drag state. */
  resetKey: number;
  onMove: (at: Point) => void;
  onCommit: () => void;
}

/**
 * Live preview of a freshly-typed text command, rendered as an HTML
 * overlay above the canvas so the user can drag it to the right spot
 * before it bakes into pixels. Tap the green ✓ button to commit.
 *
 * The text font / weight / size / color match what `renderer.drawText`
 * will paint, so what you see here is what the canvas commits.
 *
 * Drag implementation: the React position state (`at`) is the
 * source of truth for the absolute `left/top` of the wrapper, but we
 * deliberately *don't* update it during the drag. Instead we set a
 * GPU-friendly `transform: translate3d(...)` on the wrapper directly
 * via the DOM. This avoids React re-rendering (and therefore the
 * canvas + every other paint child) on every pointermove. Once the
 * pointer is released we read the final delta, reset the transform,
 * and bubble the new position up to the parent in one update.
 */
export function PaintPendingText({
  text,
  size,
  color,
  at,
  resetKey,
  onMove,
  onCommit,
}: PaintPendingTextProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLDivElement | null>(null);
  const [familyResolved, setFamilyResolved] = useState<string | null>(null);

  // Probe the resolved Fredoka family once the page has hydrated so the
  // overlay matches the canvas-baked output instead of falling back to
  // system-ui mid-edit.
  useEffect(() => {
    const probe = document.querySelector(".font-display");
    if (probe) {
      setFamilyResolved(window.getComputedStyle(probe).fontFamily);
    }
  }, []);

  const dragStateRef = useRef<{
    pointerId: number;
    startClient: Point;
  } | null>(null);

  // Drop drag state and clear any leftover transform if the parent
  // resets the placement target (e.g. fresh text).
  useEffect(() => {
    dragStateRef.current = null;
    if (wrapperRef.current) wrapperRef.current.style.transform = "";
  }, [resetKey]);

  const handlePointerDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    dragStateRef.current = {
      pointerId: ev.pointerId,
      startClient: { x: ev.clientX, y: ev.clientY },
    };
  };

  const handlePointerMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    const dxCss = ev.clientX - drag.startClient.x;
    const dyCss = ev.clientY - drag.startClient.y;
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = `translate3d(${dxCss}px, ${dyCss}px, 0)`;
    }
  };

  const endDrag = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    const dxCss = ev.clientX - drag.startClient.x;
    const dyCss = ev.clientY - drag.startClient.y;
    dragStateRef.current = null;
    if (dxCss === 0 && dyCss === 0) {
      // Tap with no drag — clear the transform now since the layout
      // effect won't fire (no `at` change).
      if (wrapperRef.current) wrapperRef.current.style.transform = "";
      return;
    }
    // Convert CSS-pixel delta to canvas-logical delta using the
    // wrapper's *actual* rendered size, not the zoom factor — the
    // wrapper can be smaller than CANVAS_WIDTH * zoom on tablets
    // where maxWidth: 100% kicks in.
    const parent = wrapperRef.current?.parentElement;
    const scaleX = parent ? parent.clientWidth / CANVAS_WIDTH : 1;
    const scaleY = parent
      ? parent.clientHeight / TEXT_SIZES_REF_HEIGHT
      : 1;
    // Leave the transform applied so the overlay stays put visually
    // while React re-renders with the new `at`. The layout effect
    // below resets the transform after left/top have been written.
    onMove({
      x: at.x + dxCss / scaleX,
      y: at.y + dyCss / scaleY,
    });
  };

  // Once the new position has been committed to the wrapper's left/top
  // (i.e. `at` has changed), drop the transform we left applied during
  // the drag — synchronously, before paint, so there's no flicker.
  useLayoutEffect(() => {
    if (wrapperRef.current) wrapperRef.current.style.transform = "";
  }, [at.x, at.y]);

  const px = TEXT_SIZES[size];
  const fontFamily =
    familyResolved ?? "var(--font-fredoka), system-ui, sans-serif";

  // Position and size are expressed relative to the canvas wrapper,
  // which has aspect-ratio + container-type: inline-size set on it.
  // Percentages map at.x/y onto the wrapper's actual width/height,
  // and cqw scales the font with the wrapper exactly the way the
  // canvas's logical-pixel `fillText` will be displayed.
  const leftPct = (at.x / CANVAS_WIDTH) * 100;
  const topPct = (at.y / TEXT_SIZES_REF_HEIGHT) * 100;
  const fontCqw = (px / CANVAS_WIDTH) * 100;

  return (
    <div
      ref={wrapperRef}
      className="absolute z-30"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        // willChange hints the compositor to keep this layer ready.
        willChange: "transform",
      }}
    >
      <div className="relative inline-flex items-start gap-2">
        <div
          ref={dragHandleRef}
          role="button"
          tabIndex={0}
          aria-label="Drag to move text"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="cursor-move select-none touch-none"
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: `${fontCqw}cqw`,
            lineHeight: 1.1,
            color,
            whiteSpace: "pre",
            outline: "2px dashed var(--cat-creative)",
            outlineOffset: 4,
            padding: "0 2px",
          }}
        >
          {text}
        </div>

        <button
          type="button"
          onClick={onCommit}
          aria-label="Place text"
          title="Place text"
          className="shrink-0 w-12 h-12 rounded-2xl grid place-items-center
                     bg-[var(--joy-correct)] text-[var(--ink-on-color)]
                     border-2 border-[oklch(0.45_0.20_145)]
                     active:scale-90"
        >
          <Check className="w-6 h-6" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
