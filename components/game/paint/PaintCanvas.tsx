"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type PointerReact = ReactPointerEvent<HTMLCanvasElement>;
import {
  AUTOSAVE_DEBOUNCE_MS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  HISTORY_LIMIT,
  STICKER_SIZE_PX,
  type TextSizeKey,
} from "@/lib/games/paint/constants";
import {
  applyCommand,
  drawShapePreview,
  replayCommands,
} from "@/lib/games/paint/renderer";
import { strokePath } from "@/lib/games/paint/strokes";
import {
  canvasToBlob,
  clearPainting,
  loadPainting,
  savePainting,
} from "@/lib/games/paint/storage";
import { loadStickerImages } from "@/lib/games/paint/stickers";
import type { Command, Point, ToolState } from "@/lib/games/paint/types";

export interface PaintCanvasHandle {
  /** Undo the last action (no-op if nothing to undo). */
  undo(): void;
  /** Redo the last undone action (no-op if nothing to redo). */
  redo(): void;
  /** Wipe the canvas + clear history + clear IndexedDB. */
  clear(): Promise<void>;
  /** Export the current painting as a PNG blob. */
  exportBlob(): Promise<Blob>;
  /** True when there is at least one undo step available. */
  canUndo(): boolean;
  /** True when there is at least one redo step available. */
  canRedo(): boolean;
}

interface PaintCanvasProps {
  userId: string;
  toolState: ToolState;
  /** Fired when the user taps the canvas with the text tool selected. */
  onTextRequest: (at: Point) => void;
  /** Whether a non-canvas modal (e.g. text entry) is currently open. */
  paused?: boolean;
  /** Called whenever an action mutates the undo/redo stacks. */
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  /** Fired once when the canvas + sticker images are ready. */
  onReady: () => void;
}

/**
 * Pending text input passed in via `commitPendingText`. We expose this
 * tiny imperative addition alongside the standard handle so the parent
 * doesn't need a second ref to commit text from the dialog.
 */
export interface PaintCanvasFullHandle extends PaintCanvasHandle {
  commitText(at: Point, text: string, size: TextSizeKey, color: string): void;
}

export const PaintCanvas = forwardRef<PaintCanvasFullHandle, PaintCanvasProps>(
  function PaintCanvas(
    { userId, toolState, onTextRequest, paused, onHistoryChange, onReady },
    ref,
  ) {
    const visibleRef = useRef<HTMLCanvasElement | null>(null);
    const committedRef = useRef<HTMLCanvasElement | null>(null);
    const stickersRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const historyRef = useRef<Command[]>([]);
    const redoRef = useRef<Command[]>([]);

    // In-flight gesture state. Refs (not state) to avoid re-renders per frame.
    const drawingRef = useRef(false);
    const pointerIdRef = useRef<number | null>(null);
    const strokePointsRef = useRef<Point[]>([]);
    const dragStartRef = useRef<Point | null>(null);

    const [error, setError] = useState<string | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);

    const toolStateRef = useRef(toolState);
    useEffect(() => {
      toolStateRef.current = toolState;
    }, [toolState]);

    /* ─── Helpers ─────────────────────────────────────────── */

    const committedCtx = useCallback(() => {
      const c = committedRef.current;
      return c ? c.getContext("2d") : null;
    }, []);

    const visibleCtx = useCallback(() => {
      const c = visibleRef.current;
      return c ? c.getContext("2d") : null;
    }, []);

    const renderVisible = useCallback(() => {
      const vctx = visibleCtx();
      const committed = committedRef.current;
      if (!vctx || !committed) return;
      vctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      vctx.drawImage(committed, 0, 0);
    }, [visibleCtx]);

    const scheduleAutosave = useCallback(() => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = window.setTimeout(() => {
        const committed = committedRef.current;
        if (!committed) return;
        void canvasToBlob(committed)
          .then((blob) => savePainting(userId, blob))
          .catch((err) => console.error("Paint: autosave failed", err));
      }, AUTOSAVE_DEBOUNCE_MS);
    }, [userId]);

    const commitCommand = useCallback(
      (cmd: Command) => {
        const ctx = committedCtx();
        if (!ctx) return;
        applyCommand(ctx, cmd, stickersRef.current);
        historyRef.current.push(cmd);
        if (historyRef.current.length > HISTORY_LIMIT) {
          historyRef.current.shift();
        }
        redoRef.current = [];
        renderVisible();
        scheduleAutosave();
        onHistoryChange(historyRef.current.length > 0, redoRef.current.length > 0);
      },
      [committedCtx, renderVisible, scheduleAutosave, onHistoryChange],
    );

    /* ─── Pointer events ───────────────────────────────────── */

    const eventToCanvasPoint = (
      ev: PointerReact,
    ): Point => {
      const canvas = ev.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      const y = ((ev.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
      return { x, y };
    };

    const handlePointerDown = (ev: PointerReact) => {
      if (paused) return;
      // Only respond to primary button / single touch — pinch & pan are
      // handled by the wrapper (two-finger gestures don't reach us).
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      const { tool, color, stickerId } = toolStateRef.current;
      const at = eventToCanvasPoint(ev);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      pointerIdRef.current = ev.pointerId;

      switch (tool) {
        case "brush":
        case "pencil":
        case "eraser":
          drawingRef.current = true;
          strokePointsRef.current = [at];
          break;
        case "line":
        case "rect":
        case "ellipse":
          drawingRef.current = true;
          dragStartRef.current = at;
          break;
        case "fill":
          commitCommand({ kind: "fill", at, color });
          break;
        case "text":
          onTextRequest(at);
          break;
        case "sticker":
          commitCommand({
            kind: "sticker",
            at,
            stickerId,
            color,
            sizePx: STICKER_SIZE_PX,
          });
          break;
      }
    };

    const handlePointerMove = (ev: PointerReact) => {
      if (!drawingRef.current) return;
      if (pointerIdRef.current !== ev.pointerId) return;
      const at = eventToCanvasPoint(ev);
      const { tool, color, brushSize } = toolStateRef.current;

      if (tool === "brush" || tool === "pencil" || tool === "eraser") {
        strokePointsRef.current.push(at);
        const vctx = visibleCtx();
        if (!vctx) return;
        renderVisible();
        const path = strokePath(strokePointsRef.current, tool, brushSize);
        vctx.save();
        vctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
        vctx.fill(path);
        vctx.restore();
      } else if (tool === "line" || tool === "rect" || tool === "ellipse") {
        const from = dragStartRef.current;
        if (!from) return;
        const vctx = visibleCtx();
        if (!vctx) return;
        renderVisible();
        drawShapePreview(vctx, tool, brushSize, color, from, at);
      }
    };

    const finishGesture = (ev: PointerReact) => {
      if (!drawingRef.current) return;
      if (pointerIdRef.current !== ev.pointerId) return;
      const at = eventToCanvasPoint(ev);
      const { tool, color, brushSize } = toolStateRef.current;
      drawingRef.current = false;
      pointerIdRef.current = null;

      if (tool === "brush" || tool === "pencil" || tool === "eraser") {
        const points = strokePointsRef.current;
        strokePointsRef.current = [];
        if (points.length === 0) return;
        // Single tap → seed a tiny dot so it's visible.
        if (points.length === 1) points.push({ x: points[0].x + 0.1, y: points[0].y + 0.1 });
        commitCommand({
          kind: "stroke",
          tool,
          size: brushSize,
          color,
          points,
        });
      } else if (tool === "line" || tool === "rect" || tool === "ellipse") {
        const from = dragStartRef.current;
        dragStartRef.current = null;
        if (!from) return;
        // Ignore micro-drags so a sloppy tap doesn't spawn a dot-shape.
        if (Math.hypot(at.x - from.x, at.y - from.y) < 4) {
          renderVisible();
          return;
        }
        commitCommand({
          kind: "shape",
          shape: tool,
          size: brushSize,
          color,
          from,
          to: at,
        });
      }
    };

    const handlePointerUp = (ev: PointerReact) =>
      finishGesture(ev);
    const handlePointerCancel = () => {
      drawingRef.current = false;
      pointerIdRef.current = null;
      strokePointsRef.current = [];
      dragStartRef.current = null;
      renderVisible();
    };

    /* ─── Imperative handle ───────────────────────────────── */

    useImperativeHandle(
      ref,
      () => ({
        undo: () => {
          const cmd = historyRef.current.pop();
          if (!cmd) return;
          redoRef.current.push(cmd);
          if (redoRef.current.length > HISTORY_LIMIT) redoRef.current.shift();
          const ctx = committedCtx();
          if (!ctx) return;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          replayCommands(ctx, historyRef.current, stickersRef.current);
          renderVisible();
          scheduleAutosave();
          onHistoryChange(historyRef.current.length > 0, redoRef.current.length > 0);
        },
        redo: () => {
          const cmd = redoRef.current.pop();
          if (!cmd) return;
          commitCommand(cmd);
        },
        clear: async () => {
          historyRef.current = [];
          redoRef.current = [];
          const ctx = committedCtx();
          if (!ctx) return;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          renderVisible();
          await clearPainting(userId);
          onHistoryChange(historyRef.current.length > 0, redoRef.current.length > 0);
        },
        exportBlob: async () => {
          const committed = committedRef.current;
          if (!committed) throw new Error("Canvas not ready");
          return canvasToBlob(committed);
        },
        canUndo: () => historyRef.current.length > 0,
        canRedo: () => redoRef.current.length > 0,
        commitText: (at, text, size, color) => {
          if (!text.trim()) return;
          commitCommand({ kind: "text", at, text, size, color });
        },
      }),
      [
        committedCtx,
        commitCommand,
        renderVisible,
        scheduleAutosave,
        onHistoryChange,
        userId,
      ],
    );

    /* ─── Mount: prepare canvases, load painting, load stickers ── */

    useEffect(() => {
      const visible = visibleRef.current;
      if (!visible) return;
      visible.width = CANVAS_WIDTH;
      visible.height = CANVAS_HEIGHT;

      const committed = document.createElement("canvas");
      committed.width = CANVAS_WIDTH;
      committed.height = CANVAS_HEIGHT;
      const cctx = committed.getContext("2d");
      if (!cctx) {
        setError("Your browser doesn't support drawing here.");
        return;
      }
      cctx.fillStyle = "#ffffff";
      cctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      committedRef.current = committed;
      renderVisible();

      let cancelled = false;

      void (async () => {
        try {
          stickersRef.current = await loadStickerImages();
        } catch (err) {
          console.error("Paint: failed to load sticker icons", err);
        }
        if (cancelled) return;

        const blob = await loadPainting(userId);
        if (blob && !cancelled) {
          const url = URL.createObjectURL(blob);
          try {
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                cctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                resolve();
              };
              img.onerror = reject;
              img.src = url;
            });
          } finally {
            URL.revokeObjectURL(url);
          }
          renderVisible();
        }

        if (!cancelled) onReady();
      })();

      return () => {
        cancelled = true;
      };
      // userId change is treated as "different user" — the parent unmounts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ─── Save on visibility/exit ─────────────────────────── */

    useEffect(() => {
      const flush = () => {
        const committed = committedRef.current;
        if (!committed) return;
        // Cancel any debounced save and write synchronously-ish.
        if (autosaveTimerRef.current !== null) {
          window.clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        void canvasToBlob(committed).then((blob) =>
          savePainting(userId, blob),
        );
      };
      const onVisibility = () => {
        if (document.visibilityState === "hidden") flush();
      };
      window.addEventListener("beforeunload", flush);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        flush();
        window.removeEventListener("beforeunload", flush);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }, [userId]);

    /* ─── Render ──────────────────────────────────────────── */

    if (error) {
      return (
        <div role="alert" className="surface-card cat-creative p-6 text-arcade-mid">
          {error}
        </div>
      );
    }

    return (
      <canvas
        ref={visibleRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block w-full h-full bg-white touch-none select-none rounded-2xl"
        style={{
          imageRendering: "auto",
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Painting canvas"
      />
    );
  },
);
