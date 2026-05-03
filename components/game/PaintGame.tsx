"use client";

import { useCallback, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PRESET_COLORS,
  STROKE_DEFAULT_PX,
  STROKE_MAX_PX,
  STROKE_MIN_PX,
  type TextSizeKey,
} from "@/lib/games/paint/constants";
import type { Point, Tool, ToolState } from "@/lib/games/paint/types";
import { useSfx } from "@/components/sound/SoundProvider";
import { PaintCanvas, type PaintCanvasFullHandle } from "./paint/PaintCanvas";
import { PaintToolbar } from "./paint/PaintToolbar";
import { PaintActionStack } from "./paint/PaintActionStack";
import { PaintColorPalette } from "./paint/PaintColorPalette";
import { PaintZoomBar } from "./paint/PaintZoomBar";
import { PaintTextDialog } from "./paint/PaintTextDialog";
import { PaintPendingText } from "./paint/PaintPendingText";
import { PaintNewConfirm } from "./paint/PaintNewConfirm";
import { PaintConfetti } from "./paint/PaintConfetti";
import { RotateNudge } from "./paint/RotateNudge";

interface PaintGameProps {
  userId: string;
}

/**
 * Top-level orchestrator for the Paint game. Owns tool state, modals,
 * zoom level, and the canvas's imperative handle. The canvas itself
 * is the source of truth for committed pixels + history.
 */
export default function PaintGame({ userId }: PaintGameProps) {
  const { play } = useSfx();
  const canvasRef = useRef<PaintCanvasFullHandle | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const [toolState, setToolState] = useState<ToolState>({
    tool: "brush",
    strokeSize: STROKE_DEFAULT_PX,
    textSize: "medium",
    color: PRESET_COLORS[0],
    stickerId: "star",
  });

  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [textRequestAt, setTextRequestAt] = useState<Point | null>(null);
  const [pendingText, setPendingText] = useState<{
    text: string;
    size: TextSizeKey;
    color: string;
    at: Point;
  } | null>(null);
  const [pendingTextResetKey, setPendingTextResetKey] = useState(0);
  const [confirmNew, setConfirmNew] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  /* ─── Tool state setters ────────────────────────────────── */

  const setTool = useCallback(
    (tool: Tool) => {
      play("tap");
      setToolState((s) => ({ ...s, tool }));
    },
    [play],
  );

  const setStrokeSize = useCallback((strokeSize: number) => {
    const clamped = Math.max(STROKE_MIN_PX, Math.min(STROKE_MAX_PX, strokeSize));
    setToolState((s) => ({ ...s, strokeSize: clamped }));
  }, []);

  const setColor = useCallback(
    (color: string) => {
      setToolState((s) => ({ ...s, color }));
    },
    [],
  );

  const setSticker = useCallback(
    (stickerId: string) => {
      play("tap");
      setToolState((s) => ({ ...s, stickerId }));
    },
    [play],
  );

  /* ─── Toolbar actions ──────────────────────────────────── */

  const handleUndo = useCallback(() => {
    play("tap");
    canvasRef.current?.undo();
  }, [play]);

  const handleRedo = useCallback(() => {
    play("tap");
    canvasRef.current?.redo();
  }, [play]);

  const handleNewRequest = useCallback(() => {
    play("tap");
    setConfirmNew(true);
  }, [play]);

  const handleToggleFullscreen = useCallback(() => {
    play("tap");
    setFullscreen((v) => !v);
  }, [play]);

  const handleNewConfirm = useCallback(async () => {
    setConfirmNew(false);
    setConfettiTrigger((t) => t + 1);
    play("levelup");
    await canvasRef.current?.clear();
  }, [play]);

  const handleSave = useCallback(async () => {
    const handle = canvasRef.current;
    if (!handle) return;
    play("ding");
    try {
      const blob = await handle.exportBlob();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `learn-buddy-painting-${stamp}.png`;

      // Prefer Web Share API on touch devices — iOS Safari surfaces "Save
      // to Photos" in the share sheet. The download-link fallback below
      // never triggers Photos on iOS because Safari ignores `download`.
      const file = new File([blob], filename, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { files?: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: "My painting" });
          return;
        } catch (err) {
          // User cancelled the share sheet — that's a normal flow.
          if ((err as { name?: string })?.name === "AbortError") return;
          // Otherwise fall through to download.
          console.warn("Paint: share failed, falling back to download", err);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error("Paint: save-to-photos failed", err);
    }
  }, [play]);

  /* ─── Text flow ────────────────────────────────────────── */

  const handleTextRequest = useCallback((at: Point) => {
    setTextRequestAt(at);
  }, []);

  // Dialog "Add text" → seed a draggable preview over the canvas. The
  // user repositions, then taps the green ✓ to bake into pixels.
  const handleTextCommit = useCallback(
    (text: string, size: TextSizeKey) => {
      const at = textRequestAt;
      setTextRequestAt(null);
      if (!at) return;
      setPendingText({ text, size, color: toolState.color, at });
      setPendingTextResetKey((k) => k + 1);
    },
    [textRequestAt, toolState.color],
  );

  const finalisePendingText = useCallback(() => {
    if (!pendingText) return;
    canvasRef.current?.commitText(
      pendingText.at,
      pendingText.text,
      pendingText.size,
      pendingText.color,
    );
    setPendingText(null);
    play("ding");
  }, [pendingText, play]);

  const movePendingText = useCallback((at: Point) => {
    setPendingText((p) => (p ? { ...p, at } : p));
  }, []);

  /* ─── Zoom ─────────────────────────────────────────────── */

  const handleZoomChange = useCallback((next: number) => {
    setZoom(next);
  }, []);

  const handleFit = useCallback(() => {
    play("tap");
    setZoom(1);
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    });
  }, [play]);

  /* ─── History propagation ─────────────────────────────── */

  const onHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  /* ─── Render ──────────────────────────────────────────── */

  // In fullscreen, escape the GameShell wrapper by overlaying the entire
  // viewport. The page header stays underneath but is fully covered.
  // Note: avoid bg-arcade here — it sets `position: relative`, which
  // would override Tailwind's `fixed`.
  const rootClass = fullscreen
    ? "fixed inset-0 z-50 flex gap-3 p-3"
    : "flex gap-3 h-[calc(100vh-9rem)] min-h-[520px]";

  return (
    <div
      className={rootClass}
      style={fullscreen ? { background: "var(--arcade-bg)" } : undefined}
    >
      <PaintToolbar
        tool={toolState.tool}
        strokeSize={toolState.strokeSize}
        fullscreen={fullscreen}
        stickerId={toolState.stickerId}
        onToolChange={setTool}
        onStrokeSizeChange={setStrokeSize}
        onStickerChange={setSticker}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <div
          ref={scrollerRef}
          className="relative flex-1 min-h-0 surface-card cat-creative p-2 overflow-auto"
          style={{ touchAction: "pan-x pan-y pinch-zoom" }}
        >
          <div
            className="relative mx-auto bg-white rounded-xl shadow-[0_8px_30px_-12px_oklch(0_0_0_/_0.5)]"
            style={{
              width: CANVAS_WIDTH * zoom,
              height: CANVAS_HEIGHT * zoom,
              maxWidth: zoom <= 1 ? "100%" : undefined,
            }}
          >
            <PaintCanvas
              ref={canvasRef}
              userId={userId}
              toolState={toolState}
              onTextRequest={handleTextRequest}
              paused={!!textRequestAt || !!pendingText || confirmNew}
              onHistoryChange={onHistoryChange}
              onReady={() => onHistoryChange(false, false)}
            />

            {pendingText && (
              <PaintPendingText
                text={pendingText.text}
                size={pendingText.size}
                color={pendingText.color}
                at={pendingText.at}
                zoom={zoom}
                resetKey={pendingTextResetKey}
                onMove={movePendingText}
                onCommit={finalisePendingText}
              />
            )}
          </div>

          <div className="absolute bottom-3 right-3">
            <PaintZoomBar
              zoom={zoom}
              onZoomChange={handleZoomChange}
              onFit={handleFit}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <PaintColorPalette color={toolState.color} onChange={setColor} />
        <PaintActionStack
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onNew={handleNewRequest}
        />
      </div>

      <PaintTextDialog
        open={textRequestAt !== null}
        initialSize={toolState.textSize}
        initialColor={toolState.color}
        onCancel={() => setTextRequestAt(null)}
        onCommit={handleTextCommit}
      />

      <PaintNewConfirm
        open={confirmNew}
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => void handleNewConfirm()}
      />

      <PaintConfetti trigger={confettiTrigger} />
      <RotateNudge />
    </div>
  );
}
