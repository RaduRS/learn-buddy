"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check } from "lucide-react";
import {
  CANVAS_WIDTH,
  TEXT_SIZES,
  type TextSizeKey,
} from "@/lib/games/paint/constants";
import type { Point } from "@/lib/games/paint/types";

interface PaintPendingTextProps {
  text: string;
  size: TextSizeKey;
  color: string;
  /** Canvas-space position. Updated as the user drags. */
  at: Point;
  zoom: number;
  /** Bumped to invalidate cached starting positions when the parent
   * resets the at coordinate (e.g. for a fresh placement). */
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
 */
export function PaintPendingText({
  text,
  size,
  color,
  at,
  zoom,
  resetKey,
  onMove,
  onCommit,
}: PaintPendingTextProps) {
  const dragRef = useRef<HTMLDivElement | null>(null);
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

  // Track the in-flight drag without re-rendering on every pointermove.
  const dragStateRef = useRef<{
    pointerId: number;
    startClient: Point;
    startAt: Point;
  } | null>(null);

  // Reset drag state if the parent resets the placement target.
  useEffect(() => {
    dragStateRef.current = null;
  }, [resetKey]);

  const handlePointerDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragStateRef.current = {
      pointerId: ev.pointerId,
      startClient: { x: ev.clientX, y: ev.clientY },
      startAt: { ...at },
    };
  };

  const handlePointerMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    const dxCss = ev.clientX - drag.startClient.x;
    const dyCss = ev.clientY - drag.startClient.y;
    onMove({
      x: drag.startAt.x + dxCss / zoom,
      y: drag.startAt.y + dyCss / zoom,
    });
  };

  const endDrag = (ev: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === ev.pointerId) {
      dragStateRef.current = null;
    }
  };

  const px = TEXT_SIZES[size];
  const fontFamily =
    familyResolved ?? "var(--font-fredoka), system-ui, sans-serif";

  // Right edge of the text in canvas-space. Used to anchor the Done
  // button so the user can grab it without it jumping around as the
  // text resizes mid-flow.
  const cssLeft = at.x * zoom;
  const cssTop = at.y * zoom;
  const cssFont = px * zoom;

  return (
    <div
      className="absolute z-30"
      style={{ left: cssLeft, top: cssTop, maxWidth: CANVAS_WIDTH * zoom - cssLeft }}
    >
      <div className="relative inline-flex items-start gap-2">
        <div
          ref={dragRef}
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
            fontSize: cssFont,
            lineHeight: 1.1,
            color,
            whiteSpace: "pre",
            // Subtle dashed outline so kids see exactly what's draggable.
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
