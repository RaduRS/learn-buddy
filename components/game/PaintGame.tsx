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
import { PaintColorPalette } from "./paint/PaintColorPalette";
import { PaintZoomBar } from "./paint/PaintZoomBar";
import { PaintStickerTray } from "./paint/PaintStickerTray";
import { PaintTextDialog } from "./paint/PaintTextDialog";
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
  const [confirmNew, setConfirmNew] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

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

  const handleTextCommit = useCallback(
    (text: string, size: TextSizeKey) => {
      const at = textRequestAt;
      setTextRequestAt(null);
      if (!at) return;
      canvasRef.current?.commitText(at, text, size, toolState.color);
    },
    [textRequestAt, toolState.color],
  );

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

  const showStickerTray = toolState.tool === "sticker";

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-9rem)] min-h-[520px]">
      <PaintToolbar
        tool={toolState.tool}
        strokeSize={toolState.strokeSize}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setTool}
        onStrokeSizeChange={setStrokeSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNew={handleNewRequest}
        onSave={handleSave}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <PaintColorPalette color={toolState.color} onChange={setColor} />
      </div>

      {showStickerTray && (
        <PaintStickerTray
          stickerId={toolState.stickerId}
          onStickerChange={setSticker}
        />
      )}

      <div
        ref={scrollerRef}
        className="relative flex-1 min-h-0 surface-card cat-creative p-2 overflow-auto"
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
      >
        <div
          className="mx-auto bg-white rounded-xl shadow-[0_8px_30px_-12px_oklch(0_0_0_/_0.5)]"
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
            paused={!!textRequestAt || confirmNew}
            onHistoryChange={onHistoryChange}
            onReady={() => onHistoryChange(false, false)}
          />
        </div>

        <div className="absolute bottom-3 right-3">
          <PaintZoomBar
            zoom={zoom}
            onZoomChange={handleZoomChange}
            onFit={handleFit}
          />
        </div>
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
