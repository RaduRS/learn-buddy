"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Puzzle as PuzzleIcon, RotateCcw } from "lucide-react";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useScore } from "@/hooks/useScore";
import { useAchievementUnlock } from "@/hooks/useAchievementUnlock";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface PuzzlePiece {
  id: string;
  row: number;
  col: number;
}

interface PuzzleConfig {
  imageUrl: string;
  gridSize: number;
  pieces: PuzzlePiece[];
}

const READY_PICTURES = ["animals", "space", "dinosaurs", "under-the-sea"];

interface DragInfo {
  piece: PuzzlePiece;
  currentX: number;
  currentY: number;
  ghostWidth: number;
  ghostHeight: number;
}

interface ReturnAnimState {
  piece: PuzzlePiece;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  width: number;
  height: number;
  animating: boolean;
}

interface PuzzleGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

export default function PuzzleGame({
  userId,
  gameId,
  userAge,
  onGameComplete,
}: PuzzleGameProps) {
  const [config, setConfig] = useState<PuzzleConfig | null>(null);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [bank, setBank] = useState<PuzzlePiece[]>([]);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef<AbortController | null>(null);

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [returnAnim, setReturnAnim] = useState<ReturnAnimState | null>(null);
  const [wrongDropId, setWrongDropId] = useState<string | null>(null);
  const [recentlyPlaced, setRecentlyPlaced] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const bankPieceRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const configRef = useRef<PuzzleConfig | null>(null);
  const dragInfoRef = useRef<DragInfo | null>(null);

  const [difficulty, setDifficulty] = useState(2);
  const [showGridPicker, setShowGridPicker] = useState(false);
  const gridPickerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  const { incrementScore } = useScore();
  const { unlock } = useAchievementUnlock(userId);
  const { play } = useSfx();

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    dragInfoRef.current = dragInfo;
  }, [dragInfo]);

  const [boardSize, setBoardSize] = useState(420);
  useEffect(() => {
    const update = () => setBoardSize(Math.min(440, window.innerWidth - 64));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const resetRound = useCallback(() => {
    setConfig(null);
    setPlaced({});
    setScore(0);
    setIsCompleted(false);
    setDragInfo(null);
    setReturnAnim(null);
    setWrongDropId(null);
    setRecentlyPlaced(null);
    setError(null);
  }, []);

  const loadPuzzle = useCallback(async () => {
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    resetRound();
    // Image generation can take 45 seconds. The ready-made option stays available.
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch("/api/ai/generate-puzzle", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAge, difficulty }),
      });
      if (!response.ok) throw new Error("Failed to generate puzzle");
      const data: PuzzleConfig = await response.json();
      if (generationRef.current !== controller) return;
      setBank([...data.pieces].sort(() => Math.random() - 0.5));
      setConfig(data);
    } catch {
      if (generationRef.current === controller) {
        setError("Buddy couldn't make a new picture. Try again or play with a picture that's ready.");
      }
    } finally {
      clearTimeout(timeout);
    }
  }, [userAge, difficulty, resetRound]);

  function playReadyPicture() {
    generationRef.current?.abort();
    generationRef.current = null;
    resetRound();
    play("tap");
    const gridSize = difficulty + 1;
    const pieces = Array.from({ length: gridSize * gridSize }, (_, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      return { id: `${row}-${col}`, row, col };
    });
    const picture = READY_PICTURES[Math.floor(Math.random() * READY_PICTURES.length)];
    setBank([...pieces].sort(() => Math.random() - 0.5));
    setConfig({ imageUrl: `/story-themes/${picture}.png`, gridSize, pieces });
  }

  useEffect(() => {
    void loadPuzzle();
    return () => {
      generationRef.current?.abort();
      generationRef.current = null;
    };
  }, [loadPuzzle]);

  const bgSize = (gs: number) => `${gs * 100}% ${gs * 100}%`;
  const bgPos = (row: number, col: number, gs: number) => {
    const x = gs <= 1 ? 0 : (col * 100) / (gs - 1);
    const y = gs <= 1 ? 0 : (row * 100) / (gs - 1);
    return `${x}% ${y}%`;
  };

  const pieceBg = (
    row: number,
    col: number,
    gs: number,
    url: string,
  ): React.CSSProperties => ({
    backgroundImage: `url(${url})`,
    backgroundSize: bgSize(gs),
    backgroundPosition: bgPos(row, col, gs),
  });

  const getTargetCell = useCallback(
    (clientX: number, clientY: number): string | null => {
      const cfg = configRef.current;
      if (!boardRef.current || !cfg) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const cellPx = rect.width / cfg.gridSize;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      )
        return null;
      const col = Math.floor((clientX - rect.left) / cellPx);
      const row = Math.floor((clientY - rect.top) / cellPx);
      if (col < 0 || col >= cfg.gridSize || row < 0 || row >= cfg.gridSize)
        return null;
      return `${row}-${col}`;
    },
    [],
  );

  const handlePiecePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, piece: PuzzlePiece) => {
      e.preventDefault();
      e.stopPropagation();
      play("tap");
      const rect = e.currentTarget.getBoundingClientRect();
      const info: DragInfo = {
        piece,
        currentX: e.clientX,
        currentY: e.clientY,
        ghostWidth: rect.width,
        ghostHeight: rect.height,
      };
      setDragInfo(info);
      dragInfoRef.current = info;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    },
    [play],
  );

  const isDragging = dragInfo !== null;

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      const prev = dragInfoRef.current;
      if (!prev) return;
      const updated: DragInfo = {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
      };
      dragInfoRef.current = updated;
      setDragInfo(updated);
      setHoveredTarget(getTargetCell(e.clientX, e.clientY));
    };

    const finishDrag = (e: PointerEvent) => {
      const current = dragInfoRef.current;
      if (!current) return;

      const target = getTargetCell(e.clientX, e.clientY);
      const pieceId = current.piece.id;

      if (target === pieceId) {
        play("correct");
        setPlaced((prev) => ({ ...prev, [target]: true }));
        setBank((prev) => prev.filter((p) => p.id !== pieceId));
        setRecentlyPlaced(target);
      } else {
        play("wrong");
        const bankEl = bankPieceRefs.current.get(pieceId);
        if (bankEl) {
          const bankRect = bankEl.getBoundingClientRect();
          setReturnAnim({
            piece: current.piece,
            fromX: e.clientX - current.ghostWidth / 2,
            fromY: e.clientY - current.ghostHeight / 2,
            toX: bankRect.left,
            toY: bankRect.top,
            width: current.ghostWidth,
            height: current.ghostHeight,
            animating: false,
          });
        }
        setWrongDropId(pieceId);
      }

      setDragInfo(null);
      dragInfoRef.current = null;
      setHoveredTarget(null);
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isDragging, getTargetCell, play]);

  useEffect(() => {
    if (!returnAnim || returnAnim.animating) return;
    const raf = requestAnimationFrame(() => {
      setReturnAnim((prev) => (prev ? { ...prev, animating: true } : null));
    });
    return () => cancelAnimationFrame(raf);
  }, [returnAnim]);

  const returnAnimating = returnAnim?.animating ?? false;
  useEffect(() => {
    if (!returnAnimating) return;
    const id = setTimeout(() => {
      setReturnAnim(null);
      setWrongDropId(null);
    }, 400);
    return () => clearTimeout(id);
  }, [returnAnimating]);

  useEffect(() => {
    if (!showGridPicker) return;
    const handler = (e: PointerEvent) => {
      if (
        gridPickerRef.current &&
        !gridPickerRef.current.contains(e.target as Node)
      ) {
        setShowGridPicker(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showGridPicker]);

  useEffect(() => {
    if (!recentlyPlaced) return;
    const id = setTimeout(() => setRecentlyPlaced(null), 700);
    return () => clearTimeout(id);
  }, [recentlyPlaced]);

  useEffect(() => {
    if (!config || isCompleted) return;
    const total = config.pieces.length;
    const placedCount = Object.values(placed).filter(Boolean).length;
    if (placedCount === total) {
      setIsCompleted(true);
      setScore((s) => s + 1);
      incrementScore(gameId, 1);
      void unlock({
        gameId,
        title: "Puzzle Master",
        description: "Completed a Puzzle!",
        icon: "🧩",
      });
      onGameComplete?.(1, 1);
    }
  }, [placed, config, isCompleted, gameId, incrementScore, onGameComplete, unlock]);

  if (!config) {
    return (
      <div className="space-y-4">
        {error ? (
          <div className="surface-card cat-spatial p-6 max-w-md mx-auto text-center text-arcade-mid" role="alert">
            {error}
          </div>
        ) : (
          <LoadingScreen
            tone="generating"
            message="Buddy is cutting up a picture…"
            subMessage="You can start now with a picture that's ready."
            className="!min-h-[35vh]"
          />
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={playReadyPicture}
            className="font-display rounded-full bg-[var(--cat-spatial)] text-[var(--ink-on-color)] px-6 py-3 hover:brightness-110 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cat-spatial)]">
            Play Now
          </button>
          {error && (
            <button type="button" onClick={loadPuzzle}
              className="font-display rounded-full border border-[var(--arcade-edge)] bg-[var(--arcade-card-soft)] text-arcade-strong px-6 py-3 hover:brightness-110 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cat-spatial)]">
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="py-6 space-y-5">
        <ResultsScreen
          score={score}
          total={1}
          category="spatial"
          headline="Puzzle complete!"
          message="Beautiful work. Every piece is in its place."
          onPlayAgain={loadPuzzle}
        />
      </div>
    );
  }

  const { imageUrl, gridSize, pieces } = config;
  const cellPx = boardSize / gridSize;
  const placedCount = Object.values(placed).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="surface-card cat-spatial p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-arcade-strong font-display text-lg">
          <PuzzleIcon
            className="w-5 h-5"
            style={{ color: "var(--cat-spatial)" }}
            aria-hidden
          />
          <span>Puzzle</span>
        </div>
        <span className="chip">
          <span className="text-sm opacity-80">Pieces</span>
          <span className="font-display">{placedCount}</span>
          <span className="opacity-70">/</span>
          <span className="font-display opacity-80">{pieces.length}</span>
        </span>
        <span className="flex-1" />

        <div ref={gridPickerRef} className="relative">
          <button
            type="button"
            onClick={() => setShowGridPicker((v) => !v)}
            className="font-display inline-flex items-center gap-1.5 px-3 py-2 rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)]
                       active:scale-[0.97]"
          >
            {gridSize}×{gridSize}
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                showGridPicker && "rotate-180",
              )}
            />
          </button>

          {showGridPicker && (
            <div
              className="absolute right-0 top-full mt-2 z-50 surface-card p-2 min-w-[160px]"
              style={{ borderRadius: "1rem" }}
            >
              <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-arcade-soft font-display">
                Grid size
              </p>
              {[
                { d: 1, label: "2 × 2", desc: "4 pieces" },
                { d: 2, label: "3 × 3", desc: "9 pieces" },
                { d: 3, label: "4 × 4", desc: "16 pieces" },
                { d: 4, label: "5 × 5", desc: "25 pieces" },
              ].map((opt) => (
                <button
                  key={opt.d}
                  type="button"
                  onClick={() => {
                    play("tap");
                    setDifficulty(opt.d);
                    setShowGridPicker(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-lg",
                    difficulty === opt.d
                      ? "bg-[oklch(0.30_0.10_25_/_0.5)] text-arcade-strong"
                      : "text-arcade-mid hover:bg-[oklch(1_0_0_/_0.06)]",
                  )}
                >
                  <span className="font-display">{opt.label}</span>
                  <span className="text-arcade-soft text-[10px]">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={loadPuzzle}
          disabled={isDragging}
          className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full
                     bg-[var(--arcade-card-soft)] text-arcade-strong
                     border border-[var(--arcade-edge)]
                     active:scale-[0.97]
                     disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" /> New
        </button>
      </div>

      <div className="surface-card cat-spatial p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
          <div
            ref={boardRef}
            className="relative border-2 border-[var(--arcade-edge)] rounded-2xl bg-[oklch(0.20_0.06_285_/_0.55)] shrink-0"
            style={{ width: boardSize, height: boardSize }}
          >
            {pieces.map((piece) => {
              const targetId = `${piece.row}-${piece.col}`;
              const isPlaced = placed[targetId];
              const isHovered = hoveredTarget === targetId;
              const isRecent = recentlyPlaced === targetId;
              return (
                <div
                  key={targetId}
                  className={cn(
                    "absolute",
                    isPlaced
                      ? "border border-[oklch(1_0_0_/_0.10)]"
                      : isHovered
                        ? "border-2 border-[color:var(--cat-spatial)] bg-[oklch(0.50_0.20_25_/_0.18)]"
                        : "border border-dashed border-[var(--arcade-edge)]",
                    isRecent && "just-placed",
                  )}
                  style={{
                    left: piece.col * cellPx,
                    top: piece.row * cellPx,
                    width: cellPx,
                    height: cellPx,
                    borderRadius: 4,
                    transition:
                      "background-color 0.15s, border-color 0.15s",
                  }}
                >
                  {isPlaced && (
                    <div
                      className="w-full h-full"
                      style={pieceBg(piece.row, piece.col, gridSize, imageUrl)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 w-full lg:w-auto">
            <p className="text-xs text-arcade-soft mb-2 select-none">
              Drag pieces onto the board.
            </p>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(gridSize, 4)}, minmax(0, 1fr))`,
                maxWidth: Math.min(gridSize, 4) * 80,
              }}
            >
              {bank.map((piece) => {
                const isBeingDragged = dragInfo?.piece.id === piece.id;
                const isWrong = wrongDropId === piece.id;
                return (
                  <button
                    key={piece.id}
                    ref={(el) => {
                      if (el) bankPieceRefs.current.set(piece.id, el);
                      else bankPieceRefs.current.delete(piece.id);
                    }}
                    onPointerDown={(e) => handlePiecePointerDown(e, piece)}
                    type="button"
                    aria-label={`Puzzle piece ${piece.row * gridSize + piece.col + 1}`}
                    className={cn(
                      "relative border-2 rounded-xl overflow-hidden",
                      "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]",
                      isBeingDragged
                        ? "opacity-25 border-[var(--arcade-edge)] scale-95"
                        : isWrong
                          ? "border-[oklch(0.65_0.22_25)] shake-piece"
                          : "border-[var(--arcade-edge)] hover:border-[color:var(--cat-spatial)] active:scale-95",
                    )}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      touchAction: "none",
                      cursor: "grab",
                      transition: isBeingDragged
                        ? "none"
                        : "transform 0.15s, border-color 0.15s, opacity 0.15s",
                    }}
                  >
                    <div
                      className="w-full h-full"
                      style={pieceBg(piece.row, piece.col, gridSize, imageUrl)}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {mounted &&
        dragInfo &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: dragInfo.currentX - dragInfo.ghostWidth / 2,
              top: dragInfo.currentY - dragInfo.ghostHeight / 2,
              width: dragInfo.ghostWidth,
              height: dragInfo.ghostHeight,
              opacity: 0.92,
              zIndex: 50,
              pointerEvents: "none",
              borderRadius: 8,
              boxShadow:
                "0 16px 36px oklch(0 0 0 / 0.45), 0 0 0 2px var(--cat-spatial-glow)",
              transform: "scale(1.12)",
              transition: "none",
              ...pieceBg(
                dragInfo.piece.row,
                dragInfo.piece.col,
                gridSize,
                imageUrl,
              ),
            }}
          />,
          document.body,
        )}

      {mounted &&
        returnAnim &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: returnAnim.animating ? returnAnim.toX : returnAnim.fromX,
              top: returnAnim.animating ? returnAnim.toY : returnAnim.fromY,
              width: returnAnim.width,
              height: returnAnim.height,
              opacity: returnAnim.animating ? 0.25 : 0.85,
              zIndex: 50,
              pointerEvents: "none",
              borderRadius: 8,
              boxShadow: "0 8px 22px oklch(0 0 0 / 0.4)",
              transition: returnAnim.animating
                ? "left 0.3s cubic-bezier(.4,0,.2,1), top 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s ease"
                : "none",
              ...pieceBg(
                returnAnim.piece.row,
                returnAnim.piece.col,
                gridSize,
                imageUrl,
              ),
            }}
          />,
          document.body,
        )}
    </div>
  );
}
