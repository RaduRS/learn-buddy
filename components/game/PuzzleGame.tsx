"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Trophy, RotateCcw } from "lucide-react";
import { useScore } from "@/hooks/useScore";
import { useApiCall } from "@/hooks/useApiCall";

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
  /* ─── core state ─── */
  const [config, setConfig] = useState<PuzzleConfig | null>(null);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [bank, setBank] = useState<PuzzlePiece[]>([]);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  /* ─── drag-and-drop state ─── */
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [returnAnim, setReturnAnim] = useState<ReturnAnimState | null>(null);
  const [wrongDropId, setWrongDropId] = useState<string | null>(null);
  const [recentlyPlaced, setRecentlyPlaced] = useState<string | null>(null);

  /* ─── refs ─── */
  const boardRef = useRef<HTMLDivElement>(null);
  const bankPieceRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const configRef = useRef<PuzzleConfig | null>(null);
  const dragInfoRef = useRef<DragInfo | null>(null);

  /* ─── difficulty / grid size ─── */
  const [difficulty, setDifficulty] = useState(2); // 1→2×2, 2→3×3, 3→4×4, 4→5×5
  const [showGridPicker, setShowGridPicker] = useState(false);
  const gridPickerRef = useRef<HTMLDivElement>(null);

  /* ─── portal mount guard (SSR-safe) ─── */
  const [mounted, setMounted] = useState(false);

  /* ─── hooks ─── */
  const { incrementScore } = useScore();
  const { execute, loading, error } = useApiCall<PuzzleConfig>({
    timeout: 30000,
  });

  /* ─── keep refs in sync ─── */
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    dragInfoRef.current = dragInfo;
  }, [dragInfo]);

  /* ─── responsive board size ─── */
  const [boardSize, setBoardSize] = useState(320);
  useEffect(() => {
    const update = () => setBoardSize(Math.min(320, window.innerWidth - 48));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ─── achievement helper ─── */
  const unlockAchievement = useCallback(
    async (title: string, description: string, icon: string) => {
      try {
        await fetch("/api/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, gameId, title, description, icon }),
        });
      } catch (err) {
        console.error("Error unlocking achievement:", err);
      }
    },
    [userId, gameId],
  );

  /* ─── load puzzle from API ─── */
  const loadPuzzle = useCallback(async () => {
    setConfig(null);
    setPlaced({});
    setIsCompleted(false);
    setDragInfo(null);
    setReturnAnim(null);
    setWrongDropId(null);
    setRecentlyPlaced(null);

    const result = await execute(
      async () => {
        const response = await fetch("/api/ai/generate-puzzle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAge, difficulty }),
        });
        if (!response.ok) throw new Error("Failed to generate puzzle");
        const cfg: PuzzleConfig = await response.json();
        const shuffled = [...cfg.pieces].sort(() => Math.random() - 0.5);
        setBank(shuffled);
        return cfg;
      },
      (data: PuzzleConfig) => {
        setConfig(data);
      },
    );
    void result;
  }, [userAge, difficulty, execute]);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  /* ─── background helpers ─── */
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

  /* ─── determine which grid cell a screen point lands on ─── */
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

  /* ─── pointer-down on a bank piece → start drag ─── */
  const handlePiecePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, piece: PuzzlePiece) => {
      e.preventDefault();
      e.stopPropagation();

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

      // Lock page scroll
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    },
    [],
  );

  /* ─── global move / up handlers while dragging ─── */
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
        // ✅ Correct placement
        setPlaced((prev: Record<string, boolean>) => ({
          ...prev,
          [target]: true,
        }));
        setBank((prev: PuzzlePiece[]) =>
          prev.filter((p: PuzzlePiece) => p.id !== pieceId),
        );
        setRecentlyPlaced(target);
      } else {
        // ❌ Wrong / missed – animate return to bank
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

      // Reset drag
      setDragInfo(null);
      dragInfoRef.current = null;
      setHoveredTarget(null);

      // Unlock scroll
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
  }, [isDragging, getTargetCell]);

  /* ─── return animation – kick off transition on next frame ─── */
  useEffect(() => {
    if (!returnAnim || returnAnim.animating) return;
    const raf = requestAnimationFrame(() => {
      setReturnAnim((prev: ReturnAnimState | null) =>
        prev ? { ...prev, animating: true } : null,
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [returnAnim]);

  /* ─── return animation – clean up after transition ─── */
  const returnAnimating = returnAnim?.animating ?? false;
  useEffect(() => {
    if (!returnAnimating) return;
    const timer = setTimeout(() => {
      setReturnAnim(null);
      setWrongDropId(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [returnAnimating]);

  /* ─── close grid picker on outside click ─── */
  useEffect(() => {
    if (!showGridPicker) return;
    const handler = (e: PointerEvent) => {
      if (gridPickerRef.current && !gridPickerRef.current.contains(e.target as Node)) {
        setShowGridPicker(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showGridPicker]);

  /* ─── recently-placed highlight ─── */
  useEffect(() => {
    if (!recentlyPlaced) return;
    const timer = setTimeout(() => setRecentlyPlaced(null), 700);
    return () => clearTimeout(timer);
  }, [recentlyPlaced]);

  /* ─── completion check ─── */
  useEffect(() => {
    if (!config || isCompleted) return;
    const total = config.pieces.length;
    const placedCount = Object.values(placed).filter(Boolean).length;
    if (placedCount === total) {
      setIsCompleted(true);
      setScore((s: number) => s + 1);
      incrementScore(gameId, 1);
      unlockAchievement("Puzzle Master", "Completed a Puzzle!", "🧩");
      onGameComplete?.(1, 1);
    }
  }, [
    placed,
    config,
    isCompleted,
    gameId,
    incrementScore,
    onGameComplete,
    unlockAchievement,
  ]);

  /* ═══════════════════════════  RENDER  ═══════════════════════════ */

  if (loading || !config) {
    if (error) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-red-600">{error}</div>
        </div>
      );
    }
    return (
      <LoadingSkeleton
        message="Creating your puzzle..."
        subMessage="Please wait while we generate a new puzzle for you"
      />
    );
  }

  const { imageUrl, gridSize, pieces } = config;
  const cellPx = boardSize / gridSize;
  const placedCount = Object.values(placed).filter(Boolean).length;

  return (
    <div className="mt-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🧩</span>
              <span>Puzzle</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {placedCount}/{pieces.length} pieces
              </Badge>
              {/* Grid size dropdown trigger */}
              <div ref={gridPickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowGridPicker((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {gridSize}×{gridSize}
                  <svg
                    className={`w-3 h-3 transition-transform ${showGridPicker ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {showGridPicker && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-50 min-w-[140px]">
                    <p className="px-2 py-1 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                      Grid size
                    </p>
                    {[
                      { d: 1, label: "2×2", desc: "4 pieces" },
                      { d: 2, label: "3×3", desc: "9 pieces" },
                      { d: 3, label: "4×4", desc: "16 pieces" },
                      { d: 4, label: "5×5", desc: "25 pieces" },
                    ].map((opt) => (
                      <button
                        key={opt.d}
                        type="button"
                        onClick={() => {
                          setDifficulty(opt.d);
                          setShowGridPicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
                          difficulty === opt.d
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-gray-400">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* ── Completion celebration ── */}
          {isCompleted && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-3xl mb-1">🎉🧩🎉</div>
              <div className="text-green-700 font-semibold text-lg">
                Puzzle Complete!
              </div>
              <div className="text-green-600 text-sm">Great job!</div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* ── Board ── */}
            <div
              ref={boardRef}
              className="relative border-2 border-gray-300 rounded-lg shadow-md bg-gray-50/80 shrink-0"
              style={{ width: boardSize, height: boardSize }}
            >
              {pieces.map((piece: PuzzlePiece) => {
                const targetId = `${piece.row}-${piece.col}`;
                const isPlaced = placed[targetId];
                const isHovered = hoveredTarget === targetId;
                const isRecent = recentlyPlaced === targetId;

                return (
                  <div
                    key={targetId}
                    className={`absolute ${
                      isPlaced
                        ? "border border-gray-100"
                        : isHovered
                          ? "border-2 border-blue-400 bg-blue-100/40"
                          : "border border-dashed border-gray-300"
                    } ${isRecent ? "just-placed" : ""}`}
                    style={{
                      left: piece.col * cellPx,
                      top: piece.row * cellPx,
                      width: cellPx,
                      height: cellPx,
                      borderRadius: 2,
                      transition:
                        "background-color 0.15s, border-color 0.15s",
                    }}
                  >
                    {isPlaced && (
                      <div
                        className="w-full h-full"
                        style={pieceBg(
                          piece.row,
                          piece.col,
                          gridSize,
                          imageUrl,
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Piece bank ── */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-2 select-none">
                👆 Drag pieces onto the board
              </p>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {bank.map((piece: PuzzlePiece) => {
                  const isBeingDragged = dragInfo?.piece.id === piece.id;
                  const isWrong = wrongDropId === piece.id;

                  return (
                    <button
                      key={piece.id}
                      ref={(el: HTMLButtonElement | null) => {
                        if (el) bankPieceRefs.current.set(piece.id, el);
                        else bankPieceRefs.current.delete(piece.id);
                      }}
                      onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) =>
                        handlePiecePointerDown(e, piece)
                      }
                      type="button"
                      className={`
                        relative border-2 rounded-lg overflow-hidden
                        ${
                          isBeingDragged
                            ? "opacity-25 border-gray-300 scale-95"
                            : isWrong
                              ? "border-red-400 shake-piece"
                              : "border-gray-200 hover:border-blue-400 active:scale-95"
                        }
                      `}
                      style={{
                        width: cellPx,
                        height: cellPx,
                        touchAction: "none",
                        cursor: "grab",
                        transition: isBeingDragged
                          ? "none"
                          : "transform 0.15s, border-color 0.15s, opacity 0.15s",
                      }}
                    >
                      <div
                        className="w-full h-full"
                        style={pieceBg(
                          piece.row,
                          piece.col,
                          gridSize,
                          imageUrl,
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <Button onClick={loadPuzzle} disabled={isDragging} size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" /> New Puzzle
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Score: {score}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Drag ghost (portal → body) ── */}
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
              opacity: 0.88,
              zIndex: 99999,
              pointerEvents: "none",
              borderRadius: 6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
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

      {/* ── Return-to-bank animation (portal → body) ── */}
      {mounted &&
        returnAnim &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: returnAnim.animating
                ? returnAnim.toX
                : returnAnim.fromX,
              top: returnAnim.animating
                ? returnAnim.toY
                : returnAnim.fromY,
              width: returnAnim.width,
              height: returnAnim.height,
              opacity: returnAnim.animating ? 0.25 : 0.8,
              zIndex: 99999,
              pointerEvents: "none",
              borderRadius: 6,
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
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