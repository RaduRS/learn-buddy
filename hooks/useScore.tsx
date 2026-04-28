"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { GameProgress } from "@/types";

interface ScoreContextType {
  totalScore: number;
  scoreLoaded: boolean;
  incrementScore: (gameId: string, points?: number) => void;
  setTotalScore: (score: number) => void;
  loadUserScore: (userId: string) => Promise<void>;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

interface ScoreProviderProps {
  children: ReactNode;
}

export function ScoreProvider({ children }: ScoreProviderProps) {
  const [totalScore, setTotalScore] = useState<number>(0);
  const [scoreLoaded, setScoreLoaded] = useState(false);

  // Optimistic-only: bump the local total so the header chip feels live
  // during play. The server-side total is updated once at game end via
  // POST /api/game-progress in the game page's onGameComplete handler.
  // We intentionally don't fire an extra POST per point — that path used
  // to double-count totals because the round-end save adds the same
  // score on top.
  const incrementScore = (gameId: string, points: number = 1) => {
    void gameId;
    setTotalScore((prev) => prev + points);
  };

  const loadUserScore = async (userId: string) => {
    try {
      const response = await fetch(`/api/game-progress?userId=${userId}`);
      if (response.ok) {
        const progress = await response.json();
        const total = progress.reduce(
          (sum: number, p: GameProgress) => sum + (p.totalScore || 0),
          0
        );
        setTotalScore(total);
      }
      setScoreLoaded(true);
    } catch (error) {
      console.error("Failed to load user score:", error);
      setTotalScore(0);
      setScoreLoaded(true);
    }
  };

  const contextValue: ScoreContextType = {
    totalScore,
    scoreLoaded,
    incrementScore,
    setTotalScore,
    loadUserScore,
  };

  return (
    <ScoreContext.Provider value={contextValue}>
      {children}
    </ScoreContext.Provider>
  );
}

export function useScore(): ScoreContextType {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error("useScore must be used within a ScoreProvider");
  }
  return context;
}
